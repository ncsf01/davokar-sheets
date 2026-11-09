-- Davokar Sheets database schema (MariaDB / MySQL).
-- Run with: flask --app davokar init-db
-- CREATE TABLE IF NOT EXISTS makes the script safe to run again:
-- existing tables and their data are left untouched.
-- Never put a semicolon inside a comment here: db.py splits this file on
-- semicolons to run one statement at a time.

-- users: one row per account.
-- password_hash stores the salted hash produced by Werkzeug, never the password itself.
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(30)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
