"""Davokar Sheets: Flask application package.

This file holds the *application factory*: `create_app()` builds and configures
a Flask instance only when someone asks for one (the `flask` command, `wsgi.py`,
Gunicorn, tests). Nothing is created at import time, which avoids circular
imports between the blueprints and lets each caller choose its configuration
(`DevelopmentConfig` or `ProductionConfig`, see config.py).
"""
from dotenv import load_dotenv
from flask import Flask


def create_app(config_class="davokar.config.DevelopmentConfig"):
    # Read the .env file into environment variables *before* the config class
    # is imported, because config.py reads them with os.getenv().
    load_dotenv()

    app = Flask(__name__)
    # Copies every UPPERCASE attribute of the config class into app.config.
    app.config.from_object(config_class)

    # Database: closes the connection after each request and adds the
    # `flask --app davokar init-db` command (see db.py).
    from davokar import db
    db.init_app(app)

    # CSRF protection for every form that sends data (see security.py).
    from davokar import security
    security.init_app(app)

    # Blueprints are groups of routes defined in their own files. They only
    # become reachable after being registered on this app instance.
    from davokar.auth import bp as auth_bp
    from davokar.characters import bp as characters_bp
    from davokar.main import bp as main_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(characters_bp)
    app.register_blueprint(main_bp)

    return app
