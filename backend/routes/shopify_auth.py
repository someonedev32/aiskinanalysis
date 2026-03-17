"""Shopify OAuth Authentication Routes."""
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import httpx
import logging
import jwt
import base64
from datetime import datetime, timezone
from urllib.parse import urlencode

logger = logging.getLogger(__name__)
auth_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

SHOPIFY_API_KEY = os.environ.get('SHOPIFY_API_KEY', '')
SHOPIFY_API_SECRET = os.environ.get('SHOPIFY_API_SECRET', '')
SHOPIFY_SCOPES = 'read_products,write_products,read_themes,write_themes'
APP_URL = os.environ.get('APP_URL', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')


@auth_router.get("/install")
async def install(request: Request):
    """
    Smart install endpoint - handles both new installs and existing shops.
    This should be set as the App URL in Shopify Partners Dashboard.
    """
    params = dict(request.query_params)
    shop = params.get('shop', '')
    host = params.get('host', '')
    
    logger.info(f"=== Install endpoint called ===")
    logger.info(f"Shop param: {shop}")
    logger.info(f"Host param: {host}")
    
    if not shop:
        raise HTTPException(status_code=400, detail="Missing shop parameter")
    
    # Clean shop domain
    if not shop.endswith('.myshopify.com'):
        shop = f"{shop}.myshopify.com"
    
    # Check if shop already has a valid access token
    existing_shop = await db.shops.find_one({'shop_domain': shop})
    
    if existing_shop and existing_shop.get('access_token'):
        # Shop is already installed, redirect to frontend app
        logger.info(f"Shop {shop} already installed, redirecting to frontend")
        
        if FRONTEND_URL:
            redirect_url = f"{FRONTEND_URL}?shop={shop}"
            if host:
                redirect_url += f"&host={host}"
            logger.info(f"Redirecting to frontend: {redirect_url}")
            return RedirectResponse(url=redirect_url)
        else:
            return {"message": "App already installed", "shop": shop}
    
    # Shop not installed or no token - start OAuth flow
    logger.info(f"Shop {shop} needs OAuth, starting authorization flow")
    
    redirect_uri = f"{APP_URL}/api/shopify/callback"
    
    # Build authorization URL - using shop as state (simpler, like add-to-cart)
    auth_params = {
        'client_id': SHOPIFY_API_KEY,
        'scope': SHOPIFY_SCOPES,
        'redirect_uri': redirect_uri,
        'state': shop,  # Use shop as state for simplicity
    }
    
    auth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(auth_params)}"
    logger.info(f"OAuth Redirect URI: {redirect_uri}")
    logger.info(f"OAuth Auth URL: {auth_url}")
    
    return RedirectResponse(url=auth_url)


@auth_router.get("/callback")
async def callback(request: Request):
    """Handle OAuth callback from Shopify."""
    params = dict(request.query_params)
    shop = params.get('shop', '')
    code = params.get('code', '')
    
    logger.info(f"=== OAuth Callback Started ===")
    logger.info(f"Shop: {shop}")
    logger.info(f"Code present: {bool(code)}")
    logger.info(f"Client ID present: {bool(SHOPIFY_API_KEY)}")
    logger.info(f"Client Secret present: {bool(SHOPIFY_API_SECRET)}")
    
    if not shop or not code:
        logger.error(f"Missing params - shop: {shop}, code: {bool(code)}")
        raise HTTPException(status_code=400, detail="Missing shop or code parameter")
    
    # Exchange code for access token
    token_url = f"https://{shop}/admin/oauth/access_token"
    token_data = {
        'client_id': SHOPIFY_API_KEY,
        'client_secret': SHOPIFY_API_SECRET,
        'code': code,
    }
    
    logger.info(f"Token exchange URL: {token_url}")
    
    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(token_url, json=token_data)
        
        logger.info(f"Token exchange response status: {response.status_code}")
        logger.info(f"Token exchange response body: {response.text[:500] if response.text else 'empty'}")
        
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        token_response = response.json()
        access_token = token_response.get('access_token', '')
        scope = token_response.get('scope', '')
        
        logger.info(f"Access token received: {bool(access_token)}, length: {len(access_token) if access_token else 0}")
        logger.info(f"Scope: {scope}")
    
    # Store shop data in MongoDB
    shop_data = {
        'shop_domain': shop,
        'access_token': access_token,
        'scope': scope,
        'installed_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat(),
        'is_active': True,
        'plan': None,
        'scan_count': 0,
        'scan_limit': 0,
        'billing_status': 'none',
    }
    
    logger.info(f"Saving shop data to MongoDB for: {shop}")
    
    try:
        result = await db.shops.update_one(
            {'shop_domain': shop},
            {'$set': shop_data},
            upsert=True
        )
        logger.info(f"MongoDB update result - matched: {result.matched_count}, modified: {result.modified_count}")
    except Exception as e:
        logger.error(f"MongoDB error saving shop data: {e}")
        raise HTTPException(status_code=500, detail="Failed to save installation data")
    
    # Verify the token was saved correctly
    saved_shop = await db.shops.find_one({'shop_domain': shop})
    saved_token = saved_shop.get('access_token', '') if saved_shop else ''
    logger.info(f"Verification - Token saved correctly: {bool(saved_token)}")
    
    logger.info(f"=== Shop installed successfully: {shop} ===")
    
    # Redirect to app in Shopify admin
    shop_handle = shop.replace('.myshopify.com', '')
    redirect_url = f"https://admin.shopify.com/store/{shop_handle}/apps/ai-skinanalysis"
    
    return RedirectResponse(url=redirect_url)


@auth_router.get("/force-install")
async def force_install(shop: str):
    """Force OAuth installation - redirects to Shopify authorize page."""
    if not shop:
        raise HTTPException(status_code=400, detail="Missing shop parameter")
    
    # Clean shop domain
    if not shop.endswith('.myshopify.com'):
        shop = f"{shop}.myshopify.com"
    
    redirect_uri = f"{APP_URL}/api/shopify/callback"
    
    # Build authorization URL
    auth_params = {
        'client_id': SHOPIFY_API_KEY,
        'scope': SHOPIFY_SCOPES,
        'redirect_uri': redirect_uri,
        'state': shop,
    }
    
    auth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(auth_params)}"
    
    logger.info(f"=== Force Install OAuth ===")
    logger.info(f"Shop: {shop}")
    logger.info(f"Redirect URI: {redirect_uri}")
    
    return RedirectResponse(url=auth_url)


@auth_router.get("/debug")
async def debug_shop(shop: str):
    """Debug endpoint to check shop data."""
    if not shop.endswith('.myshopify.com'):
        shop = f"{shop}.myshopify.com"
    
    shop_data = await db.shops.find_one({'shop_domain': shop})
    
    if not shop_data:
        return {
            'found': False,
            'message': 'Shop not found in database',
            'shop_queried': shop,
        }
    
    access_token = shop_data.get('access_token', '')
    
    return {
        'found': True,
        'shop': shop_data.get('shop_domain'),
        'has_access_token': bool(access_token),
        'access_token_length': len(access_token) if access_token else 0,
        'scope': shop_data.get('scope'),
        'installed_at': str(shop_data.get('installed_at')),
        'plan': shop_data.get('plan'),
        'billing_status': shop_data.get('billing_status'),
    }


@auth_router.delete("/shop")
async def delete_shop(shop: str):
    """Delete shop data from database - use for re-installation."""
    if not shop.endswith('.myshopify.com'):
        shop = f"{shop}.myshopify.com"
    
    result = await db.shops.delete_one({'shop_domain': shop})
    
    if result.deleted_count > 0:
        logger.info(f"Shop {shop} deleted from database")
        return {'success': True, 'message': f'Shop {shop} deleted'}
    else:
        return {'success': False, 'message': 'Shop not found'}


@auth_router.post("/verify-session")
async def verify_session_token(request: Request, authorization: str = Header(None)):
    """Verify Shopify session token for App Bridge authentication."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    try:
        decoded = jwt.decode(
            token, 
            SHOPIFY_API_SECRET, 
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        
        iss = decoded.get("iss", "")
        shop_domain = iss.replace("https://", "").replace("/admin", "")
        
        shop = await db.shops.find_one({"shop_domain": shop_domain})
        if not shop:
            raise HTTPException(status_code=401, detail="Shop not found")
        
        return {
            "valid": True,
            "shop": shop_domain,
            "exp": decoded.get("exp"),
            "sub": decoded.get("sub")
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid session token: {e}")
        raise HTTPException(status_code=401, detail="Invalid session token")


@auth_router.get("/shop/{shop_domain}")
async def get_shop(shop_domain: str):
    """Get shop details."""
    shop = await db.shops.find_one({"shop_domain": shop_domain}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.pop("access_token", None)
    return shop
