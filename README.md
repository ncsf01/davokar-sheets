**English** · [Português (Brasil)](README.pt-BR.md)

# Davokar Sheets

Online character sheets for the **Symbaroum** tabletop RPG, inspired by D&D Beyond and Demiplane.

The sheet does the math for you: **Toughness, Pain Threshold, Defense, Armor, Corruption and
Experience** are calculated from attributes, abilities, powers and equipment. Players create
accounts, join their group's *table* with an invite code and share dice rolls.

> **Unofficial fan project.** Symbaroum is a trademark of Free League Publishing.
> This repository contains **only the names** of abilities, powers, rituals and traits, never the
> rules text from the books. Each table imports its own compendium file to see the descriptions.

---

## Two versions

| | **Demo** (`demo/`) | **App** (`davokar/`) |
|---|---|---|
| Runs on | any browser, no installation | a server (Flask + MariaDB) |
| Data saved in | the browser (`localStorage`) | the database |
| Accounts and tables | no | yes |
| Share characters | export / import a `.json` file | automatic, inside the table |

The demo is also the fallback when there is no server available.

---

## Architecture (target)

```
                Elastic IP
                    │
        ┌───────────┴────────────┐
   EC2 app-1                  EC2 app-2
   Nginx (load balancer)      Nginx (standby)
   ├─ container: Flask        ├─ container: Flask
   └─ container: Flask        └─ container: Flask
        └───────────┬────────────┘
   EC2 db-1  ── replication ──►  EC2 db-2
   MariaDB (primary)             MariaDB (replica)
```

- **Nginx** spreads requests across the four Flask containers and skips any that stop responding.
- The **Elastic IP** is the site's fixed address. If app-1 fails, it is moved to app-2.
- **MariaDB replication** keeps a full copy of the data on db-2.

### How a request flows inside the app

```
Browser ──HTTP──► Werkzeug ──► Flask route (Python) ──► PyMySQL ──► MariaDB
   ▲                                   │
   └────────── HTML ◄── Jinja template ┘
```

- **Werkzeug** receives the HTTP request and builds the `request` object.
- **Flask** routes the URL to a Python function (a *view*).
- **PyMySQL** runs SQL queries against **MariaDB**.
- **Jinja** fills an HTML template with the data and returns the finished page.

---

## Project structure

```
davokar-sheets/
├── davokar/                 Flask package
│   ├── __init__.py          create_app(): the application factory
│   ├── config.py            settings read from environment variables
│   ├── db.py                PyMySQL connection, query helpers, `init-db` command
│   ├── schema.sql           CREATE TABLE statements
│   ├── security.py          CSRF protection for forms
│   ├── auth.py              blueprint: sign up, log in, log out
│   ├── characters.py        blueprint: character list, creation, sheet, autosave
│   ├── catalog.py           names of abilities and equipment tables (no rules text)
│   ├── main.py              blueprint: home page and dashboard
│   ├── templates/           Jinja + Bootstrap 5 templates (base.html holds navbar and footer)
│   └── static/
│       ├── css/style.css    colors and fonts on top of Bootstrap's dark theme
│       └── js/
│           ├── rules.js     Symbaroum rules as pure functions (Defense, Corruption...)
│           └── sheet.js     fills calculated values, handles buttons, autosaves
├── demo/                    offline version (no server)
├── Dockerfile               image of the app (Gunicorn)
├── nginx/default.conf       Nginx load balancer config
├── docker-compose.yml       development database (MariaDB in Docker)
├── wsgi.py                  production entry point (Gunicorn)
├── requirements.txt         Python dependencies
├── .env.example             template for the .env file
└── LICENSE                  AGPL-3.0
```

---

## Running the demo

Open `demo/index.html` in a browser. (The demo interface is still in Portuguese: it moves to the new
English-first structure in a later step.)

- **📖 Compendium**: import a compendium JSON to see rules text. Accepted formats: a flat list
  `[{name, category, tag, effect, tiers}]` or a grouped object `{abilities, mystical_powers, rituals, traits}`.
- **⋯ More → Export**: saves the character as a `.json` file. Import it back from the same menu.

---

## Running the app locally

**Requirements:** Python 3.10+, Docker with Docker Compose.

```bash
# 1. Settings: copy the template and edit the passwords
cp .env.example .env

# 2. Start the database (MariaDB in a container)
docker compose up -d

# 3. Python virtual environment and dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 4. Create the tables
flask --app davokar init-db

# 5. Start the development server
flask --app davokar run --debug
```

Open http://127.0.0.1:5000.

To stop the database: `docker compose down` (the data is kept in a Docker volume).

---

## Roadmap

- [x] Offline demo with compendium import and character export
- [x] Accounts: sign up, log in, log out
- [x] Characters saved in the database, interactive sheet with autosave
- [ ] Tables: create, invite code, members, shared compendium
- [ ] Shared dice rolls
- [ ] English / Portuguese language switch
- [x] Docker image for the app, Nginx load balancing
- [ ] Deployment on AWS EC2 with MariaDB replication

---

## License

[GNU AGPL-3.0](LICENSE). You may use, study, change and share this code. If you run a modified
version on a server that other people use, you must make its source code available to them.
