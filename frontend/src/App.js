import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Billing from "@/pages/Billing";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

// Initialize Shopify App Bridge for embedded app
function initializeAppBridge() {
  const params = new URLSearchParams(window.location.search);
  const host = params.get('host');
  const shop = params.get('shop');
  
  if (window.shopify && host) {
    try {
      // App Bridge is auto-initialized when loaded from Shopify CDN
      // Just need to ensure we're in the right context
      console.log('App Bridge initialized for shop:', shop);
      
      // Get session token for authenticated API calls
      if (window.shopify.idToken) {
        window.shopify.idToken().then((token) => {
          console.log('Session token obtained');
          // Store token for API calls if needed
          sessionStorage.setItem('shopify_session_token', token);
        }).catch((err) => {
          console.log('Session token not available (might be outside Shopify admin)');
        });
      }
    } catch (error) {
      console.log('App Bridge initialization skipped:', error.message);
    }
  }
}

function App() {
  useEffect(() => {
    // Initialize App Bridge when component mounts
    initializeAppBridge();
  }, []);

  return (
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
  );
}

export default App;
