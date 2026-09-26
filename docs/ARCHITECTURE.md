# Architecture

```
 CHANNELS                      ONE INTAKE PIPELINE (backend/app/services/pipeline.py)                 ANALYTICS & DECISIONS                 USERS
┌────────────────────┐   ┌─────────────────────────────────────────────────────────────┐   ┌──────────────────────────────┐   ┌─────────────────────┐
│ Web / PWA (voice)  │   │ 1 language ID (script + lexical, 18 languages)              │   │ Need-Gap Index (scoring.py)  │   │ Citizen: report,    │
│ WhatsApp Cloud API │   │ 2 speech-to-text: browser on-device | Bhashini | Whisper    │   │ Silent zones                 │   │  track, verify,     │
│ Telegram bot       │──►│ 3 understanding: offline multilingual rules (+ LLM JSON)    │──►│ Getis-Ord Gi* hotspots       │──►│  listen (TTS)       │
│ Twilio IVR + SMS   │   │ 4 translation kept next to the original (+ Bhashini / LLM)  │   │ Early-warning spikes         │   │ Field officer:      │
│ Assisted (CSC/ASHA)│   │ 5 PII redaction + one-way household hash                    │   │ Spending alignment           │   │  review, close      │
│ Gram Sabha minutes │   │ 6 geo-resolution: GPS -> area | place names in any script   │   │ Recommender + knapsack       │   │ District / national │
│ Open311 / CSV      │   │ 7 anti-gaming: repeat household, coordinated campaigns      │   │ Difference-in-differences    │   │  planner: map, NGI, │
└────────────────────┘   │ 8 demand clustering (area x sector x sub-issue)             │   │ NL Q&A (intent, not SQL)     │   │  projects, briefs   │
                         │ 9 human-review routing (low confidence / safety / location) │   │ Policy briefs                │   │ BRICS analyst       │
                         │10 reply in the citizen's language, on the same channel      │   └──────────────┬───────────────┘   └─────────────────────┘
                         └─────────────────────────────────────────────────────────────┘                  │
                                                                                         k-anonymous aggregates only
                                                                                                          ▼
                                                                                         BRICS federated exchange (brics.py)
```

## Design principles

1. **One pipeline, many channels.** Every channel calls `pipeline.process()`, so behaviour, privacy and analytics are identical everywhere.
2. **Degrade gracefully.** Every AI provider is optional. With no keys, the offline engine still detects the language, sector,
   sub-issue, severity, vulnerable groups and place. Provider errors never block a citizen.
3. **Households, not messages.** Priority counts unique salted-hash households. Coordinated campaigns count at 25%. Community-meeting
   supporters count at 50%.
4. **Need, not noise.** Demand is divided by connectivity (reporting propensity) and combined with infrastructure deficit and
   vulnerability, so quiet places are not penalised.
5. **AI recommends, humans decide.** Low-confidence items go to people. Every decision is logged with a reason (rejecting or deferring requires one).
6. **Close the loop.** Citizens hear back in their language, must verify closures, and formulaic closures are flagged.
7. **Federated by default.** Each country runs a sovereign node. Only aggregates with k ≥ 5 (optional ε-differential privacy) are shared.

## Need-Gap Index

```
NGI = 100 × (wD·Demand + wS·Deficit + wV·Vulnerability + wX·Severity) / (wD + wS + wV + wX) × (1 − wC·Covered)
```

| Term | Definition | Default weight |
|---|---|---|
| Demand | Percentile within the country of (effective households reporting per 1,000 households ÷ connectivity) | 0.30 |
| Deficit | 1 − infrastructure provisioning score for the sector | 0.30 |
| Vulnerability | Composite of poverty, marginalised share, women-headed households and disaster risk | 0.20 |
| Severity | Mean AI-extracted severity (1–5) ÷ 5 | 0.20 |
| Covered | 1 if an active sanctioned, approved or in-progress project already addresses this area and sector | 0.50 |

**Silent zone:** deficit ≥ 0.55, vulnerability ≥ 0.5, and raw demand percentile ≤ 0.35.

**Project priority** = 0.75 × NGI + 0.25 × cost-efficiency percentile (beneficiaries per USD). The **budget optimiser** solves a
0/1 knapsack that maximises Σ beneficiaries × score / 100 within the budget.

## Scale path

- Stateless API workers behind a load balancer. Move the pipeline to a queue (Celery / Redis or Kafka) for peak loads.
  CPGRAMS scale (about 25 lakh a year, or 7,000 a day) is well within one node's capacity.
- PostgreSQL + PostGIS for spatial joins and H3 indexing. Materialise the Need-Gap base metrics nightly and incrementally.
- Speech and LLM inference on government cloud GPUs (open models: IndicConformer, IndicTrans2, Whisper, Llama / Qwen-class),
  so costs are paise per request.

## Data model

`Country` → `Area` (planning unit with infrastructure indices) → `CitizenRequest` (one voice) → `DemandCluster` (one need) → `Project`
(`source=plan` or `recommended`). `IndicatorHistory` stores annual indicators for impact. `Notification` stores citizen messages.
`AuditLog` records every human decision.
