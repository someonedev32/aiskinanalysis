# Deploy Guide: Render (Backend) + Vercel (Frontend)

## Rradha: Render PARA → pastaj Vercel

---

# PJESA 1: RENDER (Backend - FastAPI)

## 1.1 Krijo Account
1. Shko: **https://dashboard.render.com**
2. Sign up me GitHub (rekomandohet - lidh repo direkt)

## 1.2 Krijo Web Service
1. Kliko **"New +"** → **"Web Service"**
2. **"Build and deploy from a Git repository"** → Next
3. Zgjidh repo-n `ai-skin-analysis` nga GitHub
4. Kliko **"Connect"**

## 1.3 Konfigurimi SAKT

```
Name:             ai-skin-analysis-backend
Region:           Frankfurt (EU Central)  ← ose Oregon nëse je US
Branch:           main
Root Directory:   backend                 ← KRITIKE: shkruaj "backend"
Runtime:          Python 3
Build Command:    pip install -r requirements.txt
Start Command:    uvicorn server:app --host 0.0.0.0 --port $PORT
Instance Type:    Free (dev) ose Starter $7/muaj (production)
```

**SCREENSHOT i fushave:**
```
┌──────────────────────────────────────────────────┐
│ Name:           [ai-skin-analysis-backend      ] │
│ Region:         [Frankfurt (EU Central)      ▼ ] │
│ Branch:         [main                        ▼ ] │
│ Root Directory: [backend                       ] │  ← MOS HARRO
│ Runtime:        [Python 3                    ▼ ] │
│ Build Command:  [pip install -r requirements.txt]│
│ Start Command:  [uvicorn server:app --host 0.0.0.0 --port $PORT] │
│ Instance Type:  ○ Free  ● Starter ($7/mo)        │
└──────────────────────────────────────────────────┘
```

## 1.4 Environment Variables

Kliko **"Advanced"** → **"Add Environment Variable"** ose pasi krijohet, shko **Environment** tab:

```
┌─────────────────────┬──────────────────────────────────────────────────────────────────┐
│ Key                 │ Value                                                            │
├─────────────────────┼──────────────────────────────────────────────────────────────────┤
│ MONGO_URL           │ mongodb+srv://skinapp_admin:PASS@cluster.mongodb.net/...         │
│ DB_NAME             │ ai_skin_analysis                                                 │
│ CORS_ORIGINS        │ https://ai-skin-analysis-frontend.vercel.app                     │
│ SHOPIFY_API_KEY     │ (nga Shopify Partner Dashboard → Client ID)                      │
│ SHOPIFY_API_SECRET  │ (nga Shopify Partner Dashboard → Client secret)                  │
│ APP_URL             │ https://ai-skin-analysis-backend.onrender.com                    │
│ OPENAI_API_KEY      │ sk-xxxxxxxxxxxxxxxx (çelësi juaj OpenAI)                         │
│ PYTHON_VERSION      │ 3.11.6                                                           │
└─────────────────────┴──────────────────────────────────────────────────────────────────┘
```

**SHËNIME:**
- `CORS_ORIGINS`: vendos URL-në e Vercel frontend PASI ta deployosh (mund ta shtosh më vonë)
- `APP_URL`: Render e jep automatikisht pasi krijon service-in
- `PYTHON_VERSION`: shto këtë për të siguruar version-in e saktë

## 1.5 Kliko "Create Web Service"

Render fillon build. Prit ~3-5 minuta.

## 1.6 Verifiko
Pasi build përfundon, Render jep URL si:
```
https://ai-skin-analysis-backend.onrender.com
```

Testo:
```bash
# Test 1: Health check
curl https://ai-skin-analysis-backend.onrender.com/api/health
# Përgjigje: {"status":"ok"}

# Test 2: API root
curl https://ai-skin-analysis-backend.onrender.com/api/
# Përgjigje: {"message":"AI Skin Analysis API","status":"running"}

# Test 3: Billing plans
curl https://ai-skin-analysis-backend.onrender.com/api/billing/plans
# Përgjigje: {"plans":{"starter":{...},"professional":{...}}}
```

## 1.7 Nëse ka error
Shko **Logs** tab në Render dashboard:
- `ModuleNotFoundError` → mungon diçka në requirements.txt
- `Connection refused` MongoDB → kontrollo MONGO_URL dhe Network Access në Atlas
- `$PORT` error → sigurohu që Start Command ka `--port $PORT` (Render e injekton)

---

# PJESA 2: VERCEL (Frontend - React CRA)

## 2.1 Krijo Account
1. Shko: **https://vercel.com**
2. Sign up me GitHub

## 2.2 Import Project
1. Kliko **"Add New..."** → **"Project"**
2. **"Import Git Repository"** → Zgjidh `ai-skin-analysis`
3. Kliko **"Import"**

## 2.3 Konfigurimi SAKT

```
┌──────────────────────────────────────────────────┐
│ Project Name:       [ai-skin-analysis-frontend ] │
│ Framework Preset:   [Create React App        ▼ ] │  ← Vercel e detekton zakonisht
│ Root Directory:     [frontend                  ] │  ← KLIKO "Edit" dhe shkruaj "frontend"
│ Build Command:      [yarn build                ] │  ← Override: yarn build
│ Output Directory:   [build                     ] │  ← Override: build
│ Install Command:    [yarn install              ] │  ← Override: yarn install
└──────────────────────────────────────────────────┘
```

**HAPAT E SAKTË:**
1. **Root Directory**: Kliko **"Edit"** pranë Root Directory → shkruaj `frontend` → Continue
2. **Framework Preset**: Duhet të thotë **"Create React App"** (auto-detect)
3. **Build & Output Settings**: Kliko **"Override"** toggle për secilin:
   - Build Command: `yarn build`
   - Output Directory: `build`
   - Install Command: `yarn install`

## 2.4 Environment Variables

Në seksionin **"Environment Variables"**:

```
┌─────────────────────────────┬──────────────────────────────────────────────────────┐
│ Key                         │ Value                                                │
├─────────────────────────────┼──────────────────────────────────────────────────────┤
│ REACT_APP_BACKEND_URL       │ https://ai-skin-analysis-backend.onrender.com        │
└─────────────────────────────┴──────────────────────────────────────────────────────┘
```

**KUJDES:**
- URL-ja NUK ka `/` në fund (pa trailing slash)
- URL-ja NUK ka `/api` - vetëm domain-in
- Kjo variabël bëhet "bake" në build - nëse e ndryshon, duhet redeploy

## 2.5 Kliko "Deploy"

Vercel fillon build. Prit ~1-2 minuta.

## 2.6 Verifiko
Vercel jep URL si:
```
https://ai-skin-analysis-frontend.vercel.app
```

Hap në browser - duhet të shohësh dashboard-in me sidebar.

## 2.7 Nëse ka error
Shko **Deployments** → kliko deployment-in → **"Building"** logs:
- `Module not found` → kontroolo import paths
- `yarn build failed` → zakonisht ESLint warnings. Shto në package.json:
  ```json
  "scripts": {
    "build": "CI=false craco build"
  }
  ```
  `CI=false` injoron warnings si errors

---

# PJESA 3: PAS DEPLOY - Lidhje Finale

## 3.1 Update CORS në Render
Shko Render → Environment → update:
```
CORS_ORIGINS=https://ai-skin-analysis-frontend.vercel.app
```
Render bën auto-redeploy.

## 3.2 Update Shopify Partner Dashboard
Shko: https://partners.shopify.com → Apps → AI Skin Analysis → App setup

```
App URL:                      https://ai-skin-analysis-frontend.vercel.app
Allowed redirection URL(s):   https://ai-skin-analysis-backend.onrender.com/api/shopify/callback

App Proxy:
  Sub path prefix:    apps
  Sub path:           skin-analysis
  Proxy URL:          https://ai-skin-analysis-backend.onrender.com/api/proxy
```

## 3.3 Test End-to-End
```bash
# 1. Backend health
curl https://ai-skin-analysis-backend.onrender.com/api/health

# 2. Frontend loads
curl -s https://ai-skin-analysis-frontend.vercel.app | head -5

# 3. Frontend → Backend connection (hap browser, shiko Network tab)
# Hap: https://ai-skin-analysis-frontend.vercel.app
# Dashboard duhet te ngarkoj demo data

# 4. OAuth test
# Hap: https://ai-skin-analysis-backend.onrender.com/api/shopify/install?shop=YOUR-STORE.myshopify.com
```

---

# TROUBLESHOOTING

| Problem | Shkak | Zgjidhje |
|---------|-------|----------|
| Render: "No module named 'routes'" | Root Directory gabim | Vendos `backend` si Root Directory |
| Render: "Connection refused" MongoDB | IP jo ne whitelist | Atlas → Network Access → 0.0.0.0/0 |
| Render: Service fle (cold start) | Free tier | Upgrade ne Starter $7/muaj |
| Vercel: "Module not found" | Root Directory gabim | Vendos `frontend` si Root Directory |
| Vercel: Build fails me warnings | CI mode | Shto `CI=false` ne build command |
| Frontend: API calls 404 | REACT_APP_BACKEND_URL gabim | Kontrollo URL ne Vercel env vars, redeploy |
| Frontend: CORS error | CORS_ORIGINS gabim ne Render | Update CORS_ORIGINS me URL e Vercel |
| Shopify: OAuth redirect fails | Redirect URL gabim | Kontrollo Allowed Redirection URLs ne Partner Dashboard |
