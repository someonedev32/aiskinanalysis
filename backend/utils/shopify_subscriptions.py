"""Shopify App Subscriptions API - GraphQL Implementation.
Handles subscription creation with usage-based pricing for Growth plan.

Plan Structure:
- Start ($39): 1,000 scans/month, no extras
- Plus ($99): 5,000 scans/month, no extras  
- Growth ($179): 10,000 scans/month + usage-based extra scans
"""
import httpx
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Plan configurations
PLANS = {
    "start": {
        "name": "Start",
        "price": 39.0,
        "scan_limit": 1000,
        "trial_days": 3,
        "allows_extra_scans": False,
        "features": ["1,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching"]
    },
    "plus": {
        "name": "Plus", 
        "price": 99.0,
        "scan_limit": 5000,
        "trial_days": 3,
        "allows_extra_scans": False,
        "features": ["5,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching"]
    },
    "growth": {
        "name": "Growth",
        "price": 179.0,
        "scan_limit": 10000,
        "trial_days": 3,
        "allows_extra_scans": True,
        "usage_cap": 5000.0,  # Monthly cap for usage charges ($5000 max)
        "usage_terms": "Extra scans beyond 10,000 included",
        "features": ["10,000 analysis/month", "AI skin analysis", "Advanced recommendations", "AM/PM routines", "Scan history", "Usage analytics", "Product matching", "Buy extra scans anytime"]
    }
}

# Extra scan packages (usage charges for Growth plan only)
SCAN_PACKAGES = {
    "pack_10k": {
        "name": "10,000 Extra Scans",
        "scans": 10000,
        "price": 170.0,
        "price_per_scan": 0.017
    },
    "pack_50k": {
        "name": "50,000 Extra Scans",
        "scans": 50000,
        "price": 750.0,
        "price_per_scan": 0.015,
        "savings": "12%"
    },
    "pack_100k": {
        "name": "100,000 Extra Scans",
        "scans": 100000,
        "price": 1400.0,
        "price_per_scan": 0.014,
        "savings": "18%"
    },
    "pack_1m": {
        "name": "1,000,000 Extra Scans",
        "scans": 1000000,
        "price": 12000.0,
        "price_per_scan": 0.012,
        "savings": "29%"
    }
}


async def graphql_request(shop_domain: str, access_token: str, query: str, variables: dict = None) -> dict:
    """Execute a GraphQL request to Shopify Admin API."""
    url = f"https://{shop_domain}/admin/api/2024-10/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers, json=payload)
        
        logger.info(f"GraphQL response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"GraphQL error: {response.status_code} - {response.text}")
            raise Exception(f"GraphQL API error: {response.status_code}")
        
        result = response.json()
        
        if "errors" in result and result["errors"]:
            error_msg = result["errors"][0].get("message", "Unknown GraphQL error")
            logger.error(f"GraphQL errors: {result['errors']}")
            raise Exception(f"GraphQL error: {error_msg}")
        
        return result


async def create_subscription(shop_domain: str, access_token: str, plan_id: str, return_url: str) -> dict:
    """Create a subscription using appSubscriptionCreate.
    
    For Growth plan: includes usage pricing component for extra scans.
    For Start/Plus: only recurring pricing.
    """
    plan = PLANS.get(plan_id)
    if not plan:
        raise ValueError(f"Invalid plan: {plan_id}")
    
    is_test = os.environ.get("SHOPIFY_BILLING_TEST", "true").lower() == "true"
    
    logger.info(f"Creating subscription: shop={shop_domain}, plan={plan_id}, test={is_test}")
    
    # Build line items based on plan
    line_items = [
        {
            "plan": {
                "appRecurringPricingDetails": {
                    "price": {"amount": plan["price"], "currencyCode": "USD"},
                    "interval": "EVERY_30_DAYS"
                }
            }
        }
    ]
    
    # Add usage pricing ONLY for Growth plan
    if plan_id == "growth" and plan.get("allows_extra_scans"):
        line_items.append({
            "plan": {
                "appUsagePricingDetails": {
                    "terms": plan.get("usage_terms", "Extra scans beyond included quota"),
                    "cappedAmount": {"amount": plan.get("usage_cap", 5000.0), "currencyCode": "USD"}
                }
            }
        })
    
    mutation = """
    mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        trialDays: $trialDays
        test: $test
        lineItems: $lineItems
      ) {
        userErrors {
          field
          message
        }
        confirmationUrl
        appSubscription {
          id
          status
          lineItems {
            id
            plan {
              pricingDetails {
                __typename
              }
            }
          }
        }
      }
    }
    """
    
    variables = {
        "name": plan["name"],
        "returnUrl": return_url,
        "trialDays": plan.get("trial_days", 3),
        "test": is_test,
        "lineItems": line_items
    }
    
    result = await graphql_request(shop_domain, access_token, mutation, variables)
    
    data = result.get("data", {}).get("appSubscriptionCreate", {})
    
    user_errors = data.get("userErrors", [])
    if user_errors:
        error_msg = user_errors[0].get("message", "Unknown error")
        logger.error(f"Subscription creation errors: {user_errors}")
        raise Exception(f"Subscription error: {error_msg}")
    
    subscription = data.get("appSubscription", {})
    confirmation_url = data.get("confirmationUrl")
    
    if not confirmation_url:
        raise Exception("No confirmation URL returned")
    
    # Extract usage line item ID for Growth plan
    usage_line_item_id = None
    if plan_id == "growth":
        for item in subscription.get("lineItems", []):
            pricing_type = item.get("plan", {}).get("pricingDetails", {}).get("__typename", "")
            if pricing_type == "AppUsagePricing":
                usage_line_item_id = item.get("id")
                break
    
    logger.info(f"Subscription created: id={subscription.get('id')}, usage_line_item={usage_line_item_id}")
    
    return {
        "confirmation_url": confirmation_url,
        "subscription_id": subscription.get("id"),
        "status": subscription.get("status"),
        "usage_line_item_id": usage_line_item_id
    }


async def create_usage_record(shop_domain: str, access_token: str, subscription_line_item_id: str, amount: float, description: str) -> dict:
    """Create a usage record for extra scans (Growth plan only).
    
    This charges the merchant for extra scans purchased.
    """
    logger.info(f"Creating usage record: shop={shop_domain}, amount=${amount}, desc={description}")
    
    mutation = """
    mutation appUsageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
      appUsageRecordCreate(
        subscriptionLineItemId: $subscriptionLineItemId
        price: $price
        description: $description
      ) {
        userErrors {
          field
          message
        }
        appUsageRecord {
          id
          createdAt
        }
      }
    }
    """
    
    variables = {
        "subscriptionLineItemId": subscription_line_item_id,
        "price": {"amount": amount, "currencyCode": "USD"},
        "description": description
    }
    
    result = await graphql_request(shop_domain, access_token, mutation, variables)
    
    data = result.get("data", {}).get("appUsageRecordCreate", {})
    
    user_errors = data.get("userErrors", [])
    if user_errors:
        error_msg = user_errors[0].get("message", "Unknown error")
        logger.error(f"Usage record errors: {user_errors}")
        raise Exception(f"Usage record error: {error_msg}")
    
    record = data.get("appUsageRecord", {})
    
    logger.info(f"Usage record created: id={record.get('id')}")
    
    return {
        "record_id": record.get("id"),
        "created_at": record.get("createdAt")
    }


async def get_active_subscriptions(shop_domain: str, access_token: str) -> list:
    """Get all active subscriptions for the current app installation."""
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
            id
            plan {
              pricingDetails {
                __typename
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
                ... on AppUsagePricing {
                  terms
                  balanceUsed {
                    amount
                  }
                  cappedAmount {
                    amount
                  }
                }
              }
            }
          }
        }
      }
    }
    """
    
    result = await graphql_request(shop_domain, access_token, query)
    
    installation = result.get("data", {}).get("currentAppInstallation", {})
    subscriptions = installation.get("activeSubscriptions", [])
    
    return subscriptions


async def cancel_subscription(shop_domain: str, access_token: str, subscription_id: str) -> bool:
    """Cancel a subscription."""
    mutation = """
    mutation appSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        userErrors {
          field
          message
        }
        appSubscription {
          id
          status
        }
      }
    }
    """
    
    result = await graphql_request(shop_domain, access_token, mutation, {"id": subscription_id})
    
    data = result.get("data", {}).get("appSubscriptionCancel", {})
    user_errors = data.get("userErrors", [])
    
    if user_errors:
        logger.error(f"Cancel errors: {user_errors}")
        return False
    
    return True
