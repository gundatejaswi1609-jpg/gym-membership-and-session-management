from flask import Blueprint, request, jsonify
from database import query_all, query_one, transaction

assessments_bp = Blueprint('assessments', __name__)

@assessments_bp.route('', methods=['GET'])
def get_assessments():
    assessments = query_all("""
        SELECT 
            fa.*,
            m.full_name AS member_name,
            m.member_code,
            t.full_name AS trainer_name
        FROM fitness_assessments fa
        INNER JOIN members m ON fa.member_id = m.id
        LEFT JOIN trainers t ON fa.trainer_id = t.id
        ORDER BY fa.assessment_date DESC;
    """)
    for a in assessments:
        for k in ['assessment_date', 'created_at']:
            if k in a and a[k]:
                a[k] = str(a[k])
        for k in ['weight_kg', 'height_cm', 'bmi', 'body_fat_percentage', 'muscle_mass_kg']:
            if k in a and a[k] is not None:
                a[k] = float(a[k])
    return jsonify(assessments)

@assessments_bp.route('', methods=['POST'])
def add_assessment():
    data = request.get_json() or {}
    member_id = data.get('member_id')
    trainer_id = data.get('trainer_id', 1)
    weight = float(data.get('weight_kg', 70))
    height = float(data.get('height_cm', 175))
    fat = float(data.get('body_fat_percentage', 18))
    muscle = float(data.get('muscle_mass_kg', 35))
    sys_bp = int(data.get('systolic_bp', 120))
    dia_bp = int(data.get('diastolic_bp', 80))
    goals = data.get('target_goals', 'General fitness and strength')
    notes = data.get('notes', '')

    # Compute BMI: weight / (height_m ^ 2)
    h_m = height / 100.0
    bmi = round(weight / (h_m * h_m), 2) if h_m > 0 else 22.0

    with transaction() as cur:
        cur.execute("""
            INSERT INTO fitness_assessments (member_id, trainer_id, assessment_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, systolic_bp, diastolic_bp, target_goals, notes)
            VALUES (%s, %s, CURDATE(), %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (member_id, trainer_id, weight, height, bmi, fat, muscle, sys_bp, dia_bp, goals, notes))
        ass_id = cur.lastrowid

    return jsonify({'success': True, 'assessment_id': ass_id, 'bmi': bmi, 'message': 'Fitness assessment recorded.'})
