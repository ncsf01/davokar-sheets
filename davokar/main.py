from flask import Blueprint, g, render_template

from davokar.db import query

bp = Blueprint("main", __name__)


def all_characters():
    return query(
        "SELECT c.name, c.race, c.occupation, u.username AS player, c.created_at "
        "FROM characters c JOIN users u ON u.id = c.user_id "
        "ORDER BY c.created_at DESC"
    )


@bp.route("/")
def index():
    showcase = all_characters()
    if g.user:
        characters = query(
            "SELECT id, name, race, occupation FROM characters "
            "WHERE user_id = %s ORDER BY updated_at DESC LIMIT 5",
            (g.user["id"],),
        )
        return render_template("dashboard.html", characters=characters, showcase=showcase)
    return render_template("index.html", showcase=showcase)
