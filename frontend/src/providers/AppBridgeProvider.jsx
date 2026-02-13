/**
 * App Bridge Provider for Shopify Embedded Apps
 * 
 * For App Bridge v4, we use the CDN script + window.shopify global
 * The CDN script in index.html provides the shopify global
 */
import { createContext, useContext, useEffect, useState } from 'react';

// Context for App Bridge
const AppBridgeContext = createContext(null);

// Hook to get App Bridge instance
export function useAppBridge() {
  const context = useContext(AppBridgeContext);
  if (context === undefined) {
    // Return window.shopify if available
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
        setShopify(window.shopify);
        
        // Initialize session token for Shopify detection
        if (typeof window.shopify.idToken === 'function') {
          console.log('[AppBridge] Calling idToken for session token auth...');
          window.shopify.idToken()
            .then(token => {
              if (token) {
                console.log('[AppBridge] Session token acquired - Using session tokens for user authentication');
              }
            })
            .catch(e => console.log('[AppBridge] Token:', e.message));
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
