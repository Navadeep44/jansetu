# 6-minute winning demo script

**Before you present:** start the backend and frontend, open http://localhost:5173, start on the Home page (no login). Log in as **Dr. S. Menon (planner)** when you reach the dashboard step.
Reset the data with `python -m app.seed.seed`. **Record a backup video of this exact flow.**

| Time | Screen | What you say / do |
|---|---|---|
| 0:00 | Home | "In May 2026 India's grievance system reported over 95% disposal. Yet Ramesh's drain in Delhi still floods. **Disposal is not development.** Only 28% of rural women even own a phone. We built the layer nobody has: from complaints to development demand to the right investment, and proof it worked." |
| 0:40 | **Report a need** | Switch Language to **తెలుగు**. Tap the mic (or click the Telugu example). Show the live *"What JanSetu understood"* panel: Telugu detected, drinking water, broken borewell, affects children. Send. The reply comes back **in Telugu**; press **Listen**. "Her voice joined 50+ households. Counted once, not as spam." |
| 1:30 | **WhatsApp / IVR simulator** | Run *"Telugu voice note, no place"*: the bot asks *where?* in Telugu, the citizen answers "జైనూర్", and it resolves. Then run *isiZulu, Soweto* and *Russian (partner node)*. "Same engine behind WhatsApp, Telegram, IVR for feature phones, and SMS." |
| 2:10 | **National dashboard** | Map layer *Need gap*, then **Hotspots (Gi\*)**. Show the early-warning card: **Soweto power cuts z = 20, "early warning of unrest"** and **Seelampur sewage: disease risk**. |
| 2:40 | Map layer **Silent zones** (zoom to Koraput) | **The wow moment:** "Narayanpatna and Laxmipur have the worst infrastructure in the district, yet almost nobody complained. They're not fine; they're unheard: 10% phone access. JanSetu tells the Collector to send ASHAs and an IVR campaign there." |
| 3:10 | **Need-Gap & silent zones** | Drag the *Citizen demand* weight to 0 and watch the ranking change. "Weights are a policy choice, published in advance, as the World Bank framework recommends. Not a black box." |
| 3:40 | **Projects & budget → AI-recommended** | Open the top project: the **Why this project?** card shows drivers, facts and citizens' own words in Odia and Telugu, plus the funding scheme (PMGSY / JJM). Click **Approve**: "every citizen in that cluster was just notified in their own language." |
| 4:10 | **Budget optimiser** | Slide ₹50 Cr, then ₹150 Cr, then ₹300 Cr: the portfolio maximising people reached. |
| 4:30 | **Misaligned spending** | "About half of India's active plan budget in this demo goes to below-median need: decorative footpaths in Vasant Vihar while Koraput has no roads." |
| 4:50 | **Ask JanSetu** | Click the Odisha water question, then ask in Hindi *"सबसे ज़्यादा पानी की समस्या कहाँ है?"*. Show the answer, the table and the map. Click **Generate policy brief** and show it is print-ready. |
| 5:20 | **Track my request → JS-IN-RAMES1** | "The department wrote *'Your grievance has been disposed.'* JanSetu flagged it as formulaic. Ramesh taps **No, not fixed** and the case reopens." Then **Impact**: complaints fell 71–85% after 4 completed projects, with difference-in-differences against comparison areas. |
| 5:45 | **BRICS federated view → DPG page** | "Each country runs its own node; only k-anonymous aggregates cross borders, which satisfies DPDP, LGPD, POPIA, PIPL and 152-FZ. Apache-2.0, all 9 DPG indicators, Open311, runs offline with zero API keys." |

## Likely judge questions

- **"Isn't this CPGRAMS / Samadhan Didi?"** They file and route tickets. We aggregate those tickets into demand, fuse it with supply and budget data, recommend and measure. We plug into them via Open311 and CSV connectors.
- **"People without smartphones?"** IVR, SMS, assisted filing (CSC, ASHA), Gram Sabha minutes, and silent-zone outreach.
- **"Gaming by organised groups?"** Unique households, not messages. Coordinated campaigns are flagged and weighted at 25%. Per-capita normalisation.
- **"Low-resource languages?"** Bhashini (22 languages) plus the offline engine plus the original always kept. Low confidence goes to a human. We publish per-language accuracy.
- **"Privacy and sovereignty?"** Federated nodes, PII redaction, hashing, erasure, k-anonymity and optional differential privacy.
- **"Is AI deciding public spending?"** No. It gives transparent recommendations; humans approve with reasons, and every decision is audited.
- **"Cost?"** Open models on government cloud, paise per request, existing CSC and DPI rails. A DPG that any BRICS country can deploy with `docker compose up`.
