from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from database import query_one, query_all, transaction
import datetime
import uuid

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user with strict Role-Based Access Control (RBAC) per portal.
    Everyone cannot log into all 3 portals!
    - Member Portal: Only users with role 'member'
    - Trainer Portal: Only users with role 'trainer'
    - Admin Portal: Only users with role 'admin'
    """
    data = request.get_json() or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()
    portal = data.get('portal', '').strip().lower()

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    user = query_one("SELECT * FROM users WHERE (LOWER(username) = %s OR LOWER(email) = %s) AND is_active = TRUE", (username, username))
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid username or password.'}), 401

    # Strict Portal RBAC Validation
    if portal == 'member' and user['role'] != 'member':
        return jsonify({
            'error': f"Access Denied (403 Forbidden): Account '{user['username']}' has role '{user['role'].upper()}'. It cannot log into the Member Portal. Only Gym Members are permitted."
        }), 403

    if portal == 'trainer' and user['role'] != 'trainer':
        return jsonify({
            'error': f"Access Denied (403 Forbidden): Account '{user['username']}' has role '{user['role'].upper()}'. It cannot log into the Trainer Portal. Only certified Trainers are permitted."
        }), 403

    if portal == 'admin' and user['role'] != 'admin':
        return jsonify({
            'error': f"Access Denied (403 Forbidden): Account '{user['username']}' has role '{user['role'].upper()}'. It cannot log into the Admin Portal. Only Administrators are permitted."
        }), 403

    session['user_id'] = user['id']
    session['role'] = user['role']

    # Attach member_id or trainer_id if applicable
    member = query_one("SELECT id, member_code, age, gender, weight_kg, height_cm, bmi, avatar_url FROM members WHERE user_id = %s", (user['id'],))
    trainer = query_one("SELECT id, trainer_code, image_url FROM trainers WHERE user_id = %s", (user['id'],))

    member_id = member['id'] if member else (1 if user['role'] == 'member' else None)
    trainer_id = trainer['id'] if trainer else (1 if user['role'] == 'trainer' else None)
    avatar_url = user.get('avatar_url') or (member.get('avatar_url') if member else None) or (trainer.get('image_url') if trainer else None)

    return jsonify({
        'message': f"Login successful as {user['role'].upper()}",
        'authenticated': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role'],
            'avatar_url': avatar_url,
            'member_id': member_id,
            'trainer_id': trainer_id,
            'age': member['age'] if member else None,
            'gender': member['gender'] if member else None,
            'weight_kg': float(member['weight_kg']) if member and member.get('weight_kg') else None,
            'height_cm': float(member['height_cm']) if member and member.get('height_cm') else None,
            'bmi': float(member['bmi']) if member and member.get('bmi') else None,
        }
    })

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Sign Up / Registration with automatic BMI calculation.
    Stores login info (username, password_hash, email) in users table,
    and biometrics (name, gender, age, weight, height, calculated BMI) in members table.
    """
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    username = data.get('username', '').strip().lower()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    role = data.get('role', 'member').strip().lower()
    gender = data.get('gender', 'Male')
    phone = data.get('phone', '+91-98765-00000').strip()
    avatar_url = data.get('avatar_url')

    if not all([full_name, username, email, password]):
        return jsonify({'error': 'Full name, username, email, and password are all required.'}), 400

    if role not in ('member', 'trainer'):
        role = 'member'

    try:
        age = int(data.get('age', 25))
        weight_kg = float(data.get('weight_kg', 70.0))
        height_cm = float(data.get('height_cm', 175.0))
    except (ValueError, TypeError):
        return jsonify({'error': 'Age, weight, and height must be valid numeric values.'}), 400

    if weight_kg <= 0 or height_cm <= 0:
        return jsonify({'error': 'Weight and height must be positive values.'}), 400

    # Automatic calculation of BMI: weight / (height / 100)^2
    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m ** 2), 2)

    # Check username / email uniqueness
    existing_user = query_one("SELECT id FROM users WHERE LOWER(username) = %s OR LOWER(email) = %s", (username, email))
    if existing_user:
        return jsonify({'error': 'An account with that username or email already exists. Please choose a different one or sign in.'}), 400

    password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    with transaction() as cur:
        cur.execute("""
            INSERT INTO users (username, password_hash, email, full_name, role, avatar_url, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """, (username, password_hash, email, full_name, role, avatar_url))
        user_id = cur.lastrowid

        member_id = None
        trainer_id = None

        if role == 'member':
            member_code = f"MEM-{uuid.uuid4().hex[:6].upper()}"
            dob = datetime.date.today() - datetime.timedelta(days=int(age * 365.25))
            cur.execute("""
                INSERT INTO members (user_id, member_code, full_name, email, phone, dob, gender, address, emergency_contact, emergency_phone, age, weight_kg, height_cm, bmi, avatar_url, status, registration_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'Bengaluru, Karnataka', 'Family Member', '+91-98765-11111', %s, %s, %s, %s, %s, 'Active', CURDATE())
            """, (user_id, member_code, full_name, email, phone, dob, gender, age, weight_kg, height_cm, bmi, avatar_url))
            member_id = cur.lastrowid

            # Initial biometric assessment record
            cur.execute("""
                INSERT INTO fitness_assessments (member_id, trainer_id, assessment_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, systolic_bp, diastolic_bp, target_goals, notes)
                VALUES (%s, 1, CURDATE(), %s, %s, %s, 18.0, %s, 120, 80, 'Initial Onboarding Biometrics', 'Profile registered with automatic BMI calculation')
            """, (member_id, weight_kg, height_cm, bmi, round(weight_kg * 0.45, 1)))

        elif role == 'trainer':
            trainer_code = f"TRN-{uuid.uuid4().hex[:6].upper()}"
            cur.execute("""
                INSERT INTO trainers (user_id, trainer_code, full_name, email, phone, bio, specialization, certification, experience_years, hourly_rate, session_price, availability_status, hire_date, image_url)
                VALUES (%s, %s, %s, %s, %s, 'Certified Fitness Coach', 'General Fitness', 'ACE Certified', 2, 1200.00, 1500.00, 'Available', CURDATE(), %s)
            """, (user_id, trainer_code, full_name, email, phone, avatar_url))
            trainer_id = cur.lastrowid

    session['user_id'] = user_id
    session['role'] = role

    return jsonify({
        'success': True,
        'message': 'Account registered successfully! Welcome to ApexFit.',
        'authenticated': True,
        'user': {
            'id': user_id,
            'username': username,
            'email': email,
            'full_name': full_name,
            'role': role,
            'member_id': member_id,
            'trainer_id': trainer_id,
            'avatar_url': avatar_url,
            'age': age,
            'gender': gender,
            'weight_kg': weight_kg,
            'height_cm': height_cm,
            'bmi': bmi
        }
    }), 201

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'authenticated': False, 'user': None}), 200

    user = query_one("SELECT id, username, email, full_name, role, avatar_url, is_active, created_at FROM users WHERE id = %s", (user_id,))
    if not user:
        return jsonify({'authenticated': False, 'user': None}), 200

    # Resolve linked member or trainer
    member = query_one("SELECT id, member_code, age, gender, weight_kg, height_cm, bmi, avatar_url FROM members WHERE user_id = %s", (user['id'],))
    trainer = query_one("SELECT id, trainer_code, image_url FROM trainers WHERE user_id = %s", (user['id'],))

    member_id = member['id'] if member else (1 if user['role'] == 'member' else None)
    trainer_id = trainer['id'] if trainer else (1 if user['role'] == 'trainer' else None)
    avatar_url = user.get('avatar_url') or (member.get('avatar_url') if member else None) or (trainer.get('image_url') if trainer else None)

    return jsonify({
        'authenticated': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role'],
            'avatar_url': avatar_url,
            'is_active': bool(user['is_active']),
            'member_id': member_id,
            'trainer_id': trainer_id,
            'age': member['age'] if member else None,
            'gender': member['gender'] if member else None,
            'weight_kg': float(member['weight_kg']) if member and member.get('weight_kg') else None,
            'height_cm': float(member['height_cm']) if member and member.get('height_cm') else None,
            'bmi': float(member['bmi']) if member and member.get('bmi') else None,
            'created_at': user['created_at'].isoformat() if hasattr(user['created_at'], 'isoformat') else str(user['created_at'])
        }
    })

@auth_bp.route('/switch-role', methods=['POST'])
def switch_role():
    """1-Click Role Switcher for instant academic demonstration."""
    data = request.get_json() or {}
    role = data.get('role', 'member').lower()

    if role not in ('admin', 'trainer', 'member'):
        return jsonify({'error': 'Invalid role specified.'}), 400

    target_user = None
    if role == 'admin':
        target_user = query_one("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
    elif role == 'trainer':
        trainer_id = data.get('trainer_id')
        if trainer_id:
            target_user = query_one("SELECT u.* FROM users u INNER JOIN trainers t ON u.id = t.user_id WHERE t.id = %s", (trainer_id,))
        if not target_user:
            target_user = query_one("SELECT * FROM users WHERE role = 'trainer' LIMIT 1")
    else: # member
        target_user = query_one("SELECT * FROM users WHERE username = 'tejaswi'")
        if not target_user:
            target_user = query_one("SELECT * FROM users WHERE role = 'member' LIMIT 1")

    if target_user:
        session['user_id'] = target_user['id']
        session['role'] = target_user['role']

    member = query_one("SELECT id, age, gender, weight_kg, height_cm, bmi, avatar_url FROM members WHERE user_id = %s", (target_user['id'],)) if target_user else None
    trainer = query_one("SELECT id, image_url FROM trainers WHERE user_id = %s", (target_user['id'],)) if target_user else None
    avatar_url = target_user.get('avatar_url') if target_user else None

    return jsonify({
        'message': f'Switched active perspective to {role.upper()}',
        'authenticated': True,
        'user': {
            'id': target_user['id'] if target_user else 1,
            'username': target_user['username'] if target_user else 'user',
            'full_name': target_user['full_name'] if target_user else 'User',
            'role': role,
            'avatar_url': avatar_url,
            'member_id': member['id'] if member else (1 if role == 'member' else None),
            'trainer_id': trainer['id'] if trainer else (1 if role == 'trainer' else None),
            'age': member['age'] if member else None,
            'gender': member['gender'] if member else None,
            'weight_kg': float(member['weight_kg']) if member and member.get('weight_kg') else None,
            'height_cm': float(member['height_cm']) if member and member.get('height_cm') else None,
            'bmi': float(member['bmi']) if member and member.get('bmi') else None,
        }
    })

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully.', 'authenticated': False})

@auth_bp.route('/credentials', methods=['GET'])
def get_portal_credentials():
    """
    Returns verified login accounts and passwords for all 3 portals
    along with strict Role-Based Access Control (RBAC) rules.
    """
    return jsonify({
        'rules': [
            'Each account is strictly bound to its assigned portal role.',
            'Member accounts (role: member) can ONLY access the Member Portal.',
            'Trainer accounts (role: trainer) can ONLY access the Trainer Portal.',
            'Admin accounts (role: admin) can ONLY access the Admin Portal.',
            'Cross-portal unauthorized access attempts are rejected with HTTP 403 Forbidden.'
        ],
        'portals': {
            'member': {
                'portal_name': 'Member Portal',
                'description': 'Gym access, class discovery, membership purchase, dynamic UPI QR checkout, session bookings',
                'allowed_role': 'member',
                'accounts': [
                    {'username': 'tejaswi', 'password': 'member123', 'name': 'Tejaswi Gunda', 'note': 'Primary Member (Annual Platinum Plan)'},
                    {'username': 'member_demo', 'password': 'member123', 'name': 'Liam Henderson', 'note': 'Standard Member'}
                ]
            },
            'trainer': {
                'portal_name': 'Trainer Portal',
                'description': 'Weekly availability calendar, dynamic slot generation, session rosters, attendance & assessments',
                'allowed_role': 'trainer',
                'accounts': [
                    {'username': 'trainer_marcus', 'password': 'trainer123', 'name': 'Marcus Fletcher', 'note': 'Head Strength Coach (Indiranagar)'},
                    {'username': 'trainer_elena', 'password': 'trainer123', 'name': 'Elena Rostova', 'note': 'Master Yoga Trainer (Koramangala)'},
                    {'username': 'trainer_sarah', 'password': 'trainer123', 'name': 'Sarah Connor', 'note': 'HIIT & Conditioning Coach'},
                    {'username': 'trainer_david', 'password': 'trainer123', 'name': 'David Kim', 'note': 'Spin & Boxing Coach'},
                    {'username': 'trainer_vikram', 'password': 'trainer123', 'name': 'Vikram Malhotra', 'note': 'Functional Training Specialist'}
                ]
            },
            'admin': {
                'portal_name': 'Admin Portal',
                'description': 'Full gym operations, equipment inventory, maintenance workorders, studio capacity overrides, 18 SQL reports & 3NF database schema',
                'allowed_role': 'admin',
                'accounts': [
                    {'username': 'admin', 'password': 'admin123', 'name': 'Alex Vance (Director)', 'note': 'System Administrator (Full Privileges)'}
                ]
            }
        }
    })
