# JanSetu: Citizen Demand Intelligence for India

> **Grievance systems close tickets. JanSetu tells planners where the next rupee should go, and whether it worked.**

JanSetu ("people's bridge") is an open-source, multilingual AI platform built as a **Digital Public Good** for India. Citizens
report development needs by voice, text, WhatsApp, Telegram, IVR / missed call, SMS, assisted filing (ASHA, CSC) or Gram
Sabha minutes. JanSetu merges many voices into **one need**, fuses that demand with demographic, infrastructure and
public-investment data, finds **hotspots** and **silent areas**, and recommends **ranked, costed, explainable projects** to
district, state and national policymakers.

Built for **Track 1: AI for Digital Public Infrastructure & Governance (Innovation theme)**.

---

## What problem it solves

India already files grievances well. CPGRAMS and its *Samadhan Didi* voice bot (May 2026) take complaints in 22 languages and
route them as tickets. What is missing is the next layer: turning those voices into **development planning**.

| Problem statement says | JanSetu feature |
|---|---|
| **Scalable** platform | One intake pipeline for every channel; stateless API; SQLite for the demo, PostgreSQL-ready; `docker compose up` |
| **Multilingual** AI | Citizens can speak or type in **13 Indian languages** (Hindi, Telugu, Odia, Bhojpuri, Urdu, Tamil, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi, Gondi) plus English. Whole UI in **English, Hindi and Telugu**. Replies come back in the citizen's language, with a **Listen** button |
| **Digital Public Good** | Apache-2.0, all 9 DPG Standard indicators (`docs/DPG_COMPLIANCE.md`), Open311, OpenAPI, runs offline with no keys |
| **Aggregates citizen development requests** | Demand clusters: many voices become one need, counted by **unique households**, not messages; campaigns down-weighted |
| **Voice, text and messaging apps** | `/report` (voice, text, photo, **picture tiles**), WhatsApp, Telegram, Twilio IVR and SMS webhooks, `/channels` simulator, Gram Sabha minutes, CSV / Open311 import (e.g. CPGRAMS exports) |
| **Across India's linguistic regions** | Pilot data in 5 states: Telangana, Odisha, Delhi, Bihar, Uttar Pradesh; offline language ID by script and keywords; Bhashini when configured |
| **Fuses with demographic data** | Population, SC/ST share, poverty, women-headed households, disaster risk per area (`Area` model) |
| **Infrastructure indices** | Per-sector provisioning scores structured like Mission Antyodaya, UDISE+, NFHS-5 and the Jal Jeevan Mission dashboard |
| **Public investment plans** | Existing plan items (PMGSY, JJM, AMRUT 2.0, RDSS...) compared with need: **misaligned spending** check |
| **Surfaces demand hotspots** | Getis-Ord Gi* hotspot map, early-warning spike alerts, **silent areas** (big need, few reports) |
| **Recommends high-priority projects** | Need-Gap score, costed projects in ₹ with scheme convergence, "Why this project?" card, **budget planner** in ₹ crore, draft **Gram Sabha plan** (VB-GRAMG / Viksit Gram Panchayat Plan, CSV for Yuktdhara) |
| **To national policymakers** | **India at a glance** state cards with drill-down to districts, **Ask** in English, Hindi or Telugu, printable briefs by state or district, impact measurement |

## Who uses it

- **Citizens never have to log in.** They report a problem (anonymously or on a shared phone), tap **Me too** on a nearby
  problem, track a request, confirm if it is really fixed, and see **Public results**. Optional phone + one-time code login
  shows all their requests (in demo mode the code is shown on screen).
- **Officials log in.** Demo accounts (also shown on the login page):

| Username / password | Role | Persona |
|---|---|---|
| `officer` / `officer123` | Field officer (`field_officer`) | Ravi Teja, Utnoor block |
| `collector` / `collector123` | District (`district`) | Anitha Rao, Collector, Adilabad |
| `state` / `state123` | State planner (`state`) | K. Srinivas, State Planning Dept, Telangana |
| `planner` / `planner123` | National planner (`national`) | Dr. S. Menon, NITI Aayog / MoRD |

Tokens are HMAC-signed and expire after 12 hours. In production, replace the login function with government single sign-on.

## Main screens

- **Home** (`/`): 3D globe highlighting India's pilot districts; first visit asks the user to pick a language.
- **Everywhere:** EN / हिं / తె switch and a **Listen** button that reads the page aloud.
- **Report a problem:** big picture tiles, voice or text, photo, works offline (sends when back online). Help for feature
  phones: IVR / missed call.
- **Track:** a simple step-by-step progress bar; reply, confirm fix, or reopen.
- **Officer inbox:** a **Today** strip (urgent, to review, fake closures, copy-paste campaigns), then tap a tile to work
  through it. The AI never rejects a citizen; unclear reports wait for a person.
- **Dashboard:** India-at-a-glance state cards with drill-down, map layers (need, hotspots, silent areas), alerts.
- **Priorities, Grouped needs, Projects & budget** (AI suggestions, budget planner, money in low-need places, Gram Sabha
  plan, existing plans), **Ask**, **Brief**, **Impact**, **Privacy & open standards**, **Decision log**.

## Quick start

**Requirements:** Python 3.10+ and Node 18+. No API keys needed.

```bash
# 1. Backend (terminal 1)
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # optional
uvicorn app.main:app --reload --port 8000             # first start loads the demo data

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                                           # open http://localhost:5173
```

- One command (macOS / Linux): `./start.sh`
- Docker: `docker compose up --build`, then open http://localhost:8000
- API docs: http://localhost:8000/docs
- Reset demo data: `cd backend && python -m app.seed.seed`

## Tests

```bash
cd backend && pytest -q      # 19 end-to-end API tests
```

They cover Telugu, Hindi, Odia and Bhojpuri intake, PII redaction, analytics, projects and budget planner, tracking and
closure audit, Ask and briefs, impact and the Gram Sabha plan, Open311, erasure, login and citizen OTP.

## Demo data

5 states, 10 districts, 50 areas: Telangana (Adilabad, Hyderabad), Odisha (Koraput), Delhi (5 districts), Bihar (Gaya),
Uttar Pradesh (Bahraich). About 9,500 requests from 6,400 households over 12 months, 60 AI-suggested projects, 18 existing plan
items and 4 completed projects with measured impact (Jahangirpuri water, Indervelly PMGSY road, Chandrayangutta drainage,
Sherghati substation).

**Demo tracking IDs**

| ID | Citizen | Story |
|---|---|---|
| `JS-IN-LAKSH1` | Lakshmi, Narnoor, Adilabad (Telugu) | No all-weather road; filed via ASHA; now part of a recommended project |
| `JS-IN-RAMES1` | Ramesh, Bawana, Delhi (Bhojpuri) | Drain overflow; told "disposed" but not fixed, so he reopened it |
| `JS-IN-SUNIT1` | Sunita, Mihinpurwa, Bahraich, UP (Hindi) | No doctor at the health centre; helped by ASHA; silent area |
| `JS-IN-PRIYA1` | Priya, Malakpet, Hyderabad (Telugu) | Power cuts; triggered an early warning |

## Optional: real AI and channels

Edit `backend/.env`:

| Capability | Setting |
|---|---|
| Indian-language speech and translation | `BHASHINI_USER_ID`, `BHASHINI_API_KEY` (bhashini.gov.in) |
| LLM for translation, extraction, Ask, briefs | `LLM_PROVIDER=openai` (any OpenAI-compatible server, e.g. Sarvam or local Ollama), `anthropic` or `gemini` |
| Whisper speech-to-text | `ASR_PROVIDER=openai` |
| Telegram | `TELEGRAM_BOT_TOKEN`, then `python -m app.channels.telegram` |
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`; webhook `/api/channels/whatsapp/webhook` |
| IVR / SMS | Twilio number pointed at `/api/channels/ivr/voice` and `/api/channels/sms` |

If a provider fails, JanSetu falls back to the offline engine. A citizen's request is never lost.

## Project structure

```
jansetu/
├── backend/                  FastAPI + SQLAlchemy (SQLite default, PostgreSQL-ready)
│   ├── app/
│   │   ├── api/routes/       intake, requests, clusters, analytics (incl. /analytics/states), projects,
│   │   │                     insights (Ask, briefs, impact, /plans/gram-sabha + .csv), open311, connectors, channels
│   │   ├── core/             config, database, roles, citizen-message translations
│   │   ├── models/           Area, CitizenRequest, DemandCluster, Project, IndicatorHistory, AuditLog
│   │   ├── services/         pipeline, ai/, geo/, clustering, scoring, recommender, gp_plan, impact,
│   │   │                     trends, nlquery, briefs, privacy, closure_audit
│   │   ├── channels/         conversation engine, Telegram, WhatsApp, Twilio IVR / SMS
│   │   └── seed/             India demo geography and multilingual templates
│   └── tests/                19 end-to-end API tests
├── frontend/                 React 19 + Vite, Leaflet, Recharts, React Three Fiber
│   └── src/                  api/, components/, pages/ (citizen, officer, gov, trust), i18n/ (en, hi, te), styles/
├── docs/                     architecture, data sources, demo script, DPG compliance, pitch, responsible AI, research
├── Dockerfile, docker-compose.yml, start.sh
└── LICENSE (Apache-2.0)
```

## Honest caveats

- **Indicator data is synthetic.** Place names and coordinates are real; values are structured like Mission Antyodaya,
  Census, NFHS-5 and UDISE+ but are not official figures. See `docs/DATA_SOURCES.md` to load real data.
- **Language understanding is keyword-based offline.** It handles common phrasings in 13 Indian languages. Configure
  Bhashini or an LLM for production-quality speech, translation and extraction.
- **Map tiles need internet.** Without it the map background is grey; markers and data still work.
- Costs are indicative ranges for ranking, not engineering estimates. A Detailed Project Report is still required.

## Licence

Code: Apache-2.0. Documentation and demo data: CC-BY-4.0.
