# Responsible AI

## Principles in the code

- **Never auto-reject a citizen.** Low confidence, missing location, abuse and urgent-safety cases go to the officer review queue.
- **Explainability.** Every Need-Gap score shows its components. Every recommended project shows its drivers, facts and the citizens' own words.
- **Humans decide.** Approve, defer and reject are human actions. Defer and reject require a written reason. Everything goes to the audit log.
- **Keep the original.** Original text (and audio, where available) is stored next to the translation, which is labelled
  `offline_gist`, `bhashini`, `llm` or `reference`.
- **Equity by construction.** Demand is adjusted for connectivity, silent zones are surfaced, campaigns are down-weighted, and
  community-meeting supporters are counted.
- **Privacy.** Identifiers are hashed, PII is redacted before analytics, erasure is on request, and only aggregates leave a country.

## Evaluation plan (to report per language)

| Metric | How |
|---|---|
| Language-ID accuracy | Labelled test set per language (min. 200 utterances) |
| Sector accuracy / macro-F1 | Gold labels by two annotators; inter-annotator agreement (Cohen's κ) |
| ASR word error rate | Bhashini / IndicConformer / Whisper on local-dialect recordings (e.g. Gondi, Desia, Bhojpuri) |
| Geo-resolution accuracy | % of requests mapped to the correct planning unit |
| Fairness | Accuracy gaps by language, gender and rural/urban. Flag any gap over 5 points |
| Human-review rate | Share of requests needing review, per language (should fall as models improve) |

A quick baseline on the bundled templates: sector and language detection is correct for all 72 templates
(`pytest` also checks Telugu, Hindi, Portuguese and isiZulu end-to-end). A real deployment must evaluate on field data.

## Known limitations

- The offline engine is keyword-based. It is robust for common phrasings but misses rare vocabulary. Configure Bhashini or an LLM for production.
- Unit costs are indicative ranges for prioritisation, not engineering estimates. A Detailed Project Report is still required.
- Difference-in-differences assumes parallel trends between treated and comparison areas. Validate with pre-period data.
