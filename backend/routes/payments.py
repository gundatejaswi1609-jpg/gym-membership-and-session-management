from flask import Blueprint, request, jsonify
from database import query_all, query_one
from services.payment_service import PaymentService
import hmac
import hashlib
import uuid
import datetime
from config import Config

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/create-order', methods=['POST'])
def create_order():
    data = request.get_json() or {}
    member_id = data.get('member_id', 1)
    item_type = data.get('item_type', 'membership')
    item_id = data.get('item_id')
    amount = float(data.get('amount', 0.00))

    if not item_id or amount <= 0:
        return jsonify({'error': 'Valid item_id and positive amount are required.'}), 400

    order = PaymentService.create_order(member_id, item_type, item_id, amount)
    return jsonify({'success': True, 'order': order})

@payments_bp.route('/orders/<order_ref>', methods=['GET'])
def get_order_status(order_ref):
    order = query_one("""
        SELECT po.*, m.full_name AS member_name, m.email AS member_email
        FROM payment_orders po
        INNER JOIN members m ON po.member_id = m.id
        WHERE po.order_ref = %s
    """, (order_ref,))
    if not order:
        return jsonify({'error': 'Order not found.'}), 404

    order['amount'] = float(order['amount'])
    for k in ['expires_at', 'created_at', 'updated_at']:
        if k in order and order[k]:
            order[k] = str(order[k])

    # Fetch any transactions
    txns = query_all("SELECT * FROM payment_transactions WHERE payment_order_id = %s", (order['id'],))
    for t in txns:
        t['amount'] = float(t['amount'])
        if t.get('created_at'):
            t['created_at'] = str(t['created_at'])

    return jsonify({
        'order': order,
        'transactions': txns,
        'is_expired': order['status'] == 'EXPIRED' or (order['status'] == 'CREATED' and order['expires_at'] < str(datetime.datetime.now()))
    })

@payments_bp.route('/verify', methods=['POST'])
def verify_payment():
    """
    Verify payment via server-side check.
    Requires order_ref, provider_payment_id, signature.
    """
    data = request.get_json() or {}
    order_ref = data.get('order_ref')
    provider_payment_id = data.get('provider_payment_id')
    signature = data.get('signature')
    payment_method = data.get('payment_method', 'UPI_QR')

    if not all([order_ref, provider_payment_id, signature]):
        return jsonify({'error': 'Missing required payment verification parameters.'}), 400

    try:
        res = PaymentService.process_successful_payment(
            order_ref=order_ref,
            provider_payment_id=provider_payment_id,
            signature=signature,
            payment_method=payment_method,
            raw_payload=data
        )
        return jsonify(res)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Payment processing error: {str(e)}'}), 500

@payments_bp.route('/test-pay', methods=['POST'])
def simulate_test_payment():
    """
    SANDBOX / ACADEMIC TEST PAYMENT ADAPTER
    Simulates a successful UPI scan & pay from an Indian banking app (GPay / PhonePe / Paytm).
    Computes a cryptographic HMAC-SHA256 signature to maintain authentic verification logic.
    """
    data = request.get_json() or {}
    order_ref = data.get('order_ref')
    vpa = data.get('vpa', 'member@oksbi')

    if not order_ref:
        return jsonify({'error': 'order_ref is required.'}), 400

    order = query_one("SELECT * FROM payment_orders WHERE order_ref = %s", (order_ref,))
    if not order:
        return jsonify({'error': 'Order not found.'}), 404

    # Generate synthetic provider IDs
    provider_payment_id = f"pay_test_{uuid.uuid4().hex[:12]}"
    sig_payload = f"{order_ref}|{provider_payment_id}"
    signature = hmac.new(
        Config.RAZORPAY_KEY_SECRET.encode('utf-8'),
        sig_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    try:
        result = PaymentService.process_successful_payment(
            order_ref=order_ref,
            provider_payment_id=provider_payment_id,
            signature=signature,
            payment_method="UPI_QR",
            raw_payload={
                "provider": "RAZORPAY_UPI_SANDBOX",
                "payment_id": provider_payment_id,
                "vpa": vpa,
                "status": "captured",
                "simulated": True
            }
        )
        result['simulated'] = True
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@payments_bp.route('/cancel', methods=['POST'])
def cancel_order():
    data = request.get_json() or {}
    order_ref = data.get('order_ref')
    if not order_ref:
        return jsonify({'error': 'order_ref is required.'}), 400
    res = PaymentService.process_failed_payment(order_ref, reason="User cancelled payment session")
    return jsonify(res)

@payments_bp.route('/history', methods=['GET'])
def get_payment_history():
    member_id = request.args.get('member_id', type=int)
    sql = """
        SELECT 
            pt.*,
            po.order_ref,
            po.item_type,
            m.full_name AS member_name,
            m.member_code
        FROM payment_transactions pt
        INNER JOIN payment_orders po ON pt.payment_order_id = po.id
        INNER JOIN members m ON po.member_id = m.id
        WHERE 1=1
    """
    params = []
    if member_id:
        sql += " AND m.id = %s"
        params.append(member_id)

    sql += " ORDER BY pt.created_at DESC"
    txns = query_all(sql, params)
    for t in txns:
        t['amount'] = float(t['amount'])
        if t.get('created_at'):
            t['created_at'] = str(t['created_at'])

    return jsonify(txns)

@payments_bp.route('/webhook', methods=['POST'])
def handle_webhook():
    """Razorpay Webhook Handler with HMAC signature validation."""
    webhook_signature = request.headers.get('X-Razorpay-Signature', '')
    raw_body = request.get_data()

    if not PaymentService.verify_webhook_signature(raw_body, webhook_signature):
        return jsonify({'error': 'Invalid webhook signature'}), 400

    payload = request.get_json() or {}
    event = payload.get('event')

    if event == 'payment.captured':
        payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
        notes = payment_entity.get('notes', {})
        order_ref = notes.get('order_ref')
        if order_ref:
            PaymentService.process_successful_payment(
                order_ref=order_ref,
                provider_payment_id=payment_entity.get('id'),
                signature=webhook_signature,
                payment_method=payment_entity.get('method', 'UPI')
            )

    return jsonify({'status': 'ok'})
