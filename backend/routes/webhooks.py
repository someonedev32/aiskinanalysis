"""Webhook Routes with HMAC Verification.
Handles GDPR mandatory webhooks + billing/lifecycle webhooks.
"""
from fastapi import APIRouter, Request, HTTPException, Response
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from datetime import datetime, timezone
from utils.hmac_verify import verify_webhook_hmac

logger = logging.getLogger(__name__)
webhook_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


async def verify_webhook(request: Request) -> dict:
    """Verify webhook HMAC and return parsed body."""
    body = await request.body()
    hmac_header = request.headers.get("X-Shopify-Hmac-SHA256", "")

    if not verify_webhook_hmac(body, hmac_header):
        logger.warning("Webhook HMAC verification failed")
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    # Log the webhook
    try:
        parsed_body = json.loads(body)
    except json.JSONDecodeError:
        parsed_body = {}

    topic = request.headers.get("X-Shopify-Topic", "unknown")
    shop = request.headers.get("X-Shopify-Shop-Domain", "unknown")

    await db.webhook_logs.insert_one({
        "topic": topic,
        "shop_domain": shop,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "received",
        "payload_summary": str(parsed_body)[:500]
    })

    return parsed_body


# === UNIFIED WEBHOOK ENDPOINT (Shopify sends all compliance webhooks here) ===

@webhook_router.post("")
async def unified_webhook_handler(request: Request):
    """
    Unified webhook handler - Shopify sends all webhooks to /api/webhooks
    and uses X-Shopify-Topic header to identify the webhook type.
    MUST return 401 for invalid HMAC signatures.
    """
    # Get raw body for HMAC verification
    body = await request.body()
    hmac_header = request.headers.get("X-Shopify-Hmac-SHA256", "")
    topic = request.headers.get("X-Shopify-Topic", "")
    shop_domain = request.headers.get("X-Shopify-Shop-Domain", "unknown")
    
    logger.info(f"Received webhook: topic={topic}, shop={shop_domain}")
    
    # CRITICAL: Verify HMAC signature - return 401 if invalid
    if not verify_webhook_hmac(body, hmac_header):
        logger.warning(f"HMAC verification FAILED for topic={topic}, shop={shop_domain}")
        raise HTTPException(status_code=401, detail="Unauthorized - Invalid HMAC signature")
    
    logger.info(f"HMAC verification PASSED for topic={topic}")
    
    # Parse body
    try:
        parsed_body = json.loads(body) if body else {}
    except json.JSONDecodeError:
        parsed_body = {}
    
    # Log the webhook
    await db.webhook_logs.insert_one({
        "topic": topic,
        "shop_domain": shop_domain,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "received",
        "payload_summary": str(parsed_body)[:500]
    })
    
    # Route based on topic
    if topic == "customers/data_request":
        customer_id = parsed_body.get("customer", {}).get("id", "")
        logger.info(f"Processing customers/data_request for shop={shop_domain}, customer={customer_id}")
        # We don't store customer PII - skin analysis is anonymous
        return {"status": "ok", "message": "No customer PII stored"}
    
    elif topic == "customers/redact":
        customer_id = parsed_body.get("customer", {}).get("id", "")
        logger.info(f"Processing customers/redact for shop={shop_domain}, customer={customer_id}")
        # Delete any stored customer data (we don't store PII by design)
        await db.webhook_logs.update_one(
            {"topic": "customers/redact", "shop_domain": shop_domain},
            {"$set": {"status": "processed"}}
        )
        return {"status": "ok"}
    
    elif topic == "shop/redact":
        logger.info(f"Processing shop/redact for shop={shop_domain}")
        # Delete all shop data
        await db.shops.delete_one({"shop_domain": shop_domain})
        await db.scans.delete_many({"shop_domain": shop_domain})
        await db.subscriptions.delete_many({"shop_domain": shop_domain})
        return {"status": "ok"}
    
    elif topic == "app/uninstalled":
        logger.info(f"Processing app/uninstalled for shop={shop_domain}")
        await db.shops.update_one(
            {"shop_domain": shop_domain},
            {"$set": {"is_active": False, "uninstalled_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"status": "ok"}
    
    else:
        logger.info(f"Received unhandled webhook topic: {topic}")
        return {"status": "ok", "message": f"Webhook received: {topic}"}


# === GDPR Mandatory Webhooks (Individual endpoints for backwards compatibility) ===

@webhook_router.post("/customers/redact")
async def customers_redact(request: Request):
    """GDPR: Customer data erasure request."""
    body = await verify_webhook(request)

    shop_domain = body.get("shop_domain", "")
    customer_id = body.get("customer", {}).get("id", "")

    logger.info(f"Customer redact request for shop={shop_domain}, customer={customer_id}")

    # Delete any stored customer data (scans don't store customer PII by design)
    await db.webhook_logs.update_one(
        {"topic": "customers/redact", "shop_domain": shop_domain},
        {"$set": {"status": "processed"}},
    )

    return {"status": "ok"}


@webhook_router.post("/shop/redact")
async def shop_redact(request: Request):
    """GDPR: Shop data erasure request (48h after uninstall)."""
    body = await verify_webhook(request)

    shop_domain = body.get("shop_domain", "")
    logger.info(f"Shop redact request for {shop_domain}")

    # Delete all shop data
    await db.shops.delete_one({"shop_domain": shop_domain})
    await db.scans.delete_many({"shop_domain": shop_domain})
    await db.subscriptions.delete_many({"shop_domain": shop_domain})

    return {"status": "ok"}


@webhook_router.post("/customers/data_request")
async def customers_data_request(request: Request):
    """GDPR: Customer data request."""
    body = await verify_webhook(request)

    shop_domain = body.get("shop_domain", "")
    customer_id = body.get("customer", {}).get("id", "")

    logger.info(f"Customer data request for shop={shop_domain}, customer={customer_id}")

    # We don't store customer PII - skin analysis is anonymous
    return {
        "status": "ok",
        "message": "No customer PII stored. Skin analysis is performed anonymously without data retention."
    }


# === App Lifecycle Webhooks ===

@webhook_router.post("/app/uninstalled")
async def app_uninstalled(request: Request):
    """Handle app uninstallation."""
    body = await verify_webhook(request)

    shop_domain = body.get("domain", body.get("myshopify_domain", ""))
    logger.info(f"App uninstalled by {shop_domain}")

    # Mark shop as inactive
    await db.shops.update_one(
        {"shop_domain": shop_domain},
        {"$set": {"is_active": False, "uninstalled_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"status": "ok"}


@webhook_router.post("/subscription/update")
async def subscription_update(request: Request):
    """Handle subscription billing update events."""
    body = await verify_webhook(request)

    shop_domain = body.get("shop_domain", "")
    charge_id = body.get("app_subscription", {}).get("admin_graphql_api_id", "")
    status = body.get("app_subscription", {}).get("status", "")

    logger.info(f"Subscription update for {shop_domain}: status={status}")

    if status == "ACTIVE":
        await db.shops.update_one(
            {"shop_domain": shop_domain},
            {"$set": {"billing_status": "active"}}
        )
    elif status in ("CANCELLED", "EXPIRED", "DECLINED"):
        await db.shops.update_one(
            {"shop_domain": shop_domain},
            {"$set": {"billing_status": status.lower(), "plan": None, "scan_limit": 0}}
        )

    return {"status": "ok"}


# === Dashboard API for Webhook Logs ===

@webhook_router.get("/logs")
async def get_webhook_logs(shop_domain: str = "", limit: int = 50):
    """Get webhook logs for the dashboard."""
    query = {}
    if shop_domain:
        query["shop_domain"] = shop_domain

    logs = await db.webhook_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"logs": logs, "total": len(logs)}
