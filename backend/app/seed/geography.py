"""Demo geography: real place names and approximate coordinates; indicator values are
SYNTHETIC but modelled on the structure of India's Mission Antyodaya (village infrastructure),
Census 2011 / NFHS-5 (vulnerability) and PM Gati Shakti / Yuktdhara layers (connectivity). Replace with real extracts via the
connectors in docs/DATA_SOURCES.md. Admin codes are illustrative placeholders."""

COUNTRIES = [
    {"code": "IN", "name": "India", "currency": "INR", "languages": ["hi", "te", "or", "bho", "ur", "en"], "node_status": "live"},
]

# infra order: water, roads, electricity, health, education, sanitation  (1 = fully provisioned)
def _i(w, r, e, h, ed, s):
    return {"water": w, "roads": r, "electricity": e, "health": h, "education": ed, "sanitation": s}


AREAS = [
    # ---------------- India: Telangana, Adilabad (rural, tribal; Telugu + Gondi) ----------------
    ("IN", "Telangana", "Adilabad", "Adilabad Urban", ["ఆదిలాబాద్", "Adilabad"], "ward", "urban", 19.672, 78.532, 139000, 33000, 0.35, 0.80, 0.8, _i(.80, .82, .90, .75, .78, .62), ["te", "hi", "en"]),
    ("IN", "Telangana", "Adilabad", "Utnoor", ["ఉట్నూర్", "Utnur"], "block", "rural", 19.366, 78.771, 78000, 18500, 0.72, 0.42, 0.35, _i(.45, .34, .72, .42, .50, .30), ["te", "gon", "hi"]),
    ("IN", "Telangana", "Adilabad", "Indervelly", ["ఇంద్రవెల్లి", "Indravelli"], "block", "rural", 19.430, 78.665, 52000, 12000, 0.74, 0.40, 0.30, _i(.40, .56, .70, .40, .48, .28), ["te", "gon"]),
    ("IN", "Telangana", "Adilabad", "Narnoor", ["నార్నూర్", "Narnur"], "block", "rural", 19.505, 78.905, 41000, 9600, 0.80, 0.30, 0.22, _i(.30, .16, .60, .30, .40, .22), ["te", "gon"]),
    ("IN", "Telangana", "Adilabad", "Jainoor", ["జైనూర్", "Jainur"], "block", "rural", 19.390, 78.960, 38000, 8900, 0.82, 0.26, 0.20, _i(.28, .19, .58, .28, .38, .20), ["te", "gon"]),
    ("IN", "Telangana", "Adilabad", "Sirpur (U)", ["సిర్పూర్", "Sirpur"], "block", "rural", 19.480, 79.010, 26000, 6100, 0.86, 0.16, 0.15, _i(.22, .12, .50, .20, .32, .15), ["gon", "te"]),
    ("IN", "Telangana", "Adilabad", "Gadiguda", ["గాదిగూడ"], "block", "rural", 19.560, 78.990, 24000, 5600, 0.84, 0.17, 0.14, _i(.25, .14, .52, .22, .35, .18), ["gon", "te"]),
    ("IN", "Telangana", "Adilabad", "Gudihatnoor", ["గుడిహత్నూర్"], "block", "rural", 19.530, 78.520, 45000, 10500, 0.60, 0.50, 0.40, _i(.55, .52, .80, .50, .58, .40), ["te", "hi"]),
    ("IN", "Telangana", "Adilabad", "Ichoda", ["ఇచ్చోడ"], "block", "rural", 19.440, 78.470, 52000, 12200, 0.58, 0.52, 0.42, _i(.58, .54, .82, .52, .60, .42), ["te", "hi"]),
    ("IN", "Telangana", "Adilabad", "Boath", ["బోథ్"], "block", "rural", 19.335, 78.335, 49000, 11400, 0.62, 0.48, 0.38, _i(.50, .49, .78, .48, .55, .38), ["te"]),
    ("IN", "Telangana", "Adilabad", "Talamadugu", ["తలమడుగు"], "block", "rural", 19.740, 78.500, 40000, 9300, 0.55, 0.50, 0.45, _i(.60, .60, .84, .55, .62, .45), ["te", "hi"]),
    ("IN", "Telangana", "Adilabad", "Bela", ["బేల"], "block", "rural", 19.730, 78.680, 37000, 8600, 0.66, 0.38, 0.33, _i(.42, .42, .75, .40, .50, .30), ["te", "hi"]),
    # ---------------- India: Odisha, Koraput (rural, tribal; Odia + Desia) ----------------
    ("IN", "Odisha", "Koraput", "Koraput Town", ["କୋରାପୁଟ", "Koraput"], "ward", "urban", 18.811, 82.711, 49000, 11800, 0.40, 0.78, 0.75, _i(.75, .78, .88, .72, .75, .60), ["or", "hi", "en"]),
    ("IN", "Odisha", "Koraput", "Jeypore", ["ଜୟପୁର"], "ward", "urban", 18.856, 82.571, 85000, 20000, 0.42, 0.74, 0.72, _i(.72, .74, .86, .70, .72, .55), ["or", "te"]),
    ("IN", "Odisha", "Koraput", "Boipariguda", ["ବୋଇପାରିଗୁଡ଼ା"], "block", "rural", 18.763, 82.425, 110000, 26000, 0.78, 0.30, 0.25, _i(.32, .27, .62, .30, .40, .20), ["or"]),
    ("IN", "Odisha", "Koraput", "Lamtaput", ["ଲମତାପୁଟ"], "block", "rural", 18.620, 82.460, 62000, 14500, 0.84, 0.20, 0.18, _i(.25, .14, .55, .24, .35, .15), ["or"]),
    ("IN", "Odisha", "Koraput", "Nandapur", ["ନନ୍ଦପୁର"], "block", "rural", 18.730, 82.600, 78000, 18400, 0.80, 0.25, 0.20, _i(.30, .22, .58, .28, .38, .18), ["or"]),
    ("IN", "Odisha", "Koraput", "Pottangi", ["ପୋଟ୍ଟାଙ୍ଗି"], "block", "rural", 18.560, 82.970, 69000, 16200, 0.78, 0.30, 0.24, _i(.35, .24, .60, .30, .42, .22), ["or", "te"]),
    ("IN", "Odisha", "Koraput", "Laxmipur", ["ଲକ୍ଷ୍ମୀପୁର", "Lakshmipur"], "block", "rural", 19.200, 83.020, 55000, 12900, 0.88, 0.13, 0.12, _i(.20, .10, .48, .18, .30, .12), ["or"]),
    ("IN", "Odisha", "Koraput", "Narayanpatna", ["ନାରାୟଣପାଟଣା"], "block", "rural", 19.150, 83.200, 48000, 11300, 0.90, 0.10, 0.10, _i(.18, .07, .45, .16, .28, .10), ["or"]),
    ("IN", "Odisha", "Koraput", "Bandhugaon", ["ବନ୍ଧୁଗାଁ"], "block", "rural", 18.870, 83.100, 41000, 9700, 0.89, 0.11, 0.10, _i(.20, .08, .46, .18, .30, .12), ["or"]),
    ("IN", "Odisha", "Koraput", "Semiliguda", ["ସେମିଳିଗୁଡ଼ା"], "block", "rural", 18.700, 82.850, 72000, 17000, 0.66, 0.45, 0.40, _i(.50, .44, .75, .45, .55, .35), ["or"]),
    # ---------------- India: Delhi (urban wards) ----------------
    ("IN", "Delhi", "North East Delhi", "Seelampur", ["सीलमपुर"], "ward", "urban", 28.670, 77.270, 210000, 42000, 0.66, 0.68, 0.85, _i(.50, .60, .85, .55, .52, .30), ["hi", "bho"]),
    ("IN", "Delhi", "South Delhi", "Sangam Vihar", ["संगम विहार"], "ward", "urban", 28.500, 77.245, 450000, 95000, 0.64, 0.66, 0.84, _i(.35, .45, .85, .50, .55, .35), ["hi", "bho"]),
    ("IN", "Delhi", "North West Delhi", "Jahangirpuri", ["जहांगीरपुरी"], "ward", "urban", 28.730, 77.170, 190000, 39000, 0.62, 0.70, 0.85, _i(.70, .60, .86, .55, .55, .38), ["hi", "bho"]),
    ("IN", "Delhi", "North West Delhi", "Mangolpuri", ["मंगोलपुरी"], "ward", "urban", 28.692, 77.084, 170000, 35000, 0.60, 0.70, 0.85, _i(.55, .62, .86, .58, .56, .40), ["hi"]),
    ("IN", "Delhi", "North West Delhi", "Bawana", ["बवाना"], "ward", "urban", 28.799, 77.034, 140000, 29000, 0.70, 0.55, 0.78, _i(.45, .50, .82, .45, .50, .30), ["hi", "bho"]),
    ("IN", "Delhi", "East Delhi", "Trilokpuri", ["त्रिलोकपुरी"], "ward", "urban", 28.612, 77.310, 160000, 33000, 0.58, 0.72, 0.85, _i(.60, .64, .87, .60, .58, .45), ["hi"]),
    ("IN", "Delhi", "South West Delhi", "Vasant Vihar", ["वसंत विहार"], "ward", "urban", 28.560, 77.160, 60000, 15000, 0.10, 0.97, 0.95, _i(.92, .90, .97, .92, .93, .90), ["en", "hi"]),
    ("IN", "Delhi", "South Delhi", "Greater Kailash", ["ग्रेटर कैलाश", "GK"], "ward", "urban", 28.540, 77.240, 90000, 22000, 0.12, 0.96, 0.95, _i(.90, .90, .96, .92, .92, .88), ["en", "hi"]),
    # ---------------- India: Telangana, Hyderabad (urban wards; Telugu + Urdu + Hindi) ----------------
    ("IN", "Telangana", "Hyderabad", "Chandrayangutta", ["చాంద్రాయణగుట్ట", "चंद्रायणगुट्टा"], "ward", "urban", 17.311, 78.482, 260000, 52000, 0.66, 0.66, 0.82, _i(.48, .55, .70, .50, .52, .32), ["te", "hi"]),
    ("IN", "Telangana", "Hyderabad", "Amberpet", ["అంబర్‌పేట్"], "ward", "urban", 17.391, 78.513, 180000, 40000, 0.52, 0.74, 0.86, _i(.62, .62, .84, .60, .60, .48), ["te", "hi"]),
    ("IN", "Telangana", "Hyderabad", "Malakpet", ["మలక్‌పేట్", "मलकपेट"], "ward", "urban", 17.372, 78.500, 210000, 45000, 0.58, 0.72, 0.85, _i(.55, .60, .82, .58, .55, .40), ["te", "hi"]),
    ("IN", "Telangana", "Hyderabad", "Kukatpally", ["కూకట్‌పల్లి"], "ward", "urban", 17.485, 78.411, 290000, 70000, 0.30, 0.88, 0.92, _i(.78, .80, .92, .80, .82, .72), ["te", "en"]),
    ("IN", "Telangana", "Hyderabad", "Banjara Hills", ["బంజారా హిల్స్"], "ward", "urban", 17.414, 78.438, 70000, 17000, 0.08, 0.97, 0.96, _i(.93, .92, .97, .93, .93, .90), ["en", "te"]),
    ("IN", "Telangana", "Hyderabad", "Jubilee Hills", ["జూబ్లీ హిల్స్"], "ward", "urban", 17.432, 78.407, 60000, 15000, 0.07, 0.98, 0.97, _i(.94, .93, .97, .94, .94, .91), ["en", "te"]),
    # ---------------- India: Bihar, Gaya (rural; Hindi + Magahi/Bhojpuri) ----------------
    ("IN", "Bihar", "Gaya", "Gaya Town", ["गया"], "ward", "urban", 24.791, 85.000, 470000, 80000, 0.50, 0.70, 0.75, _i(.60, .62, .80, .55, .58, .42), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Bodh Gaya", ["बोधगया"], "block", "rural", 24.696, 84.991, 210000, 36000, 0.62, 0.50, 0.45, _i(.42, .58, .75, .45, .50, .35), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Sherghati", ["शेरघाटी"], "block", "rural", 24.560, 84.790, 230000, 39000, 0.72, 0.38, 0.30, _i(.30, .45, .62, .35, .42, .25), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Imamganj", ["इमामगंज"], "block", "rural", 24.400, 84.590, 210000, 35000, 0.84, 0.22, 0.18, _i(.16, .28, .50, .22, .34, .15), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Dumaria", ["डुमरिया"], "block", "rural", 24.320, 84.570, 150000, 25000, 0.87, 0.15, 0.14, _i(.12, .20, .45, .18, .30, .12), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Barachatti", ["बाराचट्टी"], "block", "rural", 24.500, 85.030, 190000, 32000, 0.80, 0.28, 0.22, _i(.22, .30, .55, .28, .38, .18), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Tekari", ["टेकारी"], "block", "rural", 24.940, 84.840, 200000, 34000, 0.66, 0.44, 0.35, _i(.38, .52, .70, .42, .48, .30), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Manpur", ["मानपुर"], "block", "rural", 24.800, 85.030, 170000, 29000, 0.60, 0.52, 0.42, _i(.45, .58, .74, .48, .52, .34), ["hi"]),
    # ---------------- India: Uttar Pradesh, Bahraich (rural, aspirational district; Hindi + Awadhi) ----------------
    ("IN", "Uttar Pradesh", "Bahraich", "Bahraich Town", ["बहराइच"], "ward", "urban", 27.574, 81.595, 190000, 34000, 0.52, 0.68, 0.72, _i(.62, .60, .80, .55, .55, .40), ["hi"]),
    ("IN", "Uttar Pradesh", "Bahraich", "Mihinpurwa", ["मिहींपुरवा"], "block", "rural", 28.040, 81.260, 260000, 44000, 0.88, 0.14, 0.12, _i(.24, .22, .48, .06, .30, .14), ["hi"]),
    ("IN", "Uttar Pradesh", "Bahraich", "Nanpara", ["नानपारा"], "block", "rural", 27.860, 81.500, 240000, 41000, 0.76, 0.32, 0.28, _i(.38, .40, .62, .20, .40, .24), ["hi"]),
    ("IN", "Uttar Pradesh", "Bahraich", "Kaiserganj", ["कैसरगंज"], "block", "rural", 27.250, 81.540, 250000, 42000, 0.70, 0.40, 0.33, _i(.45, .48, .68, .26, .45, .28), ["hi"]),
    ("IN", "Uttar Pradesh", "Bahraich", "Payagpur", ["पयागपुर"], "block", "rural", 27.400, 81.930, 220000, 37000, 0.72, 0.36, 0.30, _i(.42, .44, .64, .23, .42, .26), ["hi"]),
    ("IN", "Uttar Pradesh", "Bahraich", "Shivpur", ["शिवपुर"], "block", "rural", 27.720, 81.710, 180000, 30000, 0.82, 0.20, 0.16, _i(.28, .26, .52, .10, .34, .16), ["hi"]),
    # ---------------- India: Maharashtra, Pune (urban + peri-urban; Marathi + Hindi) ----------------
    ("IN", "Maharashtra", "Pune", "Haveli", ["हवेली", "Haveli"], "block", "peri-urban", 18.520, 73.856, 320000, 75000, 0.38, 0.78, 0.82, _i(.75, .78, .88, .75, .80, .70), ["mr", "hi", "en"]),
    ("IN", "Maharashtra", "Pune", "Baramati", ["बारामती", "Baramati"], "block", "rural", 18.150, 74.580, 180000, 42000, 0.45, 0.70, 0.75, _i(.70, .72, .85, .68, .72, .65), ["mr", "hi"]),
    # ---------------- India: Karnataka, Bengaluru Urban (Kannada + English) ----------------
    ("IN", "Karnataka", "Bengaluru Urban", "Anekal", ["ಆನೇಕಲ್", "Anekal"], "block", "peri-urban", 12.710, 77.696, 290000, 68000, 0.40, 0.75, 0.80, _i(.72, .75, .86, .72, .76, .68), ["kn", "en", "hi"]),
    # ---------------- Brazil: São Paulo (subprefeituras / distritos) ----------------
    ("BR", "São Paulo", "São Paulo", "Capão Redondo", ["Capao Redondo"], "district", "urban", -23.670, -46.780, 285000, 90000, 0.66, 0.72, 0.70, _i(.78, .55, .85, .48, .45, .60), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Grajaú", ["Grajau"], "district", "urban", -23.785, -46.670, 385000, 118000, 0.72, 0.65, 0.65, _i(.60, .45, .82, .42, .40, .38), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Jardim Ângela", ["Jardim Angela"], "district", "urban", -23.712, -46.772, 330000, 102000, 0.70, 0.66, 0.66, _i(.65, .48, .83, .40, .42, .40), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Cidade Tiradentes", ["Tiradentes"], "district", "urban", -23.582, -46.400, 215000, 66000, 0.68, 0.68, 0.68, _i(.72, .55, .84, .45, .42, .50), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Brasilândia", ["Brasilandia"], "district", "urban", -23.460, -46.690, 280000, 87000, 0.66, 0.70, 0.68, _i(.70, .50, .84, .46, .45, .48), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Itaim Paulista", ["Itaim"], "district", "urban", -23.500, -46.400, 230000, 72000, 0.62, 0.72, 0.70, _i(.74, .58, .86, .50, .48, .55), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Parelheiros", ["Parelheiros"], "district", "rural", -23.830, -46.730, 150000, 45000, 0.78, 0.38, 0.40, _i(.40, .30, .72, .30, .35, .22), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Marsilac", ["Marsilac"], "district", "rural", -23.905, -46.705, 9000, 2800, 0.80, 0.22, 0.30, _i(.30, .20, .65, .25, .30, .15), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Pinheiros", ["Pinheiros"], "district", "urban", -23.567, -46.690, 65000, 29000, 0.08, 0.97, 0.96, _i(.98, .90, .98, .92, .92, .96), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Moema", ["Moema"], "district", "urban", -23.600, -46.665, 83000, 36000, 0.06, 0.98, 0.97, _i(.98, .88, .98, .93, .93, .97), ["pt"]),
    ("BR", "São Paulo", "São Paulo", "Vila Mariana", ["Vila Mariana"], "district", "urban", -23.589, -46.635, 137000, 58000, 0.08, 0.97, 0.96, _i(.98, .90, .98, .93, .93, .96), ["pt"]),
    # ---------------- South Africa: Gauteng (Johannesburg / Ekurhuleni) ----------------
    ("ZA", "Gauteng", "Johannesburg", "Soweto", ["Soweto", "eSoweto"], "township", "urban", -26.265, 27.858, 1270000, 355000, 0.60, 0.70, 0.60, _i(.62, .60, .40, .50, .55, .55), ["zu", "en", "xh"]),
    ("ZA", "Gauteng", "Johannesburg", "Alexandra", ["Alex", "Alexandra"], "township", "urban", -26.103, 28.097, 180000, 62000, 0.72, 0.66, 0.58, _i(.55, .50, .72, .45, .48, .35), ["zu", "en"]),
    ("ZA", "Gauteng", "Johannesburg", "Diepsloot", ["Diepsloot"], "township", "urban", -25.933, 28.012, 350000, 125000, 0.80, 0.55, 0.50, _i(.30, .35, .38, .30, .35, .25), ["zu", "en", "xh"]),
    ("ZA", "Gauteng", "Johannesburg", "Orange Farm", ["Orange Farm"], "township", "urban", -26.480, 27.865, 260000, 84000, 0.82, 0.35, 0.45, _i(.35, .30, .42, .28, .35, .22), ["zu", "en"]),
    ("ZA", "Gauteng", "Johannesburg", "Ivory Park", ["Ivory Park"], "township", "urban", -25.990, 28.190, 185000, 64000, 0.76, 0.52, 0.50, _i(.42, .40, .45, .36, .42, .30), ["zu", "en"]),
    ("ZA", "Gauteng", "Ekurhuleni", "Tembisa", ["Tembisa"], "township", "urban", -25.998, 28.227, 465000, 150000, 0.66, 0.66, 0.58, _i(.55, .55, .45, .45, .50, .45), ["zu", "en"]),
    ("ZA", "Gauteng", "Johannesburg", "Sandton", ["Sandton"], "suburb", "urban", -26.107, 28.056, 220000, 90000, 0.08, 0.96, 0.95, _i(.92, .88, .70, .92, .92, .92), ["en", "af"]),
    ("ZA", "Gauteng", "Johannesburg", "Midrand", ["Midrand"], "suburb", "urban", -25.990, 28.128, 175000, 68000, 0.15, 0.92, 0.90, _i(.88, .86, .70, .88, .88, .88), ["en"]),
]

ADMIN_PREFIX = {"IN": "LGD", "BR": "IBGE-3550308", "ZA": "STATSSA-798"}
