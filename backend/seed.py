#!/usr/bin/env python3
"""
Seed and Migration Script for ApexFit Database (MySQL)
Populates normalized 3NF tables with realistic Cult-inspired fitness data
and preserves historical records from legacy dataset.
"""

import os
import json
import datetime
from werkzeug.security import generate_password_hash
import pymysql

DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', 3307)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'gym_db'),
    'charset': 'utf8mb4',
    'autocommit': True,
    'cursorclass': pymysql.cursors.DictCursor
}

def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return json.load(f)
    return []

def run_seed():
    print("⚡ Connecting to MySQL database at {}:{}...".format(DB_CONFIG['host'], DB_CONFIG['port']))
    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("SET FOREIGN_KEY_CHECKS = 0;")

    # 1. USERS
    print("1. Seeding Users...")
    cur.execute("TRUNCATE TABLE users;")
    demo_users = [
        ('admin', generate_password_hash('admin123', method='pbkdf2:sha256'), 'admin@apexfit.com', 'Alex Vance (Director)', 'admin', True),
        ('trainer_marcus', generate_password_hash('trainer123', method='pbkdf2:sha256'), 'marcus.f@apexfit.com', 'Marcus Fletcher', 'trainer', True),
        ('trainer_sarah', generate_password_hash('trainer123', method='pbkdf2:sha256'), 'sarah.c@apexfit.com', 'Sarah Connor', 'trainer', True),
        ('trainer_david', generate_password_hash('trainer123', method='pbkdf2:sha256'), 'david.k@apexfit.com', 'David Kim', 'trainer', True),
        ('trainer_elena', generate_password_hash('trainer123', method='pbkdf2:sha256'), 'elena.r@apexfit.com', 'Elena Rostova', 'trainer', True),
        ('trainer_rachel', generate_password_hash('trainer123', method='pbkdf2:sha256'), 'rachel.g@apexfit.com', 'Rachel Green', 'trainer', True),
        ('trainer_vikram', generate_password_hash('trainer123', method='pbkdf2:sha256'), 'vikram.m@apexfit.com', 'Vikram Malhotra', 'trainer', True),
        ('member_demo', generate_password_hash('member123', method='pbkdf2:sha256'), 'liam.h@example.com', 'Liam Henderson', 'member', True),
        ('tejaswi', generate_password_hash('member123', method='pbkdf2:sha256'), 'tejaswi@apexfit.com', 'Tejaswi Gunda', 'member', True),
    ]
    cur.executemany("""
        INSERT INTO users (username, password_hash, email, full_name, role, is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, demo_users)

    # 2. GYM LOCATIONS
    print("2. Seeding Gym Locations...")
    cur.execute("TRUNCATE TABLE gym_locations;")
    locations = [
        (1, 'ApexFit Indiranagar Flagship', '100ft Road, HAL 2nd Stage, Indiranagar', 'Bengaluru', 'Karnataka', '560038', '+91-80-4123-9001', 'indiranagar@apexfit.com', 250, '06:00:00', '22:30:00'),
        (2, 'ApexFit Koramangala Studio', '80ft Road, 4th Block, Koramangala', 'Bengaluru', 'Karnataka', '560034', '+91-80-4123-9002', 'koramangala@apexfit.com', 180, '06:00:00', '22:00:00'),
        (3, 'ApexFit HSR Club', '27th Main, Sector 1, HSR Layout', 'Bengaluru', 'Karnataka', '560102', '+91-80-4123-9003', 'hsr@apexfit.com', 200, '06:00:00', '22:00:00'),
    ]
    cur.executemany("""
        INSERT INTO gym_locations (id, location_name, address, city, state, postal_code, phone, email, capacity, opening_time, closing_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, locations)

    # 3. ROOMS
    print("3. Seeding Rooms...")
    cur.execute("TRUNCATE TABLE rooms;")
    rooms = [
        (1, 1, 'Main Strength Arena', 50, 'Main Gym Floor'),
        (2, 1, 'Zen Yoga Shala', 25, 'Yoga Shala'),
        (3, 1, 'HIIT Pulse Studio', 30, 'Studio'),
        (4, 1, 'Velocity Spin Lab', 28, 'Spin Room'),
        (5, 1, 'Rumble Boxing Ring', 20, 'Boxing Arena'),
        (6, 2, 'Koramangala Fitness Deck', 45, 'Studio'),
        (7, 3, 'HSR Athletic Studio', 40, 'Studio'),
    ]
    cur.executemany("""
        INSERT INTO rooms (id, location_id, room_name, capacity, room_type)
        VALUES (%s, %s, %s, %s, %s)
    """, rooms)

    # 4. MEMBERS (From legacy dump + Demo member)
    print("4. Seeding Members...")
    cur.execute("TRUNCATE TABLE members;")
    legacy_members = load_json('/Users/tejaswigunda/DBMS/legacy_dump/members.json')
    member_records = []
    
    # Ensure Tejaswi is member #1
    member_records.append((
        1, 9, 'MEM-001', 'Tejaswi Gunda', 'tejaswi@apexfit.com', '+91-98765-43210',
        '2001-08-15', 'Male', 'Indiranagar 12th Main, Bengaluru', 'Venkata Gunda (Father)', '+91-98765-00001',
        'Active', '2025-01-10'
    ))

    for m in legacy_members:
        if m.get('id') == 1:
            continue # replaced with Tejaswi
        m_id = m.get('id')
        user_id = 8 if m_id == 2 else None
        m_code = m.get('member_code', f'MEM-{m_id:03d}')
        full_name = m.get('full_name')
        email = m.get('email')
        phone = m.get('phone')
        dob = m.get('dob')
        gender = m.get('gender', 'Male')
        address = m.get('address')
        emerg_contact = m.get('emergency_contact', 'Family Member')
        emerg_phone = m.get('emergency_phone', '+91-98000-00000')
        status = m.get('status', 'Active')
        reg_date = m.get('registration_date', '2025-01-15')
        member_records.append((m_id, user_id, m_code, full_name, email, phone, dob, gender, address, emerg_contact, emerg_phone, status, reg_date))

    cur.executemany("""
        INSERT INTO members (id, user_id, member_code, full_name, email, phone, dob, gender, address, emergency_contact, emergency_phone, status, registration_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, member_records)

    # 5. EMERGENCY CONTACTS
    print("5. Seeding Emergency Contacts...")
    cur.execute("TRUNCATE TABLE emergency_contacts;")
    contacts = [
        (1, 'Venkata Gunda', 'Father', '+91-98765-00001', True),
        (2, 'Carlos Martinez', 'Father', '+1-555-9002', True),
        (3, 'Rachel Walker', 'Sister', '+1-555-9003', True),
        (4, 'Kevin Chen', 'Brother', '+1-555-9004', True),
        (5, 'Grace Williams', 'Mother', '+1-555-9005', True),
    ]
    cur.executemany("""
        INSERT INTO emergency_contacts (member_id, contact_name, relationship, phone_number, is_primary)
        VALUES (%s, %s, %s, %s, %s)
    """, contacts)

    # 6. TRAINERS
    print("6. Seeding Trainers...")
    cur.execute("TRUNCATE TABLE trainers;")
    trainers_data = [
        (1, 2, 'TRN-001', 'Marcus Fletcher', 'marcus.f@apexfit.com', '+91-98111-22201',
         'Former national powerlifting champion with 10+ years specializing in hypertrophy, biomechanics, and strength.',
         'Strength & Conditioning', 'CSCS, NSCA Certified', 10, 1500.00, 1800.00, 'Available', '2021-03-15', 1,
         'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'),
        (2, 3, 'TRN-002', 'Sarah Connor', 'sarah.c@apexfit.com', '+91-98111-22202',
         'HIIT master trainer and endurance athlete focusing on athletic conditioning and high-intensity interval performance.',
         'HIIT & Athletic Conditioning', 'ACE Master Trainer, Crossfit L2', 8, 1400.00, 1600.00, 'Available', '2021-06-01', 1,
         'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'),
        (3, 4, 'TRN-003', 'David Kim', 'david.k@apexfit.com', '+91-98111-22203',
         'Olympic weightlifting coach and functional movement specialist helping clients break plateaus safely.',
         'Functional Training & Weightlifting', 'USAW L2, FMS Level 2', 7, 1300.00, 1500.00, 'Available', '2022-01-10', 2,
         'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'),
        (4, 5, 'TRN-004', 'Elena Rostova', 'elena.r@apexfit.com', '+91-98111-22204',
         'Classical Pilates and Ashtanga Yoga instructor dedicated to spine health, deep core engagement, and mindful flexibility.',
         'Yoga & Pilates Sculpt', 'RYT-500, Stott Pilates Comprehensive', 9, 1200.00, 1400.00, 'Available', '2022-04-18', 1,
         'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'),
        (5, 6, 'TRN-005', 'Rachel Green', 'rachel.g@apexfit.com', '+91-98111-22205',
         'Cardio dance choreographer and Zumba specialist bringing infectious energy, rhythm, and cardiovascular endurance.',
         'Dance Fitness & Zumba', 'ZIN Licensed, AFAA Group Fitness', 6, 1100.00, 1300.00, 'Available', '2023-02-01', 2,
         'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'),
        (6, 7, 'TRN-006', 'Vikram Malhotra', 'vikram.m@apexfit.com', '+91-98111-22206',
         'Golden Gloves boxer and combat conditioning coach teaching striking fundamentals and explosive core strength.',
         'Boxing Conditioning & Combat', 'ISSA Combat Fitness, AIBA Certified', 8, 1400.00, 1600.00, 'Available', '2023-05-12', 3,
         'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'),
    ]
    cur.executemany("""
        INSERT INTO trainers (id, user_id, trainer_code, full_name, email, phone, bio, specialization, certification, experience_years, hourly_rate, session_price, availability_status, hire_date, location_id, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, trainers_data)

    # 7. TRAINER SPECIALIZATIONS
    print("7. Seeding Trainer Specializations...")
    cur.execute("TRUNCATE TABLE trainer_specializations;")
    specs = [
        (1, 'Strength', 'Elite'),
        (1, 'Hypertrophy', 'Master'),
        (2, 'HIIT', 'Elite'),
        (2, 'Cardio', 'Master'),
        (3, 'Functional', 'Elite'),
        (3, 'Weightlifting', 'Master'),
        (4, 'Yoga', 'Elite'),
        (4, 'Pilates', 'Elite'),
        (5, 'Dance', 'Elite'),
        (5, 'Zumba', 'Elite'),
        (6, 'Boxing', 'Elite'),
        (6, 'Recovery', 'Expert'),
    ]
    cur.executemany("""
        INSERT INTO trainer_specializations (trainer_id, category, proficiency_level)
        VALUES (%s, %s, %s)
    """, specs)

    # 8. TRAINER AVAILABILITY (Weekly Schedule: Days 0..6, 06:00 to 21:00)
    print("8. Seeding Trainer Availability...")
    cur.execute("TRUNCATE TABLE trainer_availability;")
    avail_rows = []
    # All 6 trainers available across weekdays and weekends with multiple slots
    for t_id in range(1, 7):
        for day in range(7): # 0=Sun, 1=Mon... 6=Sat
            # Morning slot
            avail_rows.append((t_id, day, '06:00:00', '11:00:00', 'any', True))
            # Evening slot
            avail_rows.append((t_id, day, '16:00:00', '21:00:00', 'any', True))
    cur.executemany("""
        INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time, slot_type, is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, avail_rows)

    # 9. MEMBERSHIP PLANS (Cult-inspired INR pricing)
    print("9. Seeding Membership Plans...")
    cur.execute("TRUNCATE TABLE membership_plans;")
    plans = [
        (1, 'Day Pass', 'Day', 499.00, 1,
         'Full 1-day access to gym facilities and any 1 group class session.',
         'Full Gym Access; 1 Group Class; Locker & Shower Access; WiFi',
         'Selected Centre', 1, 'Complimentary Fitness Consultation',
         'Valid for 24 hours from purchase. Non-refundable.', 'Active'),
        (2, 'Monthly Cult Pass', 'Monthly', 2499.00, 30,
         'Flexible 30-day membership with unlimited gym access and 12 group sessions.',
         'Nationwide Gym Access; 12 Group Fitness Classes; Bio-impedance Assessment; In-app Workout Tracker',
         'All Centres Nationwide', 12, '1 Personal Trainer Session Included',
         'Auto-renews unless cancelled 48h prior. Pause up to 7 days.', 'Active'),
        (3, 'Quarterly Active', 'Quarterly', 5999.00, 90,
         'Our most popular 3-month package for committed fitness transformations.',
         'Unlimited Gym Access; 36 Group Classes; Nutrition Consultation; 2 Guest Passes',
         'All Centres Nationwide', 36, '2 Personal Trainer Sessions Included',
         'Can be paused up to 14 days during validity.', 'Active'),
        (4, 'Half-Yearly Pro', 'Half-Yearly', 10499.00, 180,
         '6-month all-access fitness regime designed for sustainable body recomposition.',
         'Unlimited Gym Access; Unlimited Group Classes; Monthly Body Scan; 4 Guest Passes; 10% Merch Discount',
         'All Centres Nationwide', 0, '4 Personal Trainer Sessions Included',
         'Can be paused up to 30 days. Priority class slot booking.', 'Active'),
        (5, 'Annual Platinum', 'Annual', 17999.00, 365,
         'Comprehensive 1-year premium fitness journey with nationwide multi-club privileges.',
         'Unlimited Nationwide Gym Access; Unlimited Group Classes; Unlimited Recovery Zone; 8 Guest Passes; Free Merchandise Kit',
         'All Centres Nationwide', 0, '6 Personal Trainer Sessions Included',
         'Can be paused up to 60 days. 100% transferrable once.', 'Active'),
        (6, 'Cult Elite VIP (with PT)', 'Elite', 29999.00, 365,
         'The ultimate luxury experience: 1-year VIP gym, unlimited classes, and 24 private 1-on-1 trainer sessions.',
         'VIP Gym Access; Unlimited Classes; 24 Dedicated 1-on-1 PT Sessions; Personalized Nutrition Plan; Dedicated Locker; Spa & Recovery Suite',
         'All Centres Nationwide', 0, '24 Dedicated 1-on-1 PT Sessions Included',
         'VIP Concierge support, full pause flexibility, no cancellation fees.', 'Active'),
    ]
    cur.executemany("""
        INSERT INTO membership_plans (id, plan_name, plan_tier, price, duration_days, description, benefits, gym_access, included_sessions, trainer_benefits, terms, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, plans)

    # 10. FITNESS CLASSES (Rich imagery and details)
    print("10. Seeding Fitness Classes...")
    cur.execute("TRUNCATE TABLE fitness_classes;")
    classes = [
        (1, 'Strength & Conditioning', 'Strength', 'Intermediate', 55, 24,
         'Progressive overload resistance training utilizing barbells, kettlebells, and bodyweight to build functional muscle density and strength.',
         'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
         0.00, True),
        (2, 'HIIT Burn & Shred', 'HIIT', 'Advanced', 45, 20,
         'High-intensity interval training designed to push VO2 max, spike metabolic burn, and accelerate caloric expenditure.',
         'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
         0.00, True),
        (3, 'Vinyasa Flow Yoga', 'Yoga', 'All Levels', 60, 25,
         'Dynamic synchronization of breath and fluid movement designed to enhance flexibility, spinal alignment, and mental serenity.',
         'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
         0.00, True),
        (4, 'Core & Pilates Sculpt', 'Pilates', 'Intermediate', 50, 22,
         'Targeted powerhouse core conditioning combining mat Pilates, resistance bands, and isometric holds for posture and stability.',
         'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
         0.00, True),
        (5, 'Zumba Dance Fiesta', 'Dance', 'Beginner', 55, 30,
         'High-energy dance workout fusing Latin and global rhythms for an exhilarating, calorie-torching cardio party.',
         'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?auto=format&fit=crop&w=800&q=80',
         0.00, True),
        (6, 'Rumble Boxing Conditioning', 'Boxing', 'Intermediate', 50, 20,
         'Heavy bag work, shadow boxing, footwork drills, and core conditioning inspired by genuine fighter training camps.',
         'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80',
         0.00, True),
        (7, 'Functional Athleticism', 'Functional', 'Advanced', 50, 18,
         'Multi-planar movement patterns incorporating sleds, plyo boxes, battle ropes, and sandbags for raw athletic performance.',
         'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
         0.00, True),
        (8, 'Mobility & Guided Recovery', 'Recovery', 'All Levels', 45, 25,
         'Foam rolling, myofascial release, joint decompression, and deep stretching designed to accelerate recovery and eliminate stiffness.',
         'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
         0.00, True),
    ]
    cur.executemany("""
        INSERT INTO fitness_classes (id, class_name, category, difficulty_level, duration_minutes, default_capacity, description, image_url, price, membership_inclusive)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, classes)

    # 11. EQUIPMENT
    print("11. Seeding Equipment Inventory...")
    cur.execute("TRUNCATE TABLE equipment;")
    legacy_equip = load_json('/Users/tejaswigunda/DBMS/legacy_dump/equipment.json')
    if legacy_equip:
        equip_rows = []
        for eq in legacy_equip:
            qty = eq.get('quantity', 5)
            # calculate operational qty
            op_qty = qty if eq.get('status') == 'Operational' else max(1, qty - 1)
            equip_rows.append((
                eq.get('id'), eq.get('equipment_code'), eq.get('name'), eq.get('category'),
                eq.get('brand'), qty, op_qty, eq.get('location', 'Main Strength Floor'),
                eq.get('purchase_date', '2023-01-10'), eq.get('condition_status', 'Good'),
                eq.get('status', 'Operational'), None
            ))
        cur.executemany("""
            INSERT INTO equipment (id, equipment_code, name, category, brand, quantity, operational_quantity, location, purchase_date, condition_status, status, next_maintenance_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, equip_rows)

    # 12. CLASS EQUIPMENT REQUIREMENTS
    print("12. Seeding Class Equipment Requirements...")
    cur.execute("TRUNCATE TABLE class_equipment_requirements;")
    class_equip_reqs = [
        (1, 4, 1, 0), # Strength requires Olympic Barbells
        (1, 3, 1, 0), # Strength requires Power Racks
        (2, 5, 1, 0), # HIIT requires Dumbbells
        (2, 6, 1, 0), # HIIT requires Kettlebells
        (3, 11, 1, 0), # Yoga requires Yoga Mats
        (4, 11, 1, 0), # Pilates requires Yoga Mats
        (6, 12, 1, 0), # Boxing requires Heavy Bags & Gloves
        (7, 9, 1, 0), # Functional requires Rowing Machines & Boxes
    ]
    # Check what equipment IDs exist before inserting
    cur.execute("SELECT id FROM equipment;")
    existing_eq_ids = {r['id'] for r in cur.fetchall()}
    valid_reqs = [r for r in class_equip_reqs if r[1] in existing_eq_ids]
    if valid_reqs:
        cur.executemany("""
            INSERT INTO class_equipment_requirements (class_id, equipment_id, units_required_per_member, total_units_required)
            VALUES (%s, %s, %s, %s)
        """, valid_reqs)

    # 13. MAINTENANCE RECORDS (From legacy dump)
    print("13. Seeding Maintenance Records...")
    cur.execute("TRUNCATE TABLE maintenance_records;")
    legacy_maint = load_json('/Users/tejaswigunda/DBMS/legacy_dump/maintenance.json')
    if legacy_maint:
        maint_rows = []
        for m in legacy_maint:
            maint_rows.append((
                m.get('id'), m.get('equipment_id'), m.get('maintenance_type', 'Routine Inspection'),
                m.get('description'), m.get('cost', 0.0), m.get('technician', 'Apex Technician'),
                m.get('reported_date', '2025-06-01'), m.get('completion_date'),
                m.get('next_maintenance_date'), m.get('status', 'Completed')
            ))
        cur.executemany("""
            INSERT INTO maintenance_records (id, equipment_id, maintenance_type, description, cost, technician, reported_date, completion_date, next_maintenance_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, maint_rows)

    # 14. CLASS SCHEDULES (Upcoming sessions for today and next 14 days)
    print("14. Seeding Class Schedules (Today through Next 14 Days)...")
    cur.execute("TRUNCATE TABLE class_schedules;")
    today = datetime.date.today()
    sched_id = 1
    sched_rows = []
    
    # Schedule templates per day
    templates = [
        (1, 1, 1, '06:30:00', '07:25:00', 24), # Strength w/ Marcus in Room 1
        (2, 2, 3, '07:30:00', '08:15:00', 20), # HIIT w/ Sarah in Room 3
        (3, 4, 2, '08:30:00', '09:30:00', 25), # Yoga w/ Elena in Room 2
        (4, 4, 2, '10:00:00', '10:50:00', 22), # Pilates w/ Elena in Room 2
        (5, 5, 3, '17:00:00', '17:55:00', 30), # Zumba w/ Rachel in Room 3
        (6, 6, 5, '18:15:00', '19:05:00', 20), # Boxing w/ Vikram in Room 5
        (7, 3, 1, '19:15:00', '20:05:00', 18), # Functional w/ David in Room 1
        (8, 4, 2, '20:15:00', '21:00:00', 25), # Recovery w/ Elena in Room 2
    ]

    for day_offset in range(0, 15): # today + next 14 days
        s_date = today + datetime.timedelta(days=day_offset)
        for class_id, trainer_id, room_id, start_t, end_t, cap in templates:
            # For today and tomorrow, set some pre-booked capacity
            booked = 4 if day_offset == 0 else (2 if day_offset == 1 else 0)
            sched_rows.append((
                sched_id, class_id, trainer_id, room_id, s_date.strftime('%Y-%m-%d'),
                start_t, end_t, cap, booked, 'Scheduled'
            ))
            sched_id += 1

    cur.executemany("""
        INSERT INTO class_schedules (id, class_id, trainer_id, room_id, session_date, start_time, end_time, max_capacity, booked_capacity, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, sched_rows)

    # 15. SUBSCRIPTIONS (From legacy dump + Active subscription for Tejaswi)
    print("15. Seeding Subscriptions...")
    cur.execute("TRUNCATE TABLE subscriptions;")
    legacy_subs = load_json('/Users/tejaswigunda/DBMS/legacy_dump/subscriptions.json')
    sub_rows = []
    
    # Tejaswi active subscription (Annual Platinum)
    sub_rows.append((
        1, 1, 5, today.strftime('%Y-%m-%d'), (today + datetime.timedelta(days=365)).strftime('%Y-%m-%d'),
        17999.00, 'Active', None
    ))

    for s in legacy_subs:
        if s.get('id') == 1:
            continue
        sub_rows.append((
            s.get('id'), s.get('member_id'), s.get('plan_id', 1),
            s.get('start_date'), s.get('end_date'), s.get('agreed_price', 1999.00),
            s.get('status', 'Active'), None
        ))
    cur.executemany("""
        INSERT INTO subscriptions (id, member_id, plan_id, start_date, end_date, agreed_price, status, payment_order_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, sub_rows)

    # 16. SUBSCRIPTION RENEWALS
    print("16. Seeding Subscription Renewals...")
    cur.execute("TRUNCATE TABLE subscription_renewals;")
    renewals = [
        (1, 1, 1, 1, '2025-01-10', 17999.00, 'TXN-INIT-001', 'SYSTEM'),
        (2, 2, 2, 2, '2025-10-14', 17999.00, 'TXN-REN-002', 'RECEPTION'),
        (3, 4, 4, 4, '2025-02-10', 5999.00, 'TXN-REN-004', 'RECEPTION'),
    ]
    cur.executemany("""
        INSERT INTO subscription_renewals (id, member_id, previous_subscription_id, new_subscription_id, renewal_date, renewal_amount, payment_ref, processed_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, renewals)

    # 17. CLASS REGISTRATIONS & BOOKINGS
    print("17. Seeding Class Registrations...")
    cur.execute("TRUNCATE TABLE class_registrations;")
    reg_rows = [
        (1, 1, 1, None, datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'Confirmed', None, 'Included', 0.00),
        (2, 1, 2, None, datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'Confirmed', None, 'Included', 0.00),
        (3, 2, 1, None, '2026-10-10 10:00:00', 'Confirmed', None, 'Included', 0.00),
        (4, 3, 1, None, '2026-10-10 10:15:00', 'Confirmed', None, 'Included', 0.00),
        (5, 4, 2, None, '2026-10-10 11:00:00', 'Confirmed', None, 'Included', 0.00),
    ]
    cur.executemany("""
        INSERT INTO class_registrations (id, member_id, schedule_id, hold_id, booking_time, status, cancellation_time, payment_status, amount_paid)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, reg_rows)

    # 18. PERSONAL TRAINING BOOKINGS
    print("18. Seeding Personal Training Bookings...")
    cur.execute("TRUNCATE TABLE personal_training_bookings;")
    pt_rows = [
        (1, 1, 1, today.strftime('%Y-%m-%d'), '11:00:00', '12:00:00', 1800.00, 'Confirmed', 'Paid', None, 'Focused on deadlift technique & form analysis'),
        (2, 2, 2, (today + datetime.timedelta(days=1)).strftime('%Y-%m-%d'), '16:00:00', '17:00:00', 1600.00, 'Confirmed', 'Paid', None, 'VO2 max ramp test & sprint intervals'),
        (3, 3, 4, (today + datetime.timedelta(days=2)).strftime('%Y-%m-%d'), '09:00:00', '10:00:00', 1400.00, 'Pending', 'Pending', None, 'Pilates core rehab & flexibility'),
    ]
    cur.executemany("""
        INSERT INTO personal_training_bookings (id, member_id, trainer_id, booking_date, start_time, end_time, price, status, payment_status, hold_id, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, pt_rows)

    # 19. ATTENDANCE
    print("19. Seeding Attendance...")
    cur.execute("TRUNCATE TABLE attendance;")
    cur.execute("""
        INSERT INTO attendance (id, registration_id, pt_booking_id, member_id, check_in_time, attendance_status, remarks, recorded_by)
        VALUES 
        (1, 1, NULL, 1, NOW(), 'Present', 'QR Check-in successful via App', 'MEMBER_PORTAL'),
        (2, 3, NULL, 2, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Present', 'Turnstile auto-check', 'RECEPTION'),
        (3, 4, NULL, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Late', 'Late by 10 mins', 'TRAINER_MARCUS');
    """)

    # 20. PAYMENT ORDERS & TRANSACTIONS
    print("20. Seeding Payment Orders & Transactions...")
    cur.execute("TRUNCATE TABLE payment_orders;")
    cur.execute("TRUNCATE TABLE payment_transactions;")
    cur.execute("TRUNCATE TABLE payment_status_history;")
    
    pay_orders = [
        (1, 'ORD-20261012-001', 1, 'membership', 5, 17999.00, 'INR', 'upi://pay?pa=apexfit@razorpay&pn=ApexFit%20Fitness&am=17999.00&tr=ORD-20261012-001&cu=INR', 'SUCCESS', (datetime.datetime.now() + datetime.timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')),
        (2, 'ORD-20261012-002', 1, 'personal_training', 1, 1800.00, 'INR', 'upi://pay?pa=apexfit@razorpay&pn=ApexFit%20Fitness&am=1800.00&tr=ORD-20261012-002&cu=INR', 'SUCCESS', (datetime.datetime.now() + datetime.timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')),
        (3, 'ORD-20261012-003', 2, 'membership', 2, 2499.00, 'INR', 'upi://pay?pa=apexfit@razorpay&pn=ApexFit%20Fitness&am=2499.00&tr=ORD-20261012-003&cu=INR', 'SUCCESS', (datetime.datetime.now() + datetime.timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')),
        (4, 'ORD-20261012-004', 3, 'membership', 3, 5999.00, 'INR', 'upi://pay?pa=apexfit@razorpay&pn=ApexFit%20Fitness&am=5999.00&tr=ORD-20261012-004&cu=INR', 'PENDING', (datetime.datetime.now() + datetime.timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')),
    ]
    cur.executemany("""
        INSERT INTO payment_orders (id, order_ref, member_id, item_type, item_id, amount, currency, upi_qr_payload, status, expires_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, pay_orders)

    pay_txns = [
        (1, 1, 'TXN-20261012-001', 'RAZORPAY_UPI', 'pay_Q9xN12093847', 'sig_valid_001', 17999.00, 'INR', 'UPI_QR', 'SUCCESS', '{"method": "upi", "bank": "HDFC", "vpa": "tejaswi@oksbi"}'),
        (2, 2, 'TXN-20261012-002', 'RAZORPAY_UPI', 'pay_Q9xN12093848', 'sig_valid_002', 1800.00, 'INR', 'UPI_QR', 'SUCCESS', '{"method": "upi", "bank": "ICICI", "vpa": "tejaswi@icici"}'),
        (3, 3, 'TXN-20261012-003', 'RAZORPAY_UPI', 'pay_Q9xN12093849', 'sig_valid_003', 2499.00, 'INR', 'UPI_QR', 'SUCCESS', '{"method": "upi", "bank": "SBI", "vpa": "sophia@upi"}'),
    ]
    cur.executemany("""
        INSERT INTO payment_transactions (id, payment_order_id, transaction_ref, provider, provider_payment_id, provider_signature, amount, currency, payment_method, status, raw_response)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, pay_txns)

    # 21. FITNESS ASSESSMENTS
    print("21. Seeding Fitness Assessments...")
    cur.execute("TRUNCATE TABLE fitness_assessments;")
    cur.execute("""
        INSERT INTO fitness_assessments (id, member_id, trainer_id, assessment_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, systolic_bp, diastolic_bp, target_goals, notes)
        VALUES
        (1, 1, 1, '2026-10-01', 74.50, 178.00, 23.51, 15.20, 36.80, 118, 78, 'Gain 3kg lean muscle and increase deadlift 1RM by 20kg', 'Excellent mobility, good baseline posture. Emphasize posterior chain volume.'),
        (2, 2, 2, '2026-09-20', 62.00, 165.00, 22.77, 21.50, 26.10, 115, 75, 'Improve cardiovascular endurance and run 10k under 50 mins', 'Very strong aerobic base. Recommend adding tempo intervals.'),
        (3, 3, 3, '2026-09-15', 82.00, 182.00, 24.75, 18.00, 38.50, 122, 80, 'Fat loss and functional explosive athleticism', 'Focus on hip mobility and kettlebell clean & press technique.');
    """)

    # 22. WORKOUT PROGRAMS
    print("22. Seeding Workout Programs...")
    cur.execute("TRUNCATE TABLE workout_programs;")
    programs = [
        (1, 'Hypertrophy & Strength 4-Day Split', 'Strength', 'Intermediate', 8,
         'Four-day upper/lower compound split focusing on progressive mechanical tension and myofibrillar hypertrophy.',
         json.dumps([
             {"day": "Day 1 (Upper A)", "exercises": ["Barbell Bench Press 4x6", "Barbell Bent-Over Row 4x8", "Overhead Press 3x8", "Lat Pulldown 3x10", "Dumbbell Incline Curl 3x12"]},
             {"day": "Day 2 (Lower A)", "exercises": ["Barbell Back Squat 4x6", "Romanian Deadlift 3x8", "Leg Press 3x12", "Standing Calf Raise 4x15", "Hanging Leg Raise 3x15"]},
             {"day": "Day 3 (Upper B)", "exercises": ["Incline Dumbbell Press 4x8", "Weighted Pull-Up 4x6", "Dumbbell Lateral Raise 4x15", "Cable Face Pull 3x15", "Tricep Rope Pushdown 3x12"]},
             {"day": "Day 4 (Lower B)", "exercises": ["Conventional Deadlift 3x5", "Front Squat 3x8", "Walking Dumbbell Lunge 3x10/leg", "Hamstring Curl 3x12", "Ab Wheel Rollout 3x12"]}
         ]), 1),
        (2, 'Metabolic Conditioning & Core Shred', 'HIIT', 'Advanced', 6,
         'Six-week high-density circuit training to maximize EPOC (excess post-exercise oxygen consumption) and core firmness.',
         json.dumps([
             {"day": "Session 1", "exercises": ["Kettlebell Swings 5x20", "Burpee Box Jumps 5x12", "Assault Bike Sprints 5x30s", "Battle Ropes 5x45s"]},
             {"day": "Session 2", "exercises": ["Dumbbell Thrusters 4x12", "Rowing Intervals 5x500m", "Medicine Ball Slams 4x15", "Plank Reach 4x60s"]}
         ]), 2),
        (3, 'Yoga Flow & Structural Mobility', 'Recovery', 'Beginner', 4,
         'Four-week gentle restorational mobility program prioritizing thoracic spine rotation and hip flexibility.',
         json.dumps([
             {"day": "Routine A", "exercises": ["Cat-Cow 10 reps", "Downward Dog into Cobra 8 flows", "Pigeon Pose 2 min/side", "Lizard Pose 2 min/side"]},
             {"day": "Routine B", "exercises": ["Thoracic Thread the Needle 10/side", "Deep Squat Hold 3 min", "Shoulder Dislocates 15 reps", "Supine Spinal Twist 2 min/side"]}
         ]), 4)
    ]
    cur.executemany("""
        INSERT INTO workout_programs (id, title, category, difficulty_level, duration_weeks, description, exercises_json, created_by_trainer_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, programs)

    # 23. PROGRAM ASSIGNMENTS
    print("23. Seeding Program Assignments...")
    cur.execute("TRUNCATE TABLE program_assignments;")
    cur.execute("""
        INSERT INTO program_assignments (id, member_id, program_id, trainer_id, assigned_date, status, completion_percentage, notes)
        VALUES
        (1, 1, 1, 1, '2026-10-01', 'Active', 45, 'Great progression on Week 3. Bench press moved up to 85kg 4x6 smoothly.'),
        (2, 2, 2, 2, '2026-09-25', 'Active', 60, 'VO2 max improving rapidly. Keep hydration steady on high intensity days.');
    """)

    # 24. AUDIT LOGS
    print("24. Seeding Admin Audit Logs...")
    cur.execute("TRUNCATE TABLE admin_audit_logs;")
    cur.execute("""
        INSERT INTO admin_audit_logs (user_id, action, target_entity, target_id, details, ip_address)
        VALUES
        (1, 'SYSTEM_INIT', 'SYSTEM', 1, 'Normalized 3NF MySQL Database initialized with Cult fitness schema upgrade', '127.0.0.1'),
        (1, 'SEAT_CAPACITY_OVERRIDE', 'class_schedules', 1, 'Capacity confirmed at 24 seats with 0 conflicts', '127.0.0.1');
    """)

    cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
    print("✅ All 30 MySQL Tables successfully seeded with rich, realistic Cult-inspired fitness data!")
    conn.close()

if __name__ == '__main__':
    run_seed()
