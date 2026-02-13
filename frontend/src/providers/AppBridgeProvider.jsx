/**
 * App Bridge Provider for Shopify Embedded Apps
 * 
 * Uses @shopify/app-bridge-react as recommended by Shopify
 * https://shopify.dev/docs/api/app-bridge-library/react-components
 */
import { useMemo } from 'react';
import { Provider } from '@shopify/app-bridge-react';

// Get host from URL query params
function getHostFromLocation() {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  return params.get('host') || undefined;
}

// Shopify API Key - this is public and safe to expose
const SHOPIFY_API_KEY = '92a7db21219834a47df3e9caa9318972';

export function AppBridgeProvider({ children }) {
  const host = getHostFromLocation();
  
  const config = useMemo(() => {
    if (!host) {
      console.log('[AppBridge] No host parameter found');
      return null;
    }
    
    console.log('[AppBridge] Initializing with host:', host);
    
    return {
      apiKey: SHOPIFY_API_KEY,
      host: host,
      forceRedirect: true, // Ensures we're always embedded in Admin
    };
  }, [host]);
  
  // If no config (not embedded), render children without provider
  if (!config) {
    console.log('[AppBridge] Running without App Bridge (not embedded)');
    return <>{children}</>;
  }
  
  return (
    <Provider config={config}>
      {children}
    </Provider>
  );
}

export default AppBridgeProvider;
