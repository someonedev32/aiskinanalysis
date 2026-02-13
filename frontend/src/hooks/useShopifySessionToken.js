/**
 * Custom hook to get Shopify session tokens
 * Uses window.shopify global from App Bridge CDN
 */
import { useCallback } from 'react';
import { useAppBridge } from '@/providers/AppBridgeProvider';

export function useShopifySessionToken() {
  // Get shopify instance from our custom provider
  const shopify = useAppBridge();
  
  const fetchToken = useCallback(async () => {
    // Use provider value or fallback to window.shopify
    const app = shopify || window.shopify;
    
    if (!app || typeof app.idToken !== 'function') {
      console.log('[SessionToken] No app instance available');
      return null;
    }
    
    try {
      console.log('[SessionToken] Getting session token...');
      const token = await app.idToken();
      console.log('[SessionToken] Token acquired successfully');
      return token;
    } catch (error) {
      console.error('[SessionToken] Error getting token:', error.message);
      return null;
    }
  }, [shopify]);
  
  return { fetchToken, app: shopify };
}

export default useShopifySessionToken;
