from flask import Blueprint, request, jsonify
from database import query_all, query_one, execute
from services.equipment_service import EquipmentService

equipment_bp = Blueprint('equipment', __name__)

@equipment_bp.route('', methods=['GET'])
def get_equipment_list():
    category = request.args.get('category')
    status = request.args.get('status')

    sql = """
        SELECT 
            e.*,
            (SELECT COUNT(*) FROM maintenance_records mr WHERE mr.equipment_id = e.id AND mr.status IN ('Reported', 'Pending', 'In Progress')) AS active_maintenance_count
        FROM equipment e
        WHERE 1=1
    """
    params = []
    if category:
        sql += " AND e.category = %s"
        params.append(category)
    if status:
        sql += " AND e.status = %s"
        params.append(status)

    sql += " ORDER BY e.category, e.name"
    equip = query_all(sql, params)
    for eq in equip:
        for k in ['purchase_date', 'next_maintenance_date', 'created_at']:
            if k in eq and eq[k]:
                eq[k] = str(eq[k])
    return jsonify(equip)

@equipment_bp.route('/realtime', methods=['GET'])
def get_realtime_inventory():
    data = EquipmentService.get_realtime_inventory()
    for eq in data:
        for k in ['purchase_date', 'next_maintenance_date']:
            if k in eq and eq[k]:
                eq[k] = str(eq[k])
    return jsonify(data)

@equipment_bp.route('/check-availability', methods=['POST'])
def check_availability():
    """
    Time-based resource availability check.
    Takes equipment_id, start_datetime, end_datetime, required_units.
    """
    data = request.get_json() or {}
    equipment_id = data.get('equipment_id')
    start_dt = data.get('start_datetime')
    end_dt = data.get('end_datetime')
    units = int(data.get('required_units', 1))

    if not all([equipment_id, start_dt, end_dt]):
        return jsonify({'error': 'equipment_id, start_datetime, and end_datetime are required.'}), 400

    result = EquipmentService.check_equipment_availability_for_window(equipment_id, start_dt, end_dt, units)
    return jsonify(result)
