import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState, createContext } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Billing from "@/pages/Billing";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import { getShopDomain, getHost, isEmbedded } from "@/utils/shopifyAuth";

// Context for Shopify authentication
export const ShopifyAuthContext = createContext(null);

// Acquire session token in background (non-blocking)
const acquireSessionTokenInBackground = () => {
  // Check every 500ms for App Bridge for up to 15 seconds
  let attempts = 0;
  const maxAttempts = 30;
  
  const tryGetToken = () => {
    attempts++;
    
    if (window.shopify && typeof window.shopify.idToken === 'function') {
      // App Bridge is ready - get token
      console.log('[Session Token] App Bridge ready, calling idToken()...');
      
      window.shopify.idToken()
        .then(token => {
          if (token) {
            console.log('[Session Token] SUCCESS - Session token retrieved');
            console.log('[Session Token] Using session token for user authentication');
            sessionStorage.setItem('session_token_acquired', 'true');
          }
        })
        .catch(err => {
          console.log('[Session Token] Error:', err.message);
        });
      
      // Set up periodic refresh every 45 seconds
      setInterval(() => {
        if (window.shopify && typeof window.shopify.idToken === 'function') {
          window.shopify.idToken()
            .then(() => console.log('[Session Token] Refreshed'))
            .catch(() => {});
        }
      }, 45000);
      
    } else if (attempts < maxAttempts) {
      // Keep trying
      setTimeout(tryGetToken, 500);
    } else {
      console.log('[Session Token] App Bridge not available after 15s');
    }
  };
  
  // Start trying after a short delay
  setTimeout(tryGetToken, 500);
};

function App() {
  const [authState, setAuthState] = useState({
    initialized: false,
    shop: null,
    host: null,
    isEmbedded: false,
    error: null
  });

  useEffect(() => {
    console.log('[App] Starting initialization...');
    
    const shop = getShopDomain();
    const host = getHost();
    const embedded = isEmbedded();
    
    console.log('[App] Auth info:', { shop, host, embedded });
    
    // Store shop domain
    if (shop) {
      try {
        localStorage.setItem('shopify_shop_domain', shop);
        sessionStorage.setItem('shopify_shop_domain', shop);
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Set initialized IMMEDIATELY - don't wait for anything
    setAuthState({
      initialized: true,
      shop,
      host,
      isEmbedded: embedded,
      error: null
    });
    
    console.log('[App] App initialized, rendering now');
    
    // If embedded, start acquiring session token in background
    if (embedded) {
      console.log('[App] Embedded context detected, acquiring session token in background...');
      acquireSessionTokenInBackground();
    }
  }, []);

  // Show loading ONLY during initial React render
  if (!authState.initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F6F7]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5C6E58] mx-auto mb-4"></div>
          <p className="text-sm text-[#616161]">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <ShopifyAuthContext.Provider value={authState}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="billing" element={<Billing />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </ShopifyAuthContext.Provider>
  );
}

export default App;
