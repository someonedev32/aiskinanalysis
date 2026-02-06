"""App Proxy Routes with HMAC Verification.
Handles storefront JS → backend requests through Shopify App Proxy.
"""
from fastapi import APIRouter, Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from datetime import datetime, timezone
from utils.hmac_verify import verify_proxy_hmac

logger = logging.getLogger(__name__)
proxy_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


async def verify_proxy_request(request: Request) -> dict:
    """Verify the App Proxy HMAC and return query params."""
    params = dict(request.query_params)
    params_copy = {k: v for k, v in params.items()}

    if not verify_proxy_hmac(params_copy):
        raise HTTPException(status_code=401, detail="Invalid proxy signature")

    return params


@proxy_router.get("/skin-analysis")
async def proxy_skin_analysis_page(request: Request):
    """Serve the skin analysis page configuration via App Proxy."""
    params = await verify_proxy_request(request)
    shop = params.get("shop", "")

    shop_data = await db.shops.find_one({"shop_domain": shop}, {"_id": 0, "access_token": 0})

    return {
        "shop": shop,
        "config": {
            "camera_enabled": True,
            "max_scan_size": "1920x1080",
            "supported_formats": ["image/jpeg", "image/png", "image/webp"]
        },
        "shop_active": shop_data.get("is_active", False) if shop_data else False,
        "plan": shop_data.get("plan") if shop_data else None
    }


@proxy_router.post("/analyze")
async def proxy_analyze_skin(request: Request):
    """Receive skin image from storefront and analyze it.
    Image sent as base64 in JSON body through App Proxy.
    """
    # Verify proxy signature from query params
    params = dict(request.query_params)
    params_copy = {k: v for k, v in params.items()}

    if not verify_proxy_hmac(params_copy):
        raise HTTPException(status_code=401, detail="Invalid proxy signature")

    shop = params.get("shop", "")

    # Check shop exists and has quota
    shop_data = await db.shops.find_one({"shop_domain": shop})
    if not shop_data:
        raise HTTPException(status_code=404, detail="Shop not found")

    if not shop_data.get("is_active"):
        raise HTTPException(status_code=403, detail="App not active for this shop")

    scan_count = shop_data.get("scan_count", 0)
    scan_limit = shop_data.get("scan_limit", 0)

    if scan_limit > 0 and scan_count >= scan_limit:
        raise HTTPException(status_code=429, detail="Scan quota exceeded")

    # Parse body
    body = await request.json()
    image_base64 = body.get("image")

    if not image_base64:
        raise HTTPException(status_code=400, detail="No image provided")

    # Import and run analysis
    from routes.skin_analysis import perform_skin_analysis
    result = await perform_skin_analysis(image_base64)

    # Increment scan count
    await db.shops.update_one(
        {"shop_domain": shop},
        {"$inc": {"scan_count": 1}}
    )

    # Log the scan
    await db.scans.insert_one({
        "shop_domain": shop,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "skin_type": result.get("skin_type", ""),
        "score": result.get("score", 0),
        "concerns": result.get("concerns", [])
    })

    return {"success": True, "result": result}


@proxy_router.get("/products")
async def proxy_get_products(request: Request):
    """Get recommended products from Shopify collections via App Proxy."""
    params = await verify_proxy_request(request)
    shop = params.get("shop", "")

    shop_data = await db.shops.find_one({"shop_domain": shop})
    if not shop_data:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Return mock product recommendations (real implementation would query Shopify API)
    return {
        "products": [],
        "message": "Configure product collections in app settings"
    }
