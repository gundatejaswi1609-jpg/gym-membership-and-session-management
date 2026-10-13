from flask import Blueprint, request, jsonify, session
from database import query_all, query_one, transaction, execute
from services.trainer_service import TrainerService
import datetime

trainers_bp = Blueprint('trainers', __name__)

@trainers_bp.route('', methods=['GET'])
def get_all_trainers():
    sql = """
        SELECT 
            t.*,
            gl.location_name,
            gl.city,
            (SELECT COUNT(*) FROM class_schedules cs WHERE cs.trainer_id = t.id AND cs.session_date >= CURDATE()) AS upcoming_classes_count,
            (SELECT COUNT(*) FROM personal_training_bookings pt WHERE pt.trainer_id = t.id AND pt.booking_date >= CURDATE()) AS upcoming_pt_count
        FROM trainers t
        LEFT JOIN gym_locations gl ON t.location_id = gl.id
        ORDER BY t.experience_years DESC;
    """
    trainers = query_all(sql)
    for t in trainers:
        t['hourly_rate'] = float(t['hourly_rate'])
        t['session_price'] = float(t['session_price'])
        t['specializations'] = query_all(
            "SELECT category, proficiency_level FROM trainer_specializations WHERE trainer_id = %s",
            (t['id'],)
        )
        if t.get('hire_date') and hasattr(t['hire_date'], 'isoformat'):
            t['hire_date'] = t['hire_date'].isoformat()
        if t.get('created_at') and hasattr(t['created_at'], 'isoformat'):
            t['created_at'] = t['created_at'].isoformat()

    return jsonify(trainers)

@trainers_bp.route('/<int:trainer_id>', methods=['GET'])
def get_trainer(trainer_id):
    trainer = TrainerService.get_trainer_profile(trainer_id)
    if not trainer:
        return jsonify({'error': 'Trainer not found'}), 404

    trainer['hourly_rate'] = float(trainer['hourly_rate'])
    trainer['session_price'] = float(trainer['session_price'])
    if trainer.get('hire_date') and hasattr(trainer['hire_date'], 'isoformat'):
        trainer['hire_date'] = trainer['hire_date'].isoformat()
    return jsonify(trainer)

@trainers_bp.route('/<int:trainer_id>/availability', methods=['GET'])
def get_availability(trainer_id):
    slots = TrainerService.get_weekly_availability(trainer_id)
    # Convert timedelta/time objects to string
    for s in slots:
        for k in ['start_time', 'end_time']:
            if k in s and s[k]:
                s[k] = str(s[k])
    return jsonify(slots)

@trainers_bp.route('/<int:trainer_id>/availability', methods=['PUT'])
def update_availability(trainer_id):
    data = request.get_json() or {}
    slots = data.get('slots', [])
    updated = TrainerService.set_weekly_availability(trainer_id, slots)
    for s in updated:
        for k in ['start_time', 'end_time']:
            if k in s and s[k]:
                s[k] = str(s[k])
    return jsonify({'message': 'Availability calendar updated successfully', 'slots': updated})

@trainers_bp.route('/<int:trainer_id>/slots', methods=['GET'])
def get_available_slots(trainer_id):
    target_date = request.args.get('date', datetime.date.today().strftime('%Y-%m-%d'))
    duration = request.args.get('duration', 60, type=int)
    slots = TrainerService.generate_available_pt_slots(trainer_id, target_date, duration)
    return jsonify(slots)

@trainers_bp.route('/<int:trainer_id>/sessions', methods=['GET'])
def get_trainer_sessions(trainer_id):
    """
    Fetch sessions for trainer portal dashboard:
    1. Assigned group classes
    2. 1-on-1 personal training appointments
    """
    date_filter = request.args.get('date', datetime.date.today().strftime('%Y-%m-%d'))

    # Classes
    classes = query_all("""
        SELECT 
            cs.*,
            fc.class_name,
            fc.category,
            fc.difficulty_level,
            r.room_name,
            gl.location_name,
            (SELECT COUNT(*) FROM class_registrations cr WHERE cr.schedule_id = cs.id AND cr.status = 'Confirmed') AS confirmed_attendees_count
        FROM class_schedules cs
        INNER JOIN fitness_classes fc ON cs.class_id = fc.id
        LEFT JOIN rooms r ON cs.room_id = r.id
        LEFT JOIN gym_locations gl ON r.location_id = gl.id
        WHERE cs.trainer_id = %s AND cs.session_date >= %s
        ORDER BY cs.session_date ASC, cs.start_time ASC
    """, (trainer_id, date_filter))

    # PT Appointments
    pt_sessions = query_all("""
        SELECT 
            pt.*,
            m.full_name AS member_name,
            m.member_code,
            m.phone AS member_phone,
            m.email AS member_email
        FROM personal_training_bookings pt
        INNER JOIN members m ON pt.member_id = m.id
        WHERE pt.trainer_id = %s AND pt.booking_date >= %s
        ORDER BY pt.booking_date ASC, pt.start_time ASC
    """, (trainer_id, date_filter))

    for c in classes:
        for k in ['session_date', 'created_at', 'start_time', 'end_time']:
            if k in c and c[k]:
                c[k] = str(c[k])

    for pt in pt_sessions:
        for k in ['booking_date', 'created_at', 'start_time', 'end_time']:
            if k in pt and pt[k]:
                pt[k] = str(pt[k])
        pt['price'] = float(pt['price'])

    return jsonify({
        'classes': classes,
        'personal_training': pt_sessions
    })

@trainers_bp.route('/<int:trainer_id>/attendance', methods=['POST'])
def record_session_attendance(trainer_id):
    """Record member attendance and post-session notes for class or PT."""
    data = request.get_json() or {}
    reg_id = data.get('registration_id')
    pt_id = data.get('pt_booking_id')
    member_id = data.get('member_id')
    status = data.get('attendance_status', 'Present')
    remarks = data.get('remarks', '')

    with transaction() as cur:
        cur.execute("""
            INSERT INTO attendance (registration_id, pt_booking_id, member_id, check_in_time, attendance_status, remarks, recorded_by)
            VALUES (%s, %s, %s, NOW(), %s, %s, %s)
        """, (reg_id, pt_id, member_id, status, remarks, f"TRAINER_{trainer_id}"))

        if reg_id:
            cur.execute("UPDATE class_registrations SET status = 'Attended' WHERE id = %s", (reg_id,))
        if pt_id:
            cur.execute("UPDATE personal_training_bookings SET status = 'Completed' WHERE id = %s", (pt_id,))

    return jsonify({'success': True, 'message': 'Attendance recorded successfully.'})
