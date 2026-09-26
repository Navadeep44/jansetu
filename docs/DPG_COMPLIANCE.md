# Digital Public Goods Alliance standard: compliance map

| # | Indicator | How JanSetu meets it | Evidence in repo |
|---|---|---|---|
| 1 | SDG relevance | SDG 6 (water, sanitation), 7 (energy), 9 (infrastructure), 3 (health), 4 (education), 10 (inequality), 11 (cities), 16 (accountable institutions). Every request and project carries an SDG tag. | `services/ai/lexicon.py` |
| 2 | Open licensing | Code Apache-2.0; docs and demo data CC-BY-4.0 | `LICENSE` |
| 3 | Clear ownership | Public repository, maintainers and governance file | `GOVERNANCE.md` |
| 4 | Platform independence | Any OpenAI-compatible, Anthropic or Gemini LLM, or none; Bhashini or Whisper or browser speech; SQLite or PostgreSQL; Docker on any cloud or on-premises | `services/ai/providers.py`, `core/config.py` |
| 5 | Documentation | README, architecture, API (OpenAPI `/docs`), data sources, responsible AI, demo script | `docs/` |
| 6 | Non-PII data extraction | Aggregated analytics, Open311 and BRICS exchange carry no personal data | `api/routes/open311.py`, `services/brics.py` |
| 7 | Privacy & applicable laws | PII redaction before analytics; salted one-way hashes; right to erasure (`DELETE /api/track/{id}`); consent notice in UI; data localisation through federated nodes (India DPDP Act 2023 / Rules 2025, Brazil LGPD, SA POPIA, China PIPL, Russia 152-FZ) | `services/privacy.py`, `api/routes/requests.py` |
| 8 | Open standards | Open311 GeoReport v2, OpenAPI 3, ISO 3166, SDG taxonomy, SDMX-style indicators, OCDS-ready project fields, GeoJSON-ready coordinates | `api/routes/open311.py` |
| 9a | Data privacy & security | RBAC roles, audit log, k-anonymity (k = 5), optional differential privacy, no raw identifiers stored in analytics | `core/security.py`, `models/audit.py` |
| 9b | Inappropriate & illegal content | Abuse filter, urgent-safety escalation (emergency number replied in the citizen's language), human review queue | `services/ai/lexicon.py`, `pipeline.py` |
| 9c | Protection from harassment | Anonymous reporting, identity never shown to officials, coordinated-campaign detection | `clustering.py`, Officer workbench |

**UN Universal DPI Safeguards alignment:** inclusion by design (IVR, assisted filing, silent zones), accountability (audit log,
citizen verification), transparency (published weights and explanations), and redress (reopen, appeal through verification).
