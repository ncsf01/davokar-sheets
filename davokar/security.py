import secrets

from flask import abort, request, session

# csrf: every form carries a random token only our pages know,
# so other sites can't submit forms using the visitor's login


def get_csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]


def init_app(app):
    @app.before_request
    def check_csrf():
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return
        sent = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token", "")
        expected = session.get("csrf_token", "")
        if not expected or not secrets.compare_digest(sent, expected):
            abort(400, description="Invalid or missing form token. Reload the page and try again.")

    app.jinja_env.globals["csrf_token"] = get_csrf_token
