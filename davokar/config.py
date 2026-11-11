import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key")

    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "davokar")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "davokar")

    SESSION_COOKIE_HTTPONLY = True   # javascript can't read the login cookie
    SESSION_COOKIE_SAMESITE = "Lax"  # other sites can't send it
    MAX_CONTENT_LENGTH = 512 * 1024  # biggest request accepted


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    # only with https, otherwise the browser drops the cookie
    SESSION_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "0") == "1"
