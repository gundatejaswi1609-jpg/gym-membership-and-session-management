from database import get_db_connection

REPORTS_CATALOG = [
    {
        "key": "active_members",
        "title": "1. Active Members Report",
        "description": "Members currently holding an active, unexpired subscription with plan details and remaining days.",
        "concepts": ["INNER JOIN", "Current Date Comparison", "DATEDIFF", "Aliases"],
        "sql_query": """
            SELECT 
                m.id AS member_id,
                m.member_code,
                m.full_name,
                m.phone,
                m.email,
                p.plan_name,
                s.start_date,
                s.end_date,
                DATEDIFF(s.end_date, CURDATE()) AS days_remaining
            FROM members m
            INNER JOIN subscriptions s ON m.id = s.member_id
            INNER JOIN membership_plans p ON s.plan_id = p.id
            WHERE s.status = 'Active' AND s.end_date >= CURDATE()
            ORDER BY s.end_date ASC;
        """
    },
    {
        "key": "expired_members",
        "title": "2. Expired Members (Churn Analysis)",
        "description": "Members who previously held a subscription but currently possess no active subscription.",
        "concepts": ["Correlated Subquery", "NOT IN", "MAX() Aggregate", "GROUP BY"],
        "sql_query": """
            SELECT 
                m.id AS member_id,
                m.member_code,
                m.full_name,
                m.phone,
                m.email,
                MAX(s.end_date) AS last_expired_date,
                DATEDIFF(CURDATE(), MAX(s.end_date)) AS days_since_expiry
            FROM members m
            INNER JOIN subscriptions s ON m.id = s.member_id
            WHERE m.id NOT IN (
                SELECT sub.member_id 
                FROM subscriptions sub 
                WHERE sub.status = 'Active' AND sub.end_date >= CURDATE()
            )
            GROUP BY m.id, m.member_code, m.full_name, m.phone, m.email
            ORDER BY last_expired_date DESC;
        """
    },
    {
        "key": "expiring_soon",
        "title": "3. Members Expiring in Next 7 or 30 Days",
        "description": "Actionable list for front-desk renewal reminders and customer retention.",
        "concepts": ["Interval Date Arithmetic", "CASE Expression", "BETWEEN", "INNER JOIN"],
        "sql_query": """
            SELECT 
                m.id AS member_id,
                m.member_code,
                m.full_name,
                m.phone,
                p.plan_name,
                s.end_date,
                DATEDIFF(s.end_date, CURDATE()) AS days_left,
                CASE 
                    WHEN DATEDIFF(s.end_date, CURDATE()) <= 7 THEN 'Critical (7 Days)'
                    ELSE 'Upcoming (30 Days)'
                END AS urgency_tier
            FROM members m
            INNER JOIN subscriptions s ON m.id = s.member_id
            INNER JOIN membership_plans p ON s.plan_id = p.id
            WHERE s.status = 'Active' 
              AND s.end_date >= CURDATE() 
              AND s.end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY s.end_date ASC;
        """
    },
    {
        "key": "plan_subscriptions",
        "title": "4. Membership Plans & Subscription Counts",
        "description": "Commercial plan adoption, active subscriptions count, and total gross value generated.",
        "concepts": ["LEFT JOIN", "COUNT()", "SUM()", "Conditional Aggregates", "COALESCE"],
        "sql_query": """
            SELECT 
                p.id AS plan_id,
                p.plan_name,
                p.plan_tier,
                p.price,
                COUNT(s.id) AS total_subscriptions_sold,
                SUM(CASE WHEN s.status = 'Active' AND s.end_date >= CURDATE() THEN 1 ELSE 0 END) AS active_subscribers,
                COALESCE(SUM(s.agreed_price), 0.00) AS total_revenue_generated
            FROM membership_plans p
            LEFT JOIN subscriptions s ON p.id = s.plan_id
            GROUP BY p.id, p.plan_name, p.plan_tier, p.price
            ORDER BY total_revenue_generated DESC;
        """
    },
    {
        "key": "monthly_revenue",
        "title": "5. Total Revenue by Month",
        "description": "Historical financial performance tracking completed membership revenues.",
        "concepts": ["Date Formatting", "GROUP BY", "SUM() Aggregate", "AVG() Calculation"],
        "sql_query": """
            SELECT 
                DATE_FORMAT(po.created_at, '%Y-%m') AS revenue_month,
                COUNT(po.id) AS transaction_count,
                SUM(po.amount) AS total_revenue,
                ROUND(AVG(po.amount), 2) AS average_order_value
            FROM payment_orders po
            WHERE po.status = 'SUCCESS'
            GROUP BY DATE_FORMAT(po.created_at, '%Y-%m')
            ORDER BY revenue_month DESC;
        """
    },
    {
        "key": "revenue_by_method",
        "title": "6. Revenue Breakdown by Payment Method",
        "description": "Analysis of customer payment methods (UPI, Credit Card, Bank Transfer).",
        "concepts": ["Aggregates", "Nested Scalar Subquery", "Percentage Calculation"],
        "sql_query": """
            SELECT 
                pt.payment_method,
                COUNT(pt.id) AS payment_count,
                SUM(pt.amount) AS total_amount,
                ROUND((SUM(pt.amount) / (SELECT SUM(amount) FROM payment_transactions WHERE status = 'SUCCESS')) * 100, 1) AS revenue_share_pct
            FROM payment_transactions pt
            WHERE pt.status = 'SUCCESS'
            GROUP BY pt.payment_method
            ORDER BY total_amount DESC;
        """
    },
    {
        "key": "member_payment_history",
        "title": "7. Member Payment Ledger",
        "description": "Comprehensive transaction ledger with member, plan, and audit reference details.",
        "concepts": ["Multi-Table JOIN", "Audit Traceability", "COALESCE"],
        "sql_query": """
            SELECT 
                pt.transaction_ref,
                po.order_ref,
                m.member_code,
                m.full_name AS member_name,
                po.item_type,
                pt.amount,
                pt.currency,
                pt.payment_method,
                pt.status,
                pt.created_at AS payment_timestamp
            FROM payment_transactions pt
            INNER JOIN payment_orders po ON pt.payment_order_id = po.id
            INNER JOIN members m ON po.member_id = m.id
            ORDER BY pt.created_at DESC;
        """
    },
    {
        "key": "class_registrations",
        "title": "8. Class-Wise Registration & Demand",
        "description": "Tracking popularity across fitness classes and registration volume.",
        "concepts": ["Multi-Table LEFT JOIN", "COUNT(DISTINCT)", "Conditional Aggregation"],
        "sql_query": """
            SELECT 
                fc.id AS class_id,
                fc.class_name,
                fc.category,
                fc.difficulty_level,
                COUNT(DISTINCT cs.id) AS total_sessions_scheduled,
                COUNT(cr.id) AS total_bookings_received,
                SUM(CASE WHEN cr.status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings
            FROM fitness_classes fc
            LEFT JOIN class_schedules cs ON fc.id = cs.class_id
            LEFT JOIN class_registrations cr ON cs.id = cr.schedule_id
            GROUP BY fc.id, fc.class_name, fc.category, fc.difficulty_level
            ORDER BY total_bookings_received DESC;
        """
    },
    {
        "key": "class_attendance_rate",
        "title": "9. Class Attendance Percentage",
        "description": "Actual attendance realization rate for each fitness class discipline.",
        "concepts": ["Three-Table JOIN", "HAVING Clause", "NULLIF Protection", "Mathematical Expressions"],
        "sql_query": """
            SELECT 
                fc.class_name,
                fc.category,
                COUNT(cr.id) AS total_registered,
                COUNT(a.id) AS total_attended,
                ROUND((COUNT(a.id) / NULLIF(COUNT(cr.id), 0)) * 100, 1) AS attendance_realization_pct
            FROM fitness_classes fc
            INNER JOIN class_schedules cs ON fc.id = cs.class_id
            INNER JOIN class_registrations cr ON cs.id = cr.schedule_id AND cr.status = 'Confirmed'
            LEFT JOIN attendance a ON cr.id = a.registration_id AND a.attendance_status = 'Present'
            GROUP BY fc.id, fc.class_name, fc.category
            ORDER BY attendance_realization_pct DESC;
        """
    },
    {
        "key": "trainer_workload",
        "title": "10. Trainer Workload & Sessions Handled",
        "description": "Workload distribution, classes taught, and client sessions handled per coach.",
        "concepts": ["Multiple Outer Joins", "COUNT(DISTINCT)", "GROUP BY"],
        "sql_query": """
            SELECT 
                t.trainer_code,
                t.full_name AS trainer_name,
                t.specialization,
                t.hourly_rate,
                COUNT(DISTINCT cs.id) AS group_classes_scheduled,
                COUNT(DISTINCT cr.id) AS group_participants_trained,
                COUNT(DISTINCT pt.id) AS personal_training_clients,
                COALESCE(SUM(pt.price), 0.00) AS personal_training_revenue
            FROM trainers t
            LEFT JOIN class_schedules cs ON t.id = cs.trainer_id
            LEFT JOIN class_registrations cr ON cs.id = cr.schedule_id AND cr.status = 'Confirmed'
            LEFT JOIN personal_training_bookings pt ON t.id = pt.trainer_id AND pt.status IN ('Confirmed', 'Completed')
            GROUP BY t.id, t.trainer_code, t.full_name, t.specialization, t.hourly_rate
            ORDER BY group_classes_scheduled DESC;
        """
    },
    {
        "key": "equipment_under_maintenance",
        "title": "11. Equipment Currently Under Maintenance",
        "description": "Inventory units currently locked in Pending or In Progress repair states.",
        "concepts": ["INNER JOIN", "WHERE IN Filter", "Chronological Ordering"],
        "sql_query": """
            SELECT 
                e.equipment_code,
                e.name AS equipment_name,
                e.category,
                mr.maintenance_type,
                mr.technician,
                mr.reported_date,
                mr.cost,
                mr.status AS maintenance_status
            FROM equipment e
            INNER JOIN maintenance_records mr ON e.id = mr.equipment_id
            WHERE mr.status IN ('Pending', 'In Progress', 'Reported')
            ORDER BY mr.reported_date DESC;
        """
    },
    {
        "key": "overdue_maintenance_expenditure",
        "title": "12. Overdue Maintenance & Cost Breakdown",
        "description": "Maintenance expenditure and count of overdue inspections grouped by asset category.",
        "concepts": ["Date Comparison", "SUM() Aggregation", "AVG() Aggregation", "GROUP BY"],
        "sql_query": """
            SELECT 
                e.category,
                COUNT(DISTINCT e.id) AS total_assets,
                COUNT(mr.id) AS total_workorders,
                COALESCE(SUM(mr.cost), 0.00) AS cumulative_repair_cost,
                ROUND(AVG(mr.cost), 2) AS average_workorder_cost
            FROM equipment e
            LEFT JOIN maintenance_records mr ON e.id = mr.equipment_id
            GROUP BY e.category
            ORDER BY cumulative_repair_cost DESC;
        """
    },
    {
        "key": "low_attendance_members",
        "title": "13. Members with Low Attendance (< 50%)",
        "description": "Identifies disengaged members with low session attendance for proactive support.",
        "concepts": ["HAVING Clause", "Aggregate Ratio Filtering", "JOIN with Registrations"],
        "sql_query": """
            SELECT 
                m.member_code,
                m.full_name,
                m.phone,
                m.email,
                COUNT(cr.id) AS total_booked_classes,
                COUNT(a.id) AS attended_classes,
                ROUND((COUNT(a.id) / COUNT(cr.id)) * 100, 1) AS attendance_pct
            FROM members m
            INNER JOIN class_registrations cr ON m.id = cr.member_id AND cr.status = 'Confirmed'
            LEFT JOIN attendance a ON cr.id = a.registration_id AND a.attendance_status = 'Present'
            GROUP BY m.id, m.member_code, m.full_name, m.phone, m.email
            HAVING total_booked_classes >= 1 AND attendance_pct < 50
            ORDER BY total_booked_classes DESC;
        """
    },
    {
        "key": "dormant_members",
        "title": "14. Members Inactive Recently (Dormant)",
        "description": "Members holding active memberships who have not checked in to any session recently.",
        "concepts": ["Outer Joins", "MAX() Timestamp Aggregate", "HAVING Condition"],
        "sql_query": """
            SELECT 
                m.member_code,
                m.full_name,
                m.email,
                p.plan_name,
                s.end_date,
                MAX(a.check_in_time) AS latest_check_in
            FROM members m
            INNER JOIN subscriptions s ON m.id = s.member_id AND s.status = 'Active' AND s.end_date >= CURDATE()
            INNER JOIN membership_plans p ON s.plan_id = p.id
            LEFT JOIN attendance a ON m.id = a.member_id
            GROUP BY m.id, m.member_code, m.full_name, m.email, p.plan_name, s.end_date
            HAVING latest_check_in IS NULL OR latest_check_in < DATE_SUB(NOW(), INTERVAL 14 DAY)
            ORDER BY s.end_date ASC;
        """
    },
    {
        "key": "renewal_history",
        "title": "15. Subscription Renewal Audit Trail",
        "description": "Traces renewal chain connecting prior subscriptions to renewed terms.",
        "concepts": ["Self/Pair-Join via Junction Entity", "Historical Traceability"],
        "sql_query": """
            SELECT 
                sr.id AS renewal_id,
                m.member_code,
                m.full_name,
                sr.renewal_date,
                sr.renewal_amount,
                sr.payment_ref,
                sr.processed_by,
                s_prev.start_date AS prior_start,
                s_prev.end_date AS prior_end,
                s_new.start_date AS renewed_start,
                s_new.end_date AS renewed_end
            FROM subscription_renewals sr
            INNER JOIN members m ON sr.member_id = m.id
            INNER JOIN subscriptions s_prev ON sr.previous_subscription_id = s_prev.id
            INNER JOIN subscriptions s_new ON sr.new_subscription_id = s_new.id
            ORDER BY sr.renewal_date DESC;
        """
    },
    {
        "key": "member_growth_cohort",
        "title": "16. Membership Growth Over Time",
        "description": "Monthly signup cohort analysis showing member demographic expansion.",
        "concepts": ["Time Grouping", "Demographic Aggregations", "Conditional SUM()"],
        "sql_query": """
            SELECT 
                DATE_FORMAT(m.registration_date, '%Y-%m') AS signup_cohort,
                COUNT(m.id) AS total_registrations,
                SUM(CASE WHEN m.gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
                SUM(CASE WHEN m.gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
                SUM(CASE WHEN m.status = 'Active' THEN 1 ELSE 0 END) AS currently_active
            FROM members m
            GROUP BY DATE_FORMAT(m.registration_date, '%Y-%m')
            ORDER BY signup_cohort DESC;
        """
    },
    {
        "key": "class_capacity_utilisation",
        "title": "17. Class Capacity Utilisation Rate",
        "description": "Occupancy rate per scheduled session comparing confirmed bookings against room capacity.",
        "concepts": ["Multi-Table JOIN", "Capacity Ratio Calculation", "ORDER BY Time"],
        "sql_query": """
            SELECT 
                cs.id AS schedule_id,
                fc.class_name,
                t.full_name AS trainer_name,
                cs.session_date,
                cs.start_time,
                cs.max_capacity,
                cs.booked_capacity,
                ROUND((cs.booked_capacity / cs.max_capacity) * 100, 1) AS occupancy_percentage
            FROM class_schedules cs
            INNER JOIN fitness_classes fc ON cs.class_id = fc.id
            INNER JOIN trainers t ON cs.trainer_id = t.id
            WHERE cs.session_date >= CURDATE()
            ORDER BY cs.session_date ASC, cs.start_time ASC;
        """
    },
    {
        "key": "outstanding_payments",
        "title": "18. Outstanding & Pending Dues",
        "description": "Unsettled or failed payment transactions requiring administrative follow-up.",
        "concepts": ["Status Filtering", "Payment Join with Member", "Audit Follow-up"],
        "sql_query": """
            SELECT 
                po.order_ref,
                m.member_code,
                m.full_name AS member_name,
                m.phone,
                po.item_type,
                po.amount,
                po.status AS order_status,
                po.created_at,
                po.expires_at
            FROM payment_orders po
            INNER JOIN members m ON po.member_id = m.id
            WHERE po.status IN ('PENDING', 'CREATED', 'FAILED')
            ORDER BY po.created_at DESC;
        """
    }
]

class ReportService:
    @staticmethod
    def get_all_reports_meta():
        return [
            {
                "key": r["key"],
                "title": r["title"],
                "description": r["description"],
                "concepts": r["concepts"]
            }
            for r in REPORTS_CATALOG
        ]

    @staticmethod
    def execute_report(key):
        report = next((r for r in REPORTS_CATALOG if r["key"] == key), None)
        if not report:
            return None

        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(report["sql_query"])
                rows = cur.fetchall()
                # Get column names
                columns = [col[0] for col in cur.description] if cur.description else []
                
                # Format datetime and decimal objects for JSON serialization
                formatted_rows = []
                for row in rows:
                    row_dict = {}
                    for k, v in row.items():
                        if hasattr(v, 'isoformat'):
                            row_dict[k] = v.isoformat()
                        elif hasattr(v, '__float__'):
                            row_dict[k] = float(v)
                        else:
                            row_dict[k] = v
                    formatted_rows.append(row_dict)

                return {
                    "report_key": report["key"],
                    "title": report["title"],
                    "description": report["description"],
                    "concepts": report["concepts"],
                    "sql_query": report["sql_query"].strip(),
                    "columns": columns,
                    "total_rows": len(formatted_rows),
                    "data": formatted_rows
                }
        finally:
            conn.close()
