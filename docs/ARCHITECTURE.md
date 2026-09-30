# Architecture

```
 CHANNELS                  ONE INTAKE PIPELINE (backend/app/services/pipeline.py)             ANALYTICS & DECISIONS              USERS
┌────────────────────┐   ┌──────────────────────────────────────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────┐
│ Web / PWA (voice,  │   │ 1 language ID (script + keywords, 13 Indian languages)   │   │ Need-Gap score            │   │ Citizen: report,     │
│  picture tiles)    │   │ 2 speech-to-text: browser | Bhashini | Whisper           │   │ Silent areas              │   │  track, verify,      │
│ WhatsApp Cloud API │──►│ 3 understanding: offline rules (+ LLM JSON if set)       │──►│ Getis-Ord Gi* hotspots    │──►│  Listen (TTS)        │
│ Telegram bot       │   │ 4 translation kept next to the original                  │   │ Early-warning spikes      │   │ Field officer:       │
│ Twilio IVR + SMS   │   │ 5 PII redaction + one-way household hash                 │   │ Spending alignment        │   │  inbox, close cases  │
│ Assisted (ASHA/CSC)│   │ 6 geo-resolution: GPS -> area | place names in any script│   │ Recommender + budget plan │   │ District collector:  │
│ Gram Sabha minutes │   │ 7 anti-gaming: repeat household, coordinated campaigns   │   │ Gram Sabha plan (VB-GRAMG)│   │  approve projects    │
│ Open311 / CSV      │   │ 8 demand clustering (area x sector x sub-issue)          │   │ Impact (diff-in-diff)     │   │ State / national     │
│  (e.g. CPGRAMS)    │   │ 9 human-review routing (low confidence / safety / place) │   │ Ask (intent, not SQL)     │   │  planner: state cards│
└────────────────────┘   │10 reply in the citizen's language, on the same channel   │   │ Briefs by state/district  │   │  drill-down, briefs  │
                         └──────────────────────────────────────────────────────────┘   └───────────────────────────┘   └──────────────────────┘
```

## Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite (demo) or PostgreSQL. OpenAPI docs at `/docs`.
- **Frontend:** React 19 + Vite, Leaflet maps, Recharts, React Three Fiber globe. UI strings in English, Hindi and Telugu
  (`frontend/src/i18n`); English text is the key, missing strings fall back to English.
- **AI (all optional):** Bhashini, any OpenAI-compatible / Anthropic / Gemini LLM, Whisper. Offline rules when none is set.

## Roles

`citizen` (no login needed), `field_officer`, `district`, `state`, `national`, `admin`. Planner routes (projects, decisions,
budget planner, briefs) need `district` or above. Every decision goes to the audit log.

## Key API routes

| Area | Routes |
|---|---|
| Intake | `POST /api/intake/text`, `/form`, `/community`, `/preview`; `/api/channels/*` webhooks |
| Citizen | `/api/track/{id}` (+ `/verify`, `/reply`, `DELETE` for erasure), `/api/nearby`, `/api/clusters/{id}/support`, `/api/public/board` |
| Analytics | `/api/analytics/overview`, `/states` (one card per state), `/need-gap`, `/silent-zones`, `/alignment`, `/trends`, `/alerts`, `/sectors`, `/languages` |
| Projects | `/api/projects`, `/{id}/decision`, `/optimise` (budget in ₹), `/regenerate` |
| Insights | `POST /api/query` (Ask), `/api/briefs?state=&district=&language=`, `/api/impact/*`, `/api/plans/gram-sabha` and `/api/plans/gram-sabha.csv` |
| Open data | `/open311/v2/*`, `/api/export/need-gap.csv` |

## Design principles

1. **One pipeline, many channels.** Every channel calls `pipeline.process()`, so privacy and analytics are the same everywhere.
2. **Degrade gracefully.** With no keys, the offline engine still finds language, sector, sub-issue, severity, vulnerable
   groups and place. Provider errors never block a citizen.
3. **Households, not messages.** Priority counts unique salted-hash households. Coordinated campaigns count at 25%; Gram
   Sabha supporters count at 50%.
4. **Need, not noise.** Demand is divided by connectivity and combined with infrastructure deficit and vulnerability, so
   quiet places are not penalised.
5. **AI suggests, people decide.** Low-confidence items go to people. Rejecting or deferring needs a written reason.
6. **Close the loop.** Citizens hear back in their language, confirm fixes, and formulaic "disposed" closures are flagged.
7. **Data stays in India.** One deployment per government, on its own cloud. Open exports carry aggregates only; the open CSV
   suppresses any count below `K_ANONYMITY` (default 5 households). A differential-privacy helper is in `services/privacy.py`.

## Need-Gap score

```
NGI = 100 × (wD·Demand + wS·Deficit + wV·Vulnerability + wX·Severity) / (wD + wS + wV + wX) × (1 − wC·Covered)
```

| Term | Definition | Default weight |
|---|---|---|
| Demand | National percentile of (effective households reporting per 1,000 households ÷ connectivity) | 0.30 |
| Deficit | 1 − infrastructure provisioning score for the sector | 0.30 |
| Vulnerability | Poverty, SC/ST share, women-headed households, disaster risk | 0.20 |
| Severity | Mean extracted severity (1–5) ÷ 5 | 0.20 |
| Covered | 1 if a sanctioned, approved or in-progress project already covers this area and sector | 0.50 |

**Silent area:** deficit ≥ 0.55, vulnerability ≥ 0.5 and demand percentile ≤ 0.35.

**Project priority** = 0.75 × NGI + 0.25 × cost-efficiency percentile (people helped per rupee). The **budget planner**
solves a 0/1 knapsack that maximises Σ beneficiaries × score / 100 within the budget (₹ crore).

**Gram Sabha plan** (`services/gp_plan.py`): recommended works for a district, ranked, with scheme, cost in ₹,
beneficiaries and citizens' own words. It drafts a Viksit Gram Panchayat Plan under VB-GRAMG (which replaced MGNREGA from
1 July 2026) for the Gram Sabha to approve; the CSV maps to Yuktdhara upload fields.

## Data model

`Area` (planning unit: state, district, LGD-style code, population, infrastructure indices) → `CitizenRequest` (one voice)
→ `DemandCluster` (one need) → `Project` (`source=plan` or `recommended`, cost in ₹). `IndicatorHistory` stores yearly
indicators for impact. `Notification` stores citizen messages. `AuditLog` records every human decision.

## Scale path

- Stateless API workers behind a load balancer; move the pipeline to a queue (Celery / Redis or Kafka) for peaks.
  CPGRAMS volume (about 25 lakh a year, 7,000 a day) fits one deployment.
- PostgreSQL + PostGIS for spatial joins; refresh Need-Gap base metrics nightly.
- Speech and LLM inference on government cloud (IndicConformer, IndicTrans2, open LLMs), so cost is paise per request.
