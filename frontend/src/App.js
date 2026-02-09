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
    isEmbedded: false,
    error: null
  });

  useEffect(() => {
    // Initialize Shopify App Bridge authentication
    async function init() {
      console.log('Starting app initialization...');
      console.log('REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
      
      try {
        const auth = await initializeShopifyAuth();
        console.log('Auth initialized:', auth);
        
        setAuthState({
          initialized: true,
          shop: auth.shop,
          host: auth.host,
          isEmbedded: auth.isEmbedded,
          error: null
        });

        // If embedded, periodically refresh session token
        if (auth.isEmbedded && window.shopify) {
          const token = await getSessionToken();
          if (token) {
            console.log('Session token active');
          }
          
          const interval = setInterval(async () => {
            try {
              await getSessionToken();
            } catch (e) {
              // Silent refresh
            }
          }, 30000);
          
          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState(prev => ({ 
          ...prev, 
          initialized: true,
          error: error.message 
        }));
      }
    }
    
    init();
  }, []);

  // Show loading while initializing
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
