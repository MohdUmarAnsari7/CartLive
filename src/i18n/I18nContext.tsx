import React, { createContext, useContext, useState, useEffect } from 'react';

// Centralised i18n dictionary
export const translations = {
  en: {
    // Header & Footer
    APP_NAME: "FreshTrack",
    GPS_SUBTITLE: "GPS Street Cart Finder",
    DISCOVER_CARTS_TAB: "Discover Carts",
    SELLER_CENTER_TAB: "Seller Center",
    ADMIN_TERMINAL_TAB: "Admin Terminal",
    FEEDBACK_TAB: "Feedback",
    FOOTER_TITLE: "Fresh Cart Find PWA Platform",
    FOOTER_DESC: "Empowering local fruit and vegetables street cart sellers (pourmen) with live geodistribution discovery networks.",
    FOOTER_TRACKING: "GPS Location Tracking Enabled",
    FOOTER_NOTIF: "Simulated Push notifications",
    FOOTER_SESSION: "JWT Authenticated Sessions",
    FOOTER_RIGHTS: "© 2026 Mobile Veg & Fruit Cart Finder Inc. All rights reserved.",
    LANG_TOGGLE: "Eng / हिंदी",

    // Authentication Screen
    TITLE_SELLER_CENTER: "Pourman Seller Center",
    SUBTITLE_LOGIN: "Log in to update offerings & broadcast live GPS location",
    SUBTITLE_REGISTER: "Register your fruit & vegetable cart in 1 minute",
    LABEL_NAME: "Full Name *",
    LABEL_PHONE: "Mobile Number *",
    LABEL_PASSWORD: "Password *",
    LABEL_CART_INFO: "Cart Description / Shop Type",
    LABEL_SERVICE_AREA: "Typical Operating Streets / Areas *",
    LABEL_PROFILE_PHOTO: "Profile Photo URL (Optional)",
    PLACEHOLDER_NAME: "e.g. Ramesh Kumar",
    PLACEHOLDER_PHONE: "e.g. 9876543210 (or 'admin')",
    PLACEHOLDER_CART_INFO: "e.g. Hand Cart, Tricycle, Stall",
    PLACEHOLDER_SERVICE_AREA: "e.g. Indiranagar Sector 2",
    PLACEHOLDER_PHOTO: "Paste direct .png/.jpg photo link",
    BUTTON_LOGIN: "Log In",
    BUTTON_SIGNUP: "Register Partner Cart",
    TOGGLE_HAVE_ACCOUNT: "Already registered? Log in here",
    TOGGLE_NEED_ACCOUNT: "Add your cart! Register here",
    ADMIN_LOCKDOWN: "System Lockdown Mode",
    ADMIN_AUTH_REQ: "Admin Authentication Required",
    ADMIN_WARN: "You are attempting to access protected global parameters settings. Authenticate using demo credential details below to continue.",
    DEMO_CREDENTIALS: "Demo Credentials",
    ADMIN_NODE: "Admin Node",
    DEMO_ADMIN_DESC: "Login with admin and password: admin123",
    DEMO_SELLER_DESC: "Sellers: Login 9876543210 or 8765432109, password: admin123 (seed-provided)",
    ERROR_CONN: "Connection timed out. Please check your system status.",
    ERROR_REG_FAILED: "Registration failed",
    ERROR_SERVER: "Server network issue. Try again shortly.",
    REG_SUCCESS: "Registration successful! Please login below.",

    // Customer Dashboard
    SEARCH_PLACEHOLDER: "Search for tomato, potato, apples...",
    LIVE_RADAR: "Live GPS Cart Discovery Radar",
    NO_SELLERS_IN_RANGE: "No active cart partners found within your selected radius range.",
    VERIFY_LOCATION: "GPS tracking is active. Change the sliders above to filter street cart proximity.",
    LISTING_ACTIVE: "Operating Vendors Found",
    RAD_LABEL: "Search Proximity Radius",
    FA_LABEL: "Filter Category",
    ALL_CAT: "All Items",
    VEG_CAT: "Vegetables",
    FRU_CAT: "Fruits",
    SORT_BY: "Sort By",
    SORT_DIST: "Distance",
    SORT_PRICE: "Price (Low-High)",
    SORT_RATING: "Top Rating",
    MOBILE_VERIFIED: "Mobile Verified",
    VIEW_DETAILS_BTN: "View Shop & Offerings",
    DISTANCE_KM: "km away",
    RATING_TITLE: "Overall Rating",
    REVIEWS_COUNT: "reviews",
    VISITS_COUNT: "visits",
    DEPARTED: "Offline / Departed",
    ACTIVE_ONLINE: "Broadcast Active",
    ITEMS_OFFERED: "Available Offerings & Prices Today",
    REVIEWS_SECTION: "Customer Reviews & Feedbacks",
    WRITE_REVIEW: "Write Local Review",
    REVIEW_SUBMIT: "Submit Review",
    AI_ASSISTANT_SUMMARY: "AI Advisor Analysis",
    AI_BTN: "Generate AI Advisor Summary",
    FAV_REMOVE: "Remove from saved",
    FAV_ADD: "Save to Favorites",
    LABEL_REVIEW_NAME: "Your Name *",
    LABEL_REVIEW_RATING: "Rating Star *",
    LABEL_REVIEW_COMMENT: "Write review comments...",
    REVIEW_SUCCESS: "Review submitted successfully!",
    AI_GENERATING: "Consulting AI Engine...",
    NO_PRODUCTS: "This partner hasn't listed any fruits or vegetables for today yet.",
    RECENTLY_VISITED: "Recently Visited Carts",

    // Seller Dashboard
    SELLER_WELCOME: "Welcome, Partner",
    CART_TYPE: "Cart style / Type",
    OPERATING_AREA: "Core operating sub-regions",
    GPS_BROADCAST_TITLE: "Live Position Satellite Broadcast Settings",
    GPS_STATUS: "GPS Broadcaster Status",
    GPS_ACTIVE: "ONLINE (Broadcasting coordinates)",
    GPS_INACTIVE: "OFFLINE (Maps invisible)",
    GPS_LOC_COORDS: "Your last physical coordinate updates",
    GPS_COORDS_VALUE: "lat: {lat}, lng: {lng}",
    GPS_UPDATE_SUCCESS: "Live coordinate position updated successfully!",
    NOTIF_TRIGGER_HEADING: "Simulate Local Range Push Notification",
    NOTIF_TRIGGER_DESC: "Broadcast custom notifications instantly to buyers who flagged your cart as Favorite inside your radial vicinity.",
    NOTIF_TITLE_LABEL: "Alert Message Title *",
    NOTIF_DESC_LABEL: "Notification Content Body *",
    NOTIF_PLACEHOLDER_TITLE: "e.g., Ramesh Fruits Indiranagar is nearby!",
    NOTIF_PLACEHOLDER_BODY: "e.g., Fresh apples available now at Indiranagar 2nd cross! Flat 10% discount.",
    NOTIF_BTN: "Broadcast Push Alerts",
    NOTIF_SUCCESS_ALERT: "Sent local range notification alert successfully!",
    NOTIF_ERROR_ALERT: "Failed to broadcast notification.",
    INVENTORY_TITLE: "My Stock Offerings & Available Quantities",
    INVENTORY_DESC: "Control items listed, change rate per unit, and availability sliders instantly.",
    ADD_ITEM_HEADING: "Select & Introduce New Item from Approved Catalogue",
    ADD_ITEM_SELECT: "Choose Vegetable / Fruit *",
    ADD_ITEM_PRICE: "Selling Price / unit *",
    ADD_ITEM_BTN: "Release to Inventory Market",
    ADD_ITEM_ERROR: "Please select a product and enter a valid positive price.",
    SUCCESS_ITEM_ADDED: "Added product to active listing successfully!",
    PRICE_UPDATED: "Listing price modified successfully!",
    AVAIL_CHANGED: "Availability status updated!",
    LOGOUT_BTN: "Log Out Partner Console",
    OFFERINGS_LIST_HEADER: "Listed Catalog items",
    OFFERINGS_AVAILABLE: "Available",
    OFFERINGS_OUT_OF_STOCK: "Out of Stock",
    OFFERINGS_REMOVE_BTN: "Remove Item",

    // Admin Dashboard
    ADMIN_WELCOME_HEADING: "FreshTrack Admin Control Center",
    ADMIN_RADIUS_CFG: "Central Discovery Radial Limit Parameter",
    ADMIN_RADIUS_VALUE: "Search limit: {radius} km",
    ADMIN_CATALOGUE_HEADING: "Master Agricultural Item Catalog Definitions",
    ADMIN_CATALOGUE_DESC: "Introduce crops and fruits that local cart sellers can choose to list.",
    ADMIN_ADD_CAT_NAME: "Crop/Fruit Item Name *",
    ADMIN_ADD_CAT_CAT: "Item Category *",
    ADMIN_ADD_CAT_UNIT: "Standard Measurement unit *",
    ADMIN_ADD_CAT_IMAGE: "Direct Visual Image URL (Unsplash direct links recommended)",
    ADMIN_ADD_CAT_BTN: "Add Crop to Master Catalog",
    ADMIN_ADD_CAT_SUCCESS: "Added product crop to master catalogs successfully!",
    CATALOG_LIST_HEADING: "Active Approved Catalogue ({count})",
    CATALOG_DELETE_BTN: "Purge",
    PARTNERS_LIST_HEADING: "Subscribed Mobile Street Partners Discovery ({count})",
    STATUS_SUSPENDED: "SUSPENDED",
    STATUS_STANDBY: "STANDBY / OFFLINE",
    STATUS_ACTIVE: "ACTIVE BROADCAST",
    PARTNER_ACTION_APPROVE: "Approve / Activate Partner",
    PARTNER_ACTION_SUSPEND: "Suspend Partner Access",
    PARTNER_ACTION_DELETE: "Purge Seller",
    ANNOUNCEMENTS_HEADING: "Platform General Announcements & Alerts Hub",
    ANNOUNCEMENTS_TITLE: "Announcement title *",
    ANNOUNCEMENTS_BODY: "Message description *",
    ANNOUNCEMENTS_BTN: "Publish Announcement",
    ANNOUNCEMENTS_SUCCESS: "Platform announcements broadcasted successfully!",
    ANNOUNCEMENT_LIST: "Recent Admin Announcements ({count})",
    FEEDBACKS_HEADING: "Customer Feedbacks Terminal Console",
    FEEDBACKS_LIVE: "Live Stream",
    FEEDBACK_NO_ITEMS: "No feedback submitted yet. Use the Feedback tab at the bottom to test.",
    FEEDBACK_REMOVE_BTN: "Remove",
    FEEDBACK_CONFIRM_REMOVE: "Are you sure you want to remove this feedback from the admin control panel?",

    // Feedback Page
    FEED_HEADER: "Share Your Feedback",
    FEED_DESC: "Your name and description will be instantly submitted and displayed in the server administrator's terminal console logs.",
    FEED_SUCCESS_TITLE: "Feedback Submitted Successfully!",
    FEED_SUCCESS_DESC: "Thank you! The administrator can now view your input inside the terminal log.",
    FEED_RETRY_BTN: "Submit another response",
    FEED_LABEL_NAME: "Your Name",
    FEED_LABEL_DESC: "Feedback Description",
    FEED_PLACEHOLDER_NAME: "Enter your full name",
    FEED_PLACEHOLDER_DESC: "Describe your feedback, feature requests, or bugs...",
    FEED_BTN_LOGGING: "Logging to server terminal...",
    FEED_BTN_SUBMIT: "Submit to terminal"
  },
  hi: {
    // Header & Footer
    APP_NAME: "फ़्रेशट्रैक",
    GPS_SUBTITLE: "जीपीएस ठेला खोजक",
    DISCOVER_CARTS_TAB: "ठेले खोजें",
    SELLER_CENTER_TAB: "विक्रेता केंद्र",
    ADMIN_TERMINAL_TAB: "एडमिन टर्मिनल",
    FEEDBACK_TAB: "फीडबैक",
    FOOTER_TITLE: "फ़्रेश कार्ट खोज प्रणाली (PWA)",
    FOOTER_DESC: "सड़क पर फल और सब्जियां बेचने वाले स्थानीय विक्रेताओं को लाइव जीपीएस के साथ खरीदारों से जोड़ने का सुरक्षित नेटवर्क।",
    FOOTER_TRACKING: "जीपीएस लाइव लोकेशन ट्रैकिंग चालू है",
    FOOTER_NOTIF: "सिम्युलेटेड पुश नोटिफिकेशन",
    FOOTER_SESSION: "जेडब्ल्यूटी सत्यापित लॉगिन क्रेडेंशियल्स",
    FOOTER_RIGHTS: "© 2026 मोबाइल सब्जी और फल खोजक ऐप। सभी अधिकार सुरक्षित हैं।",
    LANG_TOGGLE: "Eng / हिंदी",

    // Authentication Screen
    TITLE_SELLER_CENTER: "विक्रेता केंद्र",
    SUBTITLE_LOGIN: "अपनी मूल्य सूची अपडेट करने और लाइव जीपीएस लोकेशन प्रसारित करने के लिए लॉगिन करें",
    SUBTITLE_REGISTER: "केवल 1 मिनट में अपने फल और सब्जी के ठेले को पंजीकृत करें",
    LABEL_NAME: "पूरा नाम *",
    LABEL_PHONE: "मोबाइल नंबर *",
    LABEL_PASSWORD: "पासवर्ड *",
    LABEL_CART_INFO: "ठेला या दुकान का संक्षिप्त विवरण",
    LABEL_SERVICE_AREA: "मुख्य कार्य क्षेत्र / गलियाँ *",
    LABEL_PROFILE_PHOTO: "प्रोफ़ाइल फ़ोटो का सीधा लिंक (वैकल्पिक)",
    PLACEHOLDER_NAME: "जैसे: रमेश कुमार",
    PLACEHOLDER_PHONE: "जैसे: 9876543210 (या 'admin')",
    PLACEHOLDER_CART_INFO: "जैसे: लोहे का हाथ ठेला, रिक्शा दुकान, अस्थाई स्टॉल",
    PLACEHOLDER_SERVICE_AREA: "जैसे: इंदिरा नगर सेक्टर 2, मुख्य चौराहा",
    PLACEHOLDER_PHOTO: "सीधा .png/.jpg फ़ोटो का लिंक पेस्ट करें",
    BUTTON_LOGIN: "लॉगिन करें",
    BUTTON_SIGNUP: "नया ठेला पंजीकृत करें",
    TOGGLE_HAVE_ACCOUNT: "पहले से पंजीकृत हैं? यहाँ लॉगिन करें",
    TOGGLE_NEED_ACCOUNT: "अपना ठेला जोड़ें! नया पंजीकरण करें",
    ADMIN_LOCKDOWN: "सिस्टम लॉकडाउन मोड",
    ADMIN_AUTH_REQ: "एडमिन प्रमाणन आवश्यक",
    ADMIN_WARN: "आप सुरक्षित प्रशासनिक सेटिंग्स तक पहुँचने का प्रयास कर रहे हैं। जारी रखने के लिए नीचे दी गई डेमो क्रेडेंशियल्स का उपयोग कर प्रमाणित करें।",
    DEMO_CREDENTIALS: "डेमो क्रेडेंशियल्स",
    ADMIN_NODE: "प्रशासक लॉगिन",
    DEMO_ADMIN_DESC: "उपयोगकर्ता नाम admin और पासवर्ड admin123 दर्ज करके लॉगिन करें",
    DEMO_SELLER_DESC: "विक्रेता लॉगिन हेतु: 9876543210 या 8765432109, पासवर्ड: admin123 दर्ज करें",
    ERROR_CONN: "कनेक्शन का समय समाप्त हो गया। कृपया अपने सिस्टम की स्थिति जांचें।",
    ERROR_REG_FAILED: "पंजीकरण विफल रहा",
    ERROR_SERVER: "सर्वर नेटवर्क त्रुटि। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    REG_SUCCESS: "पंजीकरण सफल! कृपया नीचे लॉगिन करें।",

    // Customer Dashboard
    SEARCH_PLACEHOLDER: "टमाटर, आलू, सेब, केला आदि खोजें...",
    LIVE_RADAR: "लाइव जीपीएस कार्ट खोज रडार (नक्शा)",
    NO_SELLERS_IN_RANGE: "आपके चयनित दायरे में कोई सक्रिय सब्जी या फल विक्रेता नहीं मिला।",
    VERIFY_LOCATION: "जीपीएस सक्रिय है। दूरी को बदलने के लिए ऊपर दिए गए स्लाइडर का उपयोग करें।",
    LISTING_ACTIVE: "सक्रिय चलने वाले विक्रेता मिले",
    RAD_LABEL: "खोज की अधिकतम दूरी सीमा",
    FA_LABEL: "श्रेणी फ़िल्टर करें",
    ALL_CAT: "सभी उत्पाद",
    VEG_CAT: "ताज़ी सब्जियां",
    FRU_CAT: "ताज़े फल",
    SORT_BY: "क्रमबद्ध करें",
    SORT_DIST: "न्यूनतम दूरी",
    SORT_PRICE: "कम कीमत पहले",
    SORT_RATING: "सर्वोच्च रेटिंग",
    MOBILE_VERIFIED: "मोबाइल सत्यापित",
    VIEW_DETAILS_BTN: "मूल्य सूची और दुकान",
    DISTANCE_KM: "किमी दूर",
    RATING_TITLE: "ग्राहकों द्वारा कुल रेटिंग",
    REVIEWS_COUNT: "समीक्षाएं",
    VISITS_COUNT: "दौरे",
    DEPARTED: "ऑफ़लाइन / दुकान बंद",
    ACTIVE_ONLINE: "लाइव जीपीएस चालू",
    ITEMS_OFFERED: "आज उपलब्ध ताज़ा सब्जियां / फल एवं दरें",
    REVIEWS_SECTION: "ग्राहकों के विचार और समीक्षाएं",
    WRITE_REVIEW: "नयी समीक्षा जोड़ें",
    REVIEW_SUBMIT: "समीक्षा जमा करें",
    AI_ASSISTANT_SUMMARY: "एआई सलाहकार विश्लेषण (एआई सलाह)",
    AI_BTN: "ताज़ा एआई सारांश तैयार करें",
    FAV_REMOVE: "पसंदीदा सूची से हटाएं",
    FAV_ADD: "पसंदीदा कार्ट में जोड़ें",
    LABEL_REVIEW_NAME: "आपका नाम *",
    LABEL_REVIEW_RATING: "दर्ज की जाने वाली रेटिंग *",
    LABEL_REVIEW_COMMENT: "अपनी समीक्षा और राय यहाँ विस्तार से लिखें...",
    REVIEW_SUCCESS: "आपकी समीक्षा सफलतापूर्वक सबमिट हो गई है!",
    AI_GENERATING: "कृत्रिम बुद्धिमत्ता (AI) सलाहकार से संपर्क किया जा रहा है...",
    NO_PRODUCTS: "इस विक्रेता ने आज के लिए कोई सब्जी या फल सूची अभी तक जारी नहीं की है।",
    RECENTLY_VISITED: "हाल ही में देखे गए ठेले",

    // Seller Dashboard
    SELLER_WELCOME: "स्वागत है, हमारे पाटनर",
    CART_TYPE: "ठेले का स्वरूप / प्रकार",
    OPERATING_AREA: "कार्य करने का मुख्य क्षेत्र",
    GPS_BROADCAST_TITLE: "लाइव नक्शा जीपीएस लोकेशन सेटिंग्स",
    GPS_STATUS: "लोकेशन प्रसारण स्थिति",
    GPS_ACTIVE: "सक्रिय (नक्शे पर लाइव दिखाई दे रहे हैं)",
    GPS_INACTIVE: "निष्क्रिय (नक्शे पर दिखाई नहीं दे रहे हैं)",
    GPS_LOC_COORDS: "आपकी वर्तमान भौतिक निर्देशांक (जीपीएस स्थान)",
    GPS_COORDS_VALUE: "अक्षांश: {lat}, देशांतर: {lng}",
    GPS_UPDATE_SUCCESS: "आपकी लाइव जीपीएस स्थिति सफलतापूर्वक अपडेट हो गई है!",
    NOTIF_TRIGGER_HEADING: "स्थानीय सीमा में रहने वाले ग्राहकों को अलर्ट भेजें",
    NOTIF_TRIGGER_DESC: "आपकी दुकान को पसंदीदा जोड़ने वाले नजदीकी ग्राहकों के फोन पर तुरंत एक सीधा सूचना संदेश (पुश अलर्ट) भेजें।",
    NOTIF_TITLE_LABEL: "अलर्ट का मुख्य शीर्षक *",
    NOTIF_DESC_LABEL: "अलर्ट का मुख्य विवरण *",
    NOTIF_PLACEHOLDER_TITLE: "जैसे: रमेश फ्रूट्स आपके गली में है!",
    NOTIF_PLACEHOLDER_BODY: "जैसे: इंदिरा नगर दूसरी गली पर ताज़े सेब उपलब्ध हैं! तुरंत 10% की छूट का आनंद लें।",
    NOTIF_BTN: "अलर्ट संदेश भेजें",
    NOTIF_SUCCESS_ALERT: "अलर्ट संदेश सफलतापूर्वक प्रसारित कर दिया गया है!",
    NOTIF_ERROR_ALERT: "अलर्ट प्रसारित करने में विफलता।",
    INVENTORY_TITLE: "मेरी उपलब्ध सामग्री, दाम और मात्रा सूची",
    INVENTORY_DESC: "आज बिकने वाले उत्पादों को जोड़ें, उनका दाम बदलें या उपलब्धता की स्थिति को संभालें।",
    ADD_ITEM_HEADING: "स्वीकृत सरकारी कैटलॉग से नया उत्पाद जोड़ें",
    ADD_ITEM_SELECT: "फल या सब्जी चुनें *",
    ADD_ITEM_PRICE: "विक्रय मूल्य (प्रति इकाई दर) *",
    ADD_ITEM_BTN: "दुकान की सूची में सहेजें",
    ADD_ITEM_ERROR: "कृपया सही उत्पाद और मान्य दर चुनें।",
    SUCCESS_ITEM_ADDED: "उत्पाद को विक्रय सूची में सफलतापूर्वक जोड़ दिया गया!",
    PRICE_UPDATED: "मूल्य दर सफलतापूर्वक संशोधित कर दी गई है!",
    AVAIL_CHANGED: "उत्पाद की उपलब्धता अद्यतन की गई है!",
    LOGOUT_BTN: "पाटनर खाते से लॉग आउट करें",
    OFFERINGS_LIST_HEADER: "विक्रय पर उपलब्ध मुख्य खाद्य उत्पाद",
    OFFERINGS_AVAILABLE: "उपलब्ध",
    OFFERINGS_OUT_OF_STOCK: "स्टॉक समाप्त",
    OFFERINGS_REMOVE_BTN: "सूची से हटाएं",

    // Admin Dashboard
    ADMIN_WELCOME_HEADING: "प्रशासनिक नियंत्रण केंद्र (फ़्रेशट्रैक एडमिन)",
    ADMIN_RADIUS_CFG: "केंद्रीय खोज दूरी दायरा सीमा",
    ADMIN_RADIUS_VALUE: "अधिकतम दूरी सीमा: {radius} किमी",
    ADMIN_CATALOGUE_HEADING: "कृषि फल और सब्जी मास्टर कैटलॉग",
    ADMIN_CATALOGUE_DESC: "नये क्रॉप्स और फल जोड़ें जिन्हें ठेला विक्रेता अपनी दुकान की सूची में चुनने के लिए उपयोग करेंगे।",
    ADMIN_ADD_CAT_NAME: "सब्जी/फल का नाम *",
    ADMIN_ADD_CAT_CAT: "उत्पाद की मुख्य श्रेणी *",
    ADMIN_ADD_CAT_UNIT: "मानक माप इकाई (जैसे kg, bundle) *",
    ADMIN_ADD_CAT_IMAGE: "सीधा फोटो लिंक (Direct Visual Photo URL)",
    ADMIN_ADD_CAT_BTN: "मास्टर कैटलॉग में नया खाद्य जोड़ें",
    ADMIN_ADD_CAT_SUCCESS: "मास्टर कैटलॉग में इसे सफलतापूर्वक दर्ज कर दिया गया है!",
    CATALOG_LIST_HEADING: "सक्रिय स्वीकृत मास्टर कैटलॉग ({count})",
    CATALOG_DELETE_BTN: "हटाएं",
    PARTNERS_LIST_HEADING: "पंजीकृत मोबाइल ठेले और साझीदार ({count})",
    STATUS_SUSPENDED: "निलंबित (SUSPENDED)",
    STATUS_STANDBY: "ऑफ़लाइन / स्टैंडबाय",
    STATUS_ACTIVE: "लाइव प्रसारित / सक्रिय",
    PARTNER_ACTION_APPROVE: "साझीदार को सक्रिय/स्वीकृत करें",
    PARTNER_ACTION_SUSPEND: "साझीदार को निलंबित करें",
    PARTNER_ACTION_DELETE: "विक्रेता हटाएं",
    ANNOUNCEMENTS_HEADING: "प्लैटफ़ॉर्म सार्वजनिक घोषणाएँ एवं अलर्ट हब",
    ANNOUNCEMENTS_TITLE: "घोषणा का शीर्षक *",
    ANNOUNCEMENTS_BODY: "घोषणा का विवरण *",
    ANNOUNCEMENTS_BTN: "सार्वजनिक घोषणा जारी करें",
    ANNOUNCEMENTS_SUCCESS: "घोषणा सफलतापूर्वक जारी कर दी गई है!",
    ANNOUNCEMENT_LIST: "हालिया प्रशासनिक घोषणाएं ({count})",
    FEEDBACKS_HEADING: "ग्राहक प्रतिक्रिया टर्मिनल कंसोल",
    FEEDBACKS_LIVE: "लाइव फीडबैक प्रवाह",
    FEEDBACK_NO_ITEMS: "अभी तक किसी ग्राहक ने कोई फीडबैक नहीं भेजा है। परीक्षण के लिए नीचे 'फीडबैक' टैब का उपयोग करें।",
    FEEDBACK_REMOVE_BTN: "हटाएं",
    FEEDBACK_CONFIRM_REMOVE: "क्या आप वाकई इस फीडबैक को प्रशासनिक पैनल से स्थायी रूप से हटाना चाहते हैं?",

    // Feedback Page
    FEED_HEADER: "अपनी बहुमूल्य राय (फीडबैक) साझा करें",
    FEED_DESC: "आपका नाम और विवरण यहाँ साझा करने पर यह तुरंत एडमिन के टर्मिनल कंसोल लॉग और लाइव डैशबोर्ड पर दिखाई देगा।",
    FEED_SUCCESS_TITLE: "फीडबैक सफलतापूर्वक सबमिट हो गया!",
    FEED_SUCCESS_DESC: "धन्यवाद! व्यवस्थापक अब आपके फीडबैक को कंट्रोल पैनल और लाइव टर्मिनल पर देख सकते हैं।",
    FEED_RETRY_BTN: "दूसरी प्रतिक्रिया भेजें",
    FEED_LABEL_NAME: "आपका नाम",
    FEED_LABEL_DESC: "फीडबैक का मुख्य विवरण",
    FEED_PLACEHOLDER_NAME: "अपना पूरा नाम लिखें",
    FEED_PLACEHOLDER_DESC: "अपनी राय, नया फ़ीचर सुझाव या किसी तकनीकी समस्या के बारे में लिखें...",
    FEED_BTN_LOGGING: "टर्मिनल पर लॉग किया जा रहा है...",
    FEED_BTN_SUBMIT: "टर्मिनल पर सबमिट करें"
  }
} as const;

export type Locale = 'en' | 'hi';

interface I18nContextProps {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof translations['en'], variables?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('freshtrack_locale');
    return (saved === 'hi' || saved === 'en') ? saved : 'en';
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('freshtrack_locale', l);
  };

  const t = (key: keyof typeof translations['en'], variables?: Record<string, string | number>): string => {
    const dictionary = translations[locale] || translations['en'];
    let val = dictionary[key] || translations['en'][key] || String(key);

    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }

    return val;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
