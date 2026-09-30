"""Citizen-facing messages in the citizen's own language (closing the loop).
Add a language by adding one dictionary; an LLM can translate on the fly for others."""

SECTOR_NAMES = {
    "en": {"water": "Drinking water", "roads": "Roads", "electricity": "Electricity", "health": "Health", "education": "Education", "sanitation": "Sanitation", "other": "Other"},
    "hi": {"water": "पानी", "roads": "सड़क", "electricity": "बिजली", "health": "स्वास्थ्य", "education": "शिक्षा", "sanitation": "स्वच्छता", "other": "अन्य"},
    "te": {"water": "నీరు", "roads": "రోడ్లు", "electricity": "విద్యుత్", "health": "ఆరోగ్యం", "education": "విద్య", "sanitation": "పారిశుద్ధ్యం", "other": "ఇతర"},
    "or": {"water": "ପାଣି", "roads": "ରାସ୍ତା", "electricity": "ବିଜୁଳି", "health": "ସ୍ୱାସ୍ଥ୍ୟ", "education": "ଶିକ୍ଷା", "sanitation": "ପରିମଳ", "other": "ଅନ୍ୟ"},
}

MESSAGES = {
    "en": {
        "noted": "Thank you. We added your message to {tid}.",
        "place_not_found": "We could not find that place. Please pick your village from the list or share your location.",
        "ack": "Thank you. Your request {tid} is registered: {category}. {n} other households in {area} raised the same need.",
        "ack_first": "Thank you. Your request {tid} is registered: {category} in {area}. You are the first to report this need.",
        "ask_location": "Which village or area is this in? Share your location or type the name.",
        "clarify": "Is this about water, road, electricity, health, school or drains?",
        "in_plan": "Update on {tid}: the need you raised is now a recommended project: {project}.",
        "approved": "Good news: {project} has been approved. We will tell you when work starts.",
        "resolved": "{tid}: the department reports the work is done. Is it fixed? Reply YES or NO.",
        "reopened": "{tid} has been reopened. Thank you for telling us.",
        "closed": "{tid} is closed. Thank you for confirming. Your voice made this happen.",
        "safety": "This sounds urgent. Please call {number} now. We have flagged it for immediate attention.",
        "review": "Thank you. Your request {tid} was received. An officer will check the details.",
    },
    "hi": {
        "noted": "धन्यवाद। आपका संदेश {tid} में जोड़ दिया गया है।",
        "place_not_found": "यह जगह नहीं मिली। कृपया सूची से अपना गाँव चुनें या लोकेशन भेजें।",
        "ack": "धन्यवाद। आपका अनुरोध {tid} दर्ज हो गया है: {category}। {area} में {n} अन्य परिवारों ने भी यही ज़रूरत बताई है।",
        "ack_first": "धन्यवाद। आपका अनुरोध {tid} दर्ज हो गया है: {area} में {category}। यह ज़रूरत बताने वाले आप पहले व्यक्ति हैं।",
        "ask_location": "यह किस गाँव या इलाके में है? अपना लोकेशन भेजें या नाम लिखें।",
        "clarify": "क्या यह पानी, सड़क, बिजली, स्वास्थ्य, स्कूल या नाली के बारे में है?",
        "in_plan": "{tid} अपडेट: आपकी बताई ज़रूरत अब एक अनुशंसित परियोजना है: {project}।",
        "approved": "खुशखबरी: {project} को मंज़ूरी मिल गई है। काम शुरू होने पर हम आपको बताएँगे।",
        "resolved": "{tid}: विभाग के अनुसार काम पूरा हो गया है। क्या समस्या हल हुई? हाँ या नहीं में जवाब दें।",
        "reopened": "{tid} फिर से खोल दिया गया है। बताने के लिए धन्यवाद।",
        "closed": "{tid} बंद किया गया। पुष्टि के लिए धन्यवाद। आपकी आवाज़ से यह संभव हुआ।",
        "safety": "यह आपातकालीन लगता है। तुरंत {number} पर कॉल करें। हमने इसे तत्काल कार्रवाई के लिए चिह्नित किया है।",
        "review": "धन्यवाद। आपका अनुरोध {tid} मिल गया है। एक अधिकारी विवरण की जाँच करेंगे।",
    },
    "te": {
        "noted": "ధన్యవాదాలు. మీ సందేశాన్ని {tid} కి జోడించాము.",
        "place_not_found": "ఆ ప్రాంతం దొరకలేదు. జాబితా నుండి మీ గ్రామాన్ని ఎంచుకోండి లేదా లొకేషన్ పంపండి.",
        "ack": "ధన్యవాదాలు. మీ అభ్యర్థన {tid} నమోదైంది: {category}. {area}లో మరో {n} కుటుంబాలు ఇదే అవసరాన్ని తెలిపాయి.",
        "ack_first": "ధన్యవాదాలు. మీ అభ్యర్థన {tid} నమోదైంది: {area}లో {category}. ఈ అవసరాన్ని తెలిపిన మొదటి వారు మీరే.",
        "ask_location": "ఇది ఏ గ్రామం లేదా ప్రాంతం? మీ లొకేషన్ పంపండి లేదా పేరు టైప్ చేయండి.",
        "clarify": "ఇది నీరు, రోడ్డు, కరెంటు, ఆరోగ్యం, బడి లేదా మురుగు కాలువ — దేని గురించి?",
        "in_plan": "{tid} అప్‌డేట్: మీరు తెలిపిన అవసరం ఇప్పుడు సిఫార్సు చేసిన ప్రాజెక్ట్: {project}.",
        "approved": "శుభవార్త: {project} ఆమోదించబడింది. పనులు ప్రారంభమైనప్పుడు మీకు తెలియజేస్తాము.",
        "resolved": "{tid}: పని పూర్తయిందని శాఖ తెలిపింది. సమస్య పరిష్కారమైందా? అవును లేదా కాదు అని జవాబు ఇవ్వండి.",
        "reopened": "{tid} మళ్ళీ తెరవబడింది. మాకు తెలియజేసినందుకు ధన్యవాదాలు.",
        "closed": "{tid} ముగిసింది. నిర్ధారించినందుకు ధన్యవాదాలు. మీ గొంతు వల్లే ఇది సాధ్యమైంది.",
        "safety": "ఇది అత్యవసరంగా అనిపిస్తోంది. వెంటనే {number} కు కాల్ చేయండి. దీనిని తక్షణ చర్య కోసం గుర్తించాము.",
        "review": "ధన్యవాదాలు. మీ అభ్యర్థన {tid} అందింది. ఒక అధికారి వివరాలను పరిశీలిస్తారు.",
    },
    "or": {
        "noted": "ଧନ୍ୟବାଦ। ଆପଣଙ୍କ ସନ୍ଦେଶ {tid} ରେ ଯୋଡାଗଲା।",
        "place_not_found": "ସେହି ସ୍ଥାନ ମିଳିଲା ନାହିଁ। ତାଲିକାରୁ ଆପଣଙ୍କ ଗାଁ ବାଛନ୍ତୁ।",
        "ack": "ଧନ୍ୟବାଦ। ଆପଣଙ୍କ ଅନୁରୋଧ {tid} ପଞ୍ଜୀକୃତ ହେଲା: {category}। {area}ରେ ଆଉ {n}ଟି ପରିବାର ସମାନ ଆବଶ୍ୟକତା ଜଣାଇଛନ୍ତି।",
        "ack_first": "ଧନ୍ୟବାଦ। ଆପଣଙ୍କ ଅନୁରୋଧ {tid} ପଞ୍ଜୀକୃତ ହେଲା: {area}ରେ {category}।",
        "ask_location": "ଏହା କେଉଁ ଗାଁ ବା ଅଞ୍ଚଳରେ? ଆପଣଙ୍କ ଲୋକେସନ ପଠାନ୍ତୁ କିମ୍ବା ନାମ ଲେଖନ୍ତୁ।",
        "clarify": "ଏହା ପାଣି, ରାସ୍ତା, ବିଜୁଳି, ସ୍ୱାସ୍ଥ୍ୟ, ସ୍କୁଲ କିମ୍ବା ନାଳ ବିଷୟରେ କି?",
        "in_plan": "{tid} ଅପଡେଟ: ଆପଣଙ୍କ ଆବଶ୍ୟକତା ଏବେ ଏକ ସୁପାରିଶ ହୋଇଥିବା ପ୍ରକଳ୍ପ: {project}।",
        "approved": "ଖୁସି ଖବର: {project} ଅନୁମୋଦିତ ହେଲା। କାମ ଆରମ୍ଭ ହେଲେ ଆମେ ଜଣାଇବୁ।",
        "resolved": "{tid}: ବିଭାଗ କହୁଛି କାମ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି। ସମସ୍ୟା ସମାଧାନ ହେଲା କି? ହଁ କିମ୍ବା ନା ଉତ୍ତର ଦିଅନ୍ତୁ।",
        "reopened": "{tid} ପୁଣି ଖୋଲାଗଲା। ଜଣାଇଥିବାରୁ ଧନ୍ୟବାଦ।",
        "closed": "{tid} ବନ୍ଦ ହେଲା। ନିଶ୍ଚିତ କରିଥିବାରୁ ଧନ୍ୟବାଦ।",
        "safety": "ଏହା ଜରୁରୀ ଲାଗୁଛି। ତୁରନ୍ତ {number}କୁ କଲ କରନ୍ତୁ।",
        "review": "ଧନ୍ୟବାଦ। ଆପଣଙ୍କ ଅନୁରୋଧ {tid} ମିଳିଲା। ଜଣେ ଅଧିକାରୀ ଯାଞ୍ଚ କରିବେ।",
    },
}

EMERGENCY_NUMBERS = {"IN": "112"}
YES_WORDS = {"yes", "y", "haan", "ha", "हाँ", "हां", "అవును", "ହଁ", "avunu", "ha ji", "haan ji", "fixed", "ठीक हो गया", "బాగైంది"}
NO_WORDS = {"no", "n", "nahi", "नहीं", "కాదు", "ନା", "kaadu", "nahin", "not fixed", "ठीक नहीं", "కాలేదు"}

_FALLBACK = {"bho": "hi", "gon": "te", "mr": "hi", "ta": "en", "bn": "en"}


def lang_for(code: str) -> str:
    if code in MESSAGES:
        return code
    return _FALLBACK.get(code, "en")


def t(key: str, lang: str, **kw) -> str:
    lg = lang_for(lang)
    template = MESSAGES[lg].get(key) or MESSAGES["en"][key]
    if "category" in kw and kw["category"] in SECTOR_NAMES["en"]:
        kw["category"] = SECTOR_NAMES[lg].get(kw["category"], kw["category"])
    try:
        return template.format(**kw)
    except KeyError:
        return template
