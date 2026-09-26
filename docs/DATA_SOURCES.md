# Data sources and how to plug in real data

The demo dataset is **synthetic**. It uses real place names and approximate coordinates, and indicator structures modelled on the
sources below. Replace it by writing a loader that fills `Area`, `IndicatorHistory` and `Project (source='plan')`.

| Layer | India | Brazil | South Africa | Global fallback |
|---|---|---|---|---|
| Demographics | Census 2011 (Census 2027 in progress), SHRUG | IBGE Censo 2022 | Stats SA Census 2022 | WorldPop 100 m grids, GHSL |
| Infrastructure indices (`Area.infra`) | **Mission Antyodaya** (22 parameters, about 6.48 lakh villages, data.gov.in), UDISE+, HMIS, Jal Jeevan dashboard, PMGSY | IBGE, SNIS sanitation | Stats SA General Household Survey, municipal IDPs | OpenStreetMap (roads, schools, clinics), VIIRS night lights |
| Investment plans (`Project source=plan`) | **eGramSwaraj GPDP** (18+ lakh plans), PM Gati Shakti, MPLADS e-SAKSHI | PPA 2024–27, Novo PAC, Portal da Transparência | Municipal IDPs, National Treasury | New Development Bank and World Bank project lists |
| Existing grievances (connectors) | CPGRAMS exports, state portals | **SP156 open data** (dados.prefeitura.sp.gov.br), Rio 1746 (DATA.RIO) | Presidential Hotline statistics | Any Open311 endpoint |
| Vulnerability | SC/ST share, SECC deprivation, NFHS | CadÚnico, IVS (IPEA) | Stats SA poverty indicators | World Bank poverty maps |

## Importing existing grievances

```bash
# CSV (e.g. SP156 quarterly file uses ';' separators; column names vary by year)
curl -H "X-Role: national" -F file=@sp156.csv -F text_column=Descrição -F language=pt -F source=SP156 \
     http://localhost:8000/api/connectors/csv
# Any Open311 GeoReport v2 feed
curl -H "X-Role: national" -H "Content-Type: application/json" \
     -d '{"url":"https://<city>/open311/v2/requests.json"}' http://localhost:8000/api/connectors/open311/pull
```

## Admin codes

Join everything on official codes: India LGD, Brazil IBGE (7-digit municipality plus district), Stats SA ward codes, and
ISO 3166-2 for states. For cross-country spatial joins, add an H3 index (resolution 7 or 8) in PostGIS.
