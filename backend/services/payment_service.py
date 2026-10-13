import hmac
import hashlib
import json
import uuid
import datetime
from config import Config
from database import transaction, query_one, query_all

class PaymentService:
    @staticmethod
    def generate_upi_qr_uri(order_ref, amount, payee_name="ApexFit Wellness", vpa="apexfit@razorpay"):
        """
        Generate standard NPCI-compliant UPI dynamic QR URI string.
        Format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&tr=<ref>&cu=INR&tn=ApexFit%20Membership
        """
        amt_str = f"{float(amount):.2f}"
        encoded_name = payee_name.replace(" ", "%20")
        note = f"ApexFit-{order_ref}"
        return f"upi://pay?pa={vpa}&pn={encoded_name}&am={amt_str}&tr={order_ref}&tn={note}&cu=INR"

    @classmethod
    def create_order(cls, member_id, item_type, item_id, amount, hold_token=None):
        """
        Create a new payment order with dynamic UPI QR payload and expiration time.
        """
        order_ref = f"ORD-{datetime.datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        expires_at = datetime.datetime.now() + datetime.timedelta(minutes=15)
        upi_payload = cls.generate_upi_qr_uri(order_ref, amount)

        with transaction() as cur:
            cur.execute("""
                INSERT INTO payment_orders (order_ref, member_id, item_type, item_id, amount, currency, upi_qr_payload, status, expires_at)
                VALUES (%s, %s, %s, %s, %s, 'INR', %s, 'CREATED', %s)
            """, (order_ref, member_id, item_type, item_id, amount, upi_payload, expires_at))
            order_id = cur.lastrowid

            # Log status transition
            cur.execute("""
                INSERT INTO payment_status_history (payment_order_id, old_status, new_status, reason, changed_by)
                VALUES (%s, 'NONE', 'CREATED', 'Order created with dynamic UPI QR payload', 'SYSTEM')
            """, (order_id,))

        return {
            'order_id': order_id,
            'order_ref': order_ref,
            'amount': float(amount),
            'currency': 'INR',
            'upi_qr_payload': upi_payload,
            'expires_at': expires_at.isoformat(),
            'status': 'CREATED',
            'is_test_mode': Config.PAYMENT_TEST_MODE,
            'provider': 'RAZORPAY_UPI'
        }

    @staticmethod
    def verify_webhook_signature(raw_body, signature, secret=None):
        """
        Verify Razorpay HMAC-SHA256 signature using raw webhook body.
        """
        secret = secret or Config.RAZORPAY_WEBHOOK_SECRET
        expected_sig = hmac.new(
            secret.encode('utf-8'),
            raw_body if isinstance(raw_body, bytes) else raw_body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature)

    @classmethod
    def process_successful_payment(cls, order_ref, provider_payment_id, signature, payment_method="UPI_QR", raw_payload=None):
        """
        Transactionally record payment success and trigger resource confirmation
        with idempotency check.
        """
        with transaction() as cur:
            # 1. Fetch order with row-level lock
            cur.execute("SELECT * FROM payment_orders WHERE order_ref = %s FOR UPDATE", (order_ref,))
            order = cur.fetchone()
            if not order:
                raise ValueError(f"Order {order_ref} not found.")

            # Idempotency check: If already SUCCESS, return existing record
            if order['status'] == 'SUCCESS':
                cur.execute("SELECT * FROM payment_transactions WHERE payment_order_id = %s", (order['id'],))
                txn = cur.fetchone()
                return {'success': True, 'already_processed': True, 'order': order, 'transaction': txn}

            # Check expiration
            if order['expires_at'] < datetime.datetime.now():
                cur.execute("UPDATE payment_orders SET status = 'EXPIRED' WHERE id = %s", (order['id'],))
                raise ValueError(f"Order {order_ref} has expired. Please initiate a new order.")

            # 2. Check for duplicate transaction
            txn_ref = f"TXN-{order_ref}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("SELECT id FROM payment_transactions WHERE transaction_ref = %s OR provider_payment_id = %s", (txn_ref, provider_payment_id))
            if cur.fetchone():
                raise ValueError(f"Duplicate payment transaction detected for reference: {provider_payment_id}")

            # 3. Insert transaction
            raw_json = json.dumps(raw_payload) if raw_payload else json.dumps({
                "provider": "RAZORPAY_UPI",
                "payment_id": provider_payment_id,
                "status": "authorized",
                "method": payment_method
            })

            cur.execute("""
                INSERT INTO payment_transactions (payment_order_id, transaction_ref, provider, provider_payment_id, provider_signature, amount, currency, payment_method, status, raw_response)
                VALUES (%s, %s, 'RAZORPAY_UPI', %s, %s, %s, 'INR', %s, 'SUCCESS', %s)
            """, (order['id'], txn_ref, provider_payment_id, signature, order['amount'], payment_method, raw_json))
            txn_id = cur.lastrowid

            # 4. Update order status
            cur.execute("UPDATE payment_orders SET status = 'SUCCESS' WHERE id = %s", (order['id'],))

            # 5. Log history
            cur.execute("""
                INSERT INTO payment_status_history (payment_order_id, old_status, new_status, reason, changed_by)
                VALUES (%s, %s, 'SUCCESS', 'Payment successfully verified via provider callback/API', 'PAYMENT_GATEWAY')
            """, (order['id'], order['status']))

            # 6. Activate related entity
            item_type = order['item_type']
            item_id = order['item_id']
            member_id = order['member_id']

            if item_type == 'membership':
                # Activate subscription
                cur.execute("SELECT * FROM membership_plans WHERE id = %s", (item_id,))
                plan = cur.fetchone()
                if not plan:
                    raise ValueError(f"Plan {item_id} not found.")

                start_date = datetime.date.today()
                end_date = start_date + datetime.timedelta(days=plan['duration_days'])

                # Check if member has active subscription to extend or create new
                cur.execute("""
                    INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, agreed_price, status, payment_order_id)
                    VALUES (%s, %s, %s, %s, %s, 'Active', %s)
                """, (member_id, plan['id'], start_date, end_date, order['amount'], order['id']))
                new_sub_id = cur.lastrowid

                # Record renewal / activation
                cur.execute("""
                    INSERT INTO subscription_renewals (member_id, previous_subscription_id, new_subscription_id, renewal_date, renewal_amount, payment_ref, processed_by)
                    VALUES (%s, %s, %s, %s, %s, %s, 'ONLINE_PAYMENT')
                """, (member_id, new_sub_id, new_sub_id, start_date, order['amount'], txn_ref))

            return {
                'success': True,
                'order_ref': order_ref,
                'transaction_ref': txn_ref,
                'status': 'SUCCESS',
                'amount': float(order['amount']),
                'item_type': item_type,
                'item_id': item_id
            }

    @classmethod
    def process_failed_payment(cls, order_ref, reason="Payment declined or cancelled by user"):
        with transaction() as cur:
            cur.execute("SELECT * FROM payment_orders WHERE order_ref = %s FOR UPDATE", (order_ref,))
            order = cur.fetchone()
            if not order:
                return {'error': 'Order not found'}
            
            cur.execute("UPDATE payment_orders SET status = 'FAILED' WHERE id = %s", (order['id'],))
            cur.execute("""
                INSERT INTO payment_status_history (payment_order_id, old_status, new_status, reason, changed_by)
                VALUES (%s, %s, 'FAILED', %s, 'SYSTEM')
            """, (order['id'], order['status'], reason))
            return {'status': 'FAILED', 'order_ref': order_ref, 'reason': reason}
