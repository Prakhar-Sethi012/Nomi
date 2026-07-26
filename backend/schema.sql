-- 1. PROFILE TABLE (The Core User)
CREATE TABLE profile (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    reg_no VARCHAR UNIQUE,
    cgpa FLOAT,
    app_pin VARCHAR NOT NULL,
    current_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    custom_task_tags VARCHAR[],
    is_ghost BOOLEAN DEFAULT FALSE -- 🔥 Ghost Mode Toggle
);

-- 2. TASKS TABLE
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    task_type VARCHAR NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR DEFAULT 'Pending',
    tags VARCHAR[] NOT NULL,
    completed_at TIMESTAMP,
    is_todo BOOLEAN DEFAULT FALSE
);

-- 3. SUBJECTS TABLE (Timetable Matrix)
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    subject_type VARCHAR,
    theory_slot VARCHAR,
    lab_slot VARCHAR,
    room_number VARCHAR,
    total_classes INTEGER DEFAULT 60,
    attended_classes INTEGER DEFAULT 0,
    conducted_classes INTEGER DEFAULT 0
);

-- 4. EXPENSES TABLE (Money Manager)
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    amount FLOAT NOT NULL,
    reason VARCHAR NOT NULL,
    date DATE NOT NULL,
    tags VARCHAR[] NOT NULL
);

-- 5. PORTFOLIO TABLE
CREATE TABLE portfolio (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description VARCHAR,
    links VARCHAR[] DEFAULT '{}'
);

-- ==========================================
-- 🔥 MULTIPLAYER SOCIAL TABLES
-- ==========================================

-- 6. FRIENDSHIPS TABLE
CREATE TABLE friendships (
    user_id_1 INTEGER REFERENCES profile(id) ON DELETE CASCADE,
    user_id_2 INTEGER REFERENCES profile(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id_1, user_id_2)
);

-- 7. CIRCLES TABLE (The Groups)
CREATE TABLE circles (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    join_token VARCHAR UNIQUE NOT NULL, -- Powers the QR scanning
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. CIRCLE MEMBERS TABLE
CREATE TABLE circle_members (
    circle_id INTEGER REFERENCES circles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES profile(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (circle_id, user_id)
);