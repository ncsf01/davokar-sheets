"""Characters: list, create, view and delete character sheets.

Every route here requires a logged-in user, and every query filters by
`user_id = g.user["id"]`. That filter is the access control: a user who
types another character's id in the URL gets "404 Not Found", exactly as if
the character did not exist (so ids of other people's characters are not
revealed either).
"""
import json

from flask import Blueprint, abort, flash, g, redirect, render_template, request, url_for

from davokar.auth import login_required
from davokar.db import execute, query

bp = Blueprint("characters", __name__, url_prefix="/characters")

# Playable races (core rulebook, chapter "Races", p. 102).
# Humans come in two cultures, Ambrian and barbarian. Each race has:
#   fixed       -> traits every member has, free
#   choose_one  -> the player picks one of these, free (humans only)
#   optional    -> a trait "most" members have; it costs experience like an ability
RACES = {
    "Ambrian":    {"human": True,  "fixed": [],                        "choose_one": ["Contacts", "Privileged"], "optional": None},
    "Barbarian":  {"human": True,  "fixed": [],                        "choose_one": ["Contacts", "Bushcraft"],  "optional": None},
    "Changeling": {"human": False, "fixed": ["Long-Lived"],            "choose_one": [],                         "optional": "Shapeshifter"},
    "Goblin":     {"human": False, "fixed": ["Short-Lived", "Pariah"], "choose_one": [],                         "optional": "Survival Instinct"},
    "Ogre":       {"human": False, "fixed": ["Long-Lived", "Pariah"],  "choose_one": [],                         "optional": "Robust"},
}

ATTRIBUTES = ["accurate", "cunning", "discreet", "persuasive", "quick", "resolute", "strong", "vigilant"]

# The book offers two abilities at novice + one at adept, or five at novice.
# Both cost 50 experience (novice 10, adept 30), so a new character gets 50 to spend.
STARTING_EXPERIENCE = 50


def race_options():
    """Every valid (race, chosen trait) pair, as shown in the "Race" dropdown.

    The value is "Race" or "Race:Trait", e.g. "Ambrian:Privileged".
    """
    options = []
    for race, info in RACES.items():
        if info["choose_one"]:
            for trait in info["choose_one"]:
                options.append({"value": f"{race}:{trait}", "race": race, "trait": trait})
        else:
            options.append({"value": race, "race": race, "trait": None})
    return options


def starting_money(traits):
    """Money in the purse at creation (rulebook, "Money" and the traits chapter)."""
    if "Privileged" in traits:
        return {"t": 50, "s": 0, "o": 0}      # 50 thaler
    if "Pariah" in traits:
        return {"t": 0, "s": 5, "o": 0}       # only 5 shillings
    return {"t": 5, "s": 0, "o": 0}           # default: 5 thaler


def new_sheet_data(race, chosen_trait, take_optional):
    """Build the JSON document of a brand-new character.

    Attributes start at 10 each (the 80-point total from Point Buy), so the
    player only moves points around afterwards. Starting gear follows the
    book: camping gear, a dagger and an ordinary light armor. Weapons tied to
    abilities are added on the sheet when those abilities are picked.
    """
    info = RACES[race]
    free_traits = info["fixed"] + ([chosen_trait] if chosen_trait else [])
    abilities = [{"name": t, "cat": "Trait", "level": 1, "free": True} for t in free_traits]
    if take_optional and info["optional"]:
        # "Costs as an ability": novice level, paid with experience.
        abilities.append({"name": info["optional"], "cat": "Trait", "level": 1, "free": False})

    return {
        "attrs": {attr: 10 for attr in ATTRIBUTES},
        "xpTotal": STARTING_EXPERIENCE,
        "toughCur": None,      # None = at maximum Toughness
        "corrTemp": 0,         # temporary Corruption
        "corrExtra": 0,        # permanent Corruption from story events
        "abilities": abilities,
        "weapons": [{"name": "Dagger", "kind": "short", "die": "1D6", "q": ["Short"], "equipped": True}],
        "armors": [{"name": "Light Armor", "weight": "light", "q": [], "equipped": True}],
        "items": [{"name": "Camping gear", "qty": 1, "note": "Sleeping roll, cooking equipment, firewood"}],
        "money": starting_money(free_traits),
        "artifacts": [],
        "bio": {},
        "notes": "",
    }


def get_own_character(character_id):
    """Return the character if it belongs to the logged-in user, else stop with 404."""
    character = query(
        "SELECT id, name, race, occupation, data, created_at, updated_at "
        "FROM characters WHERE id = %s AND user_id = %s",
        (character_id, g.user["id"]),
        one=True,
    )
    if character is None:
        abort(404)
    # MariaDB returns the JSON column as text; turn it into a Python dict.
    if isinstance(character["data"], str):
        character["data"] = json.loads(character["data"])
    return character


@bp.route("/")
@login_required
def index():
    characters = query(
        "SELECT id, name, race, occupation, updated_at FROM characters "
        "WHERE user_id = %s ORDER BY updated_at DESC",
        (g.user["id"],),
    )
    return render_template("characters/list.html", characters=characters)


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new():
    options = race_options()
    valid_values = {o["value"]: o for o in options}
    form = {"name": "", "race": options[0]["value"], "occupation": "", "optional": False}

    if request.method == "POST":
        form["name"] = request.form.get("name", "").strip()
        form["race"] = request.form.get("race", "")
        form["occupation"] = request.form.get("occupation", "").strip()
        # A checkbox only appears in request.form when it is ticked.
        form["optional"] = "optional" in request.form

        error = None
        if not form["name"] or len(form["name"]) > 100:
            error = "Name is required (up to 100 characters)."
        elif form["race"] not in valid_values:
            error = "Choose a race from the list."
        elif len(form["occupation"]) > 100:
            error = "Occupation can have up to 100 characters."

        if error is None:
            choice = valid_values[form["race"]]
            data = new_sheet_data(choice["race"], choice["trait"], form["optional"])
            new_id = execute(
                "INSERT INTO characters (user_id, name, race, occupation, data) "
                "VALUES (%s, %s, %s, %s, %s)",
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
    return render_template("characters/sheet.html", character=character)


@bp.route("/<int:character_id>/delete", methods=["GET", "POST"])
@login_required
def delete(character_id):
    # GET shows a confirmation page, POST actually deletes.
    # Two steps without JavaScript, so a single misclick cannot erase a sheet.
    character = get_own_character(character_id)
    if request.method == "POST":
        execute("DELETE FROM characters WHERE id = %s AND user_id = %s", (character_id, g.user["id"]))
        flash(f"{character['name']} was deleted.", "info")
        return redirect(url_for("characters.index"))
    return render_template("characters/delete.html", character=character)
