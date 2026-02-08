"""Shopify OAuth Authentication Routes."""
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import httpx
import logging
import jwt
from datetime import datetime, timezone
from utils.hmac_verify import verify_oauth_hmac

logger = logging.getLogger(__name__)
auth_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


@auth_router.get("/install")
async def install(shop: str):
    """Initiate Shopify OAuth flow."""
    api_key = os.environ.get('SHOPIFY_API_KEY', '')
    app_url = os.environ.get('APP_URL', '')
    scopes = "read_products,write_products,read_themes,write_themes"
    nonce = str(uuid.uuid4())

    # Store nonce for verification
    await db.oauth_nonces.insert_one({
        "nonce": nonce,
        "shop": shop,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    redirect_uri = f"{app_url}/api/shopify/callback"
    install_url = (
        f"https://{shop}/admin/oauth/authorize"
        f"?client_id={api_key}"
        f"&scope={scopes}"
        f"&redirect_uri={redirect_uri}"
        f"&state={nonce}"
    )

    return RedirectResponse(url=install_url)


@auth_router.get("/callback")
async def callback(request: Request):
    """Handle Shopify OAuth callback."""
    params = dict(request.query_params)

    # Verify HMAC
    params_copy = {k: v for k, v in params.items()}
    if not verify_oauth_hmac(params_copy):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    shop = params.get("shop")
    code = params.get("code")
    state = params.get("state")

    # Verify nonce
    nonce_doc = await db.oauth_nonces.find_one({"nonce": state, "shop": shop})
    if not nonce_doc:
        raise HTTPException(status_code=401, detail="Invalid state parameter")

    # Exchange code for access token
    api_key = os.environ.get('SHOPIFY_API_KEY', '')
    api_secret = os.environ.get('SHOPIFY_API_SECRET', '')

    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(
            f"https://{shop}/admin/oauth/access_token",
            json={
                "client_id": api_key,
                "client_secret": api_secret,
                "code": code
            }
        )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get access token")

        data = response.json()
        access_token = data.get("access_token")

    # Store shop data
    await db.shops.update_one(
        {"shop_domain": shop},
        {
            "$set": {
                "shop_domain": shop,
                "access_token": access_token,
                "installed_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                "plan": None,
                "scan_count": 0,
                "scan_limit": 0
            }
        },
        upsert=True
    )

    # Cleanup nonce
    await db.oauth_nonces.delete_one({"nonce": state})

    # Create host parameter for App Bridge (base64 encoded)
    import base64
    host_value = f"admin.shopify.com/store/{shop.replace('.myshopify.com', '')}"
    host_encoded = base64.b64encode(host_value.encode()).decode()
    
    # Redirect to Shopify admin embedded app page with shop and host context
    return RedirectResponse(url=f"https://{shop}/admin/apps?shop={shop}&host={host_encoded}")


@auth_router.post("/verify-session")
async def verify_session_token(request: Request, authorization: str = Header(None)):
    """Verify Shopify session token for App Bridge authentication.
    This endpoint validates the session token sent by App Bridge.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    # Extract token from "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    api_secret = os.environ.get('SHOPIFY_API_SECRET', '')
    
    try:
        # Decode the session token (JWT)
        # Note: In production, verify against Shopify's public key
        decoded = jwt.decode(
            token, 
            api_secret, 
            algorithms=["HS256"],
            options={"verify_aud": False}  # Skip audience verification for now
        )
        
        # Extract shop domain from the token
        iss = decoded.get("iss", "")
        shop_domain = iss.replace("https://", "").replace("/admin", "")
        
        # Verify shop exists in our database
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
    # Exclude sensitive access_token from response
    shop.pop("access_token", None)
    return shop
