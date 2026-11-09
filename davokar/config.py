"""Configuration classes.

Values that change between environments (passwords, hosts, debug mode) come
from environment variables, which are loaded from the `.env` file in
development. Secrets never live in the source code.
"""
import os


class Config:
    # Signs the session cookie. Anyone who knows it can forge a login,
    # so production must use a long random value (see .env.example).
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key")

    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "davokar")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "davokar")

    # Session cookie hardening:
    # HTTPONLY  -> JavaScript in the page cannot read the cookie.
    # SAMESITE  -> the browser does not send it on requests started by other sites.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    # Set to "1" only when the site is served over HTTPS; otherwise the
    # browser would refuse to send the cookie and nobody could log in.
    SESSION_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "0") == "1"
