"""Billing Routes - Shopify Recurring Subscription Billing."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import os
import logging
import httpx
from datetime import datetime, timezone
from utils.shopify_client import create_recurring_charge, get_recurring_charge, activate_recurring_charge

logger = logging.getLogger(__name__)
billing_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Plan definitions - All plans have the same features, only scan limit differs
PLANS = {
    "start": {
        "name": "Start",
        "price": 39,
        "scan_limit": 1000,
        "trial_days": 3,
        "features": ["1,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching"]
    },
    "plus": {
        "name": "Plus",
        "price": 99,
        "scan_limit": 5000,
        "trial_days": 3,
        "features": ["5,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching"]
    },
    "growth": {
        "name": "Growth",
        "price": 179,
        "scan_limit": 10000,
        "trial_days": 3,
        "features": ["10,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching"]
    }
}

# Extra scan packages (one-time purchase) - Only for Growth plan merchants
SCAN_PACKAGES = {
    "pack_10k": {
        "name": "10,000 Extra Scans",
        "scans": 10000,
        "price": 170,
        "price_per_scan": 0.017
    },
    "pack_50k": {
        "name": "50,000 Extra Scans",
        "scans": 50000,
        "price": 750,
        "price_per_scan": 0.015,
        "savings": "12%"
    },
    "pack_100k": {
        "name": "100,000 Extra Scans",
        "scans": 100000,
        "price": 1400,
        "price_per_scan": 0.014,
        "savings": "18%"
    },
    "pack_1m": {
        "name": "1,000,000 Extra Scans",
        "scans": 1000000,
        "price": 12000,
        "price_per_scan": 0.012,
        "savings": "29%"
    }
}


class SubscribeRequest(BaseModel):
    shop_domain: str
    plan_id: str


class ActivateRequest(BaseModel):
    shop_domain: str
    charge_id: str


@billing_router.get("/plans")
async def get_plans():
    """Get available billing plans."""
    return {"plans": PLANS}


@billing_router.post("/subscribe")
async def subscribe(req: SubscribeRequest):
    """Create a subscription for a shop."""
    plan = PLANS.get(req.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")

    shop = await db.shops.find_one({"shop_domain": req.shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    access_token = shop.get("access_token", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="Shop not authenticated")

    app_url = os.environ.get('APP_URL', '')
    return_url = f"{app_url}/api/billing/confirm?shop={req.shop_domain}&plan={req.plan_id}"

    try:
        result = await create_recurring_charge(
            req.shop_domain,
            access_token,
            plan["name"],
            plan["price"],
            plan["trial_days"],
            return_url
        )

        charge = result.get("recurring_application_charge", {})
        confirmation_url = charge.get("confirmation_url", "")

        # Store pending subscription
        await db.subscriptions.insert_one({
            "shop_domain": req.shop_domain,
            "plan_id": req.plan_id,
            "charge_id": str(charge.get("id", "")),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"confirmation_url": confirmation_url, "charge_id": charge.get("id")}

    except Exception as e:
        logger.error(f"Failed to create subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Billing error: {str(e)}")


@billing_router.get("/confirm")
async def confirm_subscription(shop: str, plan: str, charge_id: str = ""):
    """Confirm subscription after merchant approval."""
    shop_data = await db.shops.find_one({"shop_domain": shop})
    if not shop_data:
        raise HTTPException(status_code=404, detail="Shop not found")

    access_token = shop_data.get("access_token", "")
    plan_data = PLANS.get(plan)
    if not plan_data:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if charge_id:
        try:
            # Verify charge status
            charge_result = await get_recurring_charge(shop, access_token, charge_id)
            charge = charge_result.get("recurring_application_charge", {})

            if charge.get("status") == "accepted":
                await activate_recurring_charge(shop, access_token, charge_id)
        except Exception as e:
            logger.error(f"Failed to activate charge: {e}")

    # Update shop with plan info
    await db.shops.update_one(
        {"shop_domain": shop},
        {
            "$set": {
                "plan": plan,
                "scan_limit": plan_data["scan_limit"],
                "scan_count": 0,
                "billing_status": "active",
                "billing_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )

    # Update subscription record
    await db.subscriptions.update_one(
        {"shop_domain": shop, "plan_id": plan, "status": "pending"},
        {"$set": {"status": "active", "activated_at": datetime.now(timezone.utc).isoformat()}}
    )

    app_url = os.environ.get('APP_URL', '')
    # Redirect to the frontend billing page
    frontend_url = os.environ.get('FRONTEND_URL', app_url)
    redirect_url = f"https://{shop}/admin/apps/ai-skinanalysis?shop={shop}&activated=true"
    return RedirectResponse(url=redirect_url)


@billing_router.get("/status/{shop_domain}")
async def get_billing_status(shop_domain: str):
    """Get current billing status for a shop."""
    shop = await db.shops.find_one({"shop_domain": shop_domain}, {"_id": 0, "access_token": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    subscription = await db.subscriptions.find_one(
        {"shop_domain": shop_domain, "status": "active"},
        {"_id": 0}
    )

    plan_info = PLANS.get(shop.get("plan", ""), {})

    return {
        "shop_domain": shop_domain,
        "plan": shop.get("plan"),
        "plan_info": plan_info,
        "scan_count": shop.get("scan_count", 0),
        "scan_limit": shop.get("scan_limit", 0),
        "billing_status": shop.get("billing_status", "none"),
        "subscription": subscription
    }


@billing_router.post("/cancel")
async def cancel_subscription(req: SubscribeRequest):
    """Cancel a shop's subscription."""
    await db.shops.update_one(
        {"shop_domain": req.shop_domain},
        {
            "$set": {
                "plan": None,
                "scan_limit": 0,
                "billing_status": "cancelled",
                "billing_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )

    await db.subscriptions.update_one(
        {"shop_domain": req.shop_domain, "status": "active"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"success": True, "message": "Subscription cancelled"}


class CreditRequest(BaseModel):
    shop_domain: str
    credits: int


@billing_router.post("/add-credits")
async def add_credits(req: CreditRequest):
    """Admin: Add scan credits to a shop."""
    shop = await db.shops.find_one({"shop_domain": req.shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    new_limit = shop.get("scan_limit", 0) + req.credits

    await db.shops.update_one(
        {"shop_domain": req.shop_domain},
        {
            "$set": {"scan_limit": new_limit},
            "$push": {
                "credit_history": {
                    "credits": req.credits,
                    "added_at": datetime.now(timezone.utc).isoformat(),
                    "new_limit": new_limit
                }
            }
        }
    )

    return {
        "success": True,
        "shop_domain": req.shop_domain,
        "credits_added": req.credits,
        "new_scan_limit": new_limit
    }


@billing_router.get("/scan-packages")
async def get_scan_packages(shop_domain: str = ""):
    """Get available extra scan packages. Only available for Growth plan merchants."""
    # If shop_domain provided, check if they qualify
    if shop_domain:
        shop = await db.shops.find_one({"shop_domain": shop_domain})
        if shop:
            plan = shop.get("plan", "")
            scan_count = shop.get("scan_count", 0)
            scan_limit = shop.get("scan_limit", 0)
            
            # Only show packages for Growth plan users who are near/over limit (80%+)
            if plan != "growth":
                return {
                    "packages": {},
                    "eligible": False,
                    "message": "Extra scan packages are only available for Growth plan subscribers. Please upgrade to Growth plan first."
                }
            
            usage_percent = (scan_count / scan_limit * 100) if scan_limit > 0 else 0
            
            return {
                "packages": SCAN_PACKAGES,
                "eligible": True,
                "current_usage": scan_count,
                "current_limit": scan_limit,
                "usage_percent": round(usage_percent, 1)
            }
    
    return {"packages": SCAN_PACKAGES, "eligible": True}


class BuyScansRequest(BaseModel):
    shop_domain: str
    package_id: str


@billing_router.post("/buy-scans")
async def buy_extra_scans(req: BuyScansRequest):
    """Purchase extra scans - creates a one-time charge in Shopify.
    Only available for Growth plan merchants.
    """
    package = SCAN_PACKAGES.get(req.package_id)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package")

    shop = await db.shops.find_one({"shop_domain": req.shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Check if shop is on Growth plan
    if shop.get("plan") != "growth":
        raise HTTPException(
            status_code=403, 
            detail="Extra scan packages are only available for Growth plan subscribers. Please upgrade to Growth plan first."
        )

    access_token = shop.get("access_token", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="Shop not authenticated")

    app_url = os.environ.get('APP_URL', '')
    return_url = f"{app_url}/api/billing/confirm-scans?shop={req.shop_domain}&package={req.package_id}"

    # Create one-time application charge
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f"https://{req.shop_domain}/admin/api/2024-01/application_charges.json",
                headers={
                    "X-Shopify-Access-Token": access_token,
                    "Content-Type": "application/json"
                },
                json={
                    "application_charge": {
                        "name": package["name"],
                        "price": package["price"],
                        "return_url": return_url,
                        "test": os.environ.get('SHOPIFY_BILLING_TEST', 'false').lower() == 'true'
                    }
                }
            )

            if response.status_code != 201:
                logger.error(f"Shopify charge error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create charge")

            charge_data = response.json()
            charge = charge_data.get("application_charge", {})

            # Store pending purchase
            await db.scan_purchases.insert_one({
                "shop_domain": req.shop_domain,
                "package_id": req.package_id,
                "charge_id": str(charge.get("id", "")),
                "scans": package["scans"],
                "price": package["price"],
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })

            return {
                "confirmation_url": charge.get("confirmation_url", ""),
                "charge_id": charge.get("id")
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create scan purchase: {e}")
        raise HTTPException(status_code=500, detail=f"Billing error: {str(e)}")


@billing_router.get("/confirm-scans")
async def confirm_scan_purchase(shop: str, package: str, charge_id: str = ""):
    """Confirm extra scans purchase after merchant approval."""
    shop_data = await db.shops.find_one({"shop_domain": shop})
    if not shop_data:
        raise HTTPException(status_code=404, detail="Shop not found")

    access_token = shop_data.get("access_token", "")
    package_data = SCAN_PACKAGES.get(package)
    if not package_data:
        raise HTTPException(status_code=400, detail="Invalid package")

    # Find the pending purchase
    purchase = await db.scan_purchases.find_one({
        "shop_domain": shop,
        "package_id": package,
        "status": "pending"
    })

    if purchase and charge_id:
        try:
            # Verify and activate the charge
            async with httpx.AsyncClient() as http_client:
                # Get charge status
                get_response = await http_client.get(
                    f"https://{shop}/admin/api/2024-01/application_charges/{charge_id}.json",
                    headers={"X-Shopify-Access-Token": access_token}
                )
                
                if get_response.status_code == 200:
                    charge = get_response.json().get("application_charge", {})
                    
                    if charge.get("status") == "accepted":
                        # Activate the charge
                        await http_client.post(
                            f"https://{shop}/admin/api/2024-01/application_charges/{charge_id}/activate.json",
                            headers={
                                "X-Shopify-Access-Token": access_token,
                                "Content-Type": "application/json"
                            }
                        )
                        
                        # Add scans to shop's limit
                        new_limit = shop_data.get("scan_limit", 0) + package_data["scans"]
                        await db.shops.update_one(
                            {"shop_domain": shop},
                            {
                                "$set": {"scan_limit": new_limit},
                                "$push": {
                                    "credit_history": {
                                        "type": "purchase",
                                        "package": package,
                                        "scans": package_data["scans"],
                                        "price": package_data["price"],
                                        "added_at": datetime.now(timezone.utc).isoformat(),
                                        "new_limit": new_limit
                                    }
                                }
                            }
                        )
                        
                        # Update purchase record
                        await db.scan_purchases.update_one(
                            {"_id": purchase["_id"]},
                            {
                                "$set": {
                                    "status": "completed",
                                    "completed_at": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
                        
                        logger.info(f"Added {package_data['scans']} scans to {shop}")

        except Exception as e:
            logger.error(f"Failed to activate scan purchase: {e}")

    # Redirect back to billing page
    redirect_url = f"https://{shop}/admin/apps/ai-skinanalysis?shop={shop}&scans_added=true"
    return RedirectResponse(url=redirect_url)


@billing_router.get("/shops")
async def list_shops():
    """Admin: List all shops with billing info."""
    shops = await db.shops.find(
        {},
        {"_id": 0, "access_token": 0}
    ).to_list(100)
    return {"shops": shops}
