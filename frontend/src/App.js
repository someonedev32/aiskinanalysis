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
    
    // Set initialized immediately
    setAuthState({
      initialized: true,
      shop,
      host,
      isEmbedded: embedded,
      error: null
    });
    
    console.log('[App] App initialized, rendering now');
    
    // If embedded, call idToken() for Shopify to detect session token usage
    if (embedded) {
      console.log('[App] Embedded context - initializing session token auth...');
      
      const initSessionToken = async () => {
        if (window.shopify && typeof window.shopify.idToken === 'function') {
          try {
            console.log('[App] Calling shopify.idToken()...');
            const token = await window.shopify.idToken();
            if (token) {
              console.log('[App] SUCCESS: Session token retrieved');
              console.log('[App] Token will be used for API authentication');
              sessionStorage.setItem('session_token_active', 'true');
            } else {
              console.log('[App] idToken returned null');
            }
          } catch (e) {
            console.log('[App] idToken error:', e.message);
          }
        } else {
          // Retry after App Bridge loads
          console.log('[App] Waiting for App Bridge...');
          setTimeout(initSessionToken, 1000);
        }
      };
      
      // Start immediately, not with delay
      initSessionToken();
    }
  }, []);

  // Show loading only during initial React render
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
