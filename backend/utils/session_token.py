"""
Session Token Verification Utility for Shopify Embedded Apps

This module provides utilities to verify and decode Shopify session tokens (JWTs).
Session token verification is REQUIRED for Shopify App Store approval.

The session token is signed using the app's client secret and contains:
- iss: The shop's admin domain
- dest: The shop's domain
- aud: The app's client ID
- sub: The user ID
- exp: Expiration time
- nbf: Not before time
- iat: Issued at time
- jti: JWT ID
- sid: Session ID
"""
import os
import jwt
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

# Your Shopify App credentials
SHOPIFY_CLIENT_ID = os.environ.get('SHOPIFY_CLIENT_ID', '92a7db21219834a47df3e9caa9318972')
SHOPIFY_CLIENT_SECRET = os.environ.get('SHOPIFY_CLIENT_SECRET', '')


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode a Shopify session token.
    
    Args:
        token: The JWT session token from the Authorization header
        
    Returns:
        Decoded token payload if valid, None if invalid
        
    Raises:
        None - returns None on any error for graceful degradation
    """
    if not token:
        logger.debug("No token provided")
        return None
    
    # Remove 'Bearer ' prefix if present
    if token.startswith('Bearer '):
        token = token[7:]
    
    if not SHOPIFY_CLIENT_SECRET:
        logger.warning("SHOPIFY_CLIENT_SECRET not configured - cannot verify session tokens")
        # In development, decode without verification
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            logger.info(f"Token decoded (unverified): shop={payload.get('dest')}")
            return payload
        except Exception as e:
            logger.error(f"Failed to decode token: {e}")
            return None
    
    try:
        # Verify the token signature using the app's client secret
        payload = jwt.decode(
            token,
            SHOPIFY_CLIENT_SECRET,
            algorithms=["HS256"],
            audience=SHOPIFY_CLIENT_ID
        )
        
        # Additional validation
        now = datetime.now(timezone.utc).timestamp()
        
        # Check expiration
        if payload.get('exp', 0) < now:
            logger.warning("Session token has expired")
            return None
        
        # Check not-before time
        if payload.get('nbf', 0) > now:
            logger.warning("Session token not yet valid")
            return None
        
        logger.info(f"Session token verified: shop={payload.get('dest')}, user={payload.get('sub')}")
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("Session token has expired")
        return None
    except jwt.InvalidAudienceError:
        logger.warning("Session token has invalid audience")
        return None
    except jwt.InvalidSignatureError:
        logger.warning("Session token has invalid signature")
        return None
    except Exception as e:
        logger.error(f"Session token verification failed: {e}")
        return None


def get_shop_from_token(token: str) -> Optional[str]:
    """
    Extract the shop domain from a session token.
    
    Args:
        token: The JWT session token
        
    Returns:
        Shop domain (e.g., 'store-name.myshopify.com') or None
    """
    payload = verify_session_token(token)
    if not payload:
        return None
    
    # The 'dest' field contains the shop URL
    dest = payload.get('dest', '')
    if dest:
        # Remove https:// prefix if present
        return dest.replace('https://', '').replace('http://', '')
    
    # Fallback to extracting from 'iss'
    iss = payload.get('iss', '')
    if iss and '.myshopify.com' in iss:
        return iss.replace('https://', '').replace('http://', '').replace('/admin', '')
    
    return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract the user ID from a session token.
    
    Args:
        token: The JWT session token
        
    Returns:
        User ID or None
    """
    payload = verify_session_token(token)
    if not payload:
        return None
    
    return payload.get('sub')


async def get_session_from_request(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extract and verify session token from a FastAPI request.
    
    Args:
        request: The FastAPI request object
        
    Returns:
        Dict with shop, user_id, and full payload, or None if not authenticated
    """
    # Get Authorization header
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header:
        logger.debug("No Authorization header present")
        return None
    
    # Verify the token
    payload = verify_session_token(auth_header)
    
    if not payload:
        return None
    
    return {
        'shop': get_shop_from_token(auth_header),
        'user_id': payload.get('sub'),
        'payload': payload
    }


def require_session_token(request: Request) -> Dict[str, Any]:
    """
    Dependency that requires a valid session token.
    Use this for protected endpoints.
    
    Usage:
        @app.get("/protected")
        async def protected_route(session: dict = Depends(require_session_token)):
            shop = session['shop']
            ...
    """
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required"
        )
    
    payload = verify_session_token(auth_header)
    
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session token"
        )
    
    return {
        'shop': get_shop_from_token(auth_header),
        'user_id': payload.get('sub'),
        'payload': payload
    }
