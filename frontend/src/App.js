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
import { initializeShopifyAuth, getSessionToken, isEmbedded } from "@/utils/shopifyAuth";

// Context for Shopify authentication
export const ShopifyAuthContext = createContext(null);

function App() {
  const [authState, setAuthState] = useState({
    initialized: false,
    shop: null,
    host: null,
    isEmbedded: false
  });

  useEffect(() => {
    // Initialize Shopify App Bridge authentication
    async function init() {
      try {
        const auth = await initializeShopifyAuth();
        setAuthState({
          initialized: true,
          shop: auth.shop,
          host: auth.host,
          isEmbedded: auth.isEmbedded
        });

        // If embedded, periodically refresh session token to generate session data for Shopify
        if (auth.isEmbedded && window.shopify) {
          // Get session token immediately
          const token = await getSessionToken();
          if (token) {
            console.log('Session token active - Shopify can now verify embedded app checks');
          }
          
          // Refresh token every 30 seconds to ensure Shopify detects session activity
          const interval = setInterval(async () => {
            try {
              await getSessionToken();
            } catch (e) {
              console.log('Token refresh skipped');
            }
          }, 30000);
          
          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState(prev => ({ ...prev, initialized: true }));
      }
    }
    
    init();
  }, []);

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
