/**
 * Custom hook to get Shopify session tokens
 * Uses @shopify/app-bridge-react and @shopify/app-bridge-utils
 */
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { useCallback } from 'react';

export function useShopifySessionToken() {
  let app = null;
  
  try {
    app = useAppBridge();
  } catch (e) {
    // Not in App Bridge context
    console.log('[SessionToken] Not in App Bridge context');
  }
  
  const fetchToken = useCallback(async () => {
    if (!app) {
      console.log('[SessionToken] No app instance');
      return null;
    }
    
    try {
      console.log('[SessionToken] Getting session token...');
      const token = await getSessionToken(app);
      console.log('[SessionToken] Token acquired successfully');
      return token;
    } catch (error) {
      console.error('[SessionToken] Error getting token:', error.message);
      return null;
    }
  }, [app]);
  
  return { fetchToken, app };
}

export default useShopifySessionToken;
