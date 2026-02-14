/**
 * App Bridge Provider for Shopify Embedded Apps
 * 
 * For App Bridge v4:
 * - Uses CDN script + meta tag for API key
 * - Session tokens are automatically injected into fetch() requests
 * - No need to manually call idToken() - it's unreliable
 */
import { createContext, useContext, useEffect, useState } from 'react';

// Context for App Bridge
const AppBridgeContext = createContext(null);

// Hook to get App Bridge instance
export function useAppBridge() {
  const context = useContext(AppBridgeContext);
  if (context === undefined) {
    return typeof window !== 'undefined' ? window.shopify : null;
  }
  return context;
}

export function AppBridgeProvider({ children }) {
  const [shopify, setShopify] = useState(null);
  
  useEffect(() => {
    // Wait for App Bridge CDN to load
    const checkAppBridge = () => {
      if (window.shopify) {
        console.log('[AppBridge] Ready via CDN');
        console.log('[AppBridge] Session tokens will be auto-injected into fetch() requests');
        setShopify(window.shopify);
        
        // Log App Bridge config for debugging
        if (window.shopify.config) {
          console.log('[AppBridge] Config:', window.shopify.config);
        }
      } else {
        setTimeout(checkAppBridge, 100);
      }
    };
    
    checkAppBridge();
  }, []);
  
  return (
    <AppBridgeContext.Provider value={shopify}>
      {children}
    </AppBridgeContext.Provider>
  );
}

export default AppBridgeProvider;
