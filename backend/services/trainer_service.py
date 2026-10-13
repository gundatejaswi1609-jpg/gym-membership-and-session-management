import datetime
from database import transaction, query_all, query_one

class TrainerService:
    @staticmethod
    def get_trainer_profile(trainer_id):
        """Fetch trainer profile with specializations and assigned location."""
        sql = """
            SELECT 
                t.*,
                gl.location_name,
                gl.city,
                u.username,
                (SELECT COUNT(*) FROM class_schedules cs WHERE cs.trainer_id = t.id AND cs.status = 'Completed') AS total_classes_completed,
                (SELECT COUNT(*) FROM personal_training_bookings pt WHERE pt.trainer_id = t.id AND pt.status = 'Completed') AS total_pt_completed
            FROM trainers t
            LEFT JOIN gym_locations gl ON t.location_id = gl.id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = %s;
        """
        trainer = query_one(sql, (trainer_id,))
        if trainer:
            trainer['specializations'] = query_all(
                "SELECT category, proficiency_level FROM trainer_specializations WHERE trainer_id = %s",
                (trainer_id,)
            )
        return trainer

    @staticmethod
    def get_weekly_availability(trainer_id):
        """Get recurring weekly schedule slots for a trainer."""
        sql = """
            SELECT id, day_of_week, start_time, end_time, slot_type, is_active
            FROM trainer_availability
            WHERE trainer_id = %s AND is_active = TRUE
            ORDER BY day_of_week, start_time;
        """
        return query_all(sql, (trainer_id,))

    @staticmethod
    def set_weekly_availability(trainer_id, slots):
        """
        Replace or update weekly recurring availability slots.
        slots: list of dicts: [{'day_of_week': 1, 'start_time': '08:00', 'end_time': '12:00', 'slot_type': 'any'}]
        """
        with transaction() as cur:
            cur.execute("DELETE FROM trainer_availability WHERE trainer_id = %s", (trainer_id,))
            for s in slots:
                cur.execute("""
                    INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time, slot_type, is_active)
                    VALUES (%s, %s, %s, %s, %s, TRUE)
                """, (trainer_id, s['day_of_week'], s['start_time'], s['end_time'], s.get('slot_type', 'any')))
        return TrainerService.get_weekly_availability(trainer_id)

    @staticmethod
    def generate_available_pt_slots(trainer_id, target_date_str, session_duration_minutes=60):
        """
        Dynamically compute available, conflict-free personal training slots for a specific date.
        Considers:
        1. Trainer's configured availability on day_of_week
        2. Blocked leaves in trainer_unavailability
        3. Scheduled classes the trainer is teaching on target_date
        4. Existing confirmed personal training bookings
        5. Active temporary booking holds
        """
        target_date = datetime.datetime.strptime(target_date_str, '%Y-%m-%d').date()
        # Python weekday: 0=Mon..6=Sun. Schema convention: 0=Sun..6=Sat
        py_weekday = target_date.weekday()
        db_day_of_week = (py_weekday + 1) % 7 # Mon(0) -> 1, Sun(6) -> 0

        # Check trainer leave
        leave_check = query_one("""
            SELECT * FROM trainer_unavailability 
            WHERE trainer_id = %s 
              AND status = 'approved'
              AND DATE(start_datetime) <= %s 
              AND DATE(end_datetime) >= %s
        """, (trainer_id, target_date_str, target_date_str))
        if leave_check:
            return [] # On approved leave

        # Get day availability windows
        windows = query_all("""
            SELECT start_time, end_time, slot_type 
            FROM trainer_availability
            WHERE trainer_id = %s AND day_of_week = %s AND is_active = TRUE
              AND slot_type IN ('personal_training', 'any')
        """, (trainer_id, db_day_of_week))

        if not windows:
            return []

        # Get existing class schedules for trainer on this date
        classes = query_all("""
            SELECT start_time, end_time 
            FROM class_schedules 
            WHERE trainer_id = %s AND session_date = %s AND status != 'Cancelled'
        """, (trainer_id, target_date_str))

        # Get existing confirmed PT bookings
        pt_bookings = query_all("""
            SELECT start_time, end_time 
            FROM personal_training_bookings 
            WHERE trainer_id = %s AND booking_date = %s AND status IN ('Confirmed', 'Pending')
        """, (trainer_id, target_date_str))

        # Get active holds
        holds = query_all("""
            SELECT start_time, end_time 
            FROM booking_holds 
            WHERE trainer_id = %s AND booking_date = %s AND status = 'active' AND expires_at > NOW()
        """, (trainer_id, target_date_str))

        # Combine busy ranges
        busy_ranges = []
        for c in classes:
            busy_ranges.append((c['start_time'], c['end_time']))
        for b in pt_bookings:
            busy_ranges.append((b['start_time'], b['end_time']))
        for h in holds:
            if h.get('start_time') and h.get('end_time'):
                busy_ranges.append((h['start_time'], h['end_time']))

        # Convert TIME / timedelta to seconds
        def to_seconds(t):
            if isinstance(t, datetime.timedelta):
                return int(t.total_seconds())
            if isinstance(t, str):
                parts = [int(p) for p in t.split(':')]
                return parts[0] * 3600 + parts[1] * 60 + (parts[2] if len(parts) > 2 else 0)
            if isinstance(t, datetime.time):
                return t.hour * 3600 + t.minute * 60 + t.second
            return 0

        def format_time_str(secs):
            h = secs // 3600
            m = (secs % 3600) // 60
            return f"{h:02d}:{m:02d}:00"

        busy_sec_ranges = [(to_seconds(s), to_seconds(e)) for s, e in busy_ranges]

        duration_sec = session_duration_minutes * 60
        buffer_sec = 15 * 60 # 15-minute buffer between sessions

        available_slots = []
        for win in windows:
            w_start = to_seconds(win['start_time'])
            w_end = to_seconds(win['end_time'])

            curr_slot_start = w_start
            while curr_slot_start + duration_sec <= w_end:
                curr_slot_end = curr_slot_start + duration_sec

                # Check conflict with any busy range
                conflict = False
                for b_start, b_end in busy_sec_ranges:
                    # Overlap condition: start < b_end and end > b_start
                    if curr_slot_start < b_end and curr_slot_end > b_start:
                        conflict = True
                        break

                if not conflict:
                    available_slots.append({
                        'trainer_id': trainer_id,
                        'booking_date': target_date_str,
                        'start_time': format_time_str(curr_slot_start),
                        'end_time': format_time_str(curr_slot_end),
                        'duration_minutes': session_duration_minutes,
                        'formatted_label': f"{format_time_str(curr_slot_start)[:5]} - {format_time_str(curr_slot_end)[:5]}"
                    })

                curr_slot_start += duration_sec + buffer_sec

        return available_slots
