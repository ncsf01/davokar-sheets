# production entry point: gunicorn --bind 0.0.0.0:8000 wsgi:app
from davokar import create_app

app = create_app("davokar.config.ProductionConfig")
