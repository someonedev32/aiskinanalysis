# AI Skin Analysis - Shopify App Store Submission Guide

---

## CHECKLIST PARA SUBMISSION (duhet te jene te gjitha OK)

### 1. Teknik
- [ ] Backend live ne Render (jo Free tier — Starter $7/muaj per uptime)
- [ ] Frontend live ne Vercel
- [ ] MongoDB Atlas funksionon
- [ ] OAuth install flow funksionon
- [ ] Billing flow funksionon (3-day trial + 3 planet)
- [ ] GDPR webhooks konfiguruar dhe funksionojne
- [ ] App Proxy konfiguruar dhe funksionon
- [ ] Theme Extension deployed me Shopify CLI
- [ ] HMAC verification aktive per webhooks dhe proxy
- [ ] Skin analysis AI funksionon me OpenAI API key

### 2. Shopify Partner Dashboard
- [ ] App URL = Vercel URL
- [ ] Redirect URL = Render callback URL
- [ ] App Proxy konfiguruar
- [ ] GDPR mandatory webhooks konfiguruar
- [ ] Distribution = Public
- [ ] App listing plotesuar (shiko me poshte)

### 3. Compliance
- [ ] Privacy Policy e aksesueshme
- [ ] Terms of Service e aksesueshme
- [ ] Medical disclaimer visible ne storefront widget
- [ ] Asnje imazh nuk ruhet (processing only)
- [ ] Billing test mode OFF per production

---

## HAPI 1: Render — Upgrade dhe Production Mode

### 1.1 Upgrade Render
Shko Render → ai-skin-analysis-backend → Settings:
- Instance Type: **Starter ($7/muaj)** minimum
- Free tier ka cold starts (15 min sleep) — Shopify do refuzon app-in

### 1.2 Hiq Test Mode nga Billing
Aktualisht billing eshte ne test mode. Duhet ta heqesh per production.
Ke ndryshimin per te bere ne `backend/utils/shopify_client.py`:
```python
# Ndrysho "test": True → "test": False
"test": False  # PRODUCTION - charges reale
```
**KUJDES**: Mos e bej kete derisa je gati per production!

---

## HAPI 2: Theme Extension Deploy

### 2.1 Ne kompjuterin tend lokal:
```bash
cd ai-skin-analysis
npm install -g @shopify/cli
shopify auth login
shopify app config link        # Lidh me app-in ne Partner Dashboard
```

### 2.2 Gjenero dhe deploy:
```bash
shopify app generate extension --type theme_app_extension --name skin-analysis
# Kopjo fajllat:
cp theme-extension/blocks/skin-analysis.liquid extensions/skin-analysis/blocks/
cp theme-extension/assets/skin-analysis.js extensions/skin-analysis/assets/
cp theme-extension/assets/skin-analysis.css extensions/skin-analysis/assets/
cp theme-extension/locales/en.default.json extensions/skin-analysis/locales/

shopify app deploy
```

### 2.3 Verifiko:
- Shko ne dev store → Online Store → Themes → Customize
- Shto seksionin "AI Skin Analysis" ne nje faqe
- Testo kameren dhe analizimin

---

## HAPI 3: Testo Gjithcka ne Dev Store

### 3.1 Install Test
```
https://aiskinanalysis.onrender.com/api/shopify/install?shop=DEV-STORE.myshopify.com
```
- Duhet te redirect ne OAuth
- Duhet te instaloj me sukses
- Dashboard duhet te ngarkoj

### 3.2 Billing Test
- Kliko "Start" ne nje plan
- Shopify do tregoj test charge (nese test=True)
- Approve → plan aktivizohet
- Verifiko quota tracking

### 3.3 Skin Analysis Test
- Shko ne storefront /pages/skin-analysis
- Hap kameren
- Kap foto → merr rezultate
- Verifiko: skin type, score, concerns, routine

### 3.4 Product Matching Test
- Shto produkte me tags: skin-oily, moisturizer, niacinamide
- Bej analyze me fytyre → verifiko qe produktet shfaqen

### 3.5 Webhook Test
```bash
shopify app webhook trigger --topic customers/redact \
  --address https://aiskinanalysis.onrender.com/api/webhooks/customers/redact
```

### 3.6 Uninstall/Reinstall Test
- Uninstall app-in nga dev store
- Verifiko qe webhook app/uninstalled u pranua
- Reinstall — duhet te funksionoj

---

## HAPI 4: App Listing (Partner Dashboard)

Shko: partners.shopify.com → Apps → AI Skin Analysis → App listing

### 4.1 App Name
```
AI Skin Analysis
```

### 4.2 App Icon
- 1200x1200 px
- PNG ose SVG
- Background e thjesht, logo e qarte
- Mos perdor fjalet "Shopify" ne ikon

### 4.3 Tagline (max 100 karaktere)
```
AI-powered skin analysis with personalized skincare recommendations
```

### 4.4 Description (detajuar)
```
AI Skin Analysis uses advanced AI technology to analyze your customers' 
skin in real-time through their device camera. Give your customers a 
personalized skincare experience that drives product discovery and sales.

HOW IT WORKS:
1. Customer opens the skin analysis page on your store
2. Uses their camera to capture a quick snapshot
3. AI analyzes their skin in seconds
4. Receives personalized results: skin type, concerns, score (0-100)
5. Gets ingredient recommendations and AM/PM skincare routines
6. Sees matching products from your store

KEY FEATURES:
• Real-time AI skin analysis via camera (no image upload needed)
• Skin type detection: Normal, Dry, Oily, Combination, Sensitive
• Skin health score (0-100)
• Concern identification: acne, dark spots, wrinkles, dehydration, etc.
• Personalized AM/PM skincare routine recommendations
• Ingredient recommendations based on skin analysis
• Smart product matching from your Shopify collections using tags
• Scan history and usage analytics dashboard
• Theme App Extension — easy to add to any page

PRIVACY FIRST:
• No images are stored — analysis is real-time only
• No customer PII collected
• GDPR compliant
• Cosmetic analysis only — not medical advice

PLANS:
• Start: $39/month — 1,000 analyses
• Plus: $99/month — 5,000 analyses
• Growth: $179/month — 10,000 analyses
All plans include a 3-day free trial.

PERFECT FOR:
• Skincare brands
• Beauty stores
• Cosmetic retailers
• Dermocosmetic shops

Set up in minutes. Tag your products, add the widget to your store, done.
```

### 4.5 Screenshots (minimum 3, rekomandohet 5)
Nevojiten screenshots te:
1. Storefront — kamera interface (para analyze)
2. Storefront — rezultatet e analizes
3. Dashboard — overview me metrika
4. Dashboard — billing plans
5. Dashboard — settings me product matching guide

Specifikimet:
- 1600x900 px ose 1200x675 px (16:9)
- PNG ose JPG
- Pa watermark, pa bordura extra

### 4.6 Category
```
Store design → Theme apps
```
ose
```
Marketing → Customer engagement
```

### 4.7 Contact Info
```
Developer name:     inovation.app
Support email:      support@inovation.app
Developer website:  https://inovation.app
Privacy Policy URL: https://aiskinanalysis-five.vercel.app/privacy
```

---

## HAPI 5: GDPR Mandatory Webhooks (Partner Dashboard)

Shko: App setup → GDPR mandatory webhooks:

```
Customer data request endpoint:
https://aiskinanalysis.onrender.com/api/webhooks/customers/data-request

Customer data erasure endpoint:
https://aiskinanalysis.onrender.com/api/webhooks/customers/redact

Shop data erasure endpoint:
https://aiskinanalysis.onrender.com/api/webhooks/shop/redact
```

---

## HAPI 6: Submit per Review

### 6.1 Para submission, verifiko:
- [ ] Instalohet pa error ne dev store
- [ ] Billing funksionon
- [ ] Theme extension shfaqet ne theme editor
- [ ] Skin analysis funksionon ne storefront
- [ ] Uninstall funksionon pa error
- [ ] GDPR webhooks respondojne
- [ ] Screenshots jane te qarta dhe profesionale
- [ ] Description eshte e plote
- [ ] Privacy Policy dhe Terms jane te aksesueshme

### 6.2 Submit
Shko: App listing → "Submit app"

### 6.3 Review Process
- Shopify review zakonisht zgjat **5-10 dite pune**
- Mund te kerkojne ndryshime — pergjigju brenda 7 diteve
- Shkaqet me te shpeshta te refuzimit:
  1. App nuk instalohet ne menyre te paster
  2. Billing nuk funksionon
  3. GDPR webhooks mungojne ose nuk respondojne
  4. Privacy policy mungon
  5. Screenshots te dobet ose te pasakta
  6. Description e paqarte

### 6.4 Pas Aprovimit
- App shfaqet ne Shopify App Store
- Merchantat mund ta instalojne
- Monitorizo: dashboard, error logs, billing

---

## TROUBLESHOOTING

| Problem | Zgjidhje |
|---------|----------|
| Review refuzuar: OAuth error | Testo install flow ne 2+ dev stores |
| Review refuzuar: Billing | Sigurohu qe trial funksionon, charges aprovohen |
| Review refuzuar: GDPR | Verifiko qe te 3 endpoints kthejne 200 |
| Review refuzuar: Privacy | Sigurohu qe URL eshte publike dhe e plote |
| Slow response | Upgrade Render ne Starter (jo Free) |
