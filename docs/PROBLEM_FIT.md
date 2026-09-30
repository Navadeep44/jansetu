# Does JanSetu solve the Track 1 problem? (audit, 30 Sep 2026)

## The problem statement, phrase by phrase

| The statement asks for | Before this audit | Now |
|---|---|---|
| "Governments **across India**" | Built as a BRICS multi-country demo; only 3 Indian areas groups, the rest Brazil and South Africa | **India only.** 5 states (Telangana, Odisha, Delhi, Bihar, Uttar Pradesh), 6 districts, 50 blocks/wards |
| "consolidate citizen feedback" | Done: all channels go through one pipeline and are grouped into needs | Same, plus CPGRAMS/portal CSV import and Open311 |
| "align it with **national** infrastructure priorities" | Planning view was per country | **India at a glance**: one card per state, click to drill down to districts; national and per-state spending alignment |
| "fragmented systems" | Open311 API, CSV connectors | Same, plus **Gram Sabha plan export** in the shape of the Viksit Gram Panchayat Plan (VB-GRAMG, Yuktdhara upload) |
| "misaligned public spending" | Alignment score per country | Per state and national; e.g. road beautification in Banjara Hills while tribal blocks lack water |
| "unaddressed infrastructure gaps" | Need-Gap Index, silent areas | Same, explained in plain words ("Need level", "Silent area") |
| "measure the impact of large-scale DPI" | Difference-in-differences impact | Same, in ₹ and plain words ("Complaints fell by 83%") |
| "**multilingual**", "diverse **linguistic regions of India**" | UI mostly English; citizen pages partly Hindi/Telugu; Portuguese/isiZulu included | **Whole UI in English, Hindi and Telugu** (every page, 0 missing strings); first-visit language chooser; citizens can speak or type in 13 Indian languages |
| "voice, text, and messaging apps" | Web, WhatsApp, Telegram, IVR, SMS, assisted, Gram Sabha | Same, plus **picture tiles** (report in 2 taps), **missed-call / IVR help**, and a **Listen button on every page** that reads it aloud |
| "demographic data, infrastructure indices, public investment plans" | Synthetic, shaped like Mission Antyodaya | Same data model, now Indian only (Census/NFHS-style vulnerability, Gati Shakti/Yuktdhara-style layers, Indian schemes) |
| "surfacing demand hotspots" | Getis-Ord Gi* hotspots, early warnings | Same; early warnings for Malakpet power cuts, Seelampur drains, Jainoor health, Gaya water |
| "recommending high-priority projects to **national policymakers**" | Ranked, costed, explainable projects | Same, plus national/state/district briefs, budget planner in ₹ crore, "Ask" in Hindi and Telugu |
| "Digital Public Good" | Open licence, DPG checklist | Same; privacy text now India's DPDP Act 2023 and DPDP Rules 2025; open CSV suppresses counts below 5 households |

## What the research changed

- **Complaints are already handled as tickets.** CPGRAMS took 15.2 lakh grievances in Jan–Jul 2026 and closes them in about 13 days. Samadhan Didi (launched 30 May 2026) takes them by voice in 22 languages. So JanSetu does not compete on "filing complaints". It turns many voices into **development planning**: which village needs which work first, and did it work.
- **VB-GRAMG replaced MGNREGA on 1 July 2026.** Village works are now planned as a Viksit Gram Panchayat Plan, discussed and approved in the Gram Sabha, then uploaded to the Yuktdhara portal (with PM Gati Shakti, India-WRIS and Bhuvan layers). JanSetu now exports its ranked works in that shape, with the citizens' own words as evidence.
- **Many rural women do not own a phone, and many people find reading hard.** This is why JanSetu has picture tiles, voice everywhere, read-aloud, ASHA/CSC-assisted filing, IVR and missed calls, and needs no login.

## Honest gaps (say these if judges ask)

- Indicator data is synthetic, but uses the same structure as Mission Antyodaya / Census; connectors for real data are documented in `DATA_SOURCES.md`.
- Offline language understanding is keyword-based. For all 22 languages, plug in Bhashini or an LLM (already supported by configuration).
- Text written by the backend for officials (for example, some closure-check reasons and brief findings) is still in English in Hindi/Telugu mode. The pages rebuild the main sentences in the chosen language.
- The IVR number shown is a demo number; the Twilio-compatible IVR flow is built and needs a real number.
- State and district boundaries on the map are shown as points (areas), not shapes.

Sources: [ANI: 15.2 lakh grievances on CPGRAMS in 2026](https://aninews.in/news/national/general-news/over-152-lakh-grievances-received-on-cpgrams-in-2026-average-disposal-time-at-13-days-centre20260805230247/) · [Manorama: Samadhan Didi launch](https://www.manoramayearbook.in/current-affairs/india/2026/06/01/cpgrams-ai-enabled-chatbot-samadhan-didi.html) · [Down To Earth: VB-GRAMG planning framework](https://www.downtoearth.org.in/governance/centre-unveils-vb-gramg-planning-framework-with-focus-on-water-roads-and-climate-resilience) · [Mission Antyodaya](https://missionantyodaya.dord.gov.in/)
