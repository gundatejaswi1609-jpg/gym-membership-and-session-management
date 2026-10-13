from flask import Blueprint, request, jsonify
from database import query_all, query_one
import datetime

classes_bp = Blueprint('classes', __name__)

@classes_bp.route('', methods=['GET'])
def get_all_classes():
    category = request.args.get('category')
    difficulty = request.args.get('difficulty')

    sql = """
        SELECT 
            fc.*,
            (SELECT COUNT(*) FROM class_schedules cs WHERE cs.class_id = fc.id AND cs.session_date >= CURDATE()) AS scheduled_sessions_count
        FROM fitness_classes fc
        WHERE 1=1
    """
    params = []
    if category:
        sql += " AND fc.category = %s"
        params.append(category)
    if difficulty:
        sql += " AND fc.difficulty_level = %s"
        params.append(difficulty)

    sql += " ORDER BY fc.id ASC"
    classes = query_all(sql, params)
    for c in classes:
        c['price'] = float(c['price'])
        c['membership_inclusive'] = bool(c['membership_inclusive'])
        if c.get('created_at') and hasattr(c['created_at'], 'isoformat'):
            c['created_at'] = c['created_at'].isoformat()

    return jsonify(classes)

@classes_bp.route('/<int:class_id>', methods=['GET'])
def get_class_details(class_id):
    fc = query_one("SELECT * FROM fitness_classes WHERE id = %s", (class_id,))
    if not fc:
        return jsonify({'error': 'Class not found'}), 404

    fc['price'] = float(fc['price'])
    fc['membership_inclusive'] = bool(fc['membership_inclusive'])

    # Required equipment
    reqs = query_all("""
        SELECT cer.*, e.name AS equipment_name, e.category AS equipment_category, e.operational_quantity
        FROM class_equipment_requirements cer
        INNER JOIN equipment e ON cer.equipment_id = e.id
        WHERE cer.class_id = %s
    """, (class_id,))
    fc['required_equipment'] = reqs

    # Trainers who teach this class
    trainers = query_all("""
        SELECT DISTINCT t.id, t.full_name, t.specialization, t.image_url
        FROM class_schedules cs
        INNER JOIN trainers t ON cs.trainer_id = t.id
        WHERE cs.class_id = %s
    """, (class_id,))
    fc['trainers'] = trainers

    # Cancellation policy
    fc['cancellation_policy'] = "Free cancellation up to 2 hours before session start time. Late cancellations or no-shows forfeit the session."

    return jsonify(fc)

@classes_bp.route('/schedules', methods=['GET'])
def get_schedules():
    """
    Get scheduled sessions with comprehensive filters:
    category, date, time, trainer_id, difficulty, location_id, available_only
    """
    category = request.args.get('category')
    date_filter = request.args.get('date', datetime.date.today().strftime('%Y-%m-%d'))
    trainer_id = request.args.get('trainer_id')
    difficulty = request.args.get('difficulty')
    location_id = request.args.get('location_id')
    available_only = request.args.get('available_only', 'false').lower() == 'true'

    sql = """
        SELECT 
            cs.*,
            fc.class_name,
            fc.category,
            fc.difficulty_level,
            fc.duration_minutes,
            fc.image_url,
            fc.price,
            fc.membership_inclusive,
            t.full_name AS trainer_name,
            t.image_url AS trainer_image,
            t.specialization AS trainer_specialization,
            r.room_name,
            gl.id AS location_id,
            gl.location_name,
            gl.city,
            (cs.max_capacity - cs.booked_capacity) AS seats_remaining,
            ROUND((cs.booked_capacity / cs.max_capacity) * 100, 1) AS occupancy_rate
        FROM class_schedules cs
        INNER JOIN fitness_classes fc ON cs.class_id = fc.id
        INNER JOIN trainers t ON cs.trainer_id = t.id
        LEFT JOIN rooms r ON cs.room_id = r.id
        LEFT JOIN gym_locations gl ON r.location_id = gl.id
        WHERE cs.session_date >= %s AND cs.status != 'Cancelled'
    """
    params = [date_filter]

    if category:
        sql += " AND fc.category = %s"
        params.append(category)
    if trainer_id:
        sql += " AND cs.trainer_id = %s"
        params.append(trainer_id)
    if difficulty:
        sql += " AND fc.difficulty_level = %s"
        params.append(difficulty)
    if location_id:
        sql += " AND gl.id = %s"
        params.append(location_id)
    if available_only:
        sql += " AND cs.booked_capacity < cs.max_capacity"

    sql += " ORDER BY cs.session_date ASC, cs.start_time ASC"

    schedules = query_all(sql, params)
    for s in schedules:
        for k in ['session_date', 'start_time', 'end_time', 'created_at']:
            if k in s and s[k]:
                s[k] = str(s[k])
        s['price'] = float(s['price'])
        s['membership_inclusive'] = bool(s['membership_inclusive'])

    return jsonify(schedules)

@classes_bp.route('/categories', methods=['GET'])
def get_categories():
    cats = query_all("""
        SELECT 
            fc.category,
            COUNT(fc.id) AS classes_count,
            MIN(fc.image_url) AS sample_image
        FROM fitness_classes fc
        GROUP BY fc.category
        ORDER BY classes_count DESC;
    """)
    return jsonify(cats)
