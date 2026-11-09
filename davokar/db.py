"""Database access with PyMySQL.

One connection is opened per request, on first use, and stored in `g`
(an object that lives only during the current request). `close_db()` runs
automatically when the request ends, so connections are never left open.

Every query uses `%s` placeholders: PyMySQL escapes the values, which
prevents SQL injection. Never build SQL by concatenating user input.
"""
import click
import pymysql
from flask import current_app, g


def get_db():
    """Return this request's connection, opening it if needed."""
    if "db" not in g:
        cfg = current_app.config
        g.db = pymysql.connect(
            host=cfg["DB_HOST"],
            port=cfg["DB_PORT"],
            user=cfg["DB_USER"],
            password=cfg["DB_PASSWORD"],
            database=cfg["DB_NAME"],
            charset="utf8mb4",  # full Unicode, including accents and emoji
            cursorclass=pymysql.cursors.DictCursor,  # rows come back as dicts
        )
    return g.db


def close_db(exception=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def query(sql, params=(), one=False):
    """Run a SELECT. Returns a list of dicts, or a single dict/None if one=True."""
    with get_db().cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone() if one else cur.fetchall()


def execute(sql, params=()):
    """Run an INSERT/UPDATE/DELETE and commit. Returns the new row id (INSERT)."""
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(sql, params)
        new_id = cur.lastrowid
    conn.commit()  # without commit, the change is discarded
    return new_id


def init_db():
    """Create the tables described in schema.sql (existing data is kept)."""
    with current_app.open_resource("schema.sql") as f:
        script = f.read().decode("utf-8")
    conn = get_db()
    with conn.cursor() as cur:
        # PyMySQL runs one statement per execute(), so the file is split on ';'.
        for statement in script.split(";"):
            if statement.strip():
                cur.execute(statement)
    conn.commit()


@click.command("init-db")
def init_db_command():
    """Command line: flask --app davokar init-db"""
    init_db()
    click.echo("Database initialized.")


def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
