import datetime
from database import transaction, query_all, query_one

class EquipmentService:
    @staticmethod
    def get_realtime_inventory():
        """
        Fetch all equipment with operational status, quantity in service,
        and count of active maintenance workorders.
        """
        sql = """
            SELECT 
                e.id,
                e.equipment_code,
                e.name,
                e.category,
                e.brand,
                e.quantity AS total_quantity,
                e.operational_quantity,
                (e.quantity - e.operational_quantity) AS in_maintenance_count,
                e.location,
                e.condition_status,
                e.status,
                e.purchase_date,
                e.next_maintenance_date,
                (
                    SELECT COUNT(*) 
                    FROM maintenance_records mr 
                    WHERE mr.equipment_id = e.id AND mr.status IN ('Reported', 'Pending', 'In Progress')
                ) AS active_workorders_count
            FROM equipment e
            ORDER BY e.category, e.name;
        """
        return query_all(sql)

    @staticmethod
    def check_equipment_availability_for_window(equipment_id, start_dt, end_dt, required_units=1):
        """
        Calculate if `required_units` of `equipment_id` are available between `start_dt` and `end_dt`.
        Formula: Operational units - Already allocated units during overlapping window.
        """
        equip = query_one("SELECT * FROM equipment WHERE id = %s", (equipment_id,))
        if not equip:
            return {'available': False, 'reason': 'Equipment does not exist'}

        if equip['status'] == 'Under Maintenance' or equip['operational_quantity'] <= 0:
            return {
                'available': False,
                'reason': f"{equip['name']} is currently under maintenance or out of service."
            }

        # Check overlapping allocations
        overlap_sql = """
            SELECT COALESCE(SUM(allocated_quantity), 0) AS units_in_use
            FROM equipment_allocations
            WHERE equipment_id = %s
              AND status IN ('Reserved', 'Active')
              AND NOT (end_datetime <= %s OR start_datetime >= %s)
        """
        res = query_one(overlap_sql, (equipment_id, start_dt, end_dt))
        in_use = res['units_in_use'] if res else 0

        usable_available = equip['operational_quantity'] - in_use
        is_ok = usable_available >= required_units

        return {
            'available': is_ok,
            'equipment_id': equipment_id,
            'name': equip['name'],
            'operational_total': equip['operational_quantity'],
            'allocated_in_window': in_use,
            'available_in_window': max(0, usable_available),
            'requested_units': required_units,
            'reason': 'Available' if is_ok else f"Only {usable_available} units available during requested time window (needed {required_units})."
        }

    @staticmethod
    def check_class_equipment_conflicts(class_id, session_date, start_time, end_time, expected_attendees):
        """
        Check all equipment requirements for a scheduled class against available inventory.
        """
        start_dt = f"{session_date} {start_time}"
        end_dt = f"{session_date} {end_time}"

        reqs = query_all("""
            SELECT cer.*, e.name AS equipment_name, e.operational_quantity
            FROM class_equipment_requirements cer
            INNER JOIN equipment e ON cer.equipment_id = e.id
            WHERE cer.class_id = %s
        """, (class_id,))

        conflicts = []
        for req in reqs:
            units_needed = (req['units_required_per_member'] * expected_attendees) if req['units_required_per_member'] > 0 else req['total_units_required']
            check = EquipmentService.check_equipment_availability_for_window(req['equipment_id'], start_dt, end_dt, units_needed)
            if not check['available']:
                conflicts.append(check)

        return {
            'has_conflicts': len(conflicts) > 0,
            'conflicts': conflicts
        }

    @staticmethod
    def allocate_equipment_for_schedule(schedule_id, cur=None):
        """
        Allocate equipment for a confirmed class schedule within a transaction.
        """
        def _do_allocate(c):
            c.execute("""
                SELECT cs.*, fc.id AS class_id 
                FROM class_schedules cs
                INNER JOIN fitness_classes fc ON cs.class_id = fc.id
                WHERE cs.id = %s
            """, (schedule_id,))
            sched = c.fetchone()
            if not sched:
                return

            start_dt = f"{sched['session_date']} {sched['start_time']}"
            end_dt = f"{sched['session_date']} {sched['end_time']}"

            c.execute("""
                SELECT cer.*, e.operational_quantity
                FROM class_equipment_requirements cer
                INNER JOIN equipment e ON cer.equipment_id = e.id
                WHERE cer.class_id = %s
            """, (sched['class_id'],))
            reqs = c.fetchall()

            for r in reqs:
                needed = r['units_required_per_member'] * max(1, sched['booked_capacity']) if r['units_required_per_member'] > 0 else r['total_units_required']
                c.execute("""
                    INSERT INTO equipment_allocations (schedule_id, equipment_id, allocated_quantity, start_datetime, end_datetime, status)
                    VALUES (%s, %s, %s, %s, %s, 'Reserved')
                """, (schedule_id, r['equipment_id'], needed, start_dt, end_dt))

        if cur:
            _do_allocate(cur)
        else:
            with transaction() as c:
                _do_allocate(c)
