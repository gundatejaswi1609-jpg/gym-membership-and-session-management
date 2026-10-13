from flask import Blueprint, request, jsonify
from database import query_all, query_one, execute
import json

members_bp = Blueprint('members', __name__)

@members_bp.route('', methods=['GET'])
def get_all_members():
    status = request.args.get('status')
    search = request.args.get('q')

    sql = """
        SELECT 
            m.*,
            p.plan_name AS current_plan_name,
            s.end_date AS membership_expiry,
            s.status AS subscription_status,
            DATEDIFF(s.end_date, CURDATE()) AS days_remaining
        FROM members m
        LEFT JOIN subscriptions s ON m.id = s.member_id AND s.status = 'Active' AND s.end_date >= CURDATE()
        LEFT JOIN membership_plans p ON s.plan_id = p.id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND m.status = %s"
        params.append(status)
    if search:
        sql += " AND (m.full_name LIKE %s OR m.email LIKE %s OR m.member_code LIKE %s OR m.phone LIKE %s)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    sql += " ORDER BY m.id ASC"
    members = query_all(sql, params)

    for m in members:
        for k in ['registration_date', 'dob', 'created_at', 'membership_expiry']:
            if k in m and m[k] and hasattr(m[k], 'isoformat'):
                m[k] = m[k].isoformat()

    return jsonify(members)

@members_bp.route('/<int:member_id>', methods=['GET'])
def get_member(member_id):
    sql = """
        SELECT m.*, u.username 
        FROM members m 
        LEFT JOIN users u ON m.user_id = u.id 
        WHERE m.id = %s
    """
    member = query_one(sql, (member_id,))
    if not member:
        return jsonify({'error': 'Member not found'}), 404

    # Fetch emergency contacts
    contacts = query_all("SELECT * FROM emergency_contacts WHERE member_id = %s", (member_id,))
    member['emergency_contacts'] = contacts

    # Fetch current subscription
    sub = query_one("""
        SELECT s.*, p.plan_name, p.plan_tier, p.gym_access, p.benefits, DATEDIFF(s.end_date, CURDATE()) AS days_left
        FROM subscriptions s
        INNER JOIN membership_plans p ON s.plan_id = p.id
        WHERE s.member_id = %s AND s.status = 'Active' AND s.end_date >= CURDATE()
        ORDER BY s.end_date DESC LIMIT 1
    """, (member_id,))
    member['active_subscription'] = sub

    for k in ['registration_date', 'dob', 'created_at']:
        if k in member and member[k] and hasattr(member[k], 'isoformat'):
            member[k] = member[k].isoformat()

    for num_col in ['weight_kg', 'height_cm', 'bmi']:
        if num_col in member and member[num_col] is not None:
            member[num_col] = float(member[num_col])

    return jsonify(member)

@members_bp.route('/<int:member_id>/profile', methods=['PUT'])
def update_member_profile(member_id):
    """
    Updates user profile details (name, gender, age, weight, height)
    and automatically recalculates BMI dynamically.
    """
    from database import transaction
    data = request.get_json() or {}
    full_name = data.get('full_name')
    gender = data.get('gender')
    age = data.get('age')
    weight_kg = data.get('weight_kg')
    height_cm = data.get('height_cm')
    phone = data.get('phone')
    avatar_url = data.get('avatar_url')

    try:
        weight_kg = float(weight_kg) if weight_kg is not None else 70.0
        height_cm = float(height_cm) if height_cm is not None else 175.0
        age = int(age) if age is not None else 25
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid numeric values for weight, height, or age.'}), 400

    if weight_kg <= 0 or height_cm <= 0:
        return jsonify({'error': 'Weight and height must be positive values.'}), 400

    # Automatic calculation of BMI: weight / (height / 100)^2
    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m ** 2), 2)

    with transaction() as cur:
        cur.execute("""
            UPDATE members 
            SET full_name = COALESCE(%s, full_name),
                gender = COALESCE(%s, gender),
                age = %s,
                weight_kg = %s,
                height_cm = %s,
                bmi = %s,
                phone = COALESCE(%s, phone),
                avatar_url = COALESCE(%s, avatar_url)
            WHERE id = %s
        """, (full_name, gender, age, weight_kg, height_cm, bmi, phone, avatar_url, member_id))

        cur.execute("SELECT user_id FROM members WHERE id = %s", (member_id,))
        m_row = cur.fetchone()
        if m_row and m_row['user_id']:
            cur.execute("""
                UPDATE users 
                SET full_name = COALESCE(%s, full_name),
                    avatar_url = COALESCE(%s, avatar_url)
                WHERE id = %s
            """, (full_name, avatar_url, m_row['user_id']))

        # Log updated assessment entry for historical trend
        cur.execute("""
            INSERT INTO fitness_assessments (member_id, trainer_id, assessment_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, systolic_bp, diastolic_bp, target_goals, notes)
            VALUES (%s, 1, CURDATE(), %s, %s, %s, 18.0, %s, 120, 80, 'Updated Profile Biometrics', 'Automatic BMI recalculation via member profile')
        """, (member_id, weight_kg, height_cm, bmi, round(weight_kg * 0.45, 1)))

    return jsonify({
        'success': True,
        'message': 'Profile and biometrics updated successfully with automatic BMI calculation.',
        'profile': {
            'member_id': member_id,
            'full_name': full_name,
            'gender': gender,
            'age': age,
            'weight_kg': weight_kg,
            'height_cm': height_cm,
            'bmi': bmi
        }
    })

@members_bp.route('/me', methods=['GET'])
def get_my_profile():
    # In academic preview, default to member #1 (Tejaswi) if not in session
    member_id = request.args.get('member_id', 1, type=int)
    return get_member(member_id)

@members_bp.route('/<int:member_id>/progress', methods=['GET'])
def get_member_progress(member_id):
    assessments = query_all("""
        SELECT fa.*, t.full_name AS trainer_name
        FROM fitness_assessments fa
        LEFT JOIN trainers t ON fa.trainer_id = t.id
        WHERE fa.member_id = %s
        ORDER BY fa.assessment_date ASC
    """, (member_id,))

    attendance_stats = query_all("""
        SELECT 
            fc.category, 
            COUNT(a.id) AS classes_attended
        FROM attendance a
        INNER JOIN class_registrations cr ON a.registration_id = cr.id
        INNER JOIN class_schedules cs ON cr.schedule_id = cs.id
        INNER JOIN fitness_classes fc ON cs.class_id = fc.id
        WHERE a.member_id = %s AND a.attendance_status = 'Present'
        GROUP BY fc.category
    """, (member_id,))

    for a in assessments:
        for k in ['assessment_date', 'created_at']:
            if k in a and a[k] and hasattr(a[k], 'isoformat'):
                a[k] = a[k].isoformat()
        for k in ['weight_kg', 'height_cm', 'bmi', 'body_fat_percentage', 'muscle_mass_kg']:
            if k in a and a[k] is not None:
                a[k] = float(a[k])

    return jsonify({
        'member_id': member_id,
        'assessments': assessments,
        'category_breakdown': attendance_stats,
        'total_workouts_completed': sum(c['classes_attended'] for c in attendance_stats)
    })

@members_bp.route('/<int:member_id>/programs', methods=['GET'])
def get_member_programs(member_id):
    programs = query_all("""
        SELECT 
            pa.id AS assignment_id,
            pa.assigned_date,
            pa.status,
            pa.completion_percentage,
            pa.notes AS trainer_notes,
            wp.id AS program_id,
            wp.title,
            wp.category,
            wp.difficulty_level,
            wp.duration_weeks,
            wp.description,
            wp.exercises_json,
            t.full_name AS trainer_name
        FROM program_assignments pa
        INNER JOIN workout_programs wp ON pa.program_id = wp.id
        LEFT JOIN trainers t ON pa.trainer_id = t.id
        WHERE pa.member_id = %s
        ORDER BY pa.assigned_date DESC
    """, (member_id,))

    for p in programs:
        if p.get('exercises_json'):
            try:
                p['exercises'] = json.loads(p['exercises_json'])
            except Exception:
                p['exercises'] = []
        if p.get('assigned_date') and hasattr(p['assigned_date'], 'isoformat'):
            p['assigned_date'] = p['assigned_date'].isoformat()

    return jsonify(programs)
