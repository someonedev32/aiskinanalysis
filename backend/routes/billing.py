"""Billing Routes - Read-only billing for Managed Pricing App.
Billing is managed by Shopify App Store - we only READ subscription status.
DO NOT attempt to create charges - Shopify handles that through the App Store.
"""
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import os
import logging
import httpx
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
billing_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Plan definitions - for display purposes only (actual billing managed by Shopify)
PLANS = {
    "start": {
        "name": "Start",
        "price": 39,
        "scan_limit": 1000,
        "features": ["1,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching"]
    },
    "plus": {
        "name": "Plus",
        "price": 99,
        "scan_limit": 5000,
        "features": ["5,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching"]
    },
    "growth": {
        "name": "Growth",
        "price": 179,
        "scan_limit": 10000,
        "features": ["10,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching", "Priority support"]
    }
}


@billing_router.get("/plans")
async def get_plans():
    """Get available billing plans (for display only - managed by Shopify)."""
    return {"plans": PLANS, "managed_pricing": True}


@billing_router.get("/status/{shop_domain}")
async def get_billing_status(shop_domain: str):
    """Get current billing status for a shop.
    Reads active subscription from Shopify GraphQL API.
    """
    shop = await db.shops.find_one({"shop_domain": shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    access_token = shop.get("access_token", "")
    
    # Try to read active subscription from Shopify
    active_subscription = None
    current_plan = None
    scan_limit = 0
    
    if access_token:
        try:
            active_subscription = await get_active_subscription_from_shopify(shop_domain, access_token)
            if active_subscription:
                # Map Shopify subscription to our plan
                sub_name = active_subscription.get("name", "").lower()
                if "start" in sub_name:
                    current_plan = "start"
                    scan_limit = PLANS["start"]["scan_limit"]
                elif "plus" in sub_name:
                    current_plan = "plus"
                    scan_limit = PLANS["plus"]["scan_limit"]
                elif "growth" in sub_name:
                    current_plan = "growth"
                    scan_limit = PLANS["growth"]["scan_limit"]
                    
                # Update our database with the subscription info
                await db.shops.update_one(
                    {"shop_domain": shop_domain},
                    {"$set": {
                        "plan": current_plan,
                        "scan_limit": scan_limit,
                        "billing_status": "active",
                        "subscription_synced_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        except Exception as e:
            logger.warning(f"Could not fetch subscription from Shopify: {e}")
            # Fall back to database values
            current_plan = shop.get("plan")
            scan_limit = shop.get("scan_limit", 0)
    else:
        current_plan = shop.get("plan")
        scan_limit = shop.get("scan_limit", 0)

    plan_info = PLANS.get(current_plan, {}) if current_plan else {}

    return {
        "shop_domain": shop_domain,
        "plan": current_plan,
        "plan_info": plan_info,
        "scan_count": shop.get("scan_count", 0),
        "scan_limit": scan_limit,
        "billing_status": "active" if current_plan else "none",
        "subscription": active_subscription,
        "managed_pricing": True,
        "message": "Billing is managed through Shopify App Store. To change plans, visit the app listing in the Shopify App Store."
    }


async def get_active_subscription_from_shopify(shop_domain: str, access_token: str) -> dict:
    """Read active subscription from Shopify using GraphQL.
    This only READS - does not create any charges.
    """
    query = """
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
          trialDays
          test
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
    """
    
    url = f"https://{shop_domain}/admin/api/2024-10/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json={"query": query},
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"GraphQL API error: {response.status_code}")
            return None
        
        result = response.json()
        
        if "errors" in result:
            logger.error(f"GraphQL errors: {result['errors']}")
            return None
        
        installation = result.get("data", {}).get("currentAppInstallation", {})
        subscriptions = installation.get("activeSubscriptions", [])
        
        if subscriptions:
            return subscriptions[0]  # Return the first active subscription
        
        return None


@billing_router.get("/sync/{shop_domain}")
async def sync_subscription(shop_domain: str):
    """Force sync subscription status from Shopify."""
    shop = await db.shops.find_one({"shop_domain": shop_domain})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    access_token = shop.get("access_token", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="Shop not authenticated")

    try:
        subscription = await get_active_subscription_from_shopify(shop_domain, access_token)
        
        if subscription:
            sub_name = subscription.get("name", "").lower()
            current_plan = None
            scan_limit = 0
            
            if "start" in sub_name:
                current_plan = "start"
                scan_limit = PLANS["start"]["scan_limit"]
            elif "plus" in sub_name:
                current_plan = "plus"
                scan_limit = PLANS["plus"]["scan_limit"]
            elif "growth" in sub_name:
                current_plan = "growth"
                scan_limit = PLANS["growth"]["scan_limit"]
            
            await db.shops.update_one(
                {"shop_domain": shop_domain},
                {"$set": {
                    "plan": current_plan,
                    "scan_limit": scan_limit,
                    "billing_status": "active",
                    "subscription_synced_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "success": True,
                "plan": current_plan,
                "scan_limit": scan_limit,
                "subscription": subscription
            }
        else:
            # No active subscription
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
                "message": "No active subscription found. Subscribe through the Shopify App Store."
            }
            
    except Exception as e:
        logger.error(f"Sync subscription error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


@billing_router.get("/shops")
async def list_shops():
    """Admin: List all shops with billing info."""
    shops = await db.shops.find(
        {},
        {"_id": 0, "access_token": 0}
    ).to_list(100)
    return {"shops": shops}
