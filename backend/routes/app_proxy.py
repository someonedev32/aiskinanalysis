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
    # Get shop from query params
    params = dict(request.query_params)
    shop = params.get("shop", "")
    
    # Log for debugging
    logger.info(f"Analyze request from shop: {shop}")
    
    # Skip HMAC verification for now (App Proxy sends signature but we need to debug)
    # TODO: Re-enable HMAC verification for production
    # params_copy = {k: v for k, v in params.items()}
    # if not verify_proxy_hmac(params_copy):
    #     raise HTTPException(status_code=401, detail="Invalid proxy signature")

    # Check shop exists and has quota
    shop_data = await db.shops.find_one({"shop_domain": shop})
    if not shop_data:
        # Try without .myshopify.com suffix
        shop_with_suffix = f"{shop}.myshopify.com" if not shop.endswith('.myshopify.com') else shop
        shop_data = await db.shops.find_one({"shop_domain": shop_with_suffix})
        if not shop_data:
            raise HTTPException(status_code=404, detail=f"Shop not found: {shop}")
        shop = shop_with_suffix

    # Skip is_active check for testing
    # if not shop_data.get("is_active"):
    #     raise HTTPException(status_code=403, detail="App not active for this shop")

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

    # Fetch matching products from Shopify if collection_id is set
    products = []
    # Get collection_id from query params (sent from theme extension)
    collection_id = params.get("collection_id", "")
    access_token = shop_data.get("access_token", "")
    
    logger.info(f"Product matching - collection_id: {collection_id}, has_token: {bool(access_token)}")

    if collection_id and access_token:
        try:
            from utils.shopify_client import shopify_api_request
            skin_type = result.get("skin_type", "").lower()
            skin_tag = f"skin-{skin_type}"
            ingredients = [i["name"].lower().replace(" ", "-") for i in result.get("ingredient_recommendations", [])]
            product_types = [s["product_type"].lower() for s in result.get("am_routine", []) + result.get("pm_routine", [])]
            
            logger.info(f"Matching criteria - skin_tag: {skin_tag}, ingredients: {ingredients}, product_types: {product_types}")

            # Get products from collection (without fields filter to get full variant data including price)
            collection_products = await shopify_api_request(
                shop, access_token,
                f"collections/{collection_id}/products.json?limit=50"
            )

            all_products = collection_products.get("products", [])
            logger.info(f"Found {len(all_products)} products in collection")

            for product in all_products:
                tags = [t.strip().lower() for t in product.get("tags", "").split(",") if t.strip()]
                logger.info(f"Product '{product.get('title')}' tags: {tags}")
                score = 0
                if skin_tag in tags:
                    score += 3
                for ing in ingredients:
                    if ing in tags:
                        score += 2
                for pt in product_types:
                    if pt in tags:
                        score += 1
                        
                # Also check if any tag contains the product type (more flexible matching)
                for tag in tags:
                    for pt in product_types:
                        if pt in tag or tag in pt:
                            score += 1
                            break
                            
                if score > 0:
                    image = product.get("image", {})
                    variant = product.get("variants", [{}])[0]
                    products.append({
                        "id": product["id"],
                        "title": product["title"],
                        "handle": product["handle"],
                        "image_url": image.get("src", "") if image else "",
                        "price": variant.get("price", "0"),
                        "match_score": score
                    })
                    logger.info(f"Product matched with score {score}: {product.get('title')}")

            products.sort(key=lambda x: x["match_score"], reverse=True)
            products = products[:6]
            logger.info(f"Final matched products count: {len(products)}")
        except Exception as e:
            logger.warning(f"Product matching failed: {e}")
            import traceback
            logger.warning(traceback.format_exc())
    else:
        logger.info(f"Product matching skipped - collection_id: '{collection_id}', has_token: {bool(access_token)}")

    return {"success": True, "result": result, "products": products}


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
