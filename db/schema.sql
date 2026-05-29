-- Brewery Coffee — full schema
-- SQLite (better-sqlite3). All timestamps stored as ISO-8601 text via datetime('now').

PRAGMA foreign_keys = ON;

-- =========================================================
-- USERS — registration, auth, RBAC
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,           -- normalized E.164 +7XXXXXXXXXX, attaches loyalty
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'     -- guest / user / moderator / admin
        CHECK (role IN ('guest', 'user', 'moderator', 'admin')),
    consent_given INTEGER NOT NULL DEFAULT 0 CHECK (consent_given IN (0, 1)),
    consent_at TEXT,                      -- timestamp of PD consent
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- =========================================================
-- LOYALTY — accumulated spend + current tier (per user)
-- =========================================================
CREATE TABLE IF NOT EXISTS loyalty (
    user_id INTEGER PRIMARY KEY,
    total_spent INTEGER NOT NULL DEFAULT 0,   -- in rubles
    level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
    discount_pct REAL NOT NULL DEFAULT 3,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================================
-- TRANSACTIONS — per-purchase history feeds the loyalty totals
-- =========================================================
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,                  -- rubles spent
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);

-- =========================================================
-- MENU ITEMS — bar card positions, drinks only
-- =========================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL                    -- espresso / alternative
        CHECK (category IN ('espresso', 'alternative')),
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,                   -- rubles
    volume TEXT,                              -- e.g. '200 мл' or '300 мл'
    tags TEXT,                                -- comma-separated short tags
    is_hit INTEGER NOT NULL DEFAULT 0 CHECK (is_hit IN (0, 1)),
    is_new INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_menu_cat_sort ON menu_items(category, sort_order);

-- =========================================================
-- REVIEWS — guest feedback with moderation
-- =========================================================
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by INTEGER,
    moderated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status, created_at DESC);

-- =========================================================
-- EVENTS — cafe events / cuppings / launches
-- =========================================================
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,                 -- ISO date or datetime
    status TEXT NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'past', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
