"""CSRF protection.

CSRF (Cross-Site Request Forgery): a malicious site makes the visitor's
browser submit a form to *this* site, and the browser attaches the login
cookie automatically. To block it, every form carries a random token that
only pages rendered by this site know. A POST without the right token is
rejected with "400 Bad Request".

Templates add the token with:
    <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
JavaScript requests send it in the "X-CSRF-Token" header instead.
"""
import secrets

from flask import abort, request, session

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def get_csrf_token():
    """Return the token stored in the session, creating it on first use."""
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]


def init_app(app):
    @app.before_request
    def check_csrf():
        if request.method not in UNSAFE_METHODS:
            return
        sent = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token", "")
        expected = session.get("csrf_token", "")
        # compare_digest takes the same time for any input, so the token
        # cannot be guessed by measuring response times.
        if not expected or not secrets.compare_digest(sent, expected):
            abort(400, description="Invalid or missing form token. Reload the page and try again.")

    # Makes {{ csrf_token() }} available in every template.
    app.jinja_env.globals["csrf_token"] = get_csrf_token
