# Data sources and how to plug in real data

**The demo indicator data is synthetic.** Place names and approximate coordinates are real. Population, infrastructure,
vulnerability and plan values are made up, but structured like the Indian sources below so a real loader can replace them.
To load real data, write a loader that fills `Area`, `IndicatorHistory` and `Project (source='plan')`.

| Layer | Indian source | Fills |
|---|---|---|
| Admin codes | **Local Government Directory (LGD)** codes for state, district, block, gram panchayat, village, ward | `Area` keys; join everything on LGD |
| Demographics | **Census 2011** now; **Census 2027** when released (house-listing and population data) | `Area.population`, households, SC/ST share |
| Village infrastructure | **Mission Antyodaya** (village facilities survey, about 6.5 lakh villages) | `Area.infra` per sector (water, roads, power, health, schools, sanitation) |
| Health and nutrition | **NFHS-5** district factsheets | vulnerability, health deficit |
| Schools | **UDISE+** | education deficit |
| Drinking water | **Jal Jeevan Mission** dashboard (tap connections by village) | water deficit, existing JJM works |
| Rural roads | **PMGSY OMMAS** (sanctioned and completed roads) | road deficit, existing PMGSY works |
| Infrastructure plans | **PM Gati Shakti** National Master Plan layers | existing plan items, locations |
| Village plans | **Yuktdhara** (VB-GRAMG Viksit Gram Panchayat Plans) and older GPDP plans on eGramSwaraj | existing plan items; JanSetu's Gram Sabha CSV goes back here |
| Maps and water resources | **Bhuvan** (ISRO) and **India-WRIS** | boundaries, groundwater and flood risk |
| Existing grievances | **CPGRAMS** exports and state portals | imported as `CitizenRequest` via the CSV connector |
| Open datasets | **data.gov.in** (OGD platform) | many of the above as CSV / API |

## Importing existing grievances

```bash
# CSV export (e.g. from CPGRAMS or a state portal)
curl -H "Authorization: Bearer <token>" -F file=@cpgrams.csv -F text_column=grievance_text \
     -F language=hi -F source=CPGRAMS http://localhost:8000/api/connectors/csv

# Any Open311 GeoReport v2 feed (e.g. a municipal corporation)
curl -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
     -d '{"url":"https://<city>/open311/v2/requests.json"}' http://localhost:8000/api/connectors/open311/pull
```

Get a token from `POST /api/auth/login` with any official account.
Each `Area` has an `admin_code` field for its LGD code. Imported text goes through the same pipeline as every
other channel (language, sector, place, PII redaction, clustering).

## Exporting

- `GET /api/export/need-gap.csv`: open, aggregated Need-Gap scores (no personal data).
- `GET /api/plans/gram-sabha.csv?district=Adilabad`: draft Viksit Gram Panchayat Plan for the Gram Sabha and Yuktdhara.
- `/open311/v2/requests.json`: anonymised requests in the Open311 standard.
