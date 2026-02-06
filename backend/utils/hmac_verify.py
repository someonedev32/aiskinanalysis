"""
Shopify HMAC Verification Utilities
Handles HMAC verification for:
1. Webhook requests (X-Shopify-Hmac-SHA256 header)
2. App Proxy requests (signature query parameter)
3. OAuth requests (hmac query parameter)
"""
import hashlib
import hmac
import os
import logging
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


def get_shopify_secret():
    secret = os.environ.get('SHOPIFY_API_SECRET', '')
    if not secret:
        logger.warning("SHOPIFY_API_SECRET not configured")
    return secret


def verify_webhook_hmac(body: bytes, hmac_header: str) -> bool:
    """Verify Shopify webhook HMAC signature."""
    secret = get_shopify_secret()
    if not secret:
        return False

    computed = hmac.new(
        secret.encode('utf-8'),
        body,
        hashlib.sha256
    ).digest()

    import base64
    computed_b64 = base64.b64encode(computed).decode('utf-8')

    return hmac.compare_digest(computed_b64, hmac_header)


def verify_proxy_hmac(query_params: dict) -> bool:
    """Verify Shopify App Proxy HMAC signature."""
    secret = get_shopify_secret()
    if not secret:
        return False

    signature = query_params.pop('signature', None)
    if not signature:
        return False

    # Sort params and build query string
    sorted_params = sorted(query_params.items())
    message = "&".join(f"{k}={v}" for k, v in sorted_params)

    computed = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed, signature)


def verify_oauth_hmac(query_params: dict) -> bool:
    """Verify Shopify OAuth callback HMAC."""
    secret = get_shopify_secret()
    if not secret:
        return False

    hmac_value = query_params.pop('hmac', None)
    if not hmac_value:
        return False

    sorted_params = sorted(query_params.items())
    message = "&".join(f"{k}={v}" for k, v in sorted_params)

    computed = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed, hmac_value)
