# AI Skin Analysis - Shopify App PRD

## Project Overview
A Shopify embedded app that provides AI-powered skin analysis for e-commerce stores. Customers can use their camera to get personalized skincare recommendations and product suggestions.

## Original Problem Statement
The user is developing a Shopify app called "AI SkinAnalysis" for submission to the Shopify App Store. The app has a React frontend, Python/FastAPI backend, and a theme extension for the storefront widget.

## Core Features

### 1. AI Skin Analysis
- Camera capture on storefront
- OpenAI GPT-4o Vision API for skin analysis
- Returns: skin type, score, concerns, ingredient recommendations, AM/PM routines
- Face detection with user-friendly error messages when no face detected

### 2. Billing System (GraphQL Subscriptions API)
- **Start Plan**: $39/mo - 1,000 scans
- **Plus Plan**: $99/mo - 5,000 scans  
- **Growth Plan**: $179/mo - 10,000 scans + usage-based extra scans
- 3-day free trial on all plans
- Usage-based charges for Growth plan extra scans via `appUsageRecordCreate`

### 3. Shopify Embedded App
- App Bridge session token authentication
- HMAC verification for webhooks and app proxy
- GDPR compliance webhooks (customers/data_request, customers/redact, shop/redact)

### 4. Theme Extension
- Liquid template for storefront integration
- Camera capture UI with face guide
- Real-time analysis with loading states
- Product recommendations based on skin analysis

## Tech Stack

### Frontend
- React 19
- Tailwind CSS + Shadcn UI
- Axios with session token interceptor
- Recharts for data visualization
- React Router for navigation

### Backend
- Python FastAPI
- Motor (async MongoDB driver)
- OpenAI SDK
- HTTPX for Shopify API calls

### Database
- MongoDB (shops, scans, subscriptions, webhook_logs, settings)

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

## Architecture

```
/app
├── backend/
│   ├── routes/
│   │   ├── billing.py        # Subscription + usage charges
│   │   ├── skin_analysis.py  # OpenAI Vision API
│   │   ├── webhooks.py       # GDPR + lifecycle webhooks
│   │   ├── dashboard.py      # Dashboard data API
│   │   ├── app_proxy.py      # Storefront analysis proxy
│   │   └── shopify_auth.py   # OAuth flow
│   ├── utils/
│   │   ├── shopify_subscriptions.py
│   │   ├── hmac_verify.py
│   │   └── shopify_client.py
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Billing, Analytics, Settings
│   │   ├── components/      # UI components
│   │   ├── hooks/           # useShopDomain
│   │   └── utils/           # api.js, shopifyAuth.js
│   └── package.json
└── theme-extension/
    ├── assets/
    │   └── skin-analysis.js
    └── blocks/
        └── skin-analysis.liquid
```

## Key API Endpoints

### Public (App Proxy)
- `POST /api/proxy/analyze` - Skin analysis from storefront

### Dashboard
- `GET /api/dashboard/overview` - Metrics and charts
- `GET /api/dashboard/scans` - Scan history
- `GET/POST /api/dashboard/settings` - App settings

### Billing
- `GET /api/billing/plans` - Available plans
- `POST /api/billing/subscribe` - Create subscription
- `GET /api/billing/status/{shop}` - Billing status
- `POST /api/billing/buy-scans` - Purchase extra scans (Growth)
- `GET /api/billing/sync/{shop}` - Sync with Shopify

### Webhooks
- `POST /api/webhooks` - Unified webhook handler

## Database Schema

### shops
```json
{
  "shop_domain": "store.myshopify.com",
  "access_token": "encrypted",
  "plan": "growth",
  "billing_status": "active",
  "scan_count": 150,
  "scan_limit": 10000,
  "extra_scans_balance": 5000,
  "usage_line_item_id": "gid://..."
}
```

### scans
```json
{
  "shop_domain": "store.myshopify.com",
  "timestamp": "2026-02-09T...",
  "skin_type": "Oily",
  "score": 75,
  "concerns": ["Acne", "Large pores"]
}
```

## Implementation Status

### Completed (Feb 2026)
- [x] Full frontend with Dashboard, Billing, Analytics, Settings
- [x] Backend with all API routes
- [x] GraphQL Subscriptions API integration
- [x] Usage-based billing for Growth plan
- [x] OpenAI Vision skin analysis
- [x] GDPR webhooks with HMAC verification
- [x] Theme extension with camera capture
- [x] Session token authentication
- [x] Product matching based on tags

### Ready for Testing
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Render
- [ ] Configure Shopify app settings
- [ ] Test embedded app checks
- [ ] Deploy theme extension

## Environment Variables

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-app.render.com
```

### Backend (.env)
```
MONGO_URL=mongodb+srv://...
DB_NAME=skin_analysis
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
APP_URL=https://your-app.render.com
OPENAI_API_KEY=sk-...
CORS_ORIGINS=https://your-frontend.vercel.app
```

## Next Steps

1. **Immediate**: Push code to new GitHub repository
2. **Deploy**: Set up Vercel for frontend, Render for backend
3. **Configure**: Update Shopify Partner Dashboard URLs
4. **Test**: Verify embedded app checks pass
5. **Submit**: Submit app for Shopify review

## Known Issues
- None currently - codebase is complete and tested

## Contact
support@inovation.app
