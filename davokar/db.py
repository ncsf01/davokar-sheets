import click
import pymysql
from flask import current_app, g


def get_db():
    # one connection per request, kept in g
    if "db" not in g:
        cfg = current_app.config
        g.db = pymysql.connect(
            host=cfg["DB_HOST"],
            port=cfg["DB_PORT"],
            user=cfg["DB_USER"],
            password=cfg["DB_PASSWORD"],
            database=cfg["DB_NAME"],
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
    return g.db


def close_db(exception=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def query(sql, params=(), one=False):
    with get_db().cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone() if one else cur.fetchall()


def execute(sql, params=()):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(sql, params)
        new_id = cur.lastrowid
    conn.commit()
    return new_id


def init_db():
    with current_app.open_resource("schema.sql") as f:
        script = f.read().decode("utf-8")
    conn = get_db()
    with conn.cursor() as cur:
        # pymysql runs one statement at a time
        for statement in script.split(";"):
            if statement.strip():
                cur.execute(statement)
    conn.commit()


@click.command("init-db")
def init_db_command():
    init_db()
    click.echo("Database initialized.")


def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
