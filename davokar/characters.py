import json

from flask import Blueprint, abort, flash, g, jsonify, redirect, render_template, request, url_for

from davokar import catalog
from davokar.auth import login_required
from davokar.db import execute, query

bp = Blueprint("characters", __name__, url_prefix="/characters")

# races from the core rulebook (p. 102)
# fixed: free traits | choose_one: humans pick one, free | optional: costs experience
RACES = {
    "Ambrian":    {"human": True,  "fixed": [],                        "choose_one": ["Contacts", "Privileged"], "optional": None},
    "Barbarian":  {"human": True,  "fixed": [],                        "choose_one": ["Contacts", "Bushcraft"],  "optional": None},
    "Changeling": {"human": False, "fixed": ["Long-Lived"],            "choose_one": [],                         "optional": "Shapeshifter"},
    "Goblin":     {"human": False, "fixed": ["Short-Lived", "Pariah"], "choose_one": [],                         "optional": "Survival Instinct"},
    "Ogre":       {"human": False, "fixed": ["Long-Lived", "Pariah"],  "choose_one": [],                         "optional": "Robust"},
}

ATTRIBUTES = ["accurate", "cunning", "discreet", "persuasive", "quick", "resolute", "strong", "vigilant"]
STARTING_EXPERIENCE = 50  # 2 novice + 1 adept, or 5 novice


def race_options():
    # values like "Ambrian:Privileged" or "Ogre"
    options = []
    for race, info in RACES.items():
        if info["choose_one"]:
            for trait in info["choose_one"]:
                options.append({"value": f"{race}:{trait}", "race": race, "trait": trait})
        else:
            options.append({"value": race, "race": race, "trait": None})
    return options


def starting_money(traits):
    if "Privileged" in traits:
        return {"t": 50, "s": 0, "o": 0}
    if "Pariah" in traits:
        return {"t": 0, "s": 5, "o": 0}
    return {"t": 5, "s": 0, "o": 0}


def new_sheet_data(race, chosen_trait, take_optional):
    info = RACES[race]
    free_traits = info["fixed"] + ([chosen_trait] if chosen_trait else [])
    abilities = [{"name": t, "cat": "Trait", "level": 1, "free": True} for t in free_traits]
    if take_optional and info["optional"]:
        abilities.append({"name": info["optional"], "cat": "Trait", "level": 1, "free": False})

    return {
        "attrs": {attr: 10 for attr in ATTRIBUTES},
        "xpTotal": STARTING_EXPERIENCE,
        "toughCur": None,
        "corrTemp": 0,
        "corrExtra": 0,
        "abilities": abilities,
        "weapons": [{"name": "Dagger", "kind": "short", "die": "1D6", "q": ["Short"], "equipped": True}],
        "armors": [{"name": "Light Armor", "weight": "light", "q": [], "equipped": True}],
        "items": [{"name": "Camping gear", "qty": 1, "note": ""}],
        "money": starting_money(free_traits),
        "artifacts": [],
        "bio": {},
        "notes": "",
    }


def fill_defaults(data):
    # older sheets may miss fields; the template expects all of them
    data.setdefault("attrs", {})
    for attr in ATTRIBUTES:
        data["attrs"].setdefault(attr, 10)
    for key in ("abilities", "weapons", "armors", "items", "artifacts"):
        data.setdefault(key, [])
    for a in data["abilities"]:
        a.setdefault("level", 1)
        a.setdefault("cat", "General")
    for w in data["weapons"] + data["armors"]:
        w.setdefault("q", [])
    data.setdefault("money", {})
    for coin in ("t", "s", "o"):
        data["money"].setdefault(coin, 0)
    data.setdefault("bio", {})
    data.setdefault("xpTotal", STARTING_EXPERIENCE)
    return data


def get_own_character(character_id):
    # 404 if the character does not exist or belongs to someone else
    character = query(
        "SELECT id, name, race, occupation, data FROM characters WHERE id = %s AND user_id = %s",
        (character_id, g.user["id"]),
        one=True,
    )
    if character is None:
        abort(404)
    if isinstance(character["data"], str):
        character["data"] = json.loads(character["data"])
    return character


@bp.route("/")
@login_required
def index():
    characters = query(
        "SELECT id, name, race, occupation FROM characters WHERE user_id = %s ORDER BY updated_at DESC",
        (g.user["id"],),
    )
    return render_template("characters/list.html", characters=characters)


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new():
    options = race_options()
    valid = {o["value"]: o for o in options}
    form = {"name": "", "race": options[0]["value"], "occupation": "", "optional": False}

    if request.method == "POST":
        form["name"] = request.form.get("name", "").strip()
        form["race"] = request.form.get("race", "")
        form["occupation"] = request.form.get("occupation", "").strip()
        form["optional"] = "optional" in request.form

        error = None
        if not form["name"] or len(form["name"]) > 100:
            error = "Name is required (up to 100 characters)."
        elif form["race"] not in valid:
            error = "Choose a race from the list."
        elif len(form["occupation"]) > 100:
            error = "Occupation can have up to 100 characters."

        if error is None:
            choice = valid[form["race"]]
            data = new_sheet_data(choice["race"], choice["trait"], form["optional"])
            new_id = execute(
                "INSERT INTO characters (user_id, name, race, occupation, data) VALUES (%s, %s, %s, %s, %s)",
                (g.user["id"], form["name"], choice["race"], form["occupation"], json.dumps(data)),
            )
            flash(f"{form['name']} was created.", "success")
            return redirect(url_for("characters.view", character_id=new_id))
        flash(error, "error")

    return render_template("characters/new.html", form=form, races=RACES, options=options)


@bp.route("/<int:character_id>")
@login_required
def view(character_id):
    character = get_own_character(character_id)
    payload = {
        "id": character["id"],
        "name": character["name"],
        "race": character["race"],
        "occupation": character["occupation"],
        "data": fill_defaults(character["data"]),
    }
    return render_template("characters/sheet.html", character=character, payload=payload,
                           attributes=ATTRIBUTES, catalog=catalog, groups=catalog.GROUPS,
                           tiered={name for name, _, _, has_levels in catalog.ENTRIES if has_levels})


@bp.route("/<int:character_id>/data", methods=["PUT"])
@login_required
def save(character_id):
    # called by sheet.js; csrf token comes in the X-CSRF-Token header
    get_own_character(character_id)
    body = request.get_json(silent=True)

    error = None
    if not isinstance(body, dict):
        error = "Expected a JSON object."
    elif not isinstance(body.get("name"), str) or not body["name"].strip() or len(body["name"]) > 100:
        error = "Name is required (up to 100 characters)."
    elif not isinstance(body.get("occupation", ""), str) or len(body.get("occupation", "")) > 100:
        error = "Occupation can have up to 100 characters."
    elif not isinstance(body.get("data"), dict):
        error = "Sheet data must be a JSON object."
    if error:
        return jsonify(ok=False, error=error), 400

    execute(
        "UPDATE characters SET name = %s, occupation = %s, data = %s WHERE id = %s AND user_id = %s",
        (body["name"].strip(), body.get("occupation", "").strip(), json.dumps(body["data"]),
         character_id, g.user["id"]),
    )
    return jsonify(ok=True)


@bp.route("/<int:character_id>/delete", methods=["GET", "POST"])
@login_required
def delete(character_id):
    # GET asks for confirmation, POST deletes
    character = get_own_character(character_id)
    if request.method == "POST":
        execute("DELETE FROM characters WHERE id = %s AND user_id = %s", (character_id, g.user["id"]))
        flash(f"{character['name']} was deleted.", "info")
        return redirect(url_for("characters.index"))
    return render_template("characters/delete.html", character=character)
