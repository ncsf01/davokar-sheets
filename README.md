# Davokar Sheets

Character sheets for the **Symbaroum** tabletop RPG, inspired by D&D Beyond and Demiplane.
Derived values (Toughness, Pain Threshold, Defense, Armor, Corruption, Experience) are calculated
automatically from attributes, abilities and equipment.

> Unofficial fan project. Symbaroum is a trademark of Free League Publishing.
> This repository ships **only the names** of abilities, powers, rituals and traits.
> Rules text is not included: each table imports its own compendium JSON.

## Versions

| Folder | What it is | Status |
|---|---|---|
| `demo/` | Offline "lite" version. Runs in the browser, saves to `localStorage`, imports/exports character JSON. No server needed. | ✅ working |
| `app/` | Flask + MariaDB version with accounts, tables (campaigns) and shared dice rolls. | 🚧 planned |
| `docker/` | Docker setup: 2 app hosts × 2 containers, Nginx load balancing, MariaDB primary + replica. | 🚧 planned |

## Running the demo

Open `demo/index.html` in a browser. That's it.

- **📖 Compêndio** → import a compendium JSON to see rules text.
  Accepted formats: a flat list `[{name, category, tag, effect, tiers}]`
  or a grouped object `{abilities, mystical_powers, rituals, traits}`.
- **⋯ Mais → Exportar ficha** saves your character as a `.json` file; import it back from the same menu.

## License

[AGPL-3.0](LICENSE)
