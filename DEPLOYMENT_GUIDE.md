# AI Skin Analysis - Shopify App Deployment Guide
## FastAPI (Render) + React CRA (Vercel) + MongoDB Atlas

---

## HAPI 1: Push ne GitHub

### 1.1 Krijo Repository ne GitHub
```bash
# Ne kompjuterin tend lokal:
git init
git remote add origin https://github.com/USERNAME/ai-skin-analysis.git
```

### 1.2 Struktura e repo
```
ai-skin-analysis/
├── backend/              # FastAPI app (deploy ne Render)
│   ├── server.py
│   ├── routes/
│   ├── utils/
│   ├── requirements.txt
│   └── .env.example      # Template (pa vlera reale)
├── frontend/             # React CRA (deploy ne Vercel)
│   ├── src/
│   ├── package.json
│   └── .env.example
├── theme-extension/      # Shopify Theme Extension (push me Shopify CLI)
│   ├── blocks/
│   ├── assets/
│   └── locales/
└── README.md
```

### 1.3 Krijo .gitignore
```
node_modules/
__pycache__/
.env
*.pyc
build/
dist/
.vercel/
```

### 1.4 Push
```bash
git add .
git commit -m "Initial commit: AI Skin Analysis Shopify App"
git push -u origin main
```

---

## HAPI 2: MongoDB Atlas (Database)

### 2.1 Krijo Cluster
1. Shko: https://cloud.mongodb.com
2. Krijo account (free) → Create Cluster → M0 Free Tier
3. Zgjidh region (EU West ose US East)
4. Cluster name: `ai-skin-analysis`

### 2.2 Konfiguro Access
1. **Database Access** → Add Database User
   - Username: `skinapp`
   - Password: gjenero password te sigurt (ruaje!)
   - Role: `readWriteAnyDatabase`

2. **Network Access** → Add IP Address
   - Kliko "Allow Access from Anywhere" (`0.0.0.0/0`)
   - (Per production: vendos vetem IP-te e Render)

### 2.3 Merr Connection String
1. Kliko **Connect** → **Drivers** → **Python 3.12+**
2. Kopjo connection string:
```
mongodb+srv://skinapp:PASSWORD@ai-skin-analysis.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
3. Zevendeso `PASSWORD` me passwordin real

---

## HAPI 3: Shopify Partner Dashboard

### 3.1 Krijo App
1. Shko: https://partners.shopify.com
2. **Apps** → **Create app** → **Create app manually**
3. App name: `AI Skin Analysis`
4. App URL: `https://ai-skin-analysis-frontend.vercel.app` (do ta dish pasi deploy ne Vercel)

### 3.2 Merr Credentials
Pasi krijohet app-i, shko ne **App setup**:
- **Client ID** = SHOPIFY_API_KEY
- **Client secret** = SHOPIFY_API_SECRET
- Ruaji keto! Do i duhen per Render.

### 3.3 Konfiguro URLs (pasi te besh deploy)
Ne **App setup** → **URLs**:

```
App URL:                    https://ai-skin-analysis-frontend.vercel.app
Allowed redirection URL(s): https://ai-skin-analysis-backend.onrender.com/api/shopify/callback
```

### 3.4 Konfiguro App Proxy
Ne **App setup** → **App proxy**:

```
Sub path prefix:    apps
Sub path:           skin-analysis  
Proxy URL:          https://ai-skin-analysis-backend.onrender.com/api/proxy
```

Kjo ben qe:
`https://STORE.myshopify.com/apps/skin-analysis/*` → `https://ai-skin-analysis-backend.onrender.com/api/proxy/*`

### 3.5 Konfiguro Webhooks
Ne **Webhooks** → **Event subscriptions**:

| Webhook Topic              | Endpoint URL                                                                |
|---------------------------|-----------------------------------------------------------------------------|
| customers/redact          | https://ai-skin-analysis-backend.onrender.com/api/webhooks/customers/redact |
| shop/redact               | https://ai-skin-analysis-backend.onrender.com/api/webhooks/shop/redact      |
| customers/data_request    | https://ai-skin-analysis-backend.onrender.com/api/webhooks/customers/data-request |
| app/uninstalled           | https://ai-skin-analysis-backend.onrender.com/api/webhooks/app/uninstalled  |

**Webhook version**: `2024-10`

### 3.6 GDPR Mandatory Webhooks
Ne **App setup** → **GDPR mandatory webhooks**:

```
Customer data request:     https://ai-skin-analysis-backend.onrender.com/api/webhooks/customers/data-request
Customer data erasure:     https://ai-skin-analysis-backend.onrender.com/api/webhooks/customers/redact
Shop data erasure:         https://ai-skin-analysis-backend.onrender.com/api/webhooks/shop/redact
```

---

## HAPI 4: Deploy Backend ne Render

### 4.1 Krijo Web Service
1. Shko: https://dashboard.render.com
2. **New** → **Web Service**
3. Connect GitHub repo → Zgjidh `ai-skin-analysis`

### 4.2 Konfigurimi
```
Name:           ai-skin-analysis-backend
Region:         Oregon (US West) ose Frankfurt (EU)
Branch:         main
Root Directory: backend
Runtime:        Python 3
Build Command:  pip install -r requirements.txt
Start Command:  uvicorn server:app --host 0.0.0.0 --port $PORT
Instance Type:  Free (per fillim) ose Starter ($7/muaj per production)
```

### 4.3 Environment Variables
Ne Render dashboard → **Environment**:

```
MONGO_URL=mongodb+srv://skinapp:PASSWORD@ai-skin-analysis.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=ai_skin_analysis
CORS_ORIGINS=https://ai-skin-analysis-frontend.vercel.app
SHOPIFY_API_KEY=shppa_xxxxxxxxxxxx          (nga Hapi 3.2)
SHOPIFY_API_SECRET=shpss_xxxxxxxxxxxx       (nga Hapi 3.2)
APP_URL=https://ai-skin-analysis-backend.onrender.com
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx          (OpenAI key juaji)
```

### 4.4 Verifiko Deploy
Pasi Render perfundon build (~3-5 min):
```bash
curl https://ai-skin-analysis-backend.onrender.com/api/health
# Duhet te ktheje: {"status":"ok"}
```

**KUJDES**: Render Free tier ka "cold starts" - sherbimi fle pas 15 min inaktiviteti.
Per Shopify webhooks/proxy, Starter ($7/muaj) eshte i nevojshem per uptime.

---

## HAPI 5: Deploy Frontend ne Vercel

### 5.1 Import Project
1. Shko: https://vercel.com
2. **New Project** → Import GitHub repo → Zgjidh `ai-skin-analysis`

### 5.2 Konfigurimi
```
Framework Preset:   Create React App
Root Directory:     frontend
Build Command:      yarn build          (Vercel e detekton automatikisht)
Output Directory:   build
```

### 5.3 Environment Variables
```
REACT_APP_BACKEND_URL=https://ai-skin-analysis-backend.onrender.com
```

### 5.4 Deploy
Kliko **Deploy**. Vercel jep URL si:
```
https://ai-skin-analysis-frontend.vercel.app
```

### 5.5 Kthehu ne Shopify Partner Dashboard
Tani qe ke URL-te reale, update:
- **App URL** = `https://ai-skin-analysis-frontend.vercel.app`
- **Redirection URL** = `https://ai-skin-analysis-backend.onrender.com/api/shopify/callback`

---

## HAPI 6: Theme App Extension (Shopify CLI)

### 6.1 Instalo Shopify CLI
```bash
npm install -g @shopify/cli @shopify/theme
```

### 6.2 Inicializo Extension
```bash
# Ne root te repo:
shopify app init          # Nese nuk e ke bere
# OSE nese ke app ekzistuese:
cd ai-skin-analysis
shopify app generate extension --type theme_app_extension --name skin-analysis
```

### 6.3 Kopjo fajllat
Kopjo permbajtjen e `/theme-extension/` ne direktorine e extension-it te gjeneruar:
```bash
cp theme-extension/blocks/skin-analysis.liquid extensions/skin-analysis/blocks/
cp theme-extension/assets/* extensions/skin-analysis/assets/
cp theme-extension/locales/* extensions/skin-analysis/locales/
```

### 6.4 Update shopify.app.toml
```toml
[app_proxy]
url = "https://ai-skin-analysis-backend.onrender.com/api/proxy"
subpath = "skin-analysis"
prefix = "apps"
```

### 6.5 Push Extension
```bash
shopify app deploy
```

### 6.6 Aktivizo ne Theme
1. Shko ne Shopify Admin te dev store
2. **Online Store** → **Themes** → **Customize**
3. Shko ne faqen `/pages/skin-analysis`
4. Shto seksionin **AI Skin Analysis**
5. Ruaj

---

## HAPI 7: Testimi Real (Checklist)

### 7.1 OAuth Flow
```
1. Hap: https://ai-skin-analysis-backend.onrender.com/api/shopify/install?shop=YOUR-STORE.myshopify.com
2. Duhet te redirect ne Shopify OAuth consent screen
3. Approve → redirect ne callback → store ruhet ne MongoDB
```

### 7.2 App Proxy
```
1. Hap: https://YOUR-STORE.myshopify.com/apps/skin-analysis/skin-analysis
2. Duhet te ktheje JSON response nga backend
3. Verifikimi HMAC duhet te kaloje (Shopify e firmos automatikisht)
```

### 7.3 Billing
```
1. Nga dashboard, kliko Subscribe per nje plan
2. Redirect ne Shopify approval page
3. Approve → charge aktivizohet → plan ruhet ne DB
```

### 7.4 Webhooks
```bash
# Testo me Shopify CLI:
shopify app webhook trigger --topic customers/redact --address https://ai-skin-analysis-backend.onrender.com/api/webhooks/customers/redact
```

### 7.5 Skin Analysis
```
1. Hap /pages/skin-analysis ne storefront
2. Lejo kameren
3. Kap snapshot → analiza duhet te ktheje rezultate
```

---

## HAPI 8: Production Checklist

- [ ] Render: Upgrade ne Starter ($7/muaj) per te shmangur cold starts
- [ ] MongoDB Atlas: Upgrade ne M10 nese trafiku rritet
- [ ] Hiq `"test": True` ne billing (backend/utils/shopify_client.py, linja 34)
- [ ] Vendos CORS_ORIGINS vetem per domain-in tend (jo *)
- [ ] Shto rate limiting ne /api/proxy/analyze
- [ ] Shto cron job per quota reset mujore
- [ ] Shopify App Store submission: https://partners.shopify.com/apps
- [ ] Testo me 2+ dev stores para submission

---

## Kostot Mujore (Estimim)

| Sherbim         | Plan       | Kosto/muaj |
|----------------|------------|------------|
| Render         | Starter    | $7         |
| Vercel         | Free/Hobby | $0-$20     |
| MongoDB Atlas  | M0 Free    | $0         |
| OpenAI API     | Pay-as-go  | ~$5-50     |
| **Total**      |            | **~$12-77**|
