# Digital Public Goods Standard: compliance map

| # | Indicator | How JanSetu meets it | Evidence in repo |
|---|---|---|---|
| 1 | SDG relevance | SDG 6 (water, sanitation), 7 (energy), 9 (infrastructure), 3 (health), 4 (education), 10 (inequality), 11 (cities), 16 (accountable institutions). Every request and project carries an SDG tag. | `services/ai/lexicon.py` |
| 2 | Open licensing | Code Apache-2.0; docs and demo data CC-BY-4.0 | `LICENSE` |
| 3 | Clear ownership | Public repository, maintainers and governance file | `GOVERNANCE.md` |
| 4 | Platform independence | Any OpenAI-compatible, Anthropic or Gemini LLM, or none; Bhashini, Whisper or browser speech; SQLite or PostgreSQL; Docker on any cloud, including MeghRaj / NIC, or on-premises | `services/ai/providers.py`, `core/config.py` |
| 5 | Documentation | README, architecture, OpenAPI at `/docs`, data sources, responsible AI, demo script | `docs/` |
| 6 | Non-PII data extraction | Need-Gap CSV, Gram Sabha plan CSV and Open311 feed carry no personal data (no names or phone numbers; any text is PII-redacted first) | `api/routes/open311.py`, `api/routes/public.py`, `services/privacy.py` |
| 7 | Privacy and applicable laws | Built for the **Digital Personal Data Protection Act, 2023** and **DPDP Rules, 2025**: consent notice in plain language (English, Hindi, Telugu), purpose limitation, PII redacted before analytics, salted one-way hashes, right to erasure (`DELETE /api/track/{id}`), anonymous reporting. **Data stays in India**: each government runs its own deployment. | `services/privacy.py`, `api/routes/requests.py`, `pages/trust/` |
| 8 | Open standards | Open311 GeoReport v2, OpenAPI 3, LGD codes, SDG taxonomy, CSV, GeoJSON-ready coordinates, BCP-47 language tags | `api/routes/open311.py` |
| 9a | Data privacy and security | Role-based access (field officer, district, state, national), HMAC tokens, audit log; open CSV suppresses counts below `K_ANONYMITY` (default 5); differential-privacy helper (`DP_EPSILON`) | `core/security.py`, `models/audit.py`, `api/routes/public.py` |
| 9b | Inappropriate and illegal content | Abuse filter, urgent-safety escalation (emergency number 112 in the citizen's language), human review queue | `services/ai/lexicon.py`, `services/pipeline.py` |
| 9c | Protection from harassment | Anonymous reporting, identity never shown to officials, coordinated-campaign detection | `services/clustering.py`, Officer inbox |

**UN Universal DPI Safeguards:** inclusion by design (IVR, assisted filing, silent areas, 3-language UI with Listen),
accountability (audit log, citizen verification), transparency (published weights, "Why this project?"), redress
(reopen when not fixed).
