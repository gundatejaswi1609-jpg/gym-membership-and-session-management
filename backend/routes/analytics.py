from flask import Blueprint, jsonify
from database import query_one, query_all

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    # Active members
    m_stat = query_one("SELECT COUNT(*) AS active_count FROM members WHERE status = 'Active'")
    
    # Active subscriptions
    s_stat = query_one("SELECT COUNT(*) AS active_subs FROM subscriptions WHERE status = 'Active' AND end_date >= CURDATE()")
    
    # Revenue this month
    r_stat = query_one("""
        SELECT COALESCE(SUM(amount), 0.00) AS month_revenue 
        FROM payment_orders 
        WHERE status = 'SUCCESS' AND created_at >= DATE_FORMAT(CURDATE(), '%%Y-%%m-01')
    """)
    
    # Total revenue lifetime
    life_r = query_one("SELECT COALESCE(SUM(amount), 0.00) AS total_revenue FROM payment_orders WHERE status = 'SUCCESS'")

    # Classes today
    c_today = query_one("SELECT COUNT(*) AS classes_today FROM class_schedules WHERE session_date = CURDATE() AND status != 'Cancelled'")

    # Equipment health
    eq_stat = query_one("""
        SELECT 
            COUNT(*) AS total_assets,
            SUM(CASE WHEN status = 'Operational' THEN 1 ELSE 0 END) AS operational_assets,
            SUM(CASE WHEN status = 'Under Maintenance' THEN 1 ELSE 0 END) AS in_maintenance_assets
        FROM equipment
    """)

    # Active trainers
    t_stat = query_one("SELECT COUNT(*) AS total_trainers FROM trainers WHERE availability_status = 'Available'")

    return jsonify({
        'active_members': m_stat['active_count'] if m_stat else 0,
        'active_subscriptions': s_stat['active_subs'] if s_stat else 0,
        'month_revenue': float(r_stat['month_revenue']) if r_stat else 0.0,
        'lifetime_revenue': float(life_r['total_revenue']) if life_r else 0.0,
        'classes_today': c_today['classes_today'] if c_today else 0,
        'equipment_total': eq_stat['total_assets'] if eq_stat else 0,
        'equipment_operational': eq_stat['operational_assets'] if eq_stat else 0,
        'equipment_maintenance': eq_stat['in_maintenance_assets'] if eq_stat else 0,
        'active_trainers': t_stat['total_trainers'] if t_stat else 0
    })

@analytics_bp.route('/occupancy-trend', methods=['GET'])
def get_occupancy_trend():
    """Daily class booking occupancy percentage for chart rendering."""
    trend = query_all("""
        SELECT 
            session_date,
            COUNT(id) AS total_classes,
            SUM(max_capacity) AS total_capacity,
            SUM(booked_capacity) AS total_booked,
            ROUND((SUM(booked_capacity) / NULLIF(SUM(max_capacity), 0)) * 100, 1) AS avg_occupancy_rate
        FROM class_schedules
        WHERE session_date >= CURDATE()
        GROUP BY session_date
        ORDER BY session_date ASC
        LIMIT 10;
    """)
    for t in trend:
        t['session_date'] = str(t['session_date'])
    return jsonify(trend)

@analytics_bp.route('/category-distribution', methods=['GET'])
def get_category_distribution():
    dist = query_all("""
        SELECT 
            fc.category,
            COUNT(cr.id) AS booking_volume
        FROM fitness_classes fc
        LEFT JOIN class_schedules cs ON fc.id = cs.class_id
        LEFT JOIN class_registrations cr ON cs.id = cr.schedule_id AND cr.status = 'Confirmed'
        GROUP BY fc.category
        ORDER BY booking_volume DESC;
    """)
    return jsonify(dist)
