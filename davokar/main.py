"""General pages: home (landing page for visitors, dashboard for users)."""
from flask import Blueprint, g, render_template

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    # One URL, two templates: visitors see the presentation page,
    # logged-in users see their dashboard.
    if g.user:
        return render_template("dashboard.html")
    return render_template("index.html")
