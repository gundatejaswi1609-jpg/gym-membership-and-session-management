-- ==============================================================================
-- DATABASE VIEWS FOR APEXFIT / CULT FITNESS DBMS
-- ==============================================================================

USE gym_db;

-- 1. Active Member Subscriptions View
CREATE OR REPLACE VIEW v_active_member_subscriptions AS
SELECT 
    m.id AS member_id,
    m.member_code,
    m.full_name,
    m.email,
    m.phone,
    p.plan_name,
    p.plan_tier,
    s.start_date,
    s.end_date,
    s.agreed_price,
    DATEDIFF(s.end_date, CURDATE()) AS days_remaining
FROM members m
INNER JOIN subscriptions s ON m.id = s.member_id
INNER JOIN membership_plans p ON s.plan_id = p.id
WHERE s.status = 'Active' AND s.end_date >= CURDATE();

-- 2. Subscriptions Expiring Soon (Retention Analysis)
CREATE OR REPLACE VIEW v_membership_expiry_report AS
SELECT 
    m.id AS member_id,
    m.member_code,
    m.full_name,
    m.phone,
    m.email,
    p.plan_name,
    s.end_date,
    DATEDIFF(s.end_date, CURDATE()) AS days_left,
    CASE 
        WHEN DATEDIFF(s.end_date, CURDATE()) <= 7 THEN 'CRITICAL (Next 7 Days)'
        WHEN DATEDIFF(s.end_date, CURDATE()) <= 30 THEN 'UPCOMING (Next 30 Days)'
        ELSE 'NORMAL'
    END AS urgency_level
FROM subscriptions s
INNER JOIN members m ON s.member_id = m.id
INNER JOIN membership_plans p ON s.plan_id = p.id
WHERE s.status = 'Active' 
  AND s.end_date >= CURDATE()
  AND s.end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY);

-- 3. Class Capacity and Occupancy Rates
CREATE OR REPLACE VIEW v_class_occupancy_rates AS
SELECT 
    cs.id AS schedule_id,
    fc.class_name,
    fc.category,
    t.full_name AS trainer_name,
    r.room_name,
    cs.session_date,
    cs.start_time,
    cs.end_time,
    cs.max_capacity,
    COUNT(cr.id) AS confirmed_bookings,
    ROUND((COUNT(cr.id) / cs.max_capacity) * 100, 1) AS occupancy_rate,
    (cs.max_capacity - COUNT(cr.id)) AS seats_remaining
FROM class_schedules cs
INNER JOIN fitness_classes fc ON cs.class_id = fc.id
INNER JOIN trainers t ON cs.trainer_id = t.id
LEFT JOIN rooms r ON cs.room_id = r.id
LEFT JOIN class_registrations cr ON cs.id = cr.schedule_id AND cr.status = 'Confirmed'
GROUP BY cs.id, fc.class_name, fc.category, t.full_name, r.room_name, cs.session_date, cs.start_time, cs.end_time, cs.max_capacity;

-- 4. Trainer Workload and Performance Summary
CREATE OR REPLACE VIEW v_trainer_performance_summary AS
SELECT 
    t.id AS trainer_id,
    t.trainer_code,
    t.full_name AS trainer_name,
    t.specialization,
    t.experience_years,
    COUNT(DISTINCT cs.id) AS total_classes_scheduled,
    COUNT(DISTINCT cr.id) AS total_class_clients_served,
    COUNT(DISTINCT pt.id) AS total_pt_sessions,
    COALESCE(SUM(pt.price), 0.00) AS pt_gross_revenue
FROM trainers t
LEFT JOIN class_schedules cs ON t.id = cs.trainer_id
LEFT JOIN class_registrations cr ON cs.id = cr.schedule_id AND cr.status = 'Confirmed'
LEFT JOIN personal_training_bookings pt ON t.id = pt.trainer_id AND pt.status IN ('Confirmed', 'Completed')
GROUP BY t.id, t.trainer_code, t.full_name, t.specialization, t.experience_years;

-- 5. Equipment Maintenance and Downtime Status
CREATE OR REPLACE VIEW v_equipment_maintenance_status AS
SELECT 
    e.id AS equipment_id,
    e.equipment_code,
    e.name AS equipment_name,
    e.category,
    e.quantity,
    e.operational_quantity,
    e.status AS operational_status,
    COUNT(m.id) AS total_workorders,
    COALESCE(SUM(m.cost), 0.00) AS total_maintenance_spend,
    MAX(m.reported_date) AS latest_service_date
FROM equipment e
LEFT JOIN maintenance_records m ON e.id = m.equipment_id
GROUP BY e.id, e.equipment_code, e.name, e.category, e.quantity, e.operational_quantity, e.status;

-- 6. Monthly Revenue Summary
CREATE OR REPLACE VIEW v_monthly_revenue_summary AS
SELECT 
    DATE_FORMAT(po.created_at, '%Y-%m') AS revenue_month,
    po.item_type,
    COUNT(po.id) AS total_transactions,
    SUM(po.amount) AS gross_revenue
FROM payment_orders po
WHERE po.status = 'SUCCESS'
GROUP BY DATE_FORMAT(po.created_at, '%Y-%m'), po.item_type;

-- 7. Real-Time Equipment Availability Overview
CREATE OR REPLACE VIEW v_equipment_realtime_availability AS
SELECT 
    e.id AS equipment_id,
    e.equipment_code,
    e.name,
    e.category,
    e.quantity AS total_units,
    e.operational_quantity AS operational_units,
    (e.quantity - e.operational_quantity) AS under_repair_units,
    e.location,
    e.condition_status,
    e.status
FROM equipment e;
