# Track 1: AI for DPI & Governance. Deep Research Brief
*Theme: Innovation · Prepared 23 Sep 2026 for Navadeep · Updated 30 Sep 2026*

> **Scope decision (30 Sep 2026): India only.** JanSetu now targets Indian citizens and Indian policymakers only: 5 pilot
> states (Telangana, Odisha, Delhi, Bihar, Uttar Pradesh), UI in English, Hindi and Telugu, and citizens can speak 13 Indian
> languages. Earlier multi-country recommendations in this brief have been replaced with Indian equivalents. Village
> planning now follows **VB-GRAMG** (replaced MGNREGA from 1 July 2026): works are planned as a **Viksit Gram Panchayat
> Plan**, approved by the Gram Sabha and uploaded to the **Yuktdhara** portal.

---

## 0. Read this first: the insight that wins

**India already has a multilingual voice chatbot for complaints.** On 30 May 2026 the government launched **"Samadhan Didi"**, an AI voice bot on CPGRAMS. It takes complaints by voice in all 22 scheduled languages through Bhashini and routes them to the right ministry automatically. CPGRAMS handles 25+ lakh grievances a year and reports a "disposal rate" above 95%.

So if you build "a multilingual chatbot that files complaints", judges will say *"this already exists."*

**What nobody has built yet** (and what your problem statement actually asks for):

| Existing systems do… | Your platform must do… |
|---|---|
| Treat each complaint as a **ticket** to close | Turn millions of voices into **collective development demand** ("412 households in 9 villages need an all-weather road") |
| Measure **speed of closure** | Measure **whether the underlying need was met** |
| Stay separate from planning data | **Fuse** demand with census, infrastructure indices and investment plans to find **need gaps** |
| Hear whoever complains loudest | Find **"silent zones"**: places with severe infrastructure deficit but few complaints (the excluded) |
| Stop at the department officer | Recommend **ranked, explainable, costed projects** to policymakers and flag **misaligned spending** |
| Work in one department or state silo | Run as an open **Digital Public Good** that any state or ministry can deploy, with data staying in India and a national view across states |

**One-line pitch:** *"CPGRAMS answers complaints. We answer the question every planning ministry has: where should the next rupee go, and did it work?"*

**Timing:** VB-GRAMG village planning started on 1 July 2026, so every Gram Panchayat is now preparing a Viksit Gram Panchayat Plan. A tool that turns citizen voices into a ready draft for the Gram Sabha lands exactly when it is needed.

---

## 1. The problem seen through real people's eyes

I took on the role of each stakeholder and walked through what actually goes wrong for them. *(The people below are composite, illustrative personas. The statistics and quotes are real and sourced.)*

### 1.1 Citizens

**Lakshmi, 38, a farm labourer in a tribal village in Telangana. She speaks Gondi and some Telugu, and does not own a phone.**
- Her village has no all-weather road. In the monsoon an ambulance can't reach it. Last year a pregnant neighbour was carried 4 km on a cot.
- She doesn't know that roads fall under PMGSY or the state PWD, whether to go to the Gram Panchayat or the Collector, or what CPGRAMS is.
- *Data reality:* only **28.4% of rural Indian women own a mobile phone** (versus 80.7% of rural men), but **76.3% have used one** in the last 3 months. They borrow a husband's or son's phone (NSO CMS-Telecom 2025).
- ➜ **Needs:** shared-phone and assisted filing (an ASHA worker, CSC operator or SHG leader files for her); **voice in her dialect**; **no need to know the department**; a way to say *"this is the whole village's problem, not just mine."*

**Ramesh, 45, a construction worker in a Delhi slum. He speaks Bhojpuri and has a feature phone (no smartphone).**
- The open drain overflows every rain and his kids get sick. He complained twice. Three weeks later he got an SMS in English: *"Your grievance has been disposed."* Nothing changed.
- This "formulaic closure" is the most common citizen complaint about CPGRAMS: the Action Taken Report repeats the complaint, says "everything is in order", and closes the file. *"Most citizens stop here, convinced the portal is decorative."*
- ➜ **Needs:** **IVR or missed-call voice filing** (no internet), **status updates in his language by voice**, **citizen-confirmed closure** (the case closes only when he or the community verifies it), and an easy **reopen**.

**Sunita, 34, in Mihinpurwa block, Bahraich (Uttar Pradesh). She speaks Hindi (Awadhi at home).**
- The health centre has no doctor most days. Nobody in her block files complaints: few phones, little hope. An ASHA worker helps her report.
- ➜ **Needs:** assisted filing, voice in her language, and a system that notices **silent areas** where need is high but reports are few.

**Priya, 27, in Malakpet, Hyderabad (Telangana). She speaks Telugu.**
- Daily power cuts, and her neighbours are angry. Meanwhile the city resurfaces roads and adds decorative lighting in Banjara Hills and Jubilee Hills, where residents report more.
- ➜ **Needs:** WhatsApp, Telugu support, **early warning to government before anger turns into protest**, and **equity correction**: volume of complaints ≠ size of need.

**Common citizen pain points**

1. They don't know **where** to complain (fragmented systems).
2. They face a **language, literacy or device barrier**.
3. **No feedback**, or fake closure. This kills trust, and fewer people report next time.
4. Their problem is **collective** (road, water, school) but the system is built for **individual** tickets.
5. **Fear**: of retaliation, of their identity being exposed, of harassment.
6. They have **no visibility** into what the government plans or spends near them.

### 1.2 Government side

**Field officer / department nodal officer**
- Gets hundreds of tickets, many duplicates. Is judged on **disposal time** (average 13 days in May 2026), so he has an **incentive to close, not to solve**.
- ➜ Needs duplicate merging, auto-routing and a **"can't solve at my level, escalate to planning"** path, so that a structural need becomes a planning input instead of a rejected ticket.

**District Collector / Municipal Commissioner**
- Has a fixed budget (MPLADS/MLALADS, Finance Commission grants, district funds). **CAG audits** repeatedly find these funds diverted to "improving existing assets" instead of durable assets, with **political favoritism**, poor integration with local plans, and weak tracking.
- ➜ Needs a **ranked, defensible list of projects** with evidence that will hold up in audit, and a view of which **existing scheme** (PMGSY, Jal Jeevan, Samagra Shiksha…) can fund each one (convergence).

**State / national planning ministry**
- 18+ lakh Panchayat Development Plans have been uploaded on eGramSwaraj since 2019-20. Grievances sit in CPGRAMS, village infrastructure in Mission Antyodaya, and projects in PM Gati Shakti. **None of them talk to each other.**
- ➜ Needs **one question answered:** *"Where is demand high, supply low, and nothing planned?"* It also needs **impact measurement**.

**National planner (NITI Aayog / line ministries)**
- Wants to compare infrastructure demand across states and pick priorities for central schemes. Each state uses different portals, languages and formats.
- ➜ Needs a **common taxonomy (SDG-mapped)**, **LGD codes**, **standard APIs**, and **aggregated, privacy-safe indicators** per state and district.

### 1.3 Root-cause analysis (why this problem exists)

| # | Root cause | Evidence | Feature that fixes it |
|---|---|---|---|
| 1 | Fragmented intake | CPGRAMS, state portals, municipal apps, helplines and social media all separate | Omni-channel intake + Open311 API connectors to existing portals |
| 2 | Ticket mindset | Success is measured as disposal rate (>95%) | Demand clustering + outcome-based KPIs |
| 3 | Perverse incentives | Formulaic "disposed" closures | Citizen-verified closure, closure-quality AI audit |
| 4 | Language & digital divide | 22 scheduled + hundreds of dialects in India; 28.4% rural women phone ownership | Voice/IVR, dialect ASR, assisted mode, shared phones |
| 5 | Voice ≠ need (elite capture) | Richer, connected areas report more; research shows elite capture in participatory budgeting (e.g., Mexico City, Medellín) | Per-capita normalisation + **Silent Zone detection** |
| 6 | Demand not linked to supply data | Grievances vs Mission Antyodaya vs Gati Shakti in separate silos | Data fusion layer on common admin codes |
| 7 | Demand not linked to the budget cycle | Village planning (now VB-GRAMG Viksit Gram Panchayat Plans) happens once a year, separately | Draft Gram Sabha plan from citizen demand, CSV for Yuktdhara |
| 8 | No impact measurement | Nobody checks whether complaints recur after projects | Impact module (before/after, diff-in-diff) |
| 9 | Manipulation & noise | Duplicates, templated spam (FixMyStreet Brussels had 144k templated reports), political campaigns | Dedup, bot and coordinated-campaign detection, unique-household counting |
| 10 | Trust & privacy | Fear of retaliation; DPDP Act 2023 and Rules 2025 | Anonymous mode, PII redaction, data stays in India |

---

## 2. What already exists: learn from it, then beat it

| System | Country | What it does well | Gap you fill |
|---|---|---|---|
| **CPGRAMS + Samadhan Didi** | India | Voice filing in 22 languages, auto-routing, appeals, feedback call centre, 5 lakh CSCs | Individual tickets only; no demand aggregation, no fusion with infra/budget data, no project recommendations |
| **State grievance portals** (CM helplines, municipal apps) | India | Local reach, local language | Separate silos; ticket-only |
| **FixMyStreet / SeeClickFix** | International, open source | Map-based reporting, open source (FixMyStreet) | No planning or prioritisation layer; heavy duplicates |
| **Jugalbandi (OpenNyAI)** | India, open source | WhatsApp LLM bot that classifies grievances and fills forms | Filing only |
| **Mission Antyodaya / Yuktdhara / eGramSwaraj / PM Gati Shakti** | India | Village infra data (~6.48 lakh villages), village plans, a GIS master plan for projects | Supply-side only; no citizen voice |

**Your positioning:** *the missing middle layer* between citizen-voice systems and planning/investment systems. Build it as an open, pluggable DPG that **integrates with** CPGRAMS and state portals instead of replacing them. Judges love "we complement existing DPI".

---

## 3. Complete feature map (nothing missing)

Priority: **P0** = must be in the demo · **P1** = build if time permits, otherwise show as a working mock · **P2** = present on the roadmap slide.

### A. Omni-channel, inclusive intake
| Feature | Pri | Notes |
|---|---|---|
| WhatsApp bot (text + voice note + photo + location pin) | P0 | Use the WhatsApp Cloud API test number, or Twilio sandbox |
| Telegram bot | P0 | Easiest fallback for a reliable demo |
| Web/PWA form, offline-first (sync when connected) | P0 | Low-bandwidth; icon-based for low literacy |
| IVR / missed-call voice line (feature phones) | P1 | Twilio/Exotel; "press 1 for water…" or free speech |
| SMS / USSD | P2 | For zero-data users |
| **Assisted mode**: CSC operator, ASHA or field volunteer files for others | P0 | Key answer to the 28% phone-ownership figure |
| **Community / Gram Sabha mode**: upload a meeting recording and AI extracts multiple demands with a count of supporters | P1 | Wow feature; ties into the VB-GRAMG Gram Sabha planning cycle |
| Connectors to import from existing portals (CPGRAMS exports, state portals, Open311 feeds) | P1 | "Aggregates… across fragmented systems" is in the problem statement |
| Social-media listening (public posts) | P2 | Optional; privacy-careful |

### B. Multilingual AI understanding
| Feature | Pri | Notes |
|---|---|---|
| Automatic language/dialect detection | P0 | |
| Speech-to-text (ASR) for voice notes | P0 | Bhashini / AI4Bharat IndicConformer for Indian languages; Whisper-large-v3 as a fallback |
| Translation to a pivot language, **keeping the original** | P0 | IndicTrans2 (22 Indic languages), NLLB-200 as a fallback. Always store the original: translation can erase nuance |
| **Structured extraction** with an LLM (JSON schema) | P0 | category → sub-category → SDG; request type (new asset / repair / service quality); location mentions; affected population; severity; urgency; vulnerable groups mentioned (children, pregnant women, disabled) |
| **Geo-resolution** of spoken landmarks ("near the Hanuman temple, Kothapally") → village/ward code | P0 | Gazetteer lookup (India LGD codes) + GPS pin + fuzzy match; ask a clarifying question when confidence is low |
| Clarifying-question dialogue in the user's language | P0 | "Is this about drinking water or irrigation?" |
| Confidence scores + human review queue for low-confidence cases | P0 | Responsible AI: the AI never silently discards a request |
| Photo understanding (pothole, broken pipe, collapsed school roof) | P1 | Vision model for evidence and severity |
| PII redaction (names, phone numbers, Aadhaar numbers) before analytics | P0 | DPG indicator 6 & 9A |
| Abuse/threat/illegal content filter; urgent-safety escalation (e.g., "child trapped", gas leak) | P1 | DPG indicator 9B/9C |

### C. From complaints to demand (the core innovation)
| Feature | Pri | Notes |
|---|---|---|
| **Semantic + spatial deduplication** | P0 | Multilingual embeddings (BGE-M3 / LaBSE / multilingual-e5) + H3 hex distance + time window |
| **Demand Clusters**: one real-world need = many voices | P0 | HDBSCAN on embeddings within the same geography and category; LLM writes a cluster title and summary with representative quotes |
| **Count unique households, not messages** | P0 | Hashed phone/ID and device; prevents spam inflating priority |
| Coordinated-campaign / bot detection | P1 | Burst detection, near-identical text, new accounts, same device |
| Trend and emerging-issue detection | P0 | Rolling z-score on weekly volume per area × category (e.g., sudden spike in "diarrhoea + water" = outbreak risk) |
| Early-warning alerts (pre-protest unrest, disease, disaster) | P1 | SMS/email to the district control room |

### D. Data fusion layer (demographics + infrastructure + investment)
| Data type | Indian sources | Open fallback |
|---|---|---|
| Demographics | Census 2011 (Census 2027 in progress), SHRUG, **NFHS-5** | **WorldPop** (100 m population grids), GHSL |
| Infrastructure indices | **Mission Antyodaya** (~6.48 lakh villages), **UDISE+** (schools), HMIS (health), **Jal Jeevan Mission** dashboard, **PMGSY OMMAS** roads, **India-WRIS** (water), **Bhuvan** | **OpenStreetMap** (roads, schools, clinics), **VIIRS night lights** |
| Investment plans | **Yuktdhara** (VB-GRAMG Viksit Gram Panchayat Plans), eGramSwaraj GPDP (18 lakh older plans), **PM Gati Shakti**, MPLADS e-SAKSHI, state budgets | World Bank projects API |
| Existing grievances | **CPGRAMS** exports, state portals | Any Open311 feed |
| Open data portal | **data.gov.in** | — |

- Join everything on **LGD codes** (state, district, block, panchayat, village, ward) and an **H3 hexagon grid** for spatial joins.
- **Demo (as built):** 5 states, 10 districts, 50 areas with synthetic indicators structured like the sources above. Next step: load *real* Mission Antyodaya + OSM + WorldPop data for one district; real data impresses judges far more than synthetic data.

### E. Analytics & scoring
| Feature | Pri | Notes |
|---|---|---|
| **Demand hotspot map** | P0 | Getis-Ord Gi* (PySAL) on H3 hexes; choropleth drill-down nation → state → district → village |
| **Need-Gap Index (NGI)** per area × sector | P0 | See formula below |
| **Silent Zone detector** | P0 | High infrastructure deficit + high vulnerability + **low** complaint volume ⇒ "under-heard community, send field outreach". This is the equity differentiator |
| **Spending-alignment score** | P0 | % of planned/sanctioned investment falling in the top-NGI areas; flags "money going where need is low" (misalignment is named in the problem statement) |
| Sector breakdown mapped to SDGs (6 water, 7 energy, 9 infrastructure, 3 health, 4 education, 11 cities) | P0 | Common taxonomy across states and ministries |
| Forecasting of demand (seasonal: monsoon floods, summer water) | P2 | |

**Need-Gap Index (simple, explainable, defensible):**
```
NGI(area, sector) = w1·DemandSignal + w2·SupplyDeficit + w3·Vulnerability + w4·Severity − w5·PlannedCoverage

DemandSignal   = unique households reporting ÷ population   (per-capita, so big cities don't dominate)
                 × reporting-propensity correction           (boost low-connectivity areas)
SupplyDeficit  = 1 − normalised infrastructure index         (e.g., Mission Antyodaya water score)
Vulnerability  = % SC/ST, poverty, women-headed households, elderly, disaster risk
Severity       = AI-extracted urgency (life-safety > livelihood > convenience)
PlannedCoverage= existing sanctioned projects covering this need (avoid double-funding)
```
Weights are **visible and adjustable by the policymaker** via sliders, with sensitivity analysis. This follows the **World Bank Infrastructure Prioritization Framework**, which says criteria and weights must be *transparent and decided in advance*, and plots projects on a social-environmental × economic-financial two-axis map.

### F. Project recommendation engine (for policymakers)
| Feature | Pri | Notes |
|---|---|---|
| Convert top clusters into **candidate projects** ("Build 3.2 km all-weather road linking Kothapally to the PHC") | P0 | LLM + rule templates per sector |
| Estimated **beneficiaries** (WorldPop within catchment) and **cost** (unit-cost tables, e.g., per km road, per borewell) | P0 | Show ranges, not fake precision |
| **Scheme convergence**: which existing scheme/budget line can fund it | P1 | PMGSY, JJM, SBM-G, AMRUT 2.0, NHM, Samagra Shiksha, RDSS, PM-KUSUM, VB-GRAMG (replaced MGNREGA from 1 July 2026), 15th FC grants |
| Ranked list with **multi-criteria score + two-axis chart** (impact vs cost-efficiency) | P0 | |
| **"Why this project?" explanation card** | P0 | Top drivers, real citizen quotes (translated + original audio), data points, map. Explainability wins trust and audits |
| What-if simulator: "If I have ₹10 crore, which set of projects maximises beneficiaries?" | P1 | Knapsack optimisation, a very impressive live demo |
| Human decision recorded (approve / defer / reject + reason) | P0 | AI recommends, humans decide; audit log |

### G. Policymaker experience
| Feature | Pri |
|---|---|
| National/state dashboard: KPIs, map, trends, sector mix | P0 |
| **Natural-language question box** in any language: *"Which districts in Odisha have the highest unmet drinking-water demand and no Jal Jeevan works planned?"* → text-to-SQL answer + map | P0 |
| **Auto-generated policy brief** (PDF, in the official's language) per district/sector | P1 |
| **India at a glance**: one card per state, same SDG sector, per-capita normalised, drill down to districts | P1 |
| Role-based access (citizen / field officer / district / state / national) | P0 |

### H. Closing the loop (rebuilds trust)
| Feature | Pri |
|---|---|
| Tracking ID + status push **in the citizen's language, on the same channel** (voice message for voice users) | P0 |
| **Cluster-level updates**: "Your request joined 211 others; it's now a recommended project" | P0 |
| **Citizen-verified closure** (photo/yes-no) + auto-reopen if disputed | P0 |
| Closure-quality AI audit: flags Action Taken Reports that just repeat the complaint | P1 |
| Public **"You said → We did"** transparency board per area | P1 |

### I. Impact measurement (explicitly required: *"measure the impact of large-scale DPI initiatives"*)
| Metric | How |
|---|---|
| Outcome: complaint **recurrence** in the same cluster after project completion | Before/after |
| Outcome: change in infrastructure index (Mission Antyodaya re-survey), night-lights change | Difference-in-differences vs similar untreated areas |
| Spending alignment trend over time | % budget to top-NGI areas, quarterly |
| Inclusion (DPI health): share of requests from women, rural areas, minority languages, voice/IVR | Disaggregated reach dashboard |
| Responsiveness: time to acknowledge / to plan / to complete; citizen satisfaction | Funnel |
| Efficiency: cost per request processed, cost per beneficiary served | |

### J. Digital Public Good compliance (the DPGA's 9 indicators; show a slide ticking each one)
1. **SDG relevance**: SDGs 6, 7, 9, 11, 16 (effective, accountable institutions), 10 (inequality).
2. **Open licence**: code Apache-2.0/MIT; docs CC-BY; sample data ODbL/CC-BY.
3. **Clear ownership**: public GitHub org, governance file.
4. **Platform independence**: swappable model providers (open models by default: IndicTrans2, Whisper, open LLM); runs on any cloud or on-premises via Docker/Kubernetes.
5. **Documentation**: README, deployment guide, API docs (OpenAPI).
6. **Non-PII data extraction**: anonymised aggregate export (CSV/API).
7. **Privacy & applicable laws**: **DPDP Act 2023** and **DPDP Rules 2025**. Consent notice, withdrawal link, retention limits, breach process, data kept in India.
8. **Open standards**: **Open311 GeoReport v2** (service requests), **OCDS** (contracting), **SDMX** (statistics), GeoJSON, ISO 3166, H3, OpenAPI.
9. **Do no harm**: (A) security (encryption, RBAC, audit logs), (B) content moderation, (C) anti-harassment, anonymous and whistle-blower mode.

**Data sovereignty:** each state or ministry runs its own instance on Indian government cloud (MeghRaj / NIC). Only **aggregated, privacy-safe indicators** (k-anonymity, optional differential privacy) flow up to the national view.

### K. Responsible AI & trust
- Bias audit: accuracy of ASR/classification per language and gender; show it in a table.
- Human-in-the-loop on low confidence; the AI never auto-rejects a citizen.
- Explainability on every score; model cards.
- Anti-gaming (C) + rate-limits.
- Accessibility: WCAG 2.1 AA, screen reader, large icons, voice everywhere.

---

## 4. Reference architecture

```
 CHANNELS                INGESTION & AI PIPELINE                           DATA & ANALYTICS                 USERS
┌──────────────┐     ┌────────────────────────────────────────┐     ┌─────────────────────────┐   ┌──────────────────┐
│ WhatsApp     │     │ 1 Channel adapters → unified message   │     │ PostgreSQL + PostGIS    │   │ Citizen          │
│ Telegram     │──►  │ 2 Lang detect → ASR (Bhashini/Whisper) │──►  │ + pgvector (embeddings) │   │  status in own   │
│ IVR / SMS    │     │ 3 Translate (IndicTrans2/NLLB) keep src│     │ Admin-boundary & H3 grid│   │  language        │
│ Web PWA      │     │ 4 LLM extraction → JSON schema         │     │ Fused datasets:         │   ├──────────────────┤
│ Assisted/CSC │     │ 5 Geo-resolve (gazetteer + GPS)        │     │  census, WorldPop, OSM, │   │ Field officer    │
│ Gram Sabha   │     │ 6 PII redaction, safety filter         │     │  Antyodaya, Yuktdhara   │   │  work queue      │
│ Portal import│     │ 7 Embed → dedup → cluster (HDBSCAN)    │     │ Scoring: NGI, Gi*,      │   ├──────────────────┤
└──────────────┘     │ 8 Human review queue (low confidence)  │     │  silent zones, alignment│   │ Policymaker      │
                     └────────────────────────────────────────┘     │ Recommender + optimiser │   │  dashboard, NL Q&A│
                               ▲ Redis/Celery queue                  │ Impact module           │   │  briefs          │
                               │                                     └───────────┬─────────────┘   ├──────────────────┤
                               └── status notifications ◄────────────────────────┘                 │ National view    │
                                                                     Aggregated, anonymised API ──►│  (all states)    │
                                                                                                    └──────────────────┘
```

**Suggested hackathon stack (all free/open):**
- Backend: **Python FastAPI**, Celery + Redis, PostgreSQL + PostGIS + pgvector
- AI: Bhashini API (free) or AI4Bharat models; `faster-whisper`; IndicTrans2 / NLLB-200; an LLM with JSON-mode for extraction; `BGE-M3` embeddings; `hdbscan`; `h3`; `pysal/esda` for Gi*; `PuLP` for budget optimisation
- Frontend: **Next.js + MapLibre GL / deck.gl** (hex maps look amazing), Recharts
- Bots: `python-telegram-bot`; WhatsApp Cloud API; Twilio Voice for IVR
- Deploy: Docker Compose (shows platform independence)

---

## 5. Winning demo script (5–6 minutes)

1. **Hook (30 s):** "In May 2026 India's grievance system reported 95% disposal. Yet Ramesh's drain still floods. Disposal is not development." Show Lakshmi's story.
2. **Citizen (60 s):** live, send a **Telugu voice note** on WhatsApp/Telegram ("our village has no road, ambulance can't come…"). The bot replies in Telugu, asks one clarifying question, gives a tracking ID. Then send a **Bhojpuri** text from Delhi and a **Hindi** one from Bahraich to show multilingual support.
3. **AI magic (45 s):** show the structured JSON, then the request **merging into a cluster of 212 voices from 9 villages** with quotes in 3 languages.
4. **Policymaker (90 s):** the national map lights up with hotspots. Toggle to **Silent Zones**: *"These 14 villages have the worst water infrastructure but almost nobody complained. They're not fine; they're unheard."* (This is the wow moment.) Ask the NL question box a question in Hindi.
5. **Recommendation (60 s):** ranked projects with the "Why?" card, cost, beneficiaries and the scheme to fund it. Move the budget slider from ₹5 Cr to ₹10 Cr and watch the optimal portfolio change. Show the **alignment score**: "only 31% of this district's planned spend addresses its top-10 needs."
6. **Close the loop + impact (45 s):** approve the project. Lakshmi receives a **voice message in Telugu**. Show the impact tab: recurrence drop and before/after index.
7. **DPG (30 s):** DPG 9-indicator checklist, Gram Sabha plan CSV for Yuktdhara, Open311 API, "any state can deploy it in a day with Docker".

**Always keep a pre-recorded video backup of the demo** in case Wi-Fi or an API fails.

---

## 6. Build plan by priority (for a small team)

| Phase | Deliverable | Owner idea |
|---|---|---|
| 1. Foundations | Data model (Request, Cluster, Area, Project, Dataset), PostGIS, load 5 Indian states (LGD codes), H3 grid | Backend |
| 2. Intake + AI | Telegram/WhatsApp bot, ASR, translation, LLM extraction, geo-resolve, tracking ID | AI dev |
| 3. Demand engine | Embeddings, dedup, clustering, seed realistic synthetic Indian requests generated from Mission Antyodaya-style gaps, plus CPGRAMS CSV import | AI/data |
| 4. Scoring | NGI, Gi* hotspots, silent zones, alignment score | Data |
| 5. Dashboard | Map, drill-down, cluster detail, ranked projects, Why-card, budget optimiser, NL query | Frontend |
| 6. Loop + impact | Status notifications, citizen verification, impact tab (simulated before/after) | Full-stack |
| 7. Polish | DPG checklist, README, architecture slide, bias table, demo video, pitch | Everyone |

**Scope advice:** go deep on **one complete end-to-end flow** rather than 20 half-features. Judges reward a flow that works live. P2 items go on the roadmap slide.

---

## 7. Questions judges will ask, and your answers

| Question | Answer |
|---|---|
| "How is this different from CPGRAMS / Samadhan Didi?" | They route individual tickets; we aggregate them into demand, fuse it with supply and budget data, recommend projects and measure outcomes. We **plug into** CPGRAMS via API; we don't replace it. |
| "What about people without smartphones?" | IVR/missed call, assisted mode through CSCs/ASHAs, Gram Sabha recordings, and silent-zone outreach. |
| "Won't loud or organised groups game it?" | We count unique households, not messages; per-capita normalisation; campaign detection; and silent zones deliberately boost the unheard. |
| "Low-resource language accuracy?" | Bhashini/AI4Bharat for Indic languages, NLLB for 200 languages, we keep the original audio, ask clarifying questions, send low-confidence cases to human review, and publish a per-language accuracy table. |
| "Privacy and sovereignty?" | Data stays in India on government cloud; PII redacted before analytics; only aggregated indicators are shared; built for the DPDP Act 2023 and Rules 2025. |
| "Is AI deciding public spending?" | No. It recommends with transparent, adjustable weights (World Bank IPF approach); humans decide; every decision is logged with its reason. |
| "Scale?" | Queue-based stateless workers; CPGRAMS scale is ~25 lakh/year ≈ 7k/day, which is trivial for this architecture. |
| "Cost / sustainability?" | Open-source models on government cloud; cost per request in paise; adoption through existing CSC, ASHA and DPI rails; a centrally supported DPG any state can adopt. |
| "How do you measure impact?" | Recurrence drop, index change vs comparison areas (diff-in-diff), alignment score trend, inclusion metrics. |

---

## 8. Common mistakes that lose hackathons (avoid them)

- Building only a chatbot (it already exists) or only a dashboard (no citizen voice).
- Using only synthetic data with no real open datasets.
- AI that looks like a black box, with no "why".
- Ignoring the offline/feature-phone and women's-access reality.
- Supporting only Hindi and English. Show at least Telugu plus one more regional or tribal language (Odia, Bhojpuri, Gondi).
- Not mentioning DPG standards, open licence or open APIs, when the problem statement literally says "Digital Public Good".
- A live demo with no backup video.

---

## 9. Coverage checklist against the problem statement

| Problem-statement phrase | Covered by |
|---|---|
| "consolidate citizen feedback" | A (omni-channel + portal import), C (clustering) |
| "align it with national infrastructure priorities" | D (fusion with investment plans), E (alignment score), F (scheme convergence) |
| "fragmented systems" | A connectors, Open311 API |
| "misaligned public spending" | Spending-alignment score, budget optimiser |
| "unaddressed infrastructure gaps" | Need-Gap Index, Silent Zones |
| "measure the impact of large-scale DPI" | I (impact module + DPI inclusion KPIs) |
| "scalable" | Queue architecture, one deployment per state or ministry |
| "multilingual" | B (ASR + translation, 22 Indic languages; 13 in the offline demo) |
| "Digital Public Good" | J (9 DPGA indicators, open licence, open standards) |
| "voice, text, and messaging apps" | WhatsApp, Telegram, IVR, SMS, web |
| "diverse linguistic regions" | Dialect ASR, keep original, clarifying questions |
| "large datasets… demographic data, infrastructure indices, public investment plans" | D |
| "surfacing demand hotspots" | E (Gi* hotspots, trends, early warning) |
| "recommending high-priority development projects" | F (ranked, explainable, costed, optimised) |
| "national policymakers" | G (India-at-a-glance state cards, Ask in Hindi/Telugu, briefs by state/district) |

---

## Sources
- [CPGRAMS & grievance redress: DARPG monthly reports (Cavalier, Jun 2026)](https://www.cavalier.in/cds-ota-current-affairs/2026-06-23/cpgrams-grievance-redress-2026)
- [Samadhan Didi AI voice chatbot launch (Tech Observer)](https://techobserver.in/news/egov/samadhan-didi-ai-voice-chatbot-cpgrams-launch-324974/)
- [CPGRAMS closed without resolution: the appeal (Vikram Kushwaha)](https://vikramkushwaha.in/blog/cpgrams-appeal-grievance-closed/)
- [NSO CMS-Telecom 2025: rural women phone ownership (Business Standard)](https://www.business-standard.com/india-news/digital-india-divide-nso-rural-women-mobile-phone-ownership-gap-125052901804_1.html)
- [MPLADS issues (NEXT IAS)](https://www.nextias.com/ca/current-affairs/04-02-2026/mplads-scheme) · [CAG report on MPLADS](https://cag.gov.in/en/audit-report/details/2341)
- [Mission Antyodaya and rural deprivation (Ideas for India)](https://www.ideasforindia.in/topics/governance/what-does-mission-antyodaya-data-say-about-rural-deprivation) · [Mission Antyodaya data (OGD)](https://www.data.gov.in/catalog/mission-antyodaya-survey-data) · [SHRUG metadata](https://docs.devdatalab.org/SHRUG-Metadata/Mission%20Antyodaya%20Village%20Facilities%20(2020)/antyodaya-metadata/)
- [People's Plan Campaign / GPDP (PIB)](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2175077) · [eGramSwaraj GPDP report](https://egramswaraj.gov.in/getGPDPReport.do)
- [PM Gati Shakti (PIB)](https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=153274&ModuleId=3&reg=3&lang=1)
- [DPG Standard (DPGA)](https://www.digitalpublicgoods.net/standard) · [UN Universal DPI Safeguards Framework (UNDP)](https://www.undp.org/press-releases/un-releases-universal-dpi-safeguards-framework-promote-safe-and-inclusive-digital-public-infrastructure) · [2025 State of DPI report](https://dpimap.org/iipp-state-of-dpi-report-2025.pdf)
- [Open-source Indian voice AI: Bhashini, AI4Bharat, Sarvam (Caller Digital)](https://caller.digital/blog/open-source-voice-ai-india-sarvam-ai4bharat-bhasini-2026) · [Bhashini API docs](https://dibd-bhashini.gitbook.io/bhashini-apis/available-models-for-usage)
- [Jugalbandi for grievance redressal (GitHub)](https://github.com/OpenNyAI/Jugalbandi-Manager/blob/main/docs/use-cases-of-jugalbandi/jugalbandi-for-grievance-redressal.md)
- [FixMyStreet Brussels hotspot & topic analytics (MDPI)](https://www.mdpi.com/2079-8954/14/7/763) · [FixMyStreet platform](https://www.mysociety.org/community/fixmystreet/)
- [Elite capture in participatory budgeting, Mexico City (Springer)](https://link.springer.com/chapter/10.1007/978-3-319-98578-7_8) · [Digital tools & inclusion in Medellín PB (T&F)](https://www.tandfonline.com/doi/full/10.1080/26883597.2023.2192363)
- [World Bank Infrastructure Prioritization Framework](https://ppp.worldbank.org/library/prioritizing-infrastructure-investment-framework-government-decision-making)
- [DPDP Rules 2025 (India Briefing)](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html/)
- [Night-lights data for development (World Bank blog)](https://blogs.worldbank.org/en/opendata/light-every-night-new-nighttime-light-data-set-and-tools-development)
