from flask import Blueprint, request, jsonify
from database import query_all, query_one, transaction, execute

maintenance_bp = Blueprint('maintenance', __name__)

@maintenance_bp.route('', methods=['GET'])
def get_maintenance_records():
    status = request.args.get('status')
    sql = """
        SELECT 
            mr.*,
            e.equipment_code,
            e.name AS equipment_name,
            e.category AS equipment_category,
            e.location AS equipment_location
        FROM maintenance_records mr
        INNER JOIN equipment e ON mr.equipment_id = e.id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND mr.status = %s"
        params.append(status)

    sql += " ORDER BY mr.reported_date DESC"
    records = query_all(sql, params)
    for r in records:
        r['cost'] = float(r['cost'])
        for k in ['reported_date', 'completion_date', 'next_maintenance_date', 'created_at']:
            if k in r and r[k]:
                r[k] = str(r[k])
    return jsonify(records)

@maintenance_bp.route('', methods=['POST'])
def create_maintenance_record():
    """Create a new workorder and update equipment status."""
    data = request.get_json() or {}
    equipment_id = data.get('equipment_id')
    m_type = data.get('maintenance_type', 'Routine Inspection')
    description = data.get('description', '')
    cost = float(data.get('cost', 0.00))
    technician = data.get('technician', 'Apex Service Tech')
    reported_date = data.get('reported_date', str(datetime.date.today()))

    with transaction() as cur:
        cur.execute("""
            INSERT INTO maintenance_records (equipment_id, maintenance_type, description, cost, technician, reported_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'In Progress')
        """, (equipment_id, m_type, description, cost, technician, reported_date))
        record_id = cur.lastrowid

        # Decrement operational quantity by 1 for the unit under repair
        cur.execute("""
            UPDATE equipment 
            SET operational_quantity = GREATEST(0, operational_quantity - 1),
                status = CASE WHEN operational_quantity <= 1 THEN 'Under Maintenance' ELSE status END
            WHERE id = %s
        """, (equipment_id,))

    return jsonify({'success': True, 'record_id': record_id, 'message': 'Maintenance workorder created.'})

@maintenance_bp.route('/<int:record_id>/status', methods=['PUT'])
def update_maintenance_status(record_id):
    data = request.get_json() or {}
    new_status = data.get('status', 'Completed')

    with transaction() as cur:
        cur.execute("SELECT * FROM maintenance_records WHERE id = %s", (record_id,))
        rec = cur.fetchone()
        if not rec:
            return jsonify({'error': 'Record not found'}), 404

        cur.execute("UPDATE maintenance_records SET status = %s WHERE id = %s", (new_status, record_id))

        if new_status == 'Completed':
            # Restore operational quantity
            cur.execute("""
                UPDATE equipment 
                SET operational_quantity = LEAST(quantity, operational_quantity + 1),
                    status = 'Operational'
                WHERE id = %s
            """, (rec['equipment_id'],))

    return jsonify({'success': True, 'message': f'Workorder updated to {new_status}.'})
