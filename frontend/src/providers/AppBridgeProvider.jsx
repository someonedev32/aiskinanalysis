/**
 * App Bridge Provider for Shopify Embedded Apps
 * 
 * This provider ensures App Bridge is properly initialized and provides
 * the shopify global variable to all child components.
 */
import { useEffect, useState, createContext, useContext } from 'react';

// Create context for App Bridge
const AppBridgeContext = createContext(null);

// Hook to access App Bridge
export function useAppBridge() {
  const context = useContext(AppBridgeContext);
  return context?.shopify || window.shopify || null;
}

// Hook to get session token
export function useSessionToken() {
  const shopify = useAppBridge();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    let intervalId;
    
    const getToken = async () => {
      if (shopify && typeof shopify.idToken === 'function') {
        try {
          const newToken = await shopify.idToken();
          if (mounted && newToken) {
            setToken(newToken);
            console.log('[SessionToken] Token acquired successfully');
          }
        } catch (e) {
          console.log('[SessionToken] Error:', e.message);
        }
      }
      if (mounted) setLoading(false);
    };
    
    getToken();
    
    // Refresh token every 50 seconds (tokens expire in 60s)
    intervalId = setInterval(getToken, 50000);
    
    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [shopify]);
  
  return { token, loading };
}

export function AppBridgeProvider({ children }) {
  const [state, setState] = useState({
    ready: false,
    shopify: null,
    error: null
  });
  
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max
    
    const checkAppBridge = () => {
      attempts++;
      
      if (window.shopify) {
        console.log('[AppBridge] Ready');
        setState({
          ready: true,
          shopify: window.shopify,
          error: null
        });
        
        // Initialize session token for Shopify detection
        if (typeof window.shopify.idToken === 'function') {
          console.log('[AppBridge] Initializing session token...');
          window.shopify.idToken()
            .then(token => {
              if (token) {
                console.log('[AppBridge] Session token initialized - Using session tokens for user authentication');
              }
            })
            .catch(e => console.log('[AppBridge] Token init:', e.message));
        }
      } else if (attempts < maxAttempts) {
        setTimeout(checkAppBridge, 500);
      } else {
        console.log('[AppBridge] Not available - continuing without');
        setState({
          ready: true,
          shopify: null,
          error: 'App Bridge not available'
        });
      }
    };
    
    checkAppBridge();
  }, []);
  
  return (
    <AppBridgeContext.Provider value={state}>
      {children}
    </AppBridgeContext.Provider>
  );
}

export default AppBridgeProvider;
