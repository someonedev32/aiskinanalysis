# MongoDB Atlas Setup - AI Skin Analysis

## Hapi 1: Krijo Account

1. Shko: **https://www.mongodb.com/cloud/atlas/register**
2. Regjistrohu me Google ose email
3. Zgjidh **M0 Free Tier** (falas përgjithmonë)

---

## Hapi 2: Krijo Cluster

1. Pasi hyn në dashboard, kliko **"Build a Database"** ose **"Create"**
2. Zgjidh: **M0 (Free)**
3. Provider: **AWS**
4. Region: **Frankfurt (eu-central-1)** nëse je në Evropë, ose **Virginia (us-east-1)** nëse je në US
   - Zgjidh regionin më afër Render server-it tënd
5. Cluster Name: `ai-skin-analysis`
6. Kliko **"Create Deployment"**

---

## Hapi 3: Krijo Database User

Sapo krijohet cluster-i, Atlas të kërkon të krijosh user:

1. **Authentication Method**: Password
2. Vendos:
   ```
   Username: skinapp_admin
   Password: (kliko "Autogenerate Secure Password")
   ```
3. **RUAJ PASSWORD-in DIKU TË SIGURT** - s'do e shohësh më
4. Kliko **"Create Database User"**

---

## Hapi 4: Konfiguro Network Access (IP Whitelist)

1. Në të njëjtën faqe, Atlas tregon seksionin "Where would you like to connect from?"
2. Kliko **"Add My Current IP Address"** për testim lokal
3. **PËR RENDER**: Kliko **"Allow Access from Anywhere"**
   - Kjo vendos `0.0.0.0/0`
   - Render ka IP dinamike, prandaj duhet "Anywhere"
   - Për siguri më të lartë: Render Pro ka Static IP, mund ta vendosësh vetëm atë
4. Kliko **"Finish and Close"**

---

## Hapi 5: Merr Connection String

1. Në Atlas dashboard, kliko **"Connect"** (butoni pranë cluster-it)
2. Zgjidh **"Drivers"**
3. Driver: **Python** → Version: **3.12 or later**
4. Kopjo connection string-un, duket kështu:

```
mongodb+srv://skinapp_admin:<password>@ai-skin-analysis.abc123.mongodb.net/?retryWrites=true&w=majority&appName=ai-skin-analysis
```

5. **Zëvendëso `<password>`** me passwordin real nga Hapi 3

**Shembull i plotë:**
```
mongodb+srv://skinapp_admin:xK9mP2vL8nQ4wR7t@ai-skin-analysis.abc123.mongodb.net/?retryWrites=true&w=majority&appName=ai-skin-analysis
```

---

## Hapi 6: Testo Connection String

Për ta testuar para se ta vendosësh në Render:

```bash
# Instalo mongosh (MongoDB Shell) nëse s'e ke:
# https://www.mongodb.com/try/download/shell

mongosh "mongodb+srv://skinapp_admin:PASSWORD@ai-skin-analysis.abc123.mongodb.net/ai_skin_analysis"

# Nëse lidhet me sukses, do shohësh:
# ai-skin-analysis [primary] ai_skin_analysis>
# Shkruaj: show dbs
# Shkruaj: exit
```

---

## Hapi 7: Vendos në Render

Në Render dashboard → ai-skin-analysis-backend → **Environment**:

```
MONGO_URL=mongodb+srv://skinapp_admin:PASSWORD@ai-skin-analysis.abc123.mongodb.net/?retryWrites=true&w=majority&appName=ai-skin-analysis
DB_NAME=ai_skin_analysis
```

**KUJDES:**
- Passwordi NUK duhet të ketë karaktere speciale si `@`, `#`, `/` (mund të prishin URL-në)
- Nëse passwordi ka karaktere speciale, encode-i: `@` → `%40`, `#` → `%23`
- Më mirë: rigjenero password vetëm me shkronja dhe numra

---

## Hapi 8: Verifiko nga App-i

Pasi Render bën redeploy me MONGO_URL të ri:

```bash
curl https://ai-skin-analysis-backend.onrender.com/api/health
# Duhet: {"status":"ok"}

curl https://ai-skin-analysis-backend.onrender.com/api/dashboard/demo-data
# Duhet: {"success":true,"message":"Demo data seeded",...}
```

Pastaj shko në MongoDB Atlas → **Browse Collections** → duhet të shohësh:
- Database: `ai_skin_analysis`
- Collections: `shops`, `scans`, `webhook_logs`

---

## Shënime

- **M0 Free Tier**: 512 MB storage, 500 connections, shared RAM - mjafton per fillim
- **Upgrade**: Kur ke 1000+ scans/ditë, upgrade ne M10 ($57/muaj) per performance
- **Backup**: M0 nuk ka automated backup - per production, M10+ ka backup automatik
- **Monitoring**: Atlas ka monitoring falas - shiko Performance Advisor per slow queries
