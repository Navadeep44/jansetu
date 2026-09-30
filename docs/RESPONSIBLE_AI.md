# Responsible AI

## Principles in the code

- **Never auto-reject a citizen.** Low confidence, missing place, abuse and urgent-safety cases go to the officer inbox.
- **Explainability.** Every Need-Gap score shows its parts. Every suggested project shows its drivers, facts and the
  citizens' own words.
- **People decide.** Approve, defer and reject are human actions. Defer and reject need a written reason. Everything goes to
  the audit log.
- **Keep the original.** The original text (and audio, where available) is stored next to the translation, which is
  labelled `offline_gist`, `bhashini`, `llm` or `reference`.
- **Equity by design.** Demand is adjusted for connectivity, silent areas are shown, copy-paste campaigns are down-weighted,
  and Gram Sabha supporters are counted.
- **Accessible to everyone.** UI in English, Hindi and Telugu, short sentences, picture tiles, a Listen button on every
  page, IVR / missed call for feature phones, assisted filing by ASHA and CSC workers.
- **Privacy.** Identifiers are hashed, PII is redacted before analytics, erasure is on request, and data stays in India
  (DPDP Act 2023, DPDP Rules 2025).

## Evaluation plan (report per language)

| Metric | How |
|---|---|
| Language-ID accuracy | Labelled test set per language (min. 200 utterances) |
| Sector accuracy / macro-F1 | Gold labels by two annotators; agreement (Cohen's κ) |
| Speech word error rate | Bhashini / IndicConformer / Whisper on local-dialect recordings (Gondi, Desia, Bhojpuri, Awadhi) |
| Place accuracy | % of requests mapped to the correct planning unit (LGD code) |
| Fairness | Accuracy gaps by language, gender and rural / urban; flag any gap over 5 points |
| Human-review rate | Share needing review, per language (should fall as models improve) |

Baseline: `pytest` checks Telugu, Hindi, Odia and Bhojpuri intake end to end (19 tests). A real deployment must evaluate on
field data.

## Known limitations

- The offline engine is keyword-based. It handles common phrasings but misses rare words. Configure Bhashini or an LLM for
  production.
- Demo indicator data is synthetic (see `DATA_SOURCES.md`).
- Unit costs are indicative ranges for ranking, not engineering estimates. A Detailed Project Report is still required.
- Difference-in-differences assumes parallel trends between treated and comparison areas. Check with pre-period data.
