# 6-minute demo script (India)

**Before you present**
- Start backend and frontend (`./start.sh`), open http://localhost:5173. Reset data first: `cd backend && python -m app.seed.seed`.
- Use a fresh browser profile so the **first-visit language chooser** appears.
- Keep four tabs ready, or log out and in as you go: `officer/officer123`, `collector/collector123`, `state/state123`, `planner/planner123`.
- Map tiles need internet. **Record a backup video of this exact flow.**

| Time | Who / screen | What you do and say |
|---|---|---|
| 0:00 | **Home** | Pick **తెలుగు** in the language chooser; the whole page switches. "CPGRAMS reports over 95% of grievances disposed. Yet Ramesh's drain in Bawana still floods. **Disposal is not development.**" Point at the globe: pilot districts in Telangana, Odisha, Delhi, Bihar and Uttar Pradesh. |
| 0:40 | Citizen: **Report a problem** | Still in Telugu. Press **Listen**: the page reads itself aloud. Tap the **water** picture tile, speak or type a Telugu sentence, send. The reply comes back in Telugu with a tracking ID. "No reading needed, no need to know the department." Show the IVR / missed-call help for feature phones. |
| 1:20 | Citizen: **Track** `JS-IN-LAKSH1` | Switch to **हिं** live. Step-by-step bar: Lakshmi from Narnoor (filed by an ASHA, in Telugu) is now part of a recommended road project. Then `JS-IN-RAMES1`: "The office wrote *disposed*. Ramesh said **not fixed** and it reopened." |
| 1:50 | Field officer (`officer`): **Inbox** | The **Today** strip: urgent, to review, fake closures, copy-paste campaigns. "The AI never rejects a citizen. Unclear reports wait for a person." Open a fake-closure flag. |
| 2:20 | National planner (`planner`): **Dashboard** | **India at a glance**: one card per state. Click **Telangana** to drill down to Adilabad and Hyderabad. Map layer **Hotspots**; early warning **Malakpet power cuts** (Priya, `JS-IN-PRIYA1`). |
| 2:50 | **Priorities → Silent areas** | "Narayanpatna and Laxmipur in Koraput, Mihinpurwa in Bahraich: worst infrastructure, very few reports. They are not fine, they are unheard." Sunita (`JS-IN-SUNIT1`) is here: no doctor at the health centre. "JanSetu tells the Collector to send ASHAs and an IVR drive." |
| 3:20 | **Projects & budget → Money in low-need places** | "About two thirds of the ₹182 crore of existing plans goes to below-median need: road resurfacing and decorative lighting in **Banjara Hills**, junction beautification in **Jubilee Hills**, while tribal blocks in Adilabad lack drinking water." |
| 3:50 | Collector (`collector`): **Suggested by AI → Budget planner** | Open the top project: **Why this project?** shows need, cost in ₹, people helped, scheme (PMGSY / JJM) and citizens' own words. **Approve**: every citizen in that group gets a message in their language. Slide the budget planner from ₹50 crore to ₹200 crore and watch the list grow. |
| 4:30 | **Gram Sabha plan** tab | Pick Adilabad. "This is a draft **Viksit Gram Panchayat Plan** under **VB-GRAMG**, which replaced MGNREGA from 1 July 2026. The Gram Sabha approves it, and the CSV is ready for **Yuktdhara**." Download the CSV. |
| 5:00 | State planner (`state`): **Ask** | Tap the Telugu question *"తెలంగాణలో నిశ్శబ్ద ప్రాంతాలు చూపించు"* (show silent areas in Telangana). Answer, table and map. Then open **Brief** for Telangana: print-ready. |
| 5:30 | **Impact** | "Four completed projects: complaints fell 65–84% against comparison areas (difference-in-differences): Jahangirpuri water, Indervelly PMGSY road, Chandrayangutta drainage, Sherghati substation." |
| 5:45 | **Privacy & open standards** | "Apache-2.0, all 9 DPG indicators, Open311, DPDP Act 2023 compliant, data stays in India, runs offline with zero keys." |

## Likely judge questions

- **"Isn't this CPGRAMS / Samadhan Didi?"** They file and route tickets. We turn tickets into demand, fuse it with
  infrastructure and budget data, recommend projects and measure impact. We import from them via CSV and Open311.
- **"People without smartphones?"** IVR / missed call, SMS, ASHA and CSC assisted filing, Gram Sabha minutes, silent-area outreach.
- **"Can groups game it?"** We count households, not messages. Copy-paste campaigns count at 25%. Scores are per capita.
- **"Dialects and small languages?"** Bhashini for 22 languages, the offline engine, the original is always kept, low confidence goes to a person.
- **"Is AI deciding spending?"** No. Weights are published, people approve with reasons, every decision is logged.
- **"Cost?"** Open models on government cloud, paise per request, existing CSC and ASHA networks, `docker compose up`.
