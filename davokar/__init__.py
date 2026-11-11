from dotenv import load_dotenv
from flask import Flask


def create_app(config_class="davokar.config.DevelopmentConfig"):
    load_dotenv()  # before config.py reads the environment

    app = Flask(__name__)
    app.config.from_object(config_class)

    from davokar import db, security
    db.init_app(app)
    security.init_app(app)

    from davokar.auth import bp as auth_bp
    from davokar.characters import bp as characters_bp
    from davokar.main import bp as main_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(characters_bp)
    app.register_blueprint(main_bp)

    return app
