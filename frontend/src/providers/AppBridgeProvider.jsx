/**
 * App Bridge Provider for Shopify Embedded Apps
 * 
 * Uses @shopify/app-bridge npm package (v3) for reliable session tokens
 * NOT the CDN window.shopify which is unreliable
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { getAppBridge, fetchSessionToken, getShopFromHost } from '@/utils/app-bridge';

// Context for App Bridge
const AppBridgeContext = createContext(null);

// Hook to get App Bridge instance
export function useAppBridge() {
  return useContext(AppBridgeContext);
}

export function AppBridgeProvider({ children }) {
  const [app, setApp] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Initialize App Bridge from npm package
    const initAppBridge = async () => {
      try {
        const appInstance = getAppBridge();
        
        if (appInstance) {
          setApp(appInstance);
          console.log('[AppBridge] NPM package initialized');
          
          // Test session token acquisition
          const token = await fetchSessionToken();
          if (token) {
            console.log('[AppBridge] Session token test successful');
            console.log('[AppBridge] Using session tokens for user authentication');
          } else {
            console.log('[AppBridge] Running without session tokens (not embedded)');
          }
        } else {
          console.log('[AppBridge] Running outside Shopify Admin');
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('[AppBridge] Initialization error:', error);
        setIsReady(true);
      }
    };
    
    initAppBridge();
  }, []);
  
  return (
    <AppBridgeContext.Provider value={app}>
      {children}
    </AppBridgeContext.Provider>
  );
}

export default AppBridgeProvider;
