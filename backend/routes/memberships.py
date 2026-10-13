from flask import Blueprint, request, jsonify
from database import query_all, query_one, transaction
from services.payment_service import PaymentService
import datetime

memberships_bp = Blueprint('memberships', __name__)

@memberships_bp.route('/plans', methods=['GET'])
def get_plans():
    plans = query_all("""
        SELECT 
            p.*,
            (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id AND s.status = 'Active' AND s.end_date >= CURDATE()) AS active_subscribers_count
        FROM membership_plans p
        WHERE p.status = 'Active'
        ORDER BY p.price ASC;
    """)
    for p in plans:
        p['price'] = float(p['price'])
        p['benefits_list'] = [b.strip() for b in p['benefits'].split(';') if b.strip()]
        if p.get('created_at') and hasattr(p['created_at'], 'isoformat'):
            p['created_at'] = p['created_at'].isoformat()

    return jsonify(plans)

@memberships_bp.route('/subscriptions', methods=['GET'])
def get_all_subscriptions():
    status = request.args.get('status')
    sql = """
        SELECT 
            s.*,
            m.full_name AS member_name,
            m.member_code,
            m.phone AS member_phone,
            p.plan_name,
            p.plan_tier,
            DATEDIFF(s.end_date, CURDATE()) AS days_remaining
        FROM subscriptions s
        INNER JOIN members m ON s.member_id = m.id
        INNER JOIN membership_plans p ON s.plan_id = p.id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND s.status = %s"
        params.append(status)

    sql += " ORDER BY s.end_date DESC"
    subs = query_all(sql, params)
    for s in subs:
        s['agreed_price'] = float(s['agreed_price'])
        for k in ['start_date', 'end_date', 'created_at', 'updated_at']:
            if k in s and s[k]:
                s[k] = str(s[k])

    return jsonify(subs)

@memberships_bp.route('/my-subscription', methods=['GET'])
def get_my_subscription():
    member_id = request.args.get('member_id', 1, type=int)

    active_sub = query_one("""
        SELECT 
            s.*,
            p.plan_name,
            p.plan_tier,
            p.description,
            p.benefits,
            p.gym_access,
            p.included_sessions,
            p.trainer_benefits,
            p.terms,
            DATEDIFF(s.end_date, CURDATE()) AS days_remaining
        FROM subscriptions s
        INNER JOIN membership_plans p ON s.plan_id = p.id
        WHERE s.member_id = %s AND s.status = 'Active' AND s.end_date >= CURDATE()
        ORDER BY s.end_date DESC LIMIT 1
    """, (member_id,))

    history = query_all("""
        SELECT 
            s.*,
            p.plan_name,
            p.plan_tier
        FROM subscriptions s
        INNER JOIN membership_plans p ON s.plan_id = p.id
        WHERE s.member_id = %s
        ORDER BY s.start_date DESC
    """, (member_id,))

    if active_sub:
        active_sub['agreed_price'] = float(active_sub['agreed_price'])
        active_sub['benefits_list'] = [b.strip() for b in active_sub['benefits'].split(';') if b.strip()]
        for k in ['start_date', 'end_date', 'created_at', 'updated_at']:
            if k in active_sub and active_sub[k]:
                active_sub[k] = str(active_sub[k])

    for h in history:
        h['agreed_price'] = float(h['agreed_price'])
        for k in ['start_date', 'end_date', 'created_at']:
            if k in h and h[k]:
                h[k] = str(h[k])

    return jsonify({
        'active_subscription': active_sub,
        'history': history
    })

@memberships_bp.route('/purchase', methods=['POST'])
def initiate_purchase():
    """Create a payment order for purchasing or renewing a membership plan."""
    data = request.get_json() or {}
    member_id = data.get('member_id', 1)
    plan_id = data.get('plan_id')

    if not plan_id:
        return jsonify({'error': 'plan_id is required.'}), 400

    plan = query_one("SELECT * FROM membership_plans WHERE id = %s", (plan_id,))
    if not plan:
        return jsonify({'error': 'Plan not found.'}), 404

    amount = float(plan['price'])
    order_data = PaymentService.create_order(
        member_id=member_id,
        item_type='membership',
        item_id=plan_id,
        amount=amount
    )

    return jsonify({
        'success': True,
        'order': order_data,
        'plan': {
            'id': plan['id'],
            'plan_name': plan['plan_name'],
            'plan_tier': plan['plan_tier'],
            'duration_days': plan['duration_days'],
            'price': amount
        }
    })
