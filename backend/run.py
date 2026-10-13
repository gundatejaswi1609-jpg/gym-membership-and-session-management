import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Create Flask application
app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY

# Enable CORS for frontend
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Register Blueprints
from routes.auth import auth_bp
from routes.members import members_bp
from routes.trainers import trainers_bp
from routes.classes import classes_bp
from routes.bookings import bookings_bp
from routes.memberships import memberships_bp
from routes.payments import payments_bp
from routes.equipment import equipment_bp
from routes.maintenance import maintenance_bp
from routes.reports import reports_bp
from routes.analytics import analytics_bp
from routes.admin import admin_bp
from routes.assessments import assessments_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(members_bp, url_prefix='/api/members')
app.register_blueprint(trainers_bp, url_prefix='/api/trainers')
app.register_blueprint(classes_bp, url_prefix='/api/classes')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
app.register_blueprint(memberships_bp, url_prefix='/api/memberships')
app.register_blueprint(payments_bp, url_prefix='/api/payments')
app.register_blueprint(equipment_bp, url_prefix='/api/equipment')
app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
app.register_blueprint(reports_bp, url_prefix='/api/reports')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(assessments_bp, url_prefix='/api/assessments')

# Compatibility route aliases
from routes.memberships import get_plans, get_all_subscriptions
from routes.bookings import get_my_bookings
app.add_url_rule('/api/plans', 'get_plans_alias', get_plans, methods=['GET'])
app.add_url_rule('/api/subscriptions', 'get_subscriptions_alias', get_all_subscriptions, methods=['GET'])
app.add_url_rule('/api/attendance', 'get_attendance_alias', lambda: jsonify([]), methods=['GET'])

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'ApexFit Premium Fitness & DBMS Platform REST API',
        'database_engine': 'mysql',
        'version': '2.0.0',
        'test_mode': Config.PAYMENT_TEST_MODE
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Requested API route was not found.'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': f'Internal Server Error: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 ApexFit MySQL Backend Server starting on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=False)
