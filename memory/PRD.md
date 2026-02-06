# Lumina Skin AI - Shopify App PRD

## Original Problem Statement
Shopify public app for App Store with:
1. Theme App Extension (Liquid + assets) for /pages/skin-analysis with camera capture
2. App Proxy + HMAC verification for storefront requests
3. Billing + Webhooks (HTTPS) + HMAC verification

## Architecture
- **Backend**: FastAPI (Python) - `/app/backend/`
- **Frontend**: React + Shadcn/UI - `/app/frontend/`
- **Database**: MongoDB
- **AI**: OpenAI Vision API (gpt-4o) via emergentintegrations
- **Theme Extension**: Liquid + vanilla JS/CSS - `/app/theme-extension/`

## User Personas
1. **Shopify Merchant**: Installs app, manages billing/settings, views analytics
2. **Store Customer**: Uses camera-based skin analysis on storefront

## Core Requirements
- [x] Theme App Extension (Liquid block for /pages/skin-analysis)
- [x] App Proxy endpoints with HMAC-SHA256 verification
- [x] Webhook endpoints (GDPR: customers/redact, shop/redact, customers/data-request + lifecycle: app/uninstalled, subscription/update) with HMAC verification
- [x] Recurring subscription billing (Starter: $4.99/100 scans, Professional: $9.99/250 scans, 7-day trial)
- [x] AI skin analysis via OpenAI Vision (skin type, score, concerns, ingredients, AM/PM routine, product recommendations)
- [x] Quota enforcement on backend
- [x] Merchant Dashboard (overview, billing, analytics, settings, webhooks, theme setup)

## What's Been Implemented (Feb 6, 2026)
- Full backend API with 6 route modules (auth, proxy, webhooks, billing, analysis, dashboard)
- HMAC verification for webhooks and app proxy
- Shopify OAuth flow
- Skin analysis with OpenAI Vision
- Complete merchant dashboard with 6 pages
- Theme App Extension files (Liquid + JS + CSS)
- Demo data seeding for development
- Testing: 92% backend, 100% frontend

## Prioritized Backlog
### P0 (Critical for Production)
- Configure real SHOPIFY_API_KEY and SHOPIFY_API_SECRET
- Set up HTTPS endpoint (Vercel/Render)
- Test with real Shopify store

### P1 (Important)
- Shopify product collection integration for recommendations
- Monthly quota reset cron job
- Session token authentication for dashboard
- Rate limiting on analysis endpoint

### P2 (Nice to Have)
- Multi-language support for theme extension
- Custom email notifications for quota alerts
- Detailed scan result history with images (optional, privacy considerations)
- A/B testing for skin analysis prompts
