"""Dashboard API Routes."""
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)
dashboard_router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


@dashboard_router.get("/overview")
async def get_dashboard_overview(shop_domain: str = ""):
    """Get dashboard overview metrics."""
    query = {}
    if shop_domain:
        query["shop_domain"] = shop_domain

    # Total shops
    total_shops = await db.shops.count_documents({})
    active_shops = await db.shops.count_documents({"is_active": True})

    # Total scans
    total_scans = await db.scans.count_documents(query)

    # Scans today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    scans_today = await db.scans.count_documents({
        **query,
        "timestamp": {"$gte": today_start}
    })

    # Recent scans (last 7 days aggregated by day)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_scans = await db.scans.find(
        {**query, "timestamp": {"$gte": seven_days_ago}},
        {"_id": 0, "timestamp": 1, "skin_type": 1, "score": 1}
    ).to_list(1000)

    # Aggregate by day
    daily_data = {}
    for scan in recent_scans:
        day = scan["timestamp"][:10]
        if day not in daily_data:
            daily_data[day] = {"date": day, "count": 0, "avg_score": 0, "total_score": 0}
        daily_data[day]["count"] += 1
        daily_data[day]["total_score"] += scan.get("score", 0)

    for day in daily_data.values():
        if day["count"] > 0:
            day["avg_score"] = round(day["total_score"] / day["count"], 1)
        del day["total_score"]

    chart_data = sorted(daily_data.values(), key=lambda x: x["date"])

    # Skin type distribution
    skin_types = {}
    all_scans = await db.scans.find(query, {"_id": 0, "skin_type": 1}).to_list(10000)
    for scan in all_scans:
        st = scan.get("skin_type", "Unknown")
        skin_types[st] = skin_types.get(st, 0) + 1

    skin_type_data = [{"name": k, "value": v} for k, v in skin_types.items()]

    # Shop billing info
    shop_data = None
    if shop_domain:
        shop_data = await db.shops.find_one(
            {"shop_domain": shop_domain},
            {"_id": 0, "access_token": 0}
        )

    return {
        "total_shops": total_shops,
        "active_shops": active_shops,
        "total_scans": total_scans,
        "scans_today": scans_today,
        "chart_data": chart_data,
        "skin_type_distribution": skin_type_data,
        "shop": shop_data
    }


@dashboard_router.get("/scans")
async def get_scan_history(shop_domain: str = "", limit: int = 50, offset: int = 0):
    """Get scan history."""
    query = {}
    if shop_domain:
        query["shop_domain"] = shop_domain

    scans = await db.scans.find(query, {"_id": 0}).sort("timestamp", -1).skip(offset).to_list(limit)
    total = await db.scans.count_documents(query)

    return {"scans": scans, "total": total, "limit": limit, "offset": offset}


@dashboard_router.get("/settings")
async def get_settings(shop_domain: str):
    """Get app settings for a shop."""
    settings = await db.settings.find_one({"shop_domain": shop_domain}, {"_id": 0})
    if not settings:
        settings = {
            "shop_domain": shop_domain,
            "camera_enabled": True,
            "auto_recommend": True,
            "collection_id": "",
            "custom_branding": False,
            "brand_color": "#4A6C58"
        }
    return settings


@dashboard_router.post("/settings")
async def update_settings(settings: dict):
    """Update app settings for a shop."""
    shop_domain = settings.get("shop_domain")
    if not shop_domain:
        return {"error": "shop_domain required"}

    await db.settings.update_one(
        {"shop_domain": shop_domain},
        {"$set": settings},
        upsert=True
    )
    return {"success": True}


@dashboard_router.get("/demo-data")
async def seed_demo_data():
    """Seed demo data for development/testing."""
    import random

    shop_domain = "demo-store.myshopify.com"

    # Create demo shop
    await db.shops.update_one(
        {"shop_domain": shop_domain},
        {
            "$set": {
                "shop_domain": shop_domain,
                "access_token": "demo-token",
                "installed_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                "plan": "professional",
                "scan_count": 147,
                "scan_limit": 250,
                "billing_status": "active"
            }
        },
        upsert=True
    )

    # Seed scan data for last 14 days
    skin_types = ["Normal", "Dry", "Oily", "Combination", "Sensitive"]
    concerns_list = ["Acne", "Dark spots", "Wrinkles", "Dehydration", "Redness", "Large pores", "Uneven tone"]

    for i in range(14):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        num_scans = random.randint(3, 20)
        for _ in range(num_scans):
            await db.scans.insert_one({
                "shop_domain": shop_domain,
                "timestamp": date.isoformat(),
                "skin_type": random.choice(skin_types),
                "score": random.randint(40, 95),
                "concerns": random.sample(concerns_list, random.randint(1, 3))
            })

    # Seed webhook logs
    topics = ["customers/redact", "app/uninstalled", "subscription/update"]
    for i in range(5):
        await db.webhook_logs.insert_one({
            "topic": random.choice(topics),
            "shop_domain": shop_domain,
            "timestamp": (datetime.now(timezone.utc) - timedelta(hours=i * 12)).isoformat(),
            "status": "processed",
            "payload_summary": "{...}"
        })

    return {"success": True, "message": "Demo data seeded", "shop": shop_domain}
