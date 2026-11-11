import functools
import re

import pymysql
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

from davokar.db import execute, query

bp = Blueprint("auth", __name__, url_prefix="/auth")

USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]{3,30}$")
MIN_PASSWORD = 8


@bp.before_app_request
def load_logged_in_user():
    # runs before every request of the app
    user_id = session.get("user_id")
    g.user = None
    if user_id is not None:
        g.user = query(
            "SELECT id, username, email FROM users WHERE id = %s", (user_id,), one=True
        )


def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            flash("Please log in to continue.", "info")
            return redirect(url_for("auth.login", next=request.path))
        return view(**kwargs)
    return wrapped_view


def _safe_next(target):
    # only paths of this site, never another website
    if target and target.startswith("/") and not target.startswith("//"):
        return target
    return url_for("main.index")


@bp.route("/register", methods=["GET", "POST"])
def register():
    form = {"username": "", "email": ""}
    if request.method == "POST":
        form["username"] = request.form.get("username", "").strip()
        form["email"] = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm", "")

        error = None
        if not USERNAME_RE.match(form["username"]):
            error = "Username must have 3 to 30 characters: letters, numbers, _ or -."
        elif "@" not in form["email"] or len(form["email"]) > 255:
            error = "Enter a valid email address."
        elif len(password) < MIN_PASSWORD:
            error = f"Password must have at least {MIN_PASSWORD} characters."
        elif password != confirm:
            error = "The two passwords do not match."

        if error is None:
            try:
                execute(
                    "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                    (form["username"], form["email"], generate_password_hash(password)),
                )
            except pymysql.err.IntegrityError:
                error = "That username or email is already registered."
            else:
                flash("Account created. You can log in now.", "success")
                return redirect(url_for("auth.login"))

        flash(error, "error")
    return render_template("auth/register.html", form=form)


@bp.route("/login", methods=["GET", "POST"])
def login():
    login_value = ""
    if request.method == "POST":
        login_value = request.form.get("login", "").strip()
        password = request.form.get("password", "")
        user = query(
            "SELECT id, password_hash FROM users WHERE username = %s OR email = %s",
            (login_value, login_value.lower()),
            one=True,
        )
        # same message for both cases, so nobody learns which accounts exist
        if user is None or not check_password_hash(user["password_hash"], password):
            flash("Incorrect username or password.", "error")
        else:
            session.clear()
            session["user_id"] = user["id"]
            return redirect(_safe_next(request.args.get("next")))
    return render_template("auth/login.html", login_value=login_value)


@bp.route("/logout", methods=["POST"])
def logout():
    # post, not a link, so other sites can't log people out
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("main.index"))
