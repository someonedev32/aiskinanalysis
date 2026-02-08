"""Shopify API Client helper."""
import os
import httpx
import logging

logger = logging.getLogger(__name__)


def get_shopify_api_key():
    return os.environ.get('SHOPIFY_API_KEY', '')


def get_shopify_api_secret():
    return os.environ.get('SHOPIFY_API_SECRET', '')


def get_app_url():
    return os.environ.get('APP_URL', '')


async def shopify_api_request(shop_domain: str, access_token: str, endpoint: str, method: str = "GET", data: dict = None):
    """Make an authenticated request to the Shopify Admin API."""
    url = f"https://{shop_domain}/admin/api/2024-10/{endpoint}"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(url, headers=headers)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = await client.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Log response for debugging
            logger.info(f"Shopify API {method} {endpoint}: {response.status_code}")
            
            if response.status_code >= 400:
                logger.error(f"Shopify API error: {response.status_code} - {response.text}")
                raise httpx.HTTPStatusError(
                    f"Client error '{response.status_code}' for url '{url}'",
                    request=response.request,
                    response=response
                )
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error for {url}: {e}")
            raise


async def create_recurring_charge(shop_domain: str, access_token: str, plan_name: str, price: float, trial_days: int = 3, return_url: str = ""):
    """Create a recurring application charge (subscription)."""
    import os
    # For dev/test stores, always use test: true
    # In production, set SHOPIFY_BILLING_TEST=false
    is_test = os.environ.get("SHOPIFY_BILLING_TEST", "true").lower() == "true"
    
    logger.info(f"Creating recurring charge for {shop_domain}: plan={plan_name}, price={price}, test={is_test}")
    
    data = {
        "recurring_application_charge": {
            "name": plan_name,
            "price": price,
            "trial_days": trial_days,
            "return_url": return_url,
            "test": is_test
        }
    }
    return await shopify_api_request(
        shop_domain, access_token,
        "recurring_application_charges.json",
        method="POST", data=data
    )


async def get_recurring_charge(shop_domain: str, access_token: str, charge_id: str):
    """Get a specific recurring charge."""
    return await shopify_api_request(
        shop_domain, access_token,
        f"recurring_application_charges/{charge_id}.json"
    )


async def activate_recurring_charge(shop_domain: str, access_token: str, charge_id: str):
    """Activate a recurring charge after merchant approval."""
    return await shopify_api_request(
        shop_domain, access_token,
        f"recurring_application_charges/{charge_id}/activate.json",
        method="POST", data={}
    )
