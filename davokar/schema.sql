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

-- characters: one row per character sheet.
-- name, race and occupation have their own columns so lists can show and
-- sort them without reading the whole sheet. Everything else (attributes,
-- abilities, weapons, items...) lives in `data` as one JSON document, the
-- same format the offline demo exports.
-- ON DELETE CASCADE: deleting a user also deletes that user's characters.
CREATE TABLE IF NOT EXISTS characters (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    name        VARCHAR(100) NOT NULL,
    race        VARCHAR(50)  NOT NULL DEFAULT '',
    occupation  VARCHAR(100) NOT NULL DEFAULT '',
    data        JSON         NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
