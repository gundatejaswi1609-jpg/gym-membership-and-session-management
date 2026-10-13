-- ==============================================================================
-- APEXFIT / CULT-INSPIRED PREMIUM FITNESS & DBMS MANAGEMENT SYSTEM
-- Relational Schema Architecture (Normalized 3NF MySQL Database)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS payment_status_history;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS payment_orders;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS personal_training_bookings;
DROP TABLE IF EXISTS class_registrations;
DROP TABLE IF EXISTS booking_holds;
DROP TABLE IF EXISTS equipment_allocations;
DROP TABLE IF EXISTS class_equipment_requirements;
DROP TABLE IF EXISTS maintenance_records;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS class_schedules;
DROP TABLE IF EXISTS fitness_classes;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS gym_locations;
DROP TABLE IF EXISTS program_assignments;
DROP TABLE IF EXISTS workout_programs;
DROP TABLE IF EXISTS fitness_assessments;
DROP TABLE IF EXISTS subscription_renewals;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS membership_plans;
DROP TABLE IF EXISTS trainer_unavailability;
DROP TABLE IF EXISTS trainer_availability;
DROP TABLE IF EXISTS trainer_specializations;
DROP TABLE IF EXISTS trainers;
DROP TABLE IF EXISTS emergency_contacts;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS (Authentication & Role-Based Access Control)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'trainer', 'member') NOT NULL DEFAULT 'member',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. GYM LOCATIONS
CREATE TABLE gym_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 200,
    opening_time TIME NOT NULL DEFAULT '06:00:00',
    closing_time TIME NOT NULL DEFAULT '22:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ROOMS
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 30,
    room_type ENUM('Studio', 'Main Gym Floor', 'Spin Room', 'Yoga Shala', 'Boxing Arena', 'Recovery Zone') NOT NULL DEFAULT 'Studio',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rooms_location FOREIGN KEY (location_id) REFERENCES gym_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. MEMBERS (Core Member Profile)
CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    member_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    dob DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Non-Binary', 'Other') NOT NULL,
    address VARCHAR(255) NOT NULL,
    emergency_contact VARCHAR(100) NOT NULL,
    emergency_phone VARCHAR(30) NOT NULL,
    age INT NOT NULL DEFAULT 25,
    weight_kg DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    height_cm DECIMAL(5,2) NOT NULL DEFAULT 175.00,
    bmi DECIMAL(4,2) NOT NULL DEFAULT 22.86,
    avatar_url VARCHAR(500) NULL,
    status ENUM('Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active',
    registration_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_members_phone (phone),
    INDEX idx_members_status (status),
    INDEX idx_members_reg_date (registration_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. EMERGENCY CONTACTS (1:N Contact Entity)
CREATE TABLE emergency_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_emergency_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TRAINERS
CREATE TABLE trainers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    trainer_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    bio TEXT,
    specialization VARCHAR(100) NOT NULL,
    certification VARCHAR(150) NOT NULL,
    experience_years INT NOT NULL DEFAULT 1,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    session_price DECIMAL(10,2) NOT NULL DEFAULT 1200.00,
    availability_status ENUM('Available', 'Busy', 'On Leave') NOT NULL DEFAULT 'Available',
    hire_date DATE NOT NULL,
    location_id INT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trainers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_trainers_location FOREIGN KEY (location_id) REFERENCES gym_locations(id) ON DELETE SET NULL,
    INDEX idx_trainers_status (availability_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TRAINER SPECIALIZATIONS
CREATE TABLE trainer_specializations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trainer_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    proficiency_level ENUM('Expert', 'Master', 'Elite') NOT NULL DEFAULT 'Expert',
    CONSTRAINT fk_spec_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    UNIQUE KEY uq_trainer_spec (trainer_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TRAINER AVAILABILITY (Weekly Schedule Slots)
CREATE TABLE trainer_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trainer_id INT NOT NULL,
    day_of_week INT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type ENUM('personal_training', 'class', 'any') NOT NULL DEFAULT 'any',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_avail_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    INDEX idx_avail_day_time (trainer_id, day_of_week, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TRAINER UNAVAILABILITY (Leave / Blocked Dates)
CREATE TABLE trainer_unavailability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trainer_id INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_unavail_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    INDEX idx_unavail_range (trainer_id, start_datetime, end_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. MEMBERSHIP PLANS
CREATE TABLE membership_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    plan_tier ENUM('Day', 'Monthly', 'Quarterly', 'Half-Yearly', 'Annual', 'Elite') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_days INT NOT NULL,
    description TEXT NOT NULL,
    benefits TEXT NOT NULL,
    gym_access VARCHAR(100) NOT NULL DEFAULT 'All Centres Nationwide',
    included_sessions INT NOT NULL DEFAULT 0 COMMENT '0 means Unlimited Group Classes',
    trainer_benefits VARCHAR(255) NOT NULL DEFAULT '1 Complimentary PT Assessment',
    terms TEXT,
    status ENUM('Active', 'Archived') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. SUBSCRIPTIONS
CREATE TABLE subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    agreed_price DECIMAL(10,2) NOT NULL,
    status ENUM('Active', 'Expired', 'Cancelled', 'Pending') NOT NULL DEFAULT 'Active',
    payment_order_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sub_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT,
    INDEX idx_sub_status_dates (status, start_date, end_date),
    INDEX idx_sub_member (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. SUBSCRIPTION RENEWALS (Audit Trail)
CREATE TABLE subscription_renewals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    previous_subscription_id INT NOT NULL,
    new_subscription_id INT NOT NULL,
    renewal_date DATE NOT NULL,
    renewal_amount DECIMAL(10,2) NOT NULL,
    payment_ref VARCHAR(100) NOT NULL,
    processed_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ren_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ren_prev FOREIGN KEY (previous_subscription_id) REFERENCES subscriptions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ren_new FOREIGN KEY (new_subscription_id) REFERENCES subscriptions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. FITNESS ASSESSMENTS
CREATE TABLE fitness_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    trainer_id INT NOT NULL,
    assessment_date DATE NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    height_cm DECIMAL(5,2) NOT NULL,
    bmi DECIMAL(4,2) NOT NULL,
    body_fat_percentage DECIMAL(4,2) NOT NULL,
    muscle_mass_kg DECIMAL(4,2) NOT NULL,
    systolic_bp INT NOT NULL,
    diastolic_bp INT NOT NULL,
    target_goals TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assess_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_assess_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. WORKOUT PROGRAMS
CREATE TABLE workout_programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
    duration_weeks INT NOT NULL DEFAULT 4,
    description TEXT NOT NULL,
    exercises_json TEXT,
    created_by_trainer_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prog_trainer FOREIGN KEY (created_by_trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. PROGRAM ASSIGNMENTS
CREATE TABLE program_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    program_id INT NOT NULL,
    trainer_id INT NOT NULL,
    assigned_date DATE NOT NULL,
    status ENUM('Active', 'Completed', 'Paused') NOT NULL DEFAULT 'Active',
    completion_percentage INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prog_assign_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_prog_assign_prog FOREIGN KEY (program_id) REFERENCES workout_programs(id) ON DELETE CASCADE,
    CONSTRAINT fk_prog_assign_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_member_prog (member_id, program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. FITNESS CLASSES
CREATE TABLE fitness_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty_level VARCHAR(50) NOT NULL DEFAULT 'All Levels',
    duration_minutes INT NOT NULL DEFAULT 50,
    default_capacity INT NOT NULL DEFAULT 24,
    description TEXT NOT NULL,
    image_url VARCHAR(500),
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    membership_inclusive BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. CLASS SCHEDULES
CREATE TABLE class_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    trainer_id INT NOT NULL,
    room_id INT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INT NOT NULL DEFAULT 24,
    booked_capacity INT NOT NULL DEFAULT 0,
    status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sched_class FOREIGN KEY (class_id) REFERENCES fitness_classes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sched_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sched_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    INDEX idx_sched_date_time (session_date, start_time),
    INDEX idx_sched_trainer (trainer_id, session_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. EQUIPMENT INVENTORY
CREATE TABLE equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    operational_quantity INT NOT NULL DEFAULT 1,
    location VARCHAR(100) NOT NULL DEFAULT 'Main Strength Floor',
    purchase_date DATE NOT NULL,
    condition_status VARCHAR(50) NOT NULL DEFAULT 'Good',
    status VARCHAR(50) NOT NULL DEFAULT 'Operational',
    next_maintenance_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_equip_status (status),
    INDEX idx_equip_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. CLASS EQUIPMENT REQUIREMENTS
CREATE TABLE class_equipment_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    equipment_id INT NOT NULL,
    units_required_per_member INT NOT NULL DEFAULT 1,
    total_units_required INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_req_class FOREIGN KEY (class_id) REFERENCES fitness_classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_req_equip FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    UNIQUE KEY uq_class_equip (class_id, equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. EQUIPMENT ALLOCATIONS (Time-Based Resource Tracking)
CREATE TABLE equipment_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NULL,
    equipment_id INT NOT NULL,
    allocated_quantity INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    status ENUM('Reserved', 'Active', 'Released') NOT NULL DEFAULT 'Reserved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alloc_sched FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_equip FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    INDEX idx_alloc_range (equipment_id, start_datetime, end_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. MAINTENANCE RECORDS
CREATE TABLE maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    maintenance_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    technician VARCHAR(100) NOT NULL,
    reported_date DATE NOT NULL,
    completion_date DATE NULL,
    next_maintenance_date DATE NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Reported',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_maint_equip FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    INDEX idx_maint_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. BOOKING HOLDS (Prevents Race Conditions / Double Booking)
CREATE TABLE booking_holds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    schedule_id INT NULL,
    session_type ENUM('class', 'personal_training') NOT NULL DEFAULT 'class',
    trainer_id INT NULL,
    booking_date DATE NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    hold_token VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    status ENUM('active', 'consumed', 'expired', 'released') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hold_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_hold_sched FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_hold_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
    INDEX idx_hold_token (hold_token),
    INDEX idx_hold_expires (expires_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. CLASS REGISTRATIONS
CREATE TABLE class_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    schedule_id INT NOT NULL,
    hold_id INT NULL,
    booking_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Confirmed', 'Cancelled', 'Waitlist', 'Attended', 'No-Show') NOT NULL DEFAULT 'Confirmed',
    cancellation_time DATETIME NULL,
    payment_status ENUM('Included', 'Paid', 'Pending', 'Refunded') NOT NULL DEFAULT 'Included',
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reg_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reg_sched FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reg_hold FOREIGN KEY (hold_id) REFERENCES booking_holds(id) ON DELETE SET NULL,
    UNIQUE KEY uq_member_schedule (member_id, schedule_id),
    INDEX idx_reg_member (member_id),
    INDEX idx_reg_sched (schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. PERSONAL TRAINING BOOKINGS
CREATE TABLE personal_training_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    trainer_id INT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('Confirmed', 'Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    payment_status ENUM('Paid', 'Pending', 'Included', 'Refunded') NOT NULL DEFAULT 'Pending',
    hold_id INT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pt_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pt_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pt_hold FOREIGN KEY (hold_id) REFERENCES booking_holds(id) ON DELETE SET NULL,
    INDEX idx_pt_trainer_date (trainer_id, booking_date, start_time),
    INDEX idx_pt_member (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. ATTENDANCE
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NULL,
    pt_booking_id INT NULL,
    member_id INT NOT NULL,
    check_in_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attendance_status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
    remarks VARCHAR(255),
    recorded_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_att_reg FOREIGN KEY (registration_id) REFERENCES class_registrations(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_pt FOREIGN KEY (pt_booking_id) REFERENCES personal_training_bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    INDEX idx_att_checkin (check_in_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. PAYMENT ORDERS
CREATE TABLE payment_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_ref VARCHAR(50) NOT NULL UNIQUE,
    member_id INT NOT NULL,
    item_type ENUM('membership', 'class', 'personal_training') NOT NULL,
    item_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    upi_qr_payload TEXT,
    status ENUM('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pay_order_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    INDEX idx_pay_order_ref (order_ref),
    INDEX idx_pay_order_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. PAYMENT TRANSACTIONS
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_order_id INT NOT NULL,
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY_UPI',
    provider_payment_id VARCHAR(100) NULL,
    provider_signature VARCHAR(255) NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI_QR',
    status ENUM('SUCCESS', 'FAILED', 'PENDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    raw_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trans_order FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id) ON DELETE CASCADE,
    INDEX idx_trans_ref (transaction_ref),
    INDEX idx_trans_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. PAYMENT STATUS HISTORY (Audit Trail)
CREATE TABLE payment_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_order_id INT NOT NULL,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(255),
    changed_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hist_order FOREIGN KEY (payment_order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. REFUNDS
CREATE TABLE refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_transaction_id INT NOT NULL,
    refund_ref VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('PENDING', 'PROCESSED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    processed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ref_trans FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. ADMIN AUDIT LOGS
CREATE TABLE admin_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_id INT NULL,
    details TEXT,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
