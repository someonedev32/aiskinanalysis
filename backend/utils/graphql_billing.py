"""Shopify GraphQL Billing API.
Uses the modern GraphQL API for creating subscriptions and charges.
More reliable than REST legacy API.
"""
import httpx
import logging
import os

logger = logging.getLogger(__name__)


async def create_subscription_graphql(shop_domain: str, access_token: str, plan_name: str, price: float, trial_days: int, return_url: str) -> dict:
    """Create a recurring subscription using Shopify GraphQL Billing API.
    
    This is the recommended approach over REST API recurring_application_charges.
    """
    is_test = os.environ.get("SHOPIFY_BILLING_TEST", "true").lower() == "true"
    
    logger.info(f"Creating GraphQL subscription for {shop_domain}: plan={plan_name}, price={price}, test={is_test}")
    
    # GraphQL mutation for creating app subscription
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
        }
      }
    }
    """
    
    variables = {
        "name": plan_name,
        "returnUrl": return_url,
        "trialDays": trial_days,
        "test": is_test,
        "lineItems": [
            {
                "plan": {
                    "appRecurringPricingDetails": {
                        "price": {
                            "amount": price,
                            "currencyCode": "USD"
                        },
                        "interval": "EVERY_30_DAYS"
                    }
                }
            }
        ]
    }
    
    url = f"https://{shop_domain}/admin/api/2024-10/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json={"query": mutation, "variables": variables},
            timeout=30
        )
        
        logger.info(f"GraphQL response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"GraphQL API error: {response.status_code} - {response.text}")
            raise Exception(f"GraphQL API error: {response.status_code}")
        
        result = response.json()
        logger.info(f"GraphQL result: {result}")
        
        # Check for errors
        if "errors" in result:
            error_msg = result["errors"][0].get("message", "Unknown GraphQL error")
            logger.error(f"GraphQL errors: {result['errors']}")
            raise Exception(f"GraphQL error: {error_msg}")
        
        data = result.get("data", {}).get("appSubscriptionCreate", {})
        
        # Check for user errors
        user_errors = data.get("userErrors", [])
        if user_errors:
            error_msg = user_errors[0].get("message", "Unknown error")
            logger.error(f"User errors: {user_errors}")
            raise Exception(f"Billing error: {error_msg}")
        
        confirmation_url = data.get("confirmationUrl")
        subscription = data.get("appSubscription", {})
        
        if not confirmation_url:
            raise Exception("No confirmation URL returned from Shopify")
        
        return {
            "confirmation_url": confirmation_url,
            "subscription_id": subscription.get("id"),
            "status": subscription.get("status")
        }


async def create_one_time_charge_graphql(shop_domain: str, access_token: str, name: str, price: float, return_url: str) -> dict:
    """Create a one-time charge using Shopify GraphQL Billing API."""
    is_test = os.environ.get("SHOPIFY_BILLING_TEST", "true").lower() == "true"
    
    logger.info(f"Creating GraphQL one-time charge for {shop_domain}: {name}, price={price}, test={is_test}")
    
    mutation = """
    mutation appPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean) {
      appPurchaseOneTimeCreate(
        name: $name
        price: $price
        returnUrl: $returnUrl
        test: $test
      ) {
        userErrors {
          field
          message
        }
        confirmationUrl
        appPurchaseOneTime {
          id
          status
        }
      }
    }
    """
    
    variables = {
        "name": name,
        "price": {
            "amount": price,
            "currencyCode": "USD"
        },
        "returnUrl": return_url,
        "test": is_test
    }
    
    url = f"https://{shop_domain}/admin/api/2024-10/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json={"query": mutation, "variables": variables},
            timeout=30
        )
        
        logger.info(f"GraphQL response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"GraphQL API error: {response.status_code} - {response.text}")
            raise Exception(f"GraphQL API error: {response.status_code}")
        
        result = response.json()
        logger.info(f"GraphQL result: {result}")
        
        if "errors" in result:
            error_msg = result["errors"][0].get("message", "Unknown GraphQL error")
            logger.error(f"GraphQL errors: {result['errors']}")
            raise Exception(f"GraphQL error: {error_msg}")
        
        data = result.get("data", {}).get("appPurchaseOneTimeCreate", {})
        
        user_errors = data.get("userErrors", [])
        if user_errors:
            error_msg = user_errors[0].get("message", "Unknown error")
            logger.error(f"User errors: {user_errors}")
            raise Exception(f"Billing error: {error_msg}")
        
        confirmation_url = data.get("confirmationUrl")
        purchase = data.get("appPurchaseOneTime", {})
        
        if not confirmation_url:
            raise Exception("No confirmation URL returned from Shopify")
        
        return {
            "confirmation_url": confirmation_url,
            "purchase_id": purchase.get("id"),
            "status": purchase.get("status")
        }


async def get_active_subscriptions(shop_domain: str, access_token: str) -> list:
    """Get active subscriptions for a shop using GraphQL."""
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
            logger.error(f"GraphQL API error: {response.status_code} - {response.text}")
            return []
        
        result = response.json()
        
        if "errors" in result:
            logger.error(f"GraphQL errors: {result['errors']}")
            return []
        
        installation = result.get("data", {}).get("currentAppInstallation", {})
        subscriptions = installation.get("activeSubscriptions", [])
        
        return subscriptions


async def cancel_subscription_graphql(shop_domain: str, access_token: str, subscription_id: str) -> bool:
    """Cancel a subscription using GraphQL."""
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
    
    url = f"https://{shop_domain}/admin/api/2024-10/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            json={"query": mutation, "variables": {"id": subscription_id}},
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"GraphQL API error: {response.status_code}")
            return False
        
        result = response.json()
        
        if "errors" in result:
            logger.error(f"GraphQL errors: {result['errors']}")
            return False
        
        data = result.get("data", {}).get("appSubscriptionCancel", {})
        user_errors = data.get("userErrors", [])
        
        if user_errors:
            logger.error(f"Cancel errors: {user_errors}")
            return False
        
        return True
