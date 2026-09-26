"""Realistic multilingual citizen messages used to generate the demo dataset.
Each entry: (language, sector, original text, English translation)."""

T = [
    # ---------------- Telugu ----------------
    ("te", "water", "మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. ఆడవాళ్ళు రోజూ మూడు కిలోమీటర్లు నడవాల్సి వస్తోంది.", "No drinking water in our village, the borewell is broken. Women walk 3 km every day."),
    ("te", "water", "చేతి పంపు నెల రోజులుగా పనిచేయడం లేదు, పిల్లలకు తాగడానికి నీళ్ళు లేవు.", "The hand pump has not worked for a month; there is no drinking water for the children."),
    ("te", "water", "నీళ్ళు మురికిగా వస్తున్నాయి, పిల్లలు జబ్బు పడుతున్నారు.", "The water comes dirty and children are falling sick."),
    ("te", "roads", "మా గ్రామానికి రోడ్డు లేదు, వర్షాకాలంలో అంబులెన్స్ రాదు. గర్భిణి స్త్రీలను మంచం మీద మోసుకెళ్ళాల్సి వస్తోంది.", "There is no road to our village; the ambulance cannot come in the monsoon. Pregnant women are carried on a cot."),
    ("te", "roads", "వాగు మీద వంతెన లేదు, వర్షం పడితే ఊరికి దారి తెగిపోతుంది.", "There is no bridge over the stream; when it rains the village is cut off."),
    ("te", "roads", "రోడ్డు మొత్తం గుంతలే, బస్సు రావడం ఆగిపోయింది.", "The road is full of potholes and the bus has stopped coming."),
    ("te", "electricity", "మా ఊరిలో కరెంటు రోజుకు నాలుగు గంటలు మాత్రమే వస్తుంది.", "Electricity comes only four hours a day in our village."),
    ("te", "electricity", "ట్రాన్స్‌ఫార్మర్ కాలిపోయి పది రోజులు అయింది, కరెంటు లేదు.", "The transformer burnt out ten days ago; there is no electricity."),
    ("te", "health", "దగ్గరలో ఆసుపత్రి లేదు, డాక్టర్ వారానికి ఒక్కసారి కూడా రావడం లేదు.", "There is no hospital nearby and the doctor does not come even once a week."),
    ("te", "health", "ఆరోగ్య కేంద్రంలో మందులు లేవు, జ్వరం వచ్చినా 20 కిలోమీటర్లు వెళ్ళాలి.", "No medicines at the health centre; even for fever we travel 20 km."),
    ("te", "education", "బడిలో ఒక్క టీచర్ మాత్రమే ఉన్నారు, ఐదు తరగతులు.", "Only one teacher in the school for five classes."),
    ("te", "education", "పాఠశాల పైకప్పు కూలిపోయేలా ఉంది, పిల్లలు భయపడుతున్నారు.", "The school roof is about to collapse; the children are scared."),
    ("te", "sanitation", "మురుగు కాలువ పొంగి పొర్లుతోంది, పిల్లలు జబ్బు పడుతున్నారు.", "The drain is overflowing and children are falling sick."),
    ("te", "sanitation", "ఊరిలో మరుగుదొడ్లు లేవు, మహిళలు చీకట్లో బయటకు వెళ్ళాల్సి వస్తోంది.", "No toilets in the village; women have to go out in the dark."),
    # ---------------- Hindi ----------------
    ("hi", "water", "हमारे गाँव में पीने का पानी नहीं है, हैंडपंप एक महीने से खराब है।", "No drinking water in our village; the handpump has been broken for a month."),
    ("hi", "water", "नल में पानी हफ्ते में सिर्फ एक बार आता है, टैंकर वाले पैसे माँगते हैं।", "Tap water comes only once a week and tanker operators demand money."),
    ("hi", "water", "पानी गंदा और बदबूदार आ रहा है, बच्चे बीमार हो रहे हैं।", "The water is dirty and smelly; children are getting sick."),
    ("hi", "roads", "गाँव तक पक्की सड़क नहीं है, बारिश में एम्बुलेंस नहीं आ पाती।", "There is no paved road to the village; the ambulance cannot come in the rain."),
    ("hi", "roads", "सड़क पर बड़े-बड़े गड्ढे हैं, रोज़ दुर्घटना होती है।", "The road has huge potholes; accidents happen every day."),
    ("hi", "roads", "बारिश में गली में जलभराव हो जाता है, सड़क टूट गई है।", "The lane waterlogs in the rain and the road is broken."),
    ("hi", "electricity", "बिजली दिन में सिर्फ चार घंटे आती है, बच्चे पढ़ नहीं पाते।", "Electricity comes only four hours a day; children cannot study."),
    ("hi", "electricity", "गली की स्ट्रीट लाइट दो महीने से बंद है, रात को औरतों के लिए खतरनाक है।", "The street light has been off for two months; it is dangerous for women at night."),
    ("hi", "health", "पास में कोई अस्पताल नहीं है, डॉक्टर हफ्ते में एक बार भी नहीं आते।", "There is no hospital nearby; the doctor does not come even once a week."),
    ("hi", "health", "मोहल्ला क्लिनिक में दवा नहीं मिलती, लंबी लाइन लगती है।", "No medicines at the mohalla clinic and there are long queues."),
    ("hi", "education", "स्कूल में शिक्षक नहीं हैं और छत टूट रही है।", "There are no teachers in the school and the roof is breaking."),
    ("hi", "education", "सरकारी स्कूल में एक कक्षा में 90 बच्चे बैठते हैं।", "90 children sit in one class in the government school."),
    ("hi", "sanitation", "नाली हर बारिश में उफन जाती है, सीवर का गंदा पानी घरों में घुसता है।", "The drain overflows every rain and sewage enters homes."),
    ("hi", "sanitation", "कचरा हफ्तों से नहीं उठाया गया, मच्छर और बीमारी फैल रही है।", "Garbage has not been collected for weeks; mosquitoes and disease are spreading."),
    ("hi", "sanitation", "मोहल्ले में शौचालय नहीं है, महिलाओं को बहुत परेशानी होती है।", "There is no toilet in the locality; women face great hardship."),
    # ---------------- Bhojpuri ----------------
    ("bho", "sanitation", "हमनी के गली में नाली उफना जाला, सीवर के पानी से लइकन बेमार हो जात बाड़न।", "The drain in our lane overflows; the children get sick from the sewage."),
    ("bho", "water", "हमनी के मोहल्ला में पानी नइखे आवत, हैंडपंप खराब बा।", "No water comes in our locality; the handpump is broken."),
    ("bho", "electricity", "बिजली खाली चार घंटा आवेला, गरमी में लइकन बेहाल बाड़न।", "Electricity comes only four hours; children suffer in the heat."),
    # ---------------- Odia ----------------
    ("or", "water", "ଆମ ଗାଁରେ ପିଇବା ପାଣି ନାହିଁ, ନଳକୂଅ ଖରାପ ହୋଇଛି।", "No drinking water in our village; the tube well is broken."),
    ("or", "roads", "ଆମ ଗାଁକୁ ରାସ୍ତା ନାହିଁ, ବର୍ଷାରେ ଆମ୍ବୁଲାନ୍ସ ଆସିପାରେ ନାହିଁ।", "No road to our village; the ambulance cannot come in the rain."),
    ("or", "health", "ପାଖରେ ଡାକ୍ତରଖାନା ନାହିଁ, ଗର୍ଭବତୀ ମହିଳାଙ୍କୁ ବହୁତ କଷ୍ଟ।", "No hospital nearby; pregnant women suffer greatly."),
    ("or", "education", "ସ୍କୁଲରେ ଶିକ୍ଷକ ନାହାନ୍ତି, ପିଲାମାନେ ପଢ଼ିପାରୁନାହାନ୍ତି।", "There are no teachers in the school; the children cannot study."),
    ("or", "electricity", "ଆମ ଗାଁରେ ବିଜୁଳି ନାହିଁ।", "There is no electricity in our village."),
    ("or", "sanitation", "ଗାଁରେ ଶୌଚାଳୟ ନାହିଁ, ନାଳ ଉଛୁଳି ପଡ଼ୁଛି।", "No toilets in the village and the drain is overflowing."),
    # ---------------- Portuguese ----------------
    ("pt", "water", "Estamos sem água há cinco dias no bairro, as crianças não têm água para beber.", "We have had no water for five days; the children have nothing to drink."),
    ("pt", "water", "A água chega suja e com cheiro, muita gente com doença de barriga.", "The water arrives dirty and smelly; many people have stomach illness."),
    ("pt", "roads", "A rua está cheia de buracos e alaga toda vez que chove.", "The street is full of potholes and floods whenever it rains."),
    ("pt", "roads", "Não tem asfalto na nossa rua, a ambulância não consegue subir o morro.", "Our street has no asphalt; the ambulance cannot climb the hill."),
    ("pt", "electricity", "Poste de luz queimado há dois meses, a rua fica escura e perigosa.", "The street light has been out for two months; the street is dark and dangerous."),
    ("pt", "electricity", "Falta de energia quase todo dia no bairro.", "Power cuts almost every day in the neighbourhood."),
    ("pt", "health", "O posto de saúde não tem médico e a fila começa às 4 da manhã.", "The health post has no doctor and the queue starts at 4 am."),
    ("pt", "health", "Não tem remédio na UBS há semanas.", "There has been no medicine at the health unit for weeks."),
    ("pt", "education", "Falta vaga na creche, as mães não conseguem trabalhar.", "There are no creche places; mothers cannot work."),
    ("pt", "education", "A escola está sem professor de matemática há meses.", "The school has had no maths teacher for months."),
    ("pt", "sanitation", "Esgoto a céu aberto na frente das casas, cheiro forte e ratos.", "Open sewage in front of the houses; strong smell and rats."),
    ("pt", "sanitation", "O lixo não é recolhido há duas semanas.", "Garbage has not been collected for two weeks."),
    # ---------------- isiZulu ----------------
    ("zu", "water", "Asinawo amanzi izinsuku ezintathu, izingane azinawo amanzi okuphuza.", "We have had no water for three days; the children have no drinking water."),
    ("zu", "water", "Ompompi bomphakathi bayaphuka njalo, sicela nisilungisele.", "The community taps keep breaking; please fix them for us."),
    ("zu", "electricity", "Awukho ugesi kusukela izolo, i-load shedding ayipheli.", "No electricity since yesterday; load shedding never ends."),
    ("zu", "electricity", "Ugesi uyacima njalo ebusuku, kuyingozi ezitaladini.", "The power goes off every night; the streets are dangerous."),
    ("zu", "roads", "Umgwaqo unemigodi eminingi, ama-ambulensi awakwazi ukungena.", "The road has many potholes; ambulances cannot get in."),
    ("zu", "health", "Umtholampilo awunawo amakhambi, silinda amahora amaningi.", "The clinic has no medicines; we wait for many hours."),
    ("zu", "education", "Isikole sigcwele kakhulu, abafundi abangu-80 ekilasini elilodwa.", "The school is overcrowded: 80 learners in one classroom."),
    ("zu", "sanitation", "Amathoyilethi agcwele futhi indle igeleza ezitaladini.", "The toilets are full and sewage flows in the streets."),
    # ---------------- English ----------------
    ("en", "water", "There has been no water in our section for four days. We are buying water from tankers.", ""),
    ("en", "roads", "The gravel road to our area washes away every rainy season and ambulances cannot reach us.", ""),
    ("en", "electricity", "Load shedding and a broken transformer mean power cuts every evening.", ""),
    ("en", "health", "The clinic closes at 4pm and there is only one nurse for the whole township.", ""),
    ("en", "education", "Our school has no proper classrooms; children learn in mud structures.", ""),
    ("en", "sanitation", "The sewer has been overflowing on our street for weeks and kids play near it.", ""),
]

# Low-severity "convenience" complaints typical of affluent, highly connected areas
AFFLUENT = [
    ("en", "roads", "Pothole on the main road outside our society needs resurfacing.", ""),
    ("en", "electricity", "Street light outside our gate not working, please replace the bulb.", ""),
    ("en", "roads", "Footpath tiles are uneven near the market, please repair.", ""),
    ("hi", "electricity", "पार्क की स्ट्रीट लाइट बंद है, कृपया ठीक करें।", "The park street light is off, please fix it."),
    ("pt", "roads", "Buraco enorme na avenida, já estourou o pneu do meu carro.", "Huge pothole on the avenue; it already burst my car tyre."),
    ("pt", "electricity", "Poste apagado na rua, precisa trocar a lâmpada.", "Street light out on the street; the bulb needs replacing."),
    ("pt", "roads", "Asfalto irregular na rua, precisa de recapeamento.", "Uneven asphalt on the street; needs resurfacing."),
]

CAMPAIGN = ("pt", "roads", "Exigimos recapeamento imediato da nossa rua, buracos em toda a via!", "We demand immediate resurfacing of our street; potholes everywhere!")

COMMUNITY = [
    ("Narnoor", "te", "గ్రామసభ తీర్మానం: మా గ్రామానికి రోడ్డు కావాలి, వర్షాకాలంలో అంబులెన్స్ రాదు (143 మంది)", "Gram Sabha resolution: our village needs a road; the ambulance cannot come in the monsoon (143 people)", 143),
    ("Jainoor", "te", "గ్రామసభ: తాగునీరు లేదు, బోరు పాడైపోయింది (88 మంది)", "Gram Sabha: no drinking water, the borewell is broken (88 people)", 88),
    ("Boipariguda", "or", "ଗ୍ରାମସଭା: ଆମ ଗାଁକୁ ରାସ୍ତା ନାହିଁ (120 ଜଣ)", "Gram Sabha: there is no road to our village (120 people)", 120),
    ("Grajaú", "pt", "Assembleia do bairro: esgoto a céu aberto é a prioridade número um (210 pessoas)", "Neighbourhood assembly: open sewage is priority number one (210 people)", 210),
    ("Diepsloot", "zu", "Umhlangano womphakathi: asinawo amanzi, sidinga ompompi abengeziwe (175 abantu)", "Community meeting: we have no water, we need more taps (175 people)", 175),
]
