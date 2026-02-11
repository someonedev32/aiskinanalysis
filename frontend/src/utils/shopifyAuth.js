/**
 * Shopify App Bridge Authentication Utilities
 * This module handles session token authentication for embedded Shopify apps
 * 
 * IMPORTANT: This uses the CDN version of App Bridge which auto-initializes
 * when data-api-key attribute is present on the script tag.
 * The global `shopify` object is available after the script loads.
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
export function waitForAppBridge(timeout = 3000) {
  return new Promise((resolve) => {
    // Check immediately
    if (window.shopify) {
      console.log('App Bridge already available');
      resolve(window.shopify);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.shopify) {
        clearInterval(checkInterval);
        console.log('App Bridge loaded after', Date.now() - startTime, 'ms');
        resolve(window.shopify);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.log('App Bridge not available after timeout');
        resolve(null);
      }
    }, 50);
  });
}

// Get session token from App Bridge
// This is REQUIRED for Shopify App Store approval
export async function getSessionToken() {
  // Wait for App Bridge if not ready
  if (!window.shopify) {
    if (isEmbedded()) {
      await waitForAppBridge(3000);
    }
  }
  
  if (!window.shopify) {
    console.log('App Bridge not available for session token');
    return null;
  }
  
  try {
    // The CDN version of App Bridge exposes shopify.idToken()
    // This returns a JWT session token
    if (typeof window.shopify.idToken === 'function') {
      const token = await window.shopify.idToken();
      console.log('Session token retrieved successfully');
      return token;
    }
    console.log('shopify.idToken not available');
    return null;
  } catch (error) {
    console.error('Session token error:', error.message);
    return null;
  }
}

// Create an authenticated fetch function that includes session token
// This implements the pattern required by Shopify for embedded apps
export function createAuthenticatedFetch() {
  return async (url, options = {}) => {
    const headers = { ...options.headers };
    
    // Try to get session token for authentication
    if (isEmbedded()) {
      try {
        const token = await getSessionToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Request authenticated with session token');
        }
      } catch (e) {
        console.log('Could not get session token, proceeding without:', e.message);
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
  const embedded = isEmbedded();
  
  console.log('Initializing Shopify Auth:', { host, shop, embedded });
  
  // Store shop domain for later use
  if (shop) {
    localStorage.setItem('shopify_shop_domain', shop);
    sessionStorage.setItem('shopify_shop_domain', shop);
  }
  
  // If embedded, wait for App Bridge and get initial session token
  if (embedded) {
    console.log('Running in embedded mode, waiting for App Bridge...');
    
    const shopify = await waitForAppBridge(3000);
    
    if (shopify) {
      console.log('App Bridge ready, getting initial session token...');
      try {
        const token = await getSessionToken();
        if (token) {
          sessionStorage.setItem('shopify_session_token', token);
          console.log('Initial session token stored successfully');
          
          // Log token details (without exposing the actual token)
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              console.log('Token payload:', {
                iss: payload.iss,
                dest: payload.dest,
                aud: payload.aud,
                exp: new Date(payload.exp * 1000).toISOString()
              });
            }
          } catch (e) {
            // Ignore decode errors
          }
        }
      } catch (e) {
        console.error('Initial session token fetch failed:', e.message);
      }
    } else {
      console.warn('App Bridge not available - session tokens will not work');
    }
  }
  
  return {
    host,
    shop,
    isEmbedded: embedded,
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
