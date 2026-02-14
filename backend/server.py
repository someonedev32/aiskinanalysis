from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="AI Skin Analysis - Shopify App")

# CORS must be added BEFORE routes
# Allow requests from Vercel frontend, Shopify Admin, and development
cors_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
# Always allow Shopify admin
cors_origins.extend([
    "https://admin.shopify.com",
    "https://*.myshopify.com",
])

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Allow all origins for Shopify embedded apps
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Root route - handle Shopify app open
@app.get("/")
async def app_root(request: Request):
    """Handle when Shopify opens the app - redirect to frontend dashboard."""
    params = dict(request.query_params)
    shop = params.get("shop", "")
    host = params.get("host", "")
    
    # Get frontend URL from environment or use default
    frontend_url = os.environ.get("FRONTEND_URL", "")
    
    if shop and frontend_url:
        # Redirect to frontend dashboard with shop context
        return RedirectResponse(url=f"{frontend_url}?shop={shop}&host={host}")
    elif shop:
        # Fallback: redirect to Shopify admin with the app open
        shop_handle = shop.replace(".myshopify.com", "")
        return RedirectResponse(url=f"https://admin.shopify.com/store/{shop_handle}/apps/ai-skinanalysis")
    
    return {"message": "AI Skin Analysis App", "docs": "/docs"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import routes
from routes.shopify_auth import auth_router
from routes.app_proxy import proxy_router
from routes.webhooks import webhook_router
from routes.billing import billing_router
from routes.skin_analysis import analysis_router
from routes.dashboard import dashboard_router

# Include all route modules
api_router.include_router(auth_router, prefix="/shopify", tags=["Shopify Auth"])
api_router.include_router(proxy_router, prefix="/proxy", tags=["App Proxy"])
api_router.include_router(webhook_router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(billing_router, prefix="/billing", tags=["Billing"])
api_router.include_router(analysis_router, prefix="/analysis", tags=["Skin Analysis"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

@api_router.get("/")
async def root():
    return {"message": "AI Skin Analysis API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "ok"}

# Include the router in the main app
app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
