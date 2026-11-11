[English](README.md) · **Português (Brasil)**

# Davokar Sheets

Fichas de personagem online para o RPG de mesa **Symbaroum**, inspiradas no D&D Beyond e no Demiplane.

A ficha faz as contas por você: **Resistência, Limiar de Dor, Defesa, Armadura, Corrupção e
Experiência** são calculadas a partir dos atributos, habilidades, poderes e equipamentos. Os jogadores
criam conta, entram na *mesa* do grupo com um código de convite e compartilham as rolagens de dados.

> **Projeto de fã, não oficial.** Symbaroum é marca registrada da Free League Publishing.
> Este repositório contém **apenas os nomes** de habilidades, poderes, rituais e traços, nunca o
> texto das regras dos livros. Cada mesa importa o próprio arquivo de compêndio para ver as descrições.

---

## Duas versões

| | **Demo** (`demo/`) | **App** (`davokar/`) |
|---|---|---|
| Roda em | qualquer navegador, sem instalar nada | um servidor (Flask + MariaDB) |
| Dados salvos em | no navegador (`localStorage`) | no banco de dados |
| Contas e mesas | não | sim |
| Compartilhar fichas | exportar / importar arquivo `.json` | automático, dentro da mesa |

A demo também serve de reserva quando não houver servidor disponível.

---

## Arquitetura (objetivo)

```
                IP elástico
                    │
        ┌───────────┴────────────┐
   EC2 app-1                  EC2 app-2
   Nginx (balanceador)        Nginx (reserva)
   ├─ container: Flask        ├─ container: Flask
   └─ container: Flask        └─ container: Flask
        └───────────┬────────────┘
   EC2 db-1  ── replicação ──►  EC2 db-2
   MariaDB (principal)          MariaDB (réplica)
```

- O **Nginx** distribui os acessos entre os quatro containers Flask e pula os que pararem de responder.
- O **IP elástico** é o endereço fixo do site. Se a app-1 cair, ele é movido para a app-2.
- A **replicação do MariaDB** mantém uma cópia completa dos dados na db-2.

### Como uma requisição passa pelo app

```
Navegador ──HTTP──► Werkzeug ──► rota do Flask (Python) ──► PyMySQL ──► MariaDB
    ▲                                    │
    └────────── HTML ◄── template Jinja ─┘
```

- O **Werkzeug** recebe a requisição HTTP e monta o objeto `request`.
- O **Flask** liga a URL a uma função Python (uma *view*).
- O **PyMySQL** executa as consultas SQL no **MariaDB**.
- O **Jinja** preenche um template HTML com os dados e devolve a página pronta.

---

## Estrutura do projeto

```
davokar-sheets/
├── davokar/                 pacote Flask
│   ├── __init__.py          create_app(): a application factory
│   ├── config.py            configurações lidas das variáveis de ambiente
│   ├── db.py                conexão PyMySQL, funções de consulta, comando `init-db`
│   ├── schema.sql           comandos CREATE TABLE
│   ├── security.py          proteção CSRF dos formulários
│   ├── auth.py              blueprint: cadastro, login, logout
│   ├── characters.py        blueprint: lista de fichas, criação, ficha, salvamento automático
│   ├── catalog.py           nomes de habilidades e tabelas de equipamento (sem texto de regras)
│   ├── main.py              blueprint: página inicial e painel
│   ├── templates/           templates Jinja + Bootstrap 5 (base.html tem a navbar e o footer)
│   └── static/
│       ├── css/style.css    cores e fontes por cima do tema escuro do Bootstrap
│       └── js/
│           ├── rules.js     regras de Symbaroum como funções puras (Defesa, Corrupção...)
│           └── sheet.js     preenche os valores calculados, cuida dos botões, salva sozinho
├── demo/                    versão offline (sem servidor)
├── docker-compose.yml       banco de desenvolvimento (MariaDB no Docker)
├── wsgi.py                  ponto de entrada em produção (Gunicorn)
├── requirements.txt         dependências Python
├── .env.example             modelo do arquivo .env
└── LICENSE                  AGPL-3.0
```

---

## Rodando a demo

Abra `demo/index.html` no navegador. (A interface da demo ainda está em português: ela passa para a
estrutura nova, com inglês primeiro, numa etapa futura.)

- **📖 Compêndio**: importa um JSON de compêndio para ver o texto das regras. Formatos aceitos: lista
  `[{name, category, tag, effect, tiers}]` ou objeto agrupado `{abilities, mystical_powers, rituals, traits}`.
- **⋯ Mais → Exportar ficha**: salva a ficha como arquivo `.json`. Para importar de volta, use o mesmo menu.

---

## Rodando o app no seu computador

**Pré-requisitos:** Python 3.10+, Docker com Docker Compose.

```bash
# 1. Configurações: copie o modelo e troque as senhas
cp .env.example .env

# 2. Suba o banco de dados (MariaDB num container)
docker compose up -d

# 3. Ambiente virtual Python e dependências
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 4. Crie as tabelas
flask --app davokar init-db

# 5. Inicie o servidor de desenvolvimento
flask --app davokar run --debug
```

Acesse http://127.0.0.1:5000.

Para parar o banco: `docker compose down` (os dados continuam guardados num volume do Docker).

---

## Próximos passos

- [x] Demo offline com importação de compêndio e exportação de ficha
- [x] Contas: cadastro, login, logout
- [x] Fichas salvas no banco de dados, ficha interativa com salvamento automático
- [ ] Mesas: criar, código de convite, membros, compêndio compartilhado
- [ ] Rolagens de dados compartilhadas
- [ ] Botão de idioma inglês / português
- [ ] Imagem Docker do app, balanceamento com Nginx
- [ ] Deploy na AWS EC2 com replicação do MariaDB

---

## Licença

[GNU AGPL-3.0](LICENSE). Você pode usar, estudar, alterar e compartilhar este código. Se rodar uma
versão modificada num servidor usado por outras pessoas, precisa disponibilizar o código-fonte dela.
