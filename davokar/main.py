"""General pages: home (landing page for visitors, dashboard for users)."""
from flask import Blueprint, g, render_template

from davokar.db import query

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    # One URL, two templates: visitors see the presentation page,
    # logged-in users see their dashboard.
    if g.user:
        # The five most recently edited characters of this user.
        characters = query(
            "SELECT id, name, race, occupation FROM characters "
            "WHERE user_id = %s ORDER BY updated_at DESC LIMIT 5",
            (g.user["id"],),
        )
        return render_template("dashboard.html", characters=characters)
    return render_template("index.html")
