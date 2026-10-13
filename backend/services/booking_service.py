import uuid
import datetime
from database import transaction, query_one, query_all
from services.equipment_service import EquipmentService

class BookingService:
    @staticmethod
    def cleanup_expired_holds():
        """Mark stale holds as expired and release temporarily blocked capacity."""
        with transaction() as cur:
            cur.execute("""
                UPDATE booking_holds 
                SET status = 'expired' 
                WHERE status = 'active' AND expires_at < NOW()
            """)

    @classmethod
    def create_class_hold(cls, member_id, schedule_id):
        """
        Create a 10-minute atomic hold for a class seat.
        Uses FOR UPDATE row locking to prevent concurrent race conditions
        on the last remaining seat.
        """
        cls.cleanup_expired_holds()

        with transaction() as cur:
            # 1. Lock schedule row
            cur.execute("SELECT * FROM class_schedules WHERE id = %s FOR UPDATE", (schedule_id,))
            sched = cur.fetchone()
            if not sched:
                raise ValueError("Class schedule not found.")

            if sched['status'] != 'Scheduled':
                raise ValueError(f"Class is not open for booking (status: {sched['status']}).")

            # 2. Check if member already booked
            cur.execute("""
                SELECT id FROM class_registrations 
                WHERE member_id = %s AND schedule_id = %s AND status = 'Confirmed'
            """, (member_id, schedule_id))
            if cur.fetchone():
                raise ValueError("You are already registered for this class session.")

            # 3. Calculate effective occupied seats: Confirmed + Active holds
            cur.execute("""
                SELECT COUNT(*) AS active_holds 
                FROM booking_holds 
                WHERE schedule_id = %s AND status = 'active' AND expires_at > NOW()
            """, (schedule_id,))
            hold_count = cur.fetchone()['active_holds']

            effective_occupied = sched['booked_capacity'] + hold_count
            if effective_occupied >= sched['max_capacity']:
                raise ValueError("This class is fully booked. No seats remaining.")

            # 4. Check equipment conflicts
            equip_check = EquipmentService.check_class_equipment_conflicts(
                sched['class_id'], sched['session_date'], sched['start_time'], sched['end_time'], effective_occupied + 1
            )
            if equip_check['has_conflicts']:
                raise ValueError(f"Equipment shortage: {equip_check['conflicts'][0]['reason']}")

            # 5. Create Hold
            hold_token = f"HLD-{uuid.uuid4().hex[:12].upper()}"
            expires_at = datetime.datetime.now() + datetime.timedelta(minutes=10)

            cur.execute("""
                INSERT INTO booking_holds (member_id, schedule_id, session_type, hold_token, expires_at, status)
                VALUES (%s, %s, 'class', %s, %s, 'active')
            """, (member_id, schedule_id, hold_token, expires_at))
            hold_id = cur.lastrowid

            # 6. Fetch class details for order summary
            cur.execute("SELECT * FROM fitness_classes WHERE id = %s", (sched['class_id'],))
            fc = cur.fetchone()
            cur.execute("SELECT full_name FROM trainers WHERE id = %s", (sched['trainer_id'],))
            trainer = cur.fetchone()

            # 7. Check if member has active membership with inclusive benefit
            cur.execute("""
                SELECT s.*, p.plan_name, p.included_sessions 
                FROM subscriptions s
                INNER JOIN membership_plans p ON s.plan_id = p.id
                WHERE s.member_id = %s AND s.status = 'Active' AND s.end_date >= CURDATE()
                ORDER BY s.end_date DESC LIMIT 1
            """, (member_id,))
            active_sub = cur.fetchone()

            is_inclusive = bool(active_sub and fc['membership_inclusive'])
            price = 0.00 if is_inclusive else float(fc['price'])

            return {
                'hold_id': hold_id,
                'hold_token': hold_token,
                'schedule_id': schedule_id,
                'class_name': fc['class_name'],
                'category': fc['category'],
                'trainer_name': trainer['full_name'],
                'session_date': str(sched['session_date']),
                'start_time': str(sched['start_time']),
                'end_time': str(sched['end_time']),
                'max_capacity': sched['max_capacity'],
                'seats_remaining': sched['max_capacity'] - (effective_occupied + 1),
                'price': price,
                'original_price': float(fc['price']),
                'is_membership_inclusive': is_inclusive,
                'active_plan': active_sub['plan_name'] if active_sub else None,
                'expires_at': expires_at.isoformat()
            }

    @classmethod
    def confirm_class_booking(cls, member_id, schedule_id, hold_token=None, payment_ref=None, amount_paid=0.00):
        """
        Atomically confirm a class booking, increment booked capacity, consume hold,
        and allocate required equipment.
        """
        with transaction() as cur:
            cur.execute("SELECT * FROM class_schedules WHERE id = %s FOR UPDATE", (schedule_id,))
            sched = cur.fetchone()
            if not sched:
                raise ValueError("Class schedule not found.")

            # Check duplicate
            cur.execute("""
                SELECT id FROM class_registrations 
                WHERE member_id = %s AND schedule_id = %s AND status = 'Confirmed'
            """, (member_id, schedule_id))
            if cur.fetchone():
                return {'success': True, 'already_registered': True, 'message': 'Already registered'}

            hold_id = None
            if hold_token:
                cur.execute("SELECT * FROM booking_holds WHERE hold_token = %s FOR UPDATE", (hold_token,))
                hold = cur.fetchone()
                if hold and hold['status'] == 'active' and hold['expires_at'] >= datetime.datetime.now():
                    hold_id = hold['id']
                    cur.execute("UPDATE booking_holds SET status = 'consumed' WHERE id = %s", (hold_id,))

            # Verify capacity wasn't exceeded
            if sched['booked_capacity'] >= sched['max_capacity']:
                raise ValueError("Cannot confirm: Class capacity reached maximum.")

            # Insert registration
            payment_status = 'Included' if amount_paid == 0.0 else 'Paid'
            cur.execute("""
                INSERT INTO class_registrations (member_id, schedule_id, hold_id, booking_time, status, payment_status, amount_paid)
                VALUES (%s, %s, %s, NOW(), 'Confirmed', %s, %s)
            """, (member_id, schedule_id, hold_id, payment_status, amount_paid))
            reg_id = cur.lastrowid

            # Increment booked capacity
            cur.execute("""
                UPDATE class_schedules 
                SET booked_capacity = booked_capacity + 1 
                WHERE id = %s
            """, (schedule_id,))

            # Allocate equipment
            EquipmentService.allocate_equipment_for_schedule(schedule_id, cur=cur)

            return {
                'success': True,
                'registration_id': reg_id,
                'schedule_id': schedule_id,
                'status': 'Confirmed',
                'booking_ref': f"BK-{reg_id:05d}"
            }

    @classmethod
    def cancel_class_booking(cls, member_id, registration_id):
        """Cancel a confirmed booking and decrement booked capacity atomically."""
        with transaction() as cur:
            cur.execute("""
                SELECT cr.*, cs.session_date, cs.start_time, cs.id AS schedule_id
                FROM class_registrations cr
                INNER JOIN class_schedules cs ON cr.schedule_id = cs.id
                WHERE cr.id = %s AND cr.member_id = %s
                FOR UPDATE
            """, (registration_id, member_id))
            reg = cur.fetchone()
            if not reg:
                raise ValueError("Registration record not found or does not belong to member.")

            if reg['status'] == 'Cancelled':
                return {'success': True, 'message': 'Booking already cancelled'}

            cur.execute("""
                UPDATE class_registrations 
                SET status = 'Cancelled', cancellation_time = NOW() 
                WHERE id = %s
            """, (registration_id,))

            cur.execute("""
                UPDATE class_schedules 
                SET booked_capacity = GREATEST(0, booked_capacity - 1) 
                WHERE id = %s
            """, (reg['schedule_id'],))

            return {'success': True, 'status': 'Cancelled', 'registration_id': registration_id}
