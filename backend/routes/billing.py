"""Billing Routes - Shopify App Subscriptions with Usage Billing.

Plan Structure:
- Start ($39/mo): 1,000 scans, no extras
- Plus ($99/mo): 5,000 scans, no extras
- Growth ($179/mo): 10,000 scans + usage-based extra scans

Uses GraphQL App Subscriptions API (appSubscriptionCreate).
Extra scans use appUsageRecordCreate for Growth plan only.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import os
import logging
from datetime import datetime, timezone
from utils.shopify_subscriptions import (
    PLANS, SCAN_PACKAGES,
    create_subscription,
    create_usage_record,
    get_active_subscriptions,
    cancel_subscription
)

logger = logging.getLogger(__name__)
billing_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


class SubscribeRequest(BaseModel):
    shop_domain: str
    plan_id: str


class BuyScansRequest(BaseModel):
    shop_domain: str
    package_id: str


# ============ PLAN ENDPOINTS ============

@billing_router.get("/plans")
async def get_plans():
    """Get available billing plans."""
    return {"plans": PLANS}


@billing_router.get("/scan-packages")
async def get_scan_packages(shop_domain: str = ""):
    """Get available extra scan packages. Only for Growth plan."""
    if shop_domain:
        shop = await db.shops.find_one({"shop_domain": shop_domain})
        if shop:
            plan = shop.get("plan", "")
            if plan != "growth":
                return {
                    "packages": {},
                    "eligible": False,
                    "message": "Extra scan packages are only available for Growth plan."
                }
            
            scan_count = shop.get("scan_count", 0)
            scan_limit = shop.get("scan_limit", 0)
            extra_scans = shop.get("extra_scans_balance", 0)
            usage_percent = (scan_count / scan_limit * 100) if scan_limit > 0 else 0
            
            return {
                "packages": SCAN_PACKAGES,
                "eligible": True,
                "current_usage": scan_count,
                "current_limit": scan_limit,
                "extra_scans_balance": extra_scans,
                "usage_percent": round(usage_percent, 1)
            }
    
    return {"packages": SCAN_PACKAGES, "eligible": True}


# ============ SUBSCRIPTION ENDPOINTS ============

@billing_router.post("/subscribe")
async def subscribe(req: SubscribeRequest):
    """Create a new subscription.
    
    Uses appSubscriptionCreate with:
    - Recurring pricing for all plans
    - Usage pricing component ONLY for Growth plan
    """
    plan = PLANS.get(req.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")

    shop = await db.shops.find_one({"shop_domain": req.shop_domain})
    if not shop:
        # Shop not in database - this means OAuth flow wasn't completed
        # Return specific error message to help user reinstall
        raise HTTPException(
            status_code=400, 
            detail="App not installed properly. Please go to your Shopify Admin > Apps, uninstall AI SkinAnalysis, and reinstall it."
        )

    access_token = shop.get("access_token", "")
    if not access_token:
        raise HTTPException(
            status_code=400, 
            detail="App authorization incomplete. Please reinstall the app from Shopify Admin > Apps."
        )

    app_url = os.environ.get('APP_URL', '')
    return_url = f"{app_url}/api/billing/confirm?shop={req.shop_domain}&plan={req.plan_id}"

    try:
        result = await create_subscription(
            req.shop_domain,
            access_token,
            req.plan_id,
            return_url
        )

        # Store pending subscription with usage line item ID
        await db.subscriptions.insert_one({
            "shop_domain": req.shop_domain,
            "plan_id": req.plan_id,
            "subscription_id": result.get("subscription_id", ""),
            "usage_line_item_id": result.get("usage_line_item_id"),  # For Growth plan
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        logger.info(f"Subscription created for {req.shop_domain}: plan={req.plan_id}")
        return {
            "confirmation_url": result["confirmation_url"],
            "subscription_id": result.get("subscription_id")
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Subscription error for {req.shop_domain}: {error_msg}")
        
        if "403" in error_msg or "Forbidden" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="Billing not available. Please ensure the app is properly configured in Shopify Partner Dashboard."
            )
        elif "401" in error_msg or "Unauthorized" in error_msg:
            raise HTTPException(status_code=401, detail="Session expired. Please reinstall the app.")
        else:
            raise HTTPException(status_code=500, detail=f"Billing error: {error_msg}")


@billing_router.get("/confirm")
async def confirm_subscription(shop: str, plan: str):
    """Confirm subscription after merchant approval."""
    shop_data = await db.shops.find_one({"shop_domain": shop})
    if not shop_data:
        raise HTTPException(status_code=404, detail="Shop not found")

    plan_data = PLANS.get(plan)
    if not plan_data:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Find the pending subscription to get usage_line_item_id
    pending_sub = await db.subscriptions.find_one({
        "shop_domain": shop,
        "plan_id": plan,
        "status": "pending"
    })
    
    usage_line_item_id = pending_sub.get("usage_line_item_id") if pending_sub else None

    # Update shop with plan info
    await db.shops.update_one(
        {"shop_domain": shop},
        {
            "$set": {
                "plan": plan,
                "scan_limit": plan_data["scan_limit"],
                "scan_count": 0,  # Reset on new subscription
                "extra_scans_balance": 0,  # Extra scans don't reset
                "billing_status": "active",
                "usage_line_item_id": usage_line_item_id,  # Store for usage charges
                "billing_updated_at": datetime.now(timezone.utc).isoformat(),
                "billing_period_start": datetime.now(timezone.utc).isoformat()
            }
        }
    )

    # Update subscription record
    await db.subscriptions.update_one(
        {"shop_domain": shop, "plan_id": plan, "status": "pending"},
        {"$set": {
            "status": "active",
            "activated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    logger.info(f"Subscription confirmed: {shop} -> {plan}")

    # Redirect back to app
    redirect_url = f"https://{shop}/admin/apps/ai-skinanalysis?shop={shop}&activated=true"
    return RedirectResponse(url=redirect_url)


@billing_router.get("/status/{shop_domain}")
async def get_billing_status(shop_domain: str):
    """Get current billing status for a shop."""
    shop = await db.shops.find_one({"shop_domain": shop_domain}, {"_id": 0, "access_token": 0})
    if not shop:
        # Return a default status for shops not yet in database
        # This happens when app is accessed but OAuth hasn't completed
        return {
            "shop_domain": shop_domain,
            "plan": None,
            "plan_info": {},
            "scan_count": 0,
            "scan_limit": 0,
            "extra_scans_balance": 0,
            "total_available": 0,
            "billing_status": "not_installed",
            "allows_extra_scans": False,
            "billing_period_start": None,
            "needs_reinstall": True,
            "message": "Shop not found. Please reinstall the app to complete setup."
        }

    plan_id = shop.get("plan")
    plan_info = PLANS.get(plan_id, {}) if plan_id else {}

    # Calculate total available scans (included + extra)
    scan_limit = shop.get("scan_limit", 0)
    extra_scans = shop.get("extra_scans_balance", 0)
    total_available = scan_limit + extra_scans
    scan_count = shop.get("scan_count", 0)

    return {
        "shop_domain": shop_domain,
        "plan": plan_id,
        "plan_info": plan_info,
        "scan_count": scan_count,
        "scan_limit": scan_limit,
        "extra_scans_balance": extra_scans,
        "total_available": total_available,
        "billing_status": shop.get("billing_status", "none"),
        "allows_extra_scans": plan_info.get("allows_extra_scans", False),
        "billing_period_start": shop.get("billing_period_start")
    }


@billing_router.get("/sync/{shop_domain}")
async def sync_subscription(shop_domain: str):
    """Sync subscription status from Shopify."""
    shop = await db.shops.find_one({"shop_domain": shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    access_token = shop.get("access_token", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="Shop not authenticated")

    try:
        subscriptions = await get_active_subscriptions(shop_domain, access_token)
        
        if subscriptions:
            active_sub = subscriptions[0]
            sub_name = active_sub.get("name", "").lower()
            
            # Map subscription name to plan
            current_plan = None
            scan_limit = 0
            usage_line_item_id = None
            
            if "start" in sub_name:
                current_plan = "start"
                scan_limit = PLANS["start"]["scan_limit"]
            elif "plus" in sub_name:
                current_plan = "plus"
                scan_limit = PLANS["plus"]["scan_limit"]
            elif "growth" in sub_name:
                current_plan = "growth"
                scan_limit = PLANS["growth"]["scan_limit"]
                # Find usage line item
                for item in active_sub.get("lineItems", []):
                    pricing = item.get("plan", {}).get("pricingDetails", {})
                    if pricing.get("__typename") == "AppUsagePricing":
                        usage_line_item_id = item.get("id")
                        break
            
            await db.shops.update_one(
                {"shop_domain": shop_domain},
                {"$set": {
                    "plan": current_plan,
                    "scan_limit": scan_limit,
                    "billing_status": "active",
                    "usage_line_item_id": usage_line_item_id,
                    "subscription_id": active_sub.get("id"),
                    "subscription_synced_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "success": True,
                "plan": current_plan,
                "scan_limit": scan_limit,
                "subscription": active_sub
            }
        else:
            await db.shops.update_one(
                {"shop_domain": shop_domain},
                {"$set": {
                    "plan": None,
                    "scan_limit": 0,
                    "billing_status": "none",
                    "subscription_synced_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "success": True,
                "plan": None,
                "message": "No active subscription"
            }
            
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


@billing_router.post("/cancel")
async def cancel_sub(req: SubscribeRequest):
    """Cancel subscription."""
    shop = await db.shops.find_one({"shop_domain": req.shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    access_token = shop.get("access_token", "")
    subscription_id = shop.get("subscription_id")
    
    if subscription_id and access_token:
        try:
            await cancel_subscription(req.shop_domain, access_token, subscription_id)
        except Exception as e:
            logger.warning(f"Cancel API call failed: {e}")

    await db.shops.update_one(
        {"shop_domain": req.shop_domain},
        {"$set": {
            "plan": None,
            "scan_limit": 0,
            "billing_status": "cancelled",
            "billing_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    await db.subscriptions.update_one(
        {"shop_domain": req.shop_domain, "status": "active"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"success": True}


# ============ EXTRA SCANS (USAGE BILLING) ============

@billing_router.post("/buy-scans")
async def buy_extra_scans(req: BuyScansRequest):
    """Purchase extra scans for Growth plan.
    
    Uses appUsageRecordCreate to charge for extra scans.
    Only available for Growth plan subscribers.
    """
    package = SCAN_PACKAGES.get(req.package_id)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package")

    shop = await db.shops.find_one({"shop_domain": req.shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Verify Growth plan
    if shop.get("plan") != "growth":
        raise HTTPException(
            status_code=403,
            detail="Extra scan packages are only available for Growth plan subscribers."
        )

    access_token = shop.get("access_token", "")
    usage_line_item_id = shop.get("usage_line_item_id")
    
    if not access_token:
        raise HTTPException(status_code=400, detail="Shop not authenticated")
    
    if not usage_line_item_id:
        # Try to sync and get usage line item ID
        try:
            subscriptions = await get_active_subscriptions(req.shop_domain, access_token)
            if subscriptions:
                for item in subscriptions[0].get("lineItems", []):
                    pricing = item.get("plan", {}).get("pricingDetails", {})
                    if pricing.get("__typename") == "AppUsagePricing":
                        usage_line_item_id = item.get("id")
                        await db.shops.update_one(
                            {"shop_domain": req.shop_domain},
                            {"$set": {"usage_line_item_id": usage_line_item_id}}
                        )
                        break
        except Exception as e:
            logger.error(f"Failed to get usage line item: {e}")
        
        if not usage_line_item_id:
            raise HTTPException(
                status_code=400,
                detail="Usage billing not configured. Please re-subscribe to Growth plan."
            )

    try:
        # Create usage record (charges the merchant)
        result = await create_usage_record(
            req.shop_domain,
            access_token,
            usage_line_item_id,
            package["price"],
            f"Extra scans: {package['name']}"
        )

        # Add scans to merchant's extra balance
        current_extra = shop.get("extra_scans_balance", 0)
        new_extra_balance = current_extra + package["scans"]
        
        await db.shops.update_one(
            {"shop_domain": req.shop_domain},
            {
                "$set": {"extra_scans_balance": new_extra_balance},
                "$push": {
                    "scan_purchases": {
                        "package_id": req.package_id,
                        "scans": package["scans"],
                        "price": package["price"],
                        "usage_record_id": result.get("record_id"),
                        "purchased_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )

        logger.info(f"Extra scans purchased: {req.shop_domain} +{package['scans']} scans")

        return {
            "success": True,
            "scans_added": package["scans"],
            "new_extra_balance": new_extra_balance,
            "amount_charged": package["price"],
            "usage_record_id": result.get("record_id")
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Buy scans error: {error_msg}")
        
        if "cap" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Monthly usage cap reached. Please contact support."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Purchase error: {error_msg}")


# ============ SCAN USAGE TRACKING ============

@billing_router.post("/use-scan")
async def use_scan(shop_domain: str):
    """Record a scan usage. Called when a customer performs a skin analysis.
    
    Logic:
    1. First uses included monthly scans
    2. Then uses extra scans balance (if Growth plan)
    3. Blocks if no scans available
    """
    shop = await db.shops.find_one({"shop_domain": shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    plan = shop.get("plan")
    if not plan:
        raise HTTPException(status_code=403, detail="No active subscription")
    
    scan_count = shop.get("scan_count", 0)
    scan_limit = shop.get("scan_limit", 0)
    extra_scans = shop.get("extra_scans_balance", 0)
    
    # Check if scans available
    if scan_count < scan_limit:
        # Use included scan
        await db.shops.update_one(
            {"shop_domain": shop_domain},
            {"$inc": {"scan_count": 1}}
        )
        return {
            "success": True,
            "scan_type": "included",
            "scans_remaining": scan_limit - scan_count - 1,
            "extra_scans_balance": extra_scans
        }
    
    elif extra_scans > 0 and PLANS.get(plan, {}).get("allows_extra_scans"):
        # Use extra scan (Growth plan only)
        await db.shops.update_one(
            {"shop_domain": shop_domain},
            {
                "$inc": {"scan_count": 1, "extra_scans_balance": -1}
            }
        )
        return {
            "success": True,
            "scan_type": "extra",
            "scans_remaining": 0,
            "extra_scans_balance": extra_scans - 1
        }
    
    else:
        # No scans available
        raise HTTPException(
            status_code=403,
            detail="Scan limit reached. " + (
                "Purchase extra scans to continue." if plan == "growth" 
                else "Upgrade your plan for more scans."
            )
        )


@billing_router.post("/reset-monthly")
async def reset_monthly_scans(shop_domain: str):
    """Reset monthly scan count (called by webhook or cron).
    
    Note: Extra scans do NOT reset - they carry forward.
    """
    result = await db.shops.update_one(
        {"shop_domain": shop_domain},
        {
            "$set": {
                "scan_count": 0,
                "billing_period_start": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": result.modified_count > 0}


# ============ ADMIN ENDPOINTS ============

@billing_router.get("/shops")
async def list_shops():
    """Admin: List all shops with billing info."""
    shops = await db.shops.find(
        {},
        {"_id": 0, "access_token": 0}
    ).to_list(100)
    return {"shops": shops}


class AddCreditsRequest(BaseModel):
    shop_domain: str
    credits: int


@billing_router.post("/add-credits")
async def add_credits(req: AddCreditsRequest):
    """Admin: Manually add extra scans to a shop."""
    result = await db.shops.update_one(
        {"shop_domain": req.shop_domain},
        {
            "$inc": {"extra_scans_balance": req.credits},
            "$push": {
                "credit_history": {
                    "type": "admin_credit",
                    "credits": req.credits,
                    "added_at": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    return {"success": True, "credits_added": req.credits}
