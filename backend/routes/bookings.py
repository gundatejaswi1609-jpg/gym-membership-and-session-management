from flask import Blueprint, request, jsonify
from database import query_all, query_one, transaction
from services.booking_service import BookingService
import datetime

bookings_bp = Blueprint('bookings', __name__)

@bookings_bp.route('/hold', methods=['POST'])
def create_booking_hold():
    """
    Step 6: Atomic booking hold creation with 10-minute expiry time
    to prevent two users from paying for the last seat simultaneously.
    """
    data = request.get_json() or {}
    member_id = data.get('member_id', 1)
    schedule_id = data.get('schedule_id')

    if not schedule_id:
        return jsonify({'error': 'schedule_id is required.'}), 400

    try:
        hold_summary = BookingService.create_class_hold(member_id, schedule_id)
        return jsonify({
            'success': True,
            'message': 'Seat reserved temporarily for 10 minutes.',
            'hold': hold_summary
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Booking hold error: {str(e)}'}), 500

@bookings_bp.route('/confirm', methods=['POST'])
def confirm_booking():
    """
    Step 10: Confirm booking after verified payment or atomic zero-cost reservation.
    """
    data = request.get_json() or {}
    member_id = data.get('member_id', 1)
    schedule_id = data.get('schedule_id')
    hold_token = data.get('hold_token')
    payment_ref = data.get('payment_ref')
    amount_paid = float(data.get('amount_paid', 0.00))

    if not schedule_id:
        return jsonify({'error': 'schedule_id is required.'}), 400

    try:
        result = BookingService.confirm_class_booking(
            member_id=member_id,
            schedule_id=schedule_id,
            hold_token=hold_token,
            payment_ref=payment_ref,
            amount_paid=amount_paid
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to confirm booking: {str(e)}'}), 500

@bookings_bp.route('/pt-book', methods=['POST'])
def book_personal_training():
    """Book a 1-on-1 personal training appointment."""
    data = request.get_json() or {}
    member_id = data.get('member_id', 1)
    trainer_id = data.get('trainer_id')
    booking_date = data.get('booking_date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    notes = data.get('notes', '')

    if not all([trainer_id, booking_date, start_time, end_time]):
        return jsonify({'error': 'trainer_id, booking_date, start_time, and end_time are required.'}), 400

    trainer = query_one("SELECT * FROM trainers WHERE id = %s", (trainer_id,))
    if not trainer:
        return jsonify({'error': 'Trainer not found.'}), 404

    price = float(trainer['session_price'])

    with transaction() as cur:
        # Check conflict
        cur.execute("""
            SELECT id FROM personal_training_bookings 
            WHERE trainer_id = %s AND booking_date = %s 
              AND status IN ('Confirmed', 'Pending')
              AND NOT (end_time <= %s OR start_time >= %s)
            FOR UPDATE
        """, (trainer_id, booking_date, start_time, end_time))
        if cur.fetchone():
            return jsonify({'error': 'Trainer is already booked during this time slot.'}), 400

        cur.execute("""
            INSERT INTO personal_training_bookings (member_id, trainer_id, booking_date, start_time, end_time, price, status, payment_status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, 'Confirmed', 'Paid', %s)
        """, (member_id, trainer_id, booking_date, start_time, end_time, price, notes))
        pt_id = cur.lastrowid

    return jsonify({
        'success': True,
        'pt_booking_id': pt_id,
        'booking_ref': f"PT-{pt_id:05d}",
        'trainer_name': trainer['full_name'],
        'booking_date': booking_date,
        'start_time': start_time,
        'end_time': end_time,
        'price': price
    })

@bookings_bp.route('/my-bookings', methods=['GET'])
def get_my_bookings():
    member_id = request.args.get('member_id', 1, type=int)

    # Group classes
    classes = query_all("""
        SELECT 
            cr.id AS registration_id,
            cr.booking_time,
            cr.status,
            cr.payment_status,
            cr.amount_paid,
            cs.id AS schedule_id,
            cs.session_date,
            cs.start_time,
            cs.end_time,
            fc.class_name,
            fc.category,
            fc.difficulty_level,
            fc.image_url,
            t.full_name AS trainer_name,
            r.room_name,
            gl.location_name,
            (SELECT attendance_status FROM attendance a WHERE a.registration_id = cr.id LIMIT 1) AS attendance_status
        FROM class_registrations cr
        INNER JOIN class_schedules cs ON cr.schedule_id = cs.id
        INNER JOIN fitness_classes fc ON cs.class_id = fc.id
        INNER JOIN trainers t ON cs.trainer_id = t.id
        LEFT JOIN rooms r ON cs.room_id = r.id
        LEFT JOIN gym_locations gl ON r.location_id = gl.id
        WHERE cr.member_id = %s
        ORDER BY cs.session_date DESC, cs.start_time DESC
    """, (member_id,))

    # Personal training
    pt_list = query_all("""
        SELECT 
            pt.*,
            t.full_name AS trainer_name,
            t.specialization,
            t.image_url AS trainer_image
        FROM personal_training_bookings pt
        INNER JOIN trainers t ON pt.trainer_id = t.id
        WHERE pt.member_id = %s
        ORDER BY pt.booking_date DESC, pt.start_time DESC
    """, (member_id,))

    for c in classes:
        for k in ['session_date', 'booking_time', 'start_time', 'end_time']:
            if k in c and c[k]:
                c[k] = str(c[k])
        c['amount_paid'] = float(c['amount_paid'])
        # QR ticket pass string
        c['qr_ticket_data'] = f"APEX-CLASS-PASS:{c['registration_id']}:{member_id}:{c['session_date']}:{c['start_time'][:5]}"

    for pt in pt_list:
        for k in ['booking_date', 'start_time', 'end_time', 'created_at']:
            if k in pt and pt[k]:
                pt[k] = str(pt[k])
        pt['price'] = float(pt['price'])
        pt['qr_ticket_data'] = f"APEX-PT-PASS:{pt['id']}:{member_id}:{pt['booking_date']}:{pt['start_time'][:5]}"

    return jsonify({
        'classes': classes,
        'personal_training': pt_list
    })

@bookings_bp.route('/<int:registration_id>/cancel', methods=['POST'])
def cancel_booking(registration_id):
    data = request.get_json() or {}
    member_id = data.get('member_id', 1)

    try:
        res = BookingService.cancel_class_booking(member_id, registration_id)
        return jsonify(res)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Cancellation failed: {str(e)}'}), 500

@bookings_bp.route('/check-in', methods=['POST'])
def check_in():
    """Turnstile/reception check-in using QR code."""
    data = request.get_json() or {}
    reg_id = data.get('registration_id')
    pt_id = data.get('pt_booking_id')
    member_id = data.get('member_id', 1)

    with transaction() as cur:
        cur.execute("""
            INSERT INTO attendance (registration_id, pt_booking_id, member_id, check_in_time, attendance_status, remarks, recorded_by)
            VALUES (%s, %s, %s, NOW(), 'Present', 'QR Scan Turnstile Access Granted', 'SMART_TURNSTILE')
        """, (reg_id, pt_id, member_id))

        if reg_id:
            cur.execute("UPDATE class_registrations SET status = 'Attended' WHERE id = %s", (reg_id,))

    return jsonify({'success': True, 'message': 'Welcome to ApexFit! Turnstile unlocked.'})
