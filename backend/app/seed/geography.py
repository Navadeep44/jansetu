"""Demo geography: real place names and approximate coordinates; indicator values are
SYNTHETIC but modelled on the structure of India's Mission Antyodaya (village infrastructure),
Brazil's IBGE Censo 2022 and Stats SA Census 2022 / GHS. Replace with real extracts via the
connectors in docs/DATA_SOURCES.md. Admin codes are illustrative placeholders."""

COUNTRIES = [
    {"code": "IN", "name": "India", "currency": "INR", "languages": ["hi", "te", "or", "bho", "en", "mr", "kn", "ta", "bn"], "node_status": "live"},
    {"code": "BR", "name": "Brazil", "currency": "BRL", "languages": ["pt"], "node_status": "live"},
    {"code": "ZA", "name": "South Africa", "currency": "ZAR", "languages": ["zu", "en", "xh", "af"], "node_status": "live"},
    {"code": "RU", "name": "Russia", "currency": "RUB", "languages": ["ru"], "node_status": "simulated"},
    {"code": "CN", "name": "China", "currency": "CNY", "languages": ["zh"], "node_status": "simulated"},
    {"code": "EG", "name": "Egypt", "currency": "EGP", "languages": ["ar"], "node_status": "simulated"},
    {"code": "ET", "name": "Ethiopia", "currency": "ETB", "languages": ["am"], "node_status": "simulated"},
    {"code": "IR", "name": "Iran", "currency": "IRR", "languages": ["fa"], "node_status": "simulated"},
    {"code": "AE", "name": "United Arab Emirates", "currency": "AED", "languages": ["ar"], "node_status": "simulated"},
    {"code": "ID", "name": "Indonesia", "currency": "IDR", "languages": ["id"], "node_status": "simulated"},
]

# infra order: water, roads, electricity, health, education, sanitation  (1 = fully provisioned)
def _i(w, r, e, h, ed, s):
    return {"water": w, "roads": r, "electricity": e, "health": h, "education": ed, "sanitation": s}


AREAS = [
    # ---------------- India: Telangana, Adilabad (rural, tribal; Telugu + Gondi) ----------------
    ("IN", "Telangana", "Adilabad", "Adilabad Urban", ["ఆదిలాబాద్", "Adilabad"], "ward", "urban", 19.672, 78.532, 139000, 33000, 0.35, 0.80, 0.8, _i(.80, .82, .90, .75, .78, .62), ["te", "hi", "en"]),
    ("IN", "Telangana", "Adilabad", "Utnoor", ["ఉట్నూర్", "Utnur"], "block", "rural", 19.366, 78.771, 78000, 18500, 0.72, 0.42, 0.35, _i(.45, .40, .72, .42, .50, .30), ["te", "gon", "hi"]),
    ("IN", "Telangana", "Adilabad", "Indervelly", ["ఇంద్రవెల్లి", "Indravelli"], "block", "rural", 19.430, 78.665, 52000, 12000, 0.74, 0.40, 0.30, _i(.40, .62, .70, .40, .48, .28), ["te", "gon"]),
    ("IN", "Telangana", "Adilabad", "Narnoor", ["నార్నూర్", "Narnur"], "block", "rural", 19.505, 78.905, 41000, 9600, 0.80, 0.30, 0.22, _i(.30, .22, .60, .30, .40, .22), ["te", "gon"]),
    ("IN", "Telangana", "Adilabad", "Jainoor", ["జైనూర్", "Jainur"], "block", "rural", 19.390, 78.960, 38000, 8900, 0.82, 0.26, 0.20, _i(.28, .25, .58, .28, .38, .20), ["te", "gon"]),
    ("IN", "Telangana", "Adilabad", "Sirpur (U)", ["సిర్పూర్", "Sirpur"], "block", "rural", 19.480, 79.010, 26000, 6100, 0.86, 0.16, 0.15, _i(.22, .18, .50, .20, .32, .15), ["gon", "te"]),
    ("IN", "Telangana", "Adilabad", "Gadiguda", ["గాదిగూడ"], "block", "rural", 19.560, 78.990, 24000, 5600, 0.84, 0.17, 0.14, _i(.25, .20, .52, .22, .35, .18), ["gon", "te"]),
    ("IN", "Telangana", "Adilabad", "Gudihatnoor", ["గుడిహత్నూర్"], "block", "rural", 19.530, 78.520, 45000, 10500, 0.60, 0.50, 0.40, _i(.55, .58, .80, .50, .58, .40), ["te", "hi"]),
    ("IN", "Telangana", "Adilabad", "Ichoda", ["ఇచ్చోడ"], "block", "rural", 19.440, 78.470, 52000, 12200, 0.58, 0.52, 0.42, _i(.58, .60, .82, .52, .60, .42), ["te", "hi"]),
    ("IN", "Telangana", "Adilabad", "Boath", ["బోథ్"], "block", "rural", 19.335, 78.335, 49000, 11400, 0.62, 0.48, 0.38, _i(.50, .55, .78, .48, .55, .38), ["te"]),
    ("IN", "Telangana", "Adilabad", "Talamadugu", ["తలమడుగు"], "block", "rural", 19.740, 78.500, 40000, 9300, 0.55, 0.50, 0.45, _i(.60, .66, .84, .55, .62, .45), ["te", "hi"]),
    ("IN", "Telangana", "Adilabad", "Bela", ["బేల"], "block", "rural", 19.730, 78.680, 37000, 8600, 0.66, 0.38, 0.33, _i(.42, .48, .75, .40, .50, .30), ["te", "hi"]),

    # ---------------- India: Telangana, Warangal (urban & rural) ----------------
    ("IN", "Telangana", "Warangal", "Hanamkonda", ["హనుమకొండ", "Hanamkonda"], "ward", "urban", 18.007, 79.560, 240000, 58000, 0.28, 0.84, 0.85, _i(.82, .85, .92, .80, .84, .75), ["te", "hi", "en"]),
    ("IN", "Telangana", "Warangal", "Kazipet", ["కాజీపేట", "Kazipet"], "ward", "urban", 17.978, 79.510, 160000, 38000, 0.30, 0.82, 0.82, _i(.78, .80, .90, .78, .80, .70), ["te", "hi", "en"]),
    ("IN", "Telangana", "Warangal", "Parkal", ["పరకాల", "Parkal"], "block", "rural", 18.200, 79.710, 68000, 16000, 0.58, 0.52, 0.48, _i(.56, .58, .78, .52, .60, .45), ["te"]),
    ("IN", "Telangana", "Warangal", "Narsampet", ["నర్సంపేట", "Narsampet"], "block", "rural", 17.930, 79.890, 75000, 17500, 0.60, 0.50, 0.45, _i(.52, .55, .76, .50, .58, .42), ["te"]),
    ("IN", "Telangana", "Warangal", "Wardhannapet", ["వర్ధన్నపేట"], "block", "rural", 17.770, 79.620, 54000, 12500, 0.64, 0.46, 0.40, _i(.48, .50, .74, .46, .52, .38), ["te"]),

    # ---------------- India: Telangana, Hyderabad (metro wards) ----------------
    ("IN", "Telangana", "Hyderabad", "Charminar", ["చార్మినార్", "Old City"], "ward", "urban", 17.361, 78.474, 380000, 85000, 0.45, 0.78, 0.88, _i(.75, .72, .92, .76, .75, .60), ["te", "ur", "hi", "en"]),
    ("IN", "Telangana", "Hyderabad", "Secunderabad", ["సికింద్రాబాద్"], "ward", "urban", 17.439, 78.498, 420000, 98000, 0.20, 0.88, 0.92, _i(.86, .88, .96, .88, .90, .82), ["te", "hi", "en"]),
    ("IN", "Telangana", "Hyderabad", "Khairatabad", ["ఖైరతాబాద్"], "ward", "urban", 17.412, 78.460, 310000, 72000, 0.22, 0.86, 0.90, _i(.85, .86, .95, .86, .88, .80), ["te", "hi", "en"]),
    ("IN", "Telangana", "Hyderabad", "Serilingampally", ["శేరిలింగంపల్లి", "Gachibowli"], "ward", "urban", 17.484, 78.328, 480000, 120000, 0.15, 0.94, 0.95, _i(.90, .92, .98, .92, .94, .88), ["en", "te", "hi"]),

    # ---------------- India: Andhra Pradesh, Visakhapatnam ----------------
    ("IN", "Andhra Pradesh", "Visakhapatnam", "Visakhapatnam Urban", ["విశాఖపట్నం", "Vizag"], "ward", "urban", 17.686, 83.218, 520000, 125000, 0.25, 0.88, 0.90, _i(.85, .88, .95, .85, .88, .80), ["te", "en", "hi"]),
    ("IN", "Andhra Pradesh", "Visakhapatnam", "Gajuwaka", ["గాజువాక"], "ward", "urban", 17.690, 83.180, 280000, 68000, 0.35, 0.80, 0.82, _i(.78, .80, .90, .76, .78, .68), ["te", "hi"]),
    ("IN", "Andhra Pradesh", "Visakhapatnam", "Anakapalle", ["అనకాపల్లి"], "block", "rural", 17.689, 83.002, 140000, 33000, 0.52, 0.62, 0.60, _i(.65, .68, .84, .62, .68, .55), ["te"]),
    ("IN", "Andhra Pradesh", "Visakhapatnam", "Bheemunipatnam", ["భీమిలి", "Bheemili"], "block", "peri-urban", 17.890, 83.450, 85000, 20000, 0.48, 0.68, 0.65, _i(.70, .72, .86, .66, .70, .58), ["te"]),

    # ---------------- India: Andhra Pradesh, Tirupati / Chittoor ----------------
    ("IN", "Andhra Pradesh", "Chittoor", "Tirupati Urban", ["తిరుపతి", "Tirupati"], "ward", "urban", 13.628, 79.419, 320000, 78000, 0.26, 0.86, 0.88, _i(.84, .86, .94, .82, .86, .78), ["te", "en", "ta"]),
    ("IN", "Andhra Pradesh", "Chittoor", "Chittoor Town", ["చిత్తూరు"], "ward", "urban", 13.217, 79.100, 180000, 42000, 0.40, 0.74, 0.76, _i(.74, .76, .88, .72, .75, .65), ["te", "ta"]),
    ("IN", "Andhra Pradesh", "Chittoor", "Madanapalle", ["మదనపల్లె"], "block", "rural", 13.550, 78.500, 160000, 38000, 0.50, 0.64, 0.62, _i(.66, .68, .82, .62, .66, .52), ["te"]),
    ("IN", "Andhra Pradesh", "Chittoor", "Srikalahasti", ["శ్రీకాళహస్తి"], "block", "peri-urban", 13.750, 79.700, 120000, 28000, 0.46, 0.70, 0.70, _i(.72, .74, .86, .68, .72, .60), ["te", "ta"]),

    # ---------------- India: Odisha, Koraput (rural, tribal; Odia + Desia) ----------------
    ("IN", "Odisha", "Koraput", "Koraput Town", ["କୋରାପୁଟ", "Koraput"], "ward", "urban", 18.811, 82.711, 49000, 11800, 0.40, 0.78, 0.75, _i(.75, .78, .88, .72, .75, .60), ["or", "hi", "en"]),
    ("IN", "Odisha", "Koraput", "Jeypore", ["ଜୟପୁର"], "ward", "urban", 18.856, 82.571, 85000, 20000, 0.42, 0.74, 0.72, _i(.72, .74, .86, .70, .72, .55), ["or", "te"]),
    ("IN", "Odisha", "Koraput", "Boipariguda", ["ବୋଇପାରିଗୁଡ଼ା"], "block", "rural", 18.763, 82.425, 110000, 26000, 0.78, 0.30, 0.25, _i(.32, .35, .62, .30, .40, .20), ["or"]),
    ("IN", "Odisha", "Koraput", "Lamtaput", ["ଲମତାପୁଟ"], "block", "rural", 18.620, 82.460, 62000, 14500, 0.84, 0.20, 0.18, _i(.25, .22, .55, .24, .35, .15), ["or"]),
    ("IN", "Odisha", "Koraput", "Nandapur", ["ନନ୍ଦପୁର"], "block", "rural", 18.730, 82.600, 78000, 18400, 0.80, 0.25, 0.20, _i(.30, .30, .58, .28, .38, .18), ["or"]),
    ("IN", "Odisha", "Koraput", "Pottangi", ["ପୋଟ୍ଟାଙ୍ଗି"], "block", "rural", 18.560, 82.970, 69000, 16200, 0.78, 0.30, 0.24, _i(.35, .32, .60, .30, .42, .22), ["or", "te"]),
    ("IN", "Odisha", "Koraput", "Laxmipur", ["ଲକ୍ଷ୍ମୀପୁର", "Lakshmipur"], "block", "rural", 19.200, 83.020, 55000, 12900, 0.88, 0.13, 0.12, _i(.20, .18, .48, .18, .30, .12), ["or"]),
    ("IN", "Odisha", "Koraput", "Narayanpatna", ["ନାରାୟଣପାଟଣା"], "block", "rural", 19.150, 83.200, 48000, 11300, 0.90, 0.10, 0.10, _i(.18, .15, .45, .16, .28, .10), ["or"]),
    ("IN", "Odisha", "Koraput", "Bandhugaon", ["ବନ୍ଧୁଗାଁ"], "block", "rural", 18.870, 83.100, 41000, 9700, 0.89, 0.11, 0.10, _i(.20, .16, .46, .18, .30, .12), ["or"]),
    ("IN", "Odisha", "Koraput", "Semiliguda", ["ସେମିଳିଗୁଡ଼ା"], "block", "rural", 18.700, 82.850, 72000, 17000, 0.66, 0.45, 0.40, _i(.50, .52, .75, .45, .55, .35), ["or"]),

    # ---------------- India: Odisha, Khordha (Bhubaneswar) ----------------
    ("IN", "Odisha", "Khordha", "Bhubaneswar Smart City", ["ଭୁବନେଶ୍ୱର", "Bhubaneswar"], "ward", "urban", 20.296, 85.824, 880000, 210000, 0.18, 0.92, 0.94, _i(.90, .92, .96, .90, .92, .86), ["or", "en", "hi"]),
    ("IN", "Odisha", "Khordha", "Jatni", ["ଜଟଣୀ", "Jatni"], "ward", "urban", 20.150, 85.700, 120000, 28000, 0.38, 0.76, 0.78, _i(.76, .78, .88, .74, .76, .66), ["or", "hi"]),
    ("IN", "Odisha", "Khordha", "Khordha Town", ["ଖୋର୍ଦ୍ଧା"], "ward", "urban", 20.180, 85.620, 110000, 26000, 0.42, 0.72, 0.74, _i(.72, .74, .86, .70, .72, .62), ["or"]),
    ("IN", "Odisha", "Khordha", "Balianta", ["ବାଳିଅନ୍ତା"], "block", "rural", 20.250, 85.900, 86000, 20000, 0.54, 0.60, 0.58, _i(.62, .64, .80, .58, .62, .48), ["or"]),

    # ---------------- India: Delhi (urban wards) ----------------
    ("IN", "Delhi", "North East Delhi", "Seelampur", ["सीलमपुर"], "ward", "urban", 28.670, 77.270, 210000, 42000, 0.66, 0.68, 0.85, _i(.50, .60, .85, .55, .52, .30), ["hi", "bho"]),
    ("IN", "Delhi", "South Delhi", "Sangam Vihar", ["संगम विहार"], "ward", "urban", 28.500, 77.245, 450000, 95000, 0.64, 0.66, 0.84, _i(.35, .45, .85, .50, .55, .35), ["hi", "bho"]),
    ("IN", "Delhi", "North West Delhi", "Jahangirpuri", ["जहांगीरपुरी"], "ward", "urban", 28.730, 77.170, 190000, 39000, 0.62, 0.70, 0.85, _i(.70, .60, .86, .55, .55, .38), ["hi", "bho"]),
    ("IN", "Delhi", "North West Delhi", "Mangolpuri", ["मंगोलपुरी"], "ward", "urban", 28.692, 77.084, 170000, 35000, 0.60, 0.70, 0.85, _i(.55, .62, .86, .58, .56, .40), ["hi"]),
    ("IN", "Delhi", "North West Delhi", "Bawana", ["बवाना"], "ward", "urban", 28.799, 77.034, 140000, 29000, 0.70, 0.55, 0.78, _i(.45, .50, .82, .45, .50, .30), ["hi", "bho"]),
    ("IN", "Delhi", "East Delhi", "Trilokpuri", ["त्रिलोकपुरी"], "ward", "urban", 28.612, 77.310, 160000, 33000, 0.58, 0.72, 0.85, _i(.60, .64, .87, .60, .58, .45), ["hi"]),
    ("IN", "Delhi", "South West Delhi", "Vasant Vihar", ["वसंत विहार"], "ward", "urban", 28.560, 77.160, 60000, 15000, 0.10, 0.97, 0.95, _i(.92, .90, .97, .92, .93, .90), ["en", "hi"]),
    ("IN", "Delhi", "South Delhi", "Greater Kailash", ["ग्रेटर कैलाश", "GK"], "ward", "urban", 28.540, 77.240, 90000, 22000, 0.12, 0.96, 0.95, _i(.90, .90, .96, .92, .92, .88), ["en", "hi"]),
    ("IN", "Delhi", "Central Delhi", "Karol Bagh", ["करोल बाग"], "ward", "urban", 28.651, 77.190, 175000, 38000, 0.25, 0.90, 0.92, _i(.88, .88, .96, .88, .88, .80), ["hi", "pa", "en"]),
    ("IN", "Delhi", "Central Delhi", "Daryaganj", ["दरियागंज", "Old Delhi"], "ward", "urban", 28.643, 77.241, 150000, 32000, 0.38, 0.82, 0.88, _i(.78, .76, .92, .80, .78, .65), ["hi", "ur", "en"]),

    # ---------------- India: Maharashtra, Pune & Mumbai ----------------
    ("IN", "Maharashtra", "Pune", "Haveli", ["हवेली", "Haveli"], "block", "peri-urban", 18.520, 73.856, 320000, 75000, 0.38, 0.78, 0.82, _i(.75, .78, .88, .75, .80, .70), ["mr", "hi", "en"]),
    ("IN", "Maharashtra", "Pune", "Baramati", ["बारामती", "Baramati"], "block", "rural", 18.150, 74.580, 180000, 42000, 0.45, 0.70, 0.75, _i(.70, .72, .85, .68, .72, .65), ["mr", "hi"]),
    ("IN", "Maharashtra", "Mumbai Suburban", "Andheri East", ["अंधेरी", "Andheri"], "ward", "urban", 19.115, 72.868, 550000, 130000, 0.22, 0.92, 0.94, _i(.88, .88, .96, .90, .92, .84), ["mr", "hi", "en", "gu"]),
    ("IN", "Maharashtra", "Mumbai Suburban", "Borivali", ["बोरिवली"], "ward", "urban", 19.230, 72.856, 490000, 115000, 0.18, 0.94, 0.95, _i(.90, .90, .96, .92, .92, .88), ["mr", "gu", "hi", "en"]),
    ("IN", "Maharashtra", "Mumbai Suburban", "Kurla West", ["कुर्ला"], "ward", "urban", 19.070, 72.880, 420000, 95000, 0.52, 0.75, 0.84, _i(.68, .70, .90, .70, .70, .55), ["mr", "hi", "ur"]),
    ("IN", "Maharashtra", "Nagpur", "Nagpur Urban", ["नागपूर", "Nagpur"], "ward", "urban", 21.145, 79.088, 650000, 150000, 0.28, 0.86, 0.88, _i(.84, .86, .94, .84, .86, .78), ["mr", "hi", "en"]),
    ("IN", "Maharashtra", "Nagpur", "Hingna", ["हिंगणा"], "block", "rural", 21.060, 78.960, 95000, 22000, 0.55, 0.60, 0.58, _i(.60, .62, .80, .58, .62, .48), ["mr", "hi"]),

    # ---------------- India: Karnataka, Bengaluru & Mysuru ----------------
    ("IN", "Karnataka", "Bengaluru Urban", "Anekal", ["ಆನೇಕಲ್", "Anekal"], "block", "peri-urban", 12.710, 77.696, 290000, 68000, 0.40, 0.75, 0.80, _i(.72, .75, .86, .72, .76, .68), ["kn", "en", "hi"]),
    ("IN", "Karnataka", "Bengaluru Urban", "Bengaluru South", ["ಬೆಂಗಳೂರು ದಕ್ಷಿಣ", "Jayanagar"], "ward", "urban", 12.925, 77.593, 620000, 155000, 0.12, 0.96, 0.96, _i(.92, .94, .98, .94, .95, .90), ["kn", "en", "hi", "ta"]),
    ("IN", "Karnataka", "Bengaluru Urban", "Yelahanka", ["ಯಲಹಂಕ"], "ward", "urban", 13.100, 77.596, 340000, 82000, 0.25, 0.88, 0.90, _i(.85, .88, .95, .86, .88, .80), ["kn", "en", "hi"]),
    ("IN", "Karnataka", "Mysuru", "Mysuru Urban", ["ಮೈಸೂರು", "Mysore"], "ward", "urban", 12.295, 76.639, 450000, 110000, 0.24, 0.88, 0.90, _i(.86, .88, .95, .86, .88, .82), ["kn", "en", "hi"]),
    ("IN", "Karnataka", "Mysuru", "Nanjangud", ["ನಂಜನಗೂಡು"], "block", "rural", 12.120, 76.680, 115000, 27000, 0.56, 0.58, 0.55, _i(.58, .60, .80, .56, .62, .48), ["kn"]),

    # ---------------- India: Uttar Pradesh, Varanasi & Lucknow ----------------
    ("IN", "Uttar Pradesh", "Varanasi", "Varanasi City", ["वाराणसी", "Kashi", "Banaras"], "ward", "urban", 25.317, 82.973, 580000, 128000, 0.42, 0.78, 0.82, _i(.74, .76, .90, .76, .78, .64), ["hi", "bho", "en"]),
    ("IN", "Uttar Pradesh", "Varanasi", "Pindra", ["पिंडरा"], "block", "rural", 25.480, 82.850, 135000, 29000, 0.65, 0.48, 0.42, _i(.48, .52, .76, .48, .55, .38), ["hi", "bho"]),
    ("IN", "Uttar Pradesh", "Varanasi", "Sevapuri", ["सेवापुरी"], "block", "rural", 25.330, 82.780, 110000, 24000, 0.68, 0.45, 0.40, _i(.45, .48, .74, .45, .52, .35), ["hi", "bho"]),
    ("IN", "Uttar Pradesh", "Lucknow", "Lucknow City", ["लखनऊ", "Hazratganj"], "ward", "urban", 26.846, 80.946, 780000, 175000, 0.26, 0.88, 0.90, _i(.85, .88, .95, .86, .88, .80), ["hi", "ur", "en"]),
    ("IN", "Uttar Pradesh", "Lucknow", "Mohanlalganj", ["मोहनलालगंज"], "block", "rural", 26.680, 80.980, 155000, 34000, 0.62, 0.52, 0.46, _i(.52, .55, .78, .50, .58, .42), ["hi"]),

    # ---------------- India: Bihar, Patna & Gaya ----------------
    ("IN", "Bihar", "Patna", "Patna Sadar", ["पटना", "Patna"], "ward", "urban", 25.594, 85.137, 720000, 160000, 0.38, 0.80, 0.84, _i(.76, .78, .90, .78, .80, .66), ["hi", "bho", "mag", "en"]),
    ("IN", "Bihar", "Patna", "Danapur", ["दानापुर"], "block", "peri-urban", 25.630, 85.040, 220000, 48000, 0.48, 0.68, 0.70, _i(.68, .70, .85, .66, .70, .56), ["hi", "bho"]),
    ("IN", "Bihar", "Patna", "Bikram", ["विक्रम"], "block", "rural", 25.460, 84.860, 125000, 26000, 0.70, 0.42, 0.38, _i(.44, .46, .72, .44, .50, .32), ["hi", "bho"]),
    ("IN", "Bihar", "Gaya", "Gaya Town", ["गया"], "ward", "urban", 24.791, 85.000, 310000, 68000, 0.46, 0.72, 0.74, _i(.70, .72, .86, .70, .72, .58), ["hi", "mag"]),
    ("IN", "Bihar", "Gaya", "Bodh Gaya", ["बोधगया"], "block", "rural", 24.696, 84.991, 145000, 31000, 0.64, 0.50, 0.45, _i(.50, .52, .76, .48, .56, .40), ["hi", "mag", "en"]),

    # ---------------- India: Rajasthan, Jaipur ----------------
    ("IN", "Rajasthan", "Jaipur", "Jaipur City", ["जयपुर", "Pink City"], "ward", "urban", 26.912, 75.787, 850000, 190000, 0.24, 0.88, 0.90, _i(.86, .88, .95, .86, .88, .80), ["hi", "raj", "en"]),
    ("IN", "Rajasthan", "Jaipur", "Sanganer", ["सांगानेर"], "block", "peri-urban", 26.816, 75.772, 260000, 58000, 0.42, 0.74, 0.76, _i(.74, .76, .88, .72, .75, .65), ["hi", "raj"]),
    ("IN", "Rajasthan", "Jaipur", "Amer", ["आमेर"], "block", "rural", 26.985, 75.850, 110000, 24000, 0.58, 0.56, 0.52, _i(.56, .58, .78, .54, .60, .46), ["hi", "raj"]),

    # ---------------- India: Tamil Nadu, Chennai & Madurai ----------------
    ("IN", "Tamil Nadu", "Chennai", "T. Nagar", ["தி. நகர்", "T Nagar"], "ward", "urban", 13.041, 80.233, 390000, 92000, 0.14, 0.94, 0.95, _i(.92, .92, .98, .92, .94, .88), ["ta", "en"]),
    ("IN", "Tamil Nadu", "Chennai", "Mylapore", ["மயிலாப்பூர்"], "ward", "urban", 13.033, 80.268, 320000, 76000, 0.16, 0.92, 0.94, _i(.90, .90, .97, .90, .92, .86), ["ta", "en"]),
    ("IN", "Tamil Nadu", "Madurai", "Madurai Urban", ["மதுரை", "Madurai"], "ward", "urban", 9.925, 78.119, 480000, 115000, 0.28, 0.86, 0.88, _i(.84, .86, .94, .84, .86, .78), ["ta", "en"]),
    ("IN", "Tamil Nadu", "Madurai", "Melur", ["மேலூர்"], "block", "rural", 10.050, 78.330, 130000, 29000, 0.56, 0.58, 0.54, _i(.60, .62, .82, .58, .62, .50), ["ta"]),

    # ---------------- India: West Bengal, Kolkata & Darjeeling ----------------
    ("IN", "West Bengal", "Kolkata", "Kolkata Central", ["কলকাতা", "Kolkata"], "ward", "urban", 22.572, 88.363, 620000, 145000, 0.22, 0.90, 0.92, _i(.88, .88, .96, .88, .90, .82), ["bn", "en", "hi"]),
    ("IN", "West Bengal", "Kolkata", "Salt Lake", ["সল্ট লেক", "Bidhannagar"], "ward", "urban", 22.586, 88.417, 310000, 74000, 0.12, 0.96, 0.96, _i(.94, .94, .98, .94, .96, .92), ["bn", "en"]),
    ("IN", "West Bengal", "Darjeeling", "Darjeeling Sadar", ["দার্জিলিং", "Darjeeling"], "block", "rural", 27.036, 88.262, 95000, 21000, 0.62, 0.48, 0.44, _i(.50, .46, .75, .48, .55, .38), ["ne", "bn", "en"]),
    ("IN", "West Bengal", "Darjeeling", "Siliguri Urban", ["শিলিগুড়ি"], "ward", "urban", 26.727, 88.395, 340000, 80000, 0.34, 0.82, 0.84, _i(.80, .82, .90, .80, .82, .72), ["bn", "hi", "en"]),

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
