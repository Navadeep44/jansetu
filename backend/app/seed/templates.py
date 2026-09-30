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
    # ---------------- English (Indian usage) ----------------
    ("en", "water", "No water in our basti for four days. We are buying tanker water at 300 rupees.", ""),
    ("en", "roads", "The kachha road to our village washes away every monsoon and the 108 ambulance cannot reach us.", ""),
    ("en", "electricity", "Power cuts every evening and the transformer keeps tripping; children cannot study.", ""),
    ("en", "health", "The PHC closes at 2 pm and there is only one ANM for five villages.", ""),
    ("en", "education", "Our government school has one teacher for 120 children and no toilet for girls.", ""),
    ("en", "sanitation", "The nala has been overflowing on our lane for weeks and children play near it.", ""),
]

# Low-severity "convenience" complaints typical of affluent, highly connected areas
AFFLUENT = [
    ("en", "roads", "Pothole on the main road outside our society needs resurfacing.", ""),
    ("en", "electricity", "Street light outside our gate not working, please replace the bulb.", ""),
    ("en", "roads", "Footpath tiles are uneven near the market, please repair.", ""),
    ("hi", "electricity", "पार्क की स्ट्रीट लाइट बंद है, कृपया ठीक करें।", "The park street light is off, please fix it."),
    ("te", "roads", "మా కాలనీ రోడ్డు మీద చిన్న గుంత ఉంది, రీ-సర్ఫేసింగ్ చేయండి.", "There is a small pothole on our colony road; please resurface it."),
    ("te", "electricity", "పార్క్ దగ్గర వీధి దీపం వెలగడం లేదు.", "The street light near the park is not working."),
]

CAMPAIGN = ("en", "roads", "We demand immediate resurfacing of our road, potholes everywhere! Forward to all residents.", "")

COMMUNITY = [
    ("Narnoor", "te", "గ్రామసభ తీర్మానం: మా గ్రామానికి రోడ్డు కావాలి, వర్షాకాలంలో అంబులెన్స్ రాదు (143 మంది)", "Gram Sabha resolution: our village needs a road; the ambulance cannot come in the monsoon (143 people)", 143),
    ("Jainoor", "te", "గ్రామసభ: తాగునీరు లేదు, బోరు పాడైపోయింది (88 మంది)", "Gram Sabha: no drinking water, the borewell is broken (88 people)", 88),
    ("Boipariguda", "or", "ଗ୍ରାମସଭା: ଆମ ଗାଁକୁ ରାସ୍ତା ନାହିଁ (120 ଜଣ)", "Gram Sabha: there is no road to our village (120 people)", 120),
    ("Imamganj", "hi", "ग्राम सभा प्रस्ताव: गाँव में पीने का पानी नहीं है, नया हैंडपंप चाहिए (160 लोग)", "Gram Sabha resolution: no drinking water in the village, we need a new handpump (160 people)", 160),
    ("Mihinpurwa", "hi", "ग्राम सभा: गाँव तक पक्की सड़क नहीं है, बारिश में एम्बुलेंस नहीं आती (175 लोग)", "Gram Sabha: no paved road to the village, the ambulance cannot come in the rain (175 people)", 175),
]
