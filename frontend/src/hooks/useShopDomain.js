import { useState, useEffect } from "react";

// Helper function to get shop domain from various sources
function getShopDomain() {
  // Try URL search params first (standard way)
  const urlParams = new URLSearchParams(window.location.search);
  let shop = urlParams.get("shop");
  if (shop) {
    console.log("Got shop from URL params:", shop);
    return shop;
  }
  
  // Try decoding Shopify's host parameter (base64 encoded)
  const host = urlParams.get("host");
  if (host) {
    try {
      const decoded = atob(host);
      // Format: store-name.myshopify.com/admin or admin.shopify.com/store/store-name
      const storeMatch = decoded.match(/([^/.]+)\.myshopify\.com/);
      if (storeMatch) {
        console.log("Got shop from host param:", storeMatch[1]);
        return `${storeMatch[1]}.myshopify.com`;
      }
      const adminMatch = decoded.match(/admin\.shopify\.com\/store\/([^/]+)/);
      if (adminMatch) {
        console.log("Got shop from host param (admin):", adminMatch[1]);
        return `${adminMatch[1]}.myshopify.com`;
      }
    } catch (e) {
      console.log("Failed to decode host param");
    }
  }
  
  // Try getting from URL hash (sometimes used in embedded apps)
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  shop = hashParams.get("shop");
  if (shop) return shop;
  
  // Try getting from referrer URL (when embedded in Shopify iframe)
  try {
    const referrer = document.referrer;
    if (referrer) {
      console.log("Referrer:", referrer);
      // Match admin.shopify.com/store/STORE-NAME pattern
      const adminMatch = referrer.match(/admin\.shopify\.com\/store\/([^/]+)/);
      if (adminMatch) {
        console.log("Got shop from referrer:", adminMatch[1]);
        return `${adminMatch[1]}.myshopify.com`;
      }
      // Match STORE.myshopify.com pattern
      const storeMatch = referrer.match(/([^/.]+)\.myshopify\.com/);
      if (storeMatch) {
        return `${storeMatch[1]}.myshopify.com`;
      }
    }
  } catch (e) {
    console.log("Could not access referrer");
  }

  // Try window.name (sometimes Shopify puts data there)
  try {
    if (window.name && window.name.includes('myshopify')) {
      const match = window.name.match(/([^/.]+)\.myshopify\.com/);
      if (match) return `${match[1]}.myshopify.com`;
    }
  } catch (e) {}
  
  // Try localStorage (if saved during install)
  shop = localStorage.getItem("shopify_shop_domain");
  if (shop) {
    console.log("Got shop from localStorage:", shop);
    return shop;
  }
  
  // Extract from current hostname if it's a Shopify URL
  const hostname = window.location.hostname;
  if (hostname.includes('.myshopify.com')) {
    return hostname;
  }
  
  return null;
}

export function useShopDomain() {
  const [shopDomain, setShopDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const shop = getShopDomain();
    if (shop) {
      setShopDomain(shop);
      localStorage.setItem("shopify_shop_domain", shop);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  return { shopDomain, loading, error };
}

export default useShopDomain;
