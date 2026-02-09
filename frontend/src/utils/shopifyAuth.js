/**
 * Shopify App Bridge Authentication Utilities
 * This module handles session token authentication for embedded Shopify apps
 */

// Get the host parameter from URL (required for App Bridge)
export function getHost() {
  const params = new URLSearchParams(window.location.search);
  return params.get('host');
}

// Get shop domain from URL or host parameter
export function getShopDomain() {
  const params = new URLSearchParams(window.location.search);
  
  // Try direct shop parameter
  let shop = params.get('shop');
  if (shop) return shop;
  
  // Try decoding host parameter
  const host = params.get('host');
  if (host) {
    try {
      const decoded = atob(host);
      // admin.shopify.com/store/STORE pattern
      const adminMatch = decoded.match(/admin\.shopify\.com\/store\/([^/]+)/);
      if (adminMatch) return `${adminMatch[1]}.myshopify.com`;
      
      // STORE.myshopify.com pattern
      const storeMatch = decoded.match(/([^/.]+)\.myshopify\.com/);
      if (storeMatch) return `${storeMatch[1]}.myshopify.com`;
    } catch (e) {
      console.error('Failed to decode host:', e);
    }
  }
  
  // Fallback to localStorage
  return localStorage.getItem('shopify_shop_domain');
}

// Check if we're in an embedded Shopify context
export function isEmbedded() {
  return window.self !== window.top;
}

// Wait for App Bridge to be ready
export function waitForAppBridge(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (window.shopify) {
      resolve(window.shopify);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.shopify) {
        clearInterval(checkInterval);
        resolve(window.shopify);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.log('App Bridge not available after timeout, continuing without it');
        resolve(null);
      }
    }, 100);
  });
}

// Get session token from App Bridge
export async function getSessionToken() {
  // Wait for App Bridge if in embedded context
  if (isEmbedded()) {
    await waitForAppBridge();
  }
  
  if (!window.shopify) {
    console.log('App Bridge not available');
    return null;
  }
  
  try {
    // The CDN version of App Bridge exposes shopify.idToken()
    if (typeof window.shopify.idToken === 'function') {
      const token = await window.shopify.idToken();
      console.log('Session token obtained successfully');
      return token;
    }
    
    // Alternative: try shopify.getSessionToken if available
    if (typeof window.shopify.getSessionToken === 'function') {
      const token = await window.shopify.getSessionToken();
      return token;
    }
    
    console.log('No session token method available');
    return null;
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
}

// Create an authenticated fetch function that includes session token
export function createAuthenticatedFetch() {
  return async (url, options = {}) => {
    const headers = { ...options.headers };
    
    // Try to get session token for authentication
    if (isEmbedded() && window.shopify) {
      try {
        const token = await getSessionToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Added session token to request');
        }
      } catch (e) {
        console.log('Could not get session token, proceeding without');
      }
    }
    
    // Add content type if not present
    if (!headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    return fetch(url, { ...options, headers });
  };
}

// Initialize App Bridge and return auth utilities
export async function initializeShopifyAuth() {
  const host = getHost();
  const shop = getShopDomain();
  
  console.log('Initializing Shopify Auth:', { host, shop, embedded: isEmbedded() });
  
  // Store shop domain for later use
  if (shop) {
    localStorage.setItem('shopify_shop_domain', shop);
    sessionStorage.setItem('shopify_shop_domain', shop);
  }
  
  // If embedded and App Bridge is available, get initial session token
  if (isEmbedded() && window.shopify) {
    try {
      const token = await getSessionToken();
      if (token) {
        sessionStorage.setItem('shopify_session_token', token);
        console.log('Initial session token stored');
      }
    } catch (e) {
      console.log('Initial session token fetch skipped:', e.message);
    }
  }
  
  return {
    host,
    shop,
    isEmbedded: isEmbedded(),
    getSessionToken,
    authenticatedFetch: createAuthenticatedFetch()
  };
}

export default {
  getHost,
  getShopDomain,
  isEmbedded,
  getSessionToken,
  createAuthenticatedFetch,
  initializeShopifyAuth
};
