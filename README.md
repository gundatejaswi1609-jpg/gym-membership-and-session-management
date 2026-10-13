# 🏋🏻‍♀️ ApexFit: Premium Fitness Membership, Class Booking & Trainer Management Platform
**Academic Relational Database Management System (DBMS) Capstone Project**

---

## 📌 Project Overview
**ApexFit** is an enterprise-grade, full-stack relational database management system (DBMS) application developed to demonstrate advanced database design, Third Normal Form (3NF) normalization, multi-resource conflict checking, ACID transactional concurrency guarantees, and automated complex SQL reporting.

Inspired by the refined consumer experience of modern fitness applications such as Cult, **ApexFit** features a light, elegant wellness aesthetic and seamlessly connects three distinct portal experiences backed by a live **MySQL 8** database engine, a Python Flask REST API backend, and a modern React 18 + Vite frontend with Tailwind CSS and Recharts.

---

## ✨ Three Connected Portal Experiences

### 1. 🧘 Member Portal (`/`)
- **Home Dashboard:** Hero promoting gym access & fitness classes, quick actions, active membership tier, countdown to expiration, recommended classes, popular instructors, and nearby flagship centres.
- **Explore Workouts:** Discipline categories (Strength, HIIT, Vinyasa Yoga, Core Pilates, Zumba Dance, Boxing Conditioning, Functional Athleticism, Recovery).
- **Gym Memberships:** Transparent plan tiers with INR pricing (Day Pass ₹499, Monthly Cult Pass ₹2,499, Quarterly Active ₹5,999, Half-Yearly Pro ₹10,499, Annual Platinum ₹17,999, Cult Elite VIP with PT ₹29,999).
- **Fitness Classes:** Interactive timetable with list/calendar views, filters by date, category, difficulty, instructor, and location, featuring real-time seat availability counters (`booked_capacity` / `max_capacity`).
- **Personal Trainers:** Certified coach profiles, specializations, hourly fees, and interactive 1-on-1 slot booking.
- **Find a Slot:** Universal scheduling wizard across all studio disciplines.
- **My Bookings:** Confirmed bookings with dynamic entry QR code passes and turnstile check-in simulation.
- **My Membership:** Active validity countdown, unlocked perks, 1-click renewal, and plan upgrade options.
- **Payment History:** Complete transaction ledger with order references, payment methods, and timestamps.
- **Fitness Progress:** Biometric logs (Weight, Height, BMI, Body Fat %, Muscle Mass, BP) with historical tracking.
- **Workout Programmes:** Trainer-prescribed personalized workout splits with exercises, sets, and reps.
- **Profile & Settings:** Demographics and emergency contact details.

### 2. 🏋️ Trainer Portal (`/trainer/dashboard`)
- **Coach Dashboard:** Real-time agenda of today's group classes and 1-on-1 personal training appointments.
- **Weekly Availability Calendar:** Interactive weekly grid with editable time windows, multiple slots per day, and slot types (`personal_training`, `class`, `any`).
- **Dynamic Slot Generation:** Dynamically generates bookable 1-hour slots by evaluating weekly availability, subtracting active bookings, scheduled classes, and approved leaves, with 15-minute buffers.
- **Session Roster & Attendance:** Attendance marking (Present, Absent, Late) and post-session notes.
- **Biometric Assessments:** Log biometric evaluations and target goals for assigned members.
- **Role Isolation:** Trainers are strictly restricted to their own schedule and assigned clients.

### 3. 🛡️ Admin Portal (`/admin`)
- **Executive Analytics:** Live KPI summary cards (Active Members, Subscriptions, Month Revenue, Asset Health) and occupancy trend charts built with Recharts.
- **Entity Management:** Members, Membership plans, Class schedules, Trainers, Equipment, Maintenance workorders, Payments, and Audit logs.
- **Administrative Overrides:** Studio capacity override with mandatory audit reason logging.
- **Equipment Resource Scheduling:** Tracks operational vs in-maintenance assets, class equipment dependencies, and time-window allocations.
- **Maintenance Workorders:** Logs repairs and immediately locks affected units from class allocation until marked completed.
- **18 Academic DBMS SQL Reports:** Interactive catalog running native MySQL queries with live tabular results, concept tags, and syntax-highlighted SQL.
- **Database Architecture & 3NF Defense:** Interactive relational schema statistics and normalization defense.

---

## 🔑 Portal Login Information, Passwords & Role Access Control (RBAC)

The platform enforces **strict Role-Based Access Control (RBAC)** across the backend and frontend. **Everyone cannot log into all 3 portals!** Each portal permits only its designated account type, and cross-portal access is blocked with HTTP 403 Forbidden.

### 1. 🧘 Member Portal Logins (`http://localhost:3000`)
*Permitted Role: `member` only. Cannot access Trainer or Admin Portals.*
- **Primary Member (Tejaswi Gunda):** `Username: tejaswi` | `Password: member123` (Annual Platinum Tier, active bookings & workout split)
- **Demo Member (Liam Henderson):** `Username: member_demo` | `Password: member123` (Standard member, ready for new subscription purchase)

### 2. 🏋️ Trainer Portal Logins (`http://localhost:3000` -> Trainer Portal)
*Permitted Role: `trainer` only. Cannot access Member or Admin Portals.*
- **Head Strength Coach (Marcus Fletcher):** `Username: trainer_marcus` | `Password: trainer123` (Indiranagar Flagship)
- **Master Yoga Trainer (Elena Rostova):** `Username: trainer_elena` | `Password: trainer123` (Koramangala Studio)
- **HIIT & Conditioning (Sarah Connor):** `Username: trainer_sarah` | `Password: trainer123`
- **Spin & Boxing (David Kim):** `Username: trainer_david` | `Password: trainer123`
- **Functional Specialist (Vikram Malhotra):** `Username: trainer_vikram` | `Password: trainer123`

### 3. 🛡️ Admin Portal Logins (`http://localhost:3000` -> Admin Portal)
*Permitted Role: `admin` only. Cannot be accessed by members or trainers.*
- **Director / System Administrator (Alex Vance):** `Username: admin` | `Password: admin123` (Full system access, studio capacity override, 18 SQL DBMS reports)

| Portal | Authorized Role | Sample Username | Password | Access Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Member Portal** | `member` | `tejaswi` | `member123` | Class booking, UPI QR payments, workout plans, QR entry passes |
| **Trainer Portal** | `trainer` | `trainer_marcus` | `trainer123` | Weekly availability grid, session rosters, attendance & biometrics |
| **Admin Portal** | `admin` | `admin` | `admin123` | Full administrative control, equipment maintenance, 18 SQL reports |

> 🔒 **Security Guard Active:** Attempting to log into a portal without the matching role will return **HTTP 403 Forbidden** (e.g., logging in as a Member on the Trainer Portal will display: *"Access Denied: Account has role 'member'. It cannot log into the Trainer Portal. Only certified Trainers are permitted."*).
> 
> 💡 **Quick Reference in UI:** Click the **"Portal Logins & Passwords"** key button in the top navigation bar at any time to view all accounts and use 1-click auto-fill during evaluations.

---

## 🎨 Visual Design Palette (Cult Light Aesthetic)

- **Warm Ivory (`#FAF8F3`):** Primary application canvas.
- **Soft Cream (`#F2EEE5`):** Secondary card backgrounds, pill badges, and input fills.
- **Deep Forest Green (`#24483B`):** Brand primary, headings, hero gradient, and active buttons.
- **Sage Green (`#B8C8AD`):** Subtle accents, borders, and icon highlights.
- **Muted Peach (`#EBC9B8`):** Warm accent for category cards.
- **Pale Lavender (`#E6E0F1`):** Gentle badge tint for membership tiers.
- **Charcoal Text (`#292D29`):** High-contrast body typography.
- **White Cards (`#FFFFFF`):** Rounded cards with 1px border and restrained box shadows.

---

## 💳 Functional UPI QR Payment Integration

The platform includes an authentic payment integration designed for Indian academic evaluations:

1. **NPCI-Compliant Dynamic UPI QR Payload:**
   ```
   upi://pay?pa=apexfit@razorpay&pn=ApexFit%20Wellness&am=2499.00&tr=ORD-20261012-6D8C36&tn=ApexFit-ORD-20261012-6D8C36&cu=INR
   ```
2. **10-Minute Expiring Booking Holds:** A temporary booking hold (`booking_holds`) is created with row-level locks on `class_schedules` to prevent race conditions during checkout.
3. **Cryptographic HMAC-SHA256 Verification:** Signatures are computed and verified server-side using the configured webhook secret.
4. **Idempotency Protection:** Detects duplicate transaction references (`TXN-*`) or provider payment IDs, preventing duplicate charges or subscription extensions.
5. **Academic Sandbox Simulator:** Clearly labeled test mode simulating authentic UPI authorization from bank apps (Google Pay, PhonePe, Paytm, BHIM) that verifies server-side signatures before activating resources.

---

## 🗄️ Relational Database Architecture (30 Tables in 3NF)

The MySQL database (`gym_db`) is normalized up to **Third Normal Form (3NF)**:

```
users
├── members (1:1 with users)
│   ├── emergency_contacts (1:N)
│   ├── subscriptions (N:1 with membership_plans)
│   │   └── subscription_renewals (audit trail)
│   ├── booking_holds (temporary holds)
│   ├── class_registrations (N:1 with class_schedules)
│   ├── personal_training_bookings (N:1 with trainers)
│   ├── attendance (N:1 with class_registrations / pt_bookings)
│   ├── fitness_assessments (N:1 with trainers)
│   ├── program_assignments (M:N junction with workout_programs)
│   └── payment_orders (1:N)
│       ├── payment_transactions (1:N)
│       │   └── refunds (1:N)
│       └── payment_status_history (audit log)
├── trainers (1:1 with users)
│   ├── trainer_specializations (1:N)
│   ├── trainer_availability (1:N weekly recurring slots)
│   ├── trainer_unavailability (leaves & blocked dates)
│   └── class_schedules (1:N timetable sessions)
│       ├── rooms (N:1 with gym_locations)
│       ├── equipment_allocations (time-based reservations)
│       └── class_equipment_requirements (M:N junction with equipment)
├── equipment (physical asset inventory)
│   └── maintenance_records (service workorders)
└── admin_audit_logs (immutable administrative override log)
```

### Normalization Defense
- **1NF (Atomicity):** Every attribute contains atomic values (e.g. emergency contacts and workout routines are normalized in dedicated child tables).
- **2NF (No Partial Dependency):** All composite primary keys in junction relations (`class_registrations`, `class_equipment_requirements`) have non-prime attributes functionally dependent on the entire composite key.
- **3NF (No Transitive Dependency):** Non-prime attributes depend only on primary keys. For example, `subscriptions` links to `plan_id` only; plan prices, tiers, and duration rules are maintained solely in `membership_plans`.

### ACID Transaction Guarantees
- **Atomicity & Consistency:** Booking holds, payment activation, and capacity increments execute in single database transactions via Python context managers (`with transaction() as cur:`). If any constraint fails, the entire transaction rolls back cleanly.
- **Isolation:** Row-level locks (`SELECT ... FOR UPDATE`) prevent race conditions when multiple members attempt to book the last available seat simultaneously.
- **Durability:** Committed records persist directly to MySQL InnoDB disk tables.

---

## 📊 The 18 Academic DBMS SQL Reports

All reports execute live SQL queries against MySQL:

1. **Active Members Report** — Multi-table INNER JOIN, date arithmetic, and DATEDIFF.
2. **Expired Members (Churn Analysis)** — Correlated subquery with NOT IN and MAX() aggregate.
3. **Members Expiring in Next 7 or 30 Days** — CASE expressions and BETWEEN date ranges.
4. **Membership Plans & Subscription Counts** — LEFT JOIN, conditional COUNT, and SUM aggregates.
5. **Total Revenue by Month** — DATE_FORMAT time grouping and AVG order value calculation.
6. **Revenue Breakdown by Payment Method** — Percentage of total revenue calculation.
7. **Member Payment Ledger** — Multi-table audit ledger trace with member demographics.
8. **Class-Wise Registration & Demand** — Demand aggregation comparing scheduled sessions to bookings.
9. **Class Attendance Percentage** — Attendance realization percentage with NULLIF protection.
10. **Trainer Workload & Sessions Handled** — Multiple outer joins tracking classes, participants, and PT revenue.
11. **Equipment Currently Under Maintenance** — Status filtering for pending and in-progress workorders.
12. **Overdue Maintenance & Cost Breakdown** — Cumulative repair costs and average workorder spend.
13. **Members with Low Attendance (< 50%)** — HAVING clause aggregate ratio filtering.
14. **Members Inactive Recently (Dormant)** — MAX timestamp aggregate with HAVING condition.
15. **Subscription Renewal Audit Trail** — Pair-join via junction entity linking prior to renewed terms.
16. **Membership Growth Over Time** — Signup cohorts with demographic gender splits.
17. **Class Capacity Utilisation Rate** — Occupancy percentage per scheduled studio session.
18. **Outstanding & Pending Dues** — Unsettled payment follow-up filter.

---

## 🚀 Live System Quickstart

### Option 1: Automatic Startup Script (Recommended)
```bash
cd /Users/tejaswigunda/DBMS
./start.sh
```
*Launches Flask backend on port 5001 and Vite React frontend on port 3000.*

### Option 2: Step-by-Step Manual Launch

#### 1. Backend (Flask REST API)
```bash
cd /Users/tejaswigunda/DBMS/backend
source venv/bin/activate
PORT=5001 python3 run.py
```
*Backend runs on `http://127.0.0.1:5001`*

#### 2. Frontend (React + Vite)
```bash
npm run dev
```
*Frontend runs on `http://localhost:3000`*

### Option 3: Live Public HTTPS Link (Cloudflare Tunnel - 100% Free)
If you need to share the application with evaluators, examiners, or test on mobile phones:
```bash
/opt/homebrew/bin/cloudflared tunnel --url http://localhost:3000
```
- **Active Live Public URL:** [https://authorities-formal-dig-omaha.trycloudflare.com](https://authorities-formal-dig-omaha.trycloudflare.com)
*Connects directly through your local machine to the live MySQL 8 database and Flask REST API.*

---

## ⚡ Vercel Deployment Guide (Why Localhost Fails on Vercel)

If you deployed or are attempting to deploy to **Vercel** (`.vercel.app`), understand the architecture:

1. **Why `http://localhost:3000` does not work on Vercel:**
   - `localhost` is your internal laptop loopback address; Vercel's cloud servers cannot reach your personal computer.
2. **Why pure static Vercel deployments fail to load data:**
   - Vercel only serves the compiled React/Vite frontend. Your **MySQL 8 database** (`127.0.0.1:3307`) and **Python Flask API** (`127.0.0.1:5001`) run locally on your Mac.
   - When the frontend attempts to call `/api/auth/me` or `/api/memberships/plans`, Vercel returns `404 Not Found` because Vercel has no backend running.
3. **How to configure Vercel properly:**
   - **Root Directory:** Set to `frontend` (or keep root with our included `vercel.json`).
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variable:** In Vercel Project Settings -> **Environment Variables**, add:
     ```
     VITE_API_BASE_URL = https://authorities-formal-dig-omaha.trycloudflare.com/api
     ```
   - This points the Vercel-hosted frontend to your live running MySQL backend!

---

## 🧪 Comprehensive Concurrency & Academic Edge Cases Test Suite

The platform includes an automated test runner validating all 16 academic edge cases and concurrency safeguards required by the specification:

```bash
cd /Users/tejaswigunda/DBMS
backend/venv/bin/python backend/test_concurrency_and_rules.py
```

### Verified Test Cases (16/16 Passed):
1. **Available & Unavailable Trainer Slots** — Verifies bookable slots vs approved leaves.
2. **Conflicting Appointments Rejection** — Atomic collision detection on trainer calendar.
3. **Full Classes Rejection** — Capacity check prevents booking full sessions.
4. **Unavailable Equipment Validation** — Assets under maintenance are detected and blocked.
5. **Expired Subscriptions Handling** — Correct identification of inactive/expired memberships.
6. **Successful Payment Verification** — Cryptographic signature check & subscription activation.
7. **Failed Payment Status Logging** — Transition state tracking to `FAILED`.
8. **Pending Payment Check** — Non-expired `CREATED` state validation.
9. **Duplicate Webhook Idempotency** — Repeated callback delivery safely handled without duplicate charges.
10. **Incorrect Payment Amount Rejection** — Negative/invalid values rejected with HTTP 400.
11. **Invalid Cryptographic HMAC Signature Rejection** — Webhook forged signature rejected with HTTP 400.
12. **Duplicate Transaction Reference Rejection** — MySQL UNIQUE constraint enforcement.
13. **Expired Booking Hold Rejection** — 10-minute hold expiration enforcement.
14. **Late Payment Arrival Handling** — Reconciliation state handling for expired holds.
15. **Concurrent Race Condition Test** — Threaded test with 5 simultaneous requests competing for seat hold (`FOR UPDATE` locking).
16. **Role Separation & Permission Checks** — 1-click role switcher and authenticated profile validation.

---

## 🛠️ Technology Stack
- **Database:** MySQL 8 (InnoDB engine, utf8mb4 charset, 30 normalized tables, 7 views)
- **Backend:** Python 3.9, Flask 3.1, PyMySQL, Cryptography, Python-Dotenv, Razorpay SDK
- **Frontend:** React 18, Vite 8, Tailwind CSS, Lucide Icons, Recharts, Canvas Confetti, QRCode.react
- **Environment:** macOS / Local Development with zero external paid API dependencies
