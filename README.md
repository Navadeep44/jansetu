# JanSetu: Citizen Demand Intelligence for BRICS

> **Grievance systems answer complaints. JanSetu answers where the next rupee, real or rand should go, and whether it worked.**

JanSetu ("people's bridge") is an open-source, multilingual, federated AI platform built as a **Digital Public Good**. It
turns citizen development requests (voice, text, WhatsApp, Telegram, IVR, SMS, assisted filing, Gram Sabha meetings) into
**collective development demand**. It fuses that demand with demographic, infrastructure and public-investment data, finds
**demand hotspots** and **silent zones**, and recommends **ranked, costed, explainable projects** to policymakers. Every BRICS
country can run its own sovereign node.

Built for **BRICS Track 1: AI for Digital Public Infrastructure & Governance (Innovation theme)**.

---

## Why this is different

In May 2026, India's CPGRAMS launched *Samadhan Didi*, a voice bot in 22 languages. Filing complaints by voice is **solved**. What
no system does is the next layer, and that is what JanSetu builds:

| Existing systems | JanSetu |
|---|---|
| Each complaint is a ticket to close | Many voices become one **demand cluster**, counted by unique households |
| Success = disposal speed | Success = **need met**, verified by citizens, **impact measured** (difference-in-differences) |
| Siloed from planning data | **Need-Gap Index** fuses demand + infrastructure deficit + vulnerability + existing plans |
| Loudest voices win | **Silent-zone detection** finds severe need with few reports; connectivity-adjusted demand |
| Stops at the officer | **Ranked, costed, explainable projects**, scheme convergence, **budget optimiser**, **misaligned-spending check** |
| One country | **Federated BRICS nodes**; only k-anonymous aggregates cross borders |

## Feature map (problem statement to feature)

| Problem statement asks for | Where it lives |
|---|---|
| Aggregate requests via **voice, text, messaging apps** | `/report` (voice + text + photo), `/channels` simulator, WhatsApp / Telegram / Twilio IVR + SMS webhooks, `backend/app/channels/` |
| **Multilingual**, diverse linguistic regions | Offline engine for 13+ languages; Bhashini (22 Indic languages); any LLM; citizen UI in 6 languages; replies in the citizen's language, readable aloud |
| **Consolidate fragmented systems** | Open311 GeoReport v2 API, CSV importer (SP156 / 1746 / CPGRAMS exports), Open311 pull connector |
| **Large datasets**: demographics, infrastructure indices, investment plans | `Area.infra` (Mission Antyodaya / IBGE / Stats SA style), population and vulnerability, plan items (GPDP / PPA / IDP), indicator history |
| **Demand hotspots** | Getis-Ord Gi* spatial statistics, map layer, early-warning spike alerts |
| **Recommend high-priority projects** | Need-Gap Index, recommender with cost, beneficiaries, funding scheme, "Why this project?" card, knapsack budget optimiser |
| **Misaligned spending, unaddressed gaps** | Alignment score, misaligned plan items, silent zones |
| **Measure impact of DPI** | Difference-in-differences on complaint rates, indicator change, inclusion and trust KPIs |
| **National policymakers across BRICS** | Dashboard, natural-language Q&A (any language), printable policy briefs, BRICS federated comparison |
| Citizen convenience | **Me too** one-tap support, **My requests** by phone, **offline outbox** (sends automatically when back online), **Public results** board, open **CSV export** |
| **Digital Public Good** | Apache-2.0, all 9 DPGA indicators (see `docs/DPG_COMPLIANCE.md`), open standards, platform independence |

## Who logs in?

- **Citizens never have to log in.** They can report a problem (even anonymously or on a shared phone), say **Me too** to a problem already reported nearby, track requests by ID or phone number, confirm fixes, and see the **Public results** board.
- **Optional citizen login** (phone number + one-time code) shows all of a citizen's requests in one place. In demo mode the code is shown on screen; in production it goes by SMS.
- **Officials log in** to reach the inbox, dashboard, ranking, projects, questions and impact pages. Demo accounts (also shown on the login page):

| Username / password | Role |
|---|---|
| `officer` / `officer123` | Field officer |
| `collector` / `collector123` | District collector (approves projects) |
| `planner` / `planner123` | National planner |
| `brics` / `brics123` | BRICS analyst |

Tokens are HMAC-signed and expire after 12 hours. In production, swap the login function for the government's single sign-on.

## Home page

`/` is an animated landing page: a 3D BRICS globe (React Three Fiber), GSAP scroll reveals and live counters, and Framer Motion navbar, filters and tilt cards. The navbar has separate **Citizen login** and **Official login** buttons, and the page lists all 16 services with who can use each one. The short card guide is at `/overview`. All animation respects the system "reduce motion" setting.

## Quick start (about 3 minutes)

**Requirements:** Python 3.10+ and Node 18+. No API keys needed: the demo runs fully offline.

```bash
# 1. Backend (terminal 1)
cd backend
python3 -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                     # optional: add keys later
uvicorn app.main:app --reload --port 8000                # first start auto-loads the demo dataset

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                                              # open http://localhost:5173
```

Or use the helper script: `./start.sh` (macOS / Linux). Or run `docker compose up --build` and open http://localhost:8000.

- API docs (Swagger): http://localhost:8000/docs
- Reset the demo data: `cd backend && python -m app.seed.seed`
- Run the tests: `cd backend && pytest -q` (19 end-to-end tests)

## Turning on real AI and channels (optional)

Edit `backend/.env`:

| Capability | Setting |
|---|---|
| LLM translation, extraction, Q&A, briefs | `LLM_PROVIDER=openai` with any OpenAI-compatible endpoint (OpenAI, Groq, Together, Sarvam, local **Ollama** `http://localhost:11434/v1`), or `anthropic`, or `gemini` |
| Indian-language speech and translation | `BHASHINI_USER_ID`, `BHASHINI_API_KEY` (free, from bhashini.gov.in) |
| Whisper speech-to-text | `ASR_PROVIDER=openai` |
| Telegram bot | `TELEGRAM_BOT_TOKEN`, then `python -m app.channels.telegram` (long-polling, no public URL needed) |
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`; webhook at `/api/channels/whatsapp/webhook` |
| IVR / SMS (feature phones) | Twilio number pointed at `/api/channels/ivr/voice` and `/api/channels/sms` |

If any provider fails, the system falls back to the offline engine. A citizen's request is never lost.

## Project structure

```
jansetu/
├── backend/                     FastAPI + SQLAlchemy (SQLite by default, PostgreSQL-ready)
│   ├── app/
│   │   ├── main.py              app factory, routers, SPA hosting
│   │   ├── core/                config, database, RBAC, citizen-message i18n
│   │   ├── models/              Area, CitizenRequest, DemandCluster, Project, IndicatorHistory, AuditLog
│   │   ├── schemas/             input models + output serializers (PII-safe)
│   │   ├── api/routes/          intake, requests, clusters, analytics, projects, insights, open311, connectors, channels
│   │   ├── services/
│   │   │   ├── ai/              language ID, lexicon, extraction, LLM providers, Bhashini, speech
│   │   │   ├── geo/             gazetteer geo-resolution, Getis-Ord Gi* hotspots
│   │   │   ├── pipeline.py      the single intake pipeline every channel uses
│   │   │   ├── clustering.py    complaints -> demand clusters, campaign detection
│   │   │   ├── scoring.py       Need-Gap Index, silent zones, alignment
│   │   │   ├── recommender.py   costed projects, scheme convergence, explanations, knapsack optimiser
│   │   │   ├── impact.py        difference-in-differences, DPI KPIs
│   │   │   ├── trends.py        early-warning spike detection
│   │   │   ├── nlquery.py       safe natural-language Q&A (intent, not SQL)
│   │   │   ├── briefs.py        policy brief generator
│   │   │   ├── brics.py         federated, k-anonymous exchange
│   │   │   ├── privacy.py       PII redaction, hashing, k-anonymity, differential privacy
│   │   │   └── closure_audit.py flags "your grievance has been disposed" closures
│   │   ├── channels/            conversation engine, Telegram, WhatsApp, Twilio IVR/SMS
│   │   └── seed/                demo geography, multilingual templates, federated partner nodes
│   └── tests/                   end-to-end API tests
├── frontend/                    React 19 + Vite, Leaflet maps, Recharts
│   └── src/
│       ├── api/                 API client
│       ├── components/          layout, ui kit, map, charts, voice input
│       ├── pages/               citizen/, officer/, gov/, brics/, trust/
│       ├── i18n/                citizen UI in English, Hindi, Telugu, Odia, Portuguese, isiZulu
│       └── styles/              design tokens (ui-ux-pro-max "Accessible & Ethical" government system)
├── docs/                        architecture, DPG compliance, data sources, responsible AI, demo script, pitch
├── design-system/jansetu/       generated design-system master (ui-ux-pro-max)
├── .claude/skills/              ui-ux-pro-max skill (installed via `npm i -g ui-ux-pro-max-cli && uipro init --ai claude`)
├── Dockerfile, docker-compose.yml, start.sh
└── LICENSE (Apache-2.0)
```

## Demo data

The demo covers 49 real places across 3 live nodes: Adilabad (Telangana), Koraput (Odisha) and Delhi (India); São Paulo
(Brazil); Johannesburg and Ekurhuleni (South Africa). It includes about 14,000 multilingual requests over 12 months, 21
existing plan items, 4 completed projects for impact analysis, and 7 simulated partner nodes (Russia, China, Egypt, Ethiopia,
Iran, UAE, Indonesia). **Indicator values are synthetic** but follow the structure of Mission Antyodaya, IBGE Censo 2022 and
Stats SA. See `docs/DATA_SOURCES.md` to plug in real data.

Demo tracking IDs: `JS-IN-LAKSH1`, `JS-IN-RAMES1`, `JS-BR-MARIA1`, `JS-ZA-THAND1`.

## License

Code: Apache-2.0. Documentation and demo data: CC-BY-4.0.
