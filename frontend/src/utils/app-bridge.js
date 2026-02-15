/**
 * Shopify App Bridge initialization for embedded Admin apps
 * 
 * Uses @shopify/app-bridge v3 with getSessionToken for reliable authentication
 */

import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { Redirect } from '@shopify/app-bridge/actions';

// Get API key from environment or meta tag
function getApiKey() {
  // Try meta tag first (set in index.html)
  const metaTag = document.querySelector('meta[name="shopify-api-key"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }
  
  // Fallback to environment variable
  const apiKey = process.env.REACT_APP_SHOPIFY_API_KEY;
  if (!apiKey) {
    console.error('[AppBridge] No API key found');
    return null;
  }
  
  return apiKey;
}

// Get host parameter from URL
function getHostFromUrl() {
  const url = new URL(window.location.href);
  const host = url.searchParams.get('host');
  
  if (!host) {
    console.warn('[AppBridge] Missing host parameter - not embedded in Shopify Admin');
    return null;
  }
  
  return host;
}

// Extract shop domain from host parameter
export function getShopFromHost() {
  const host = getHostFromUrl();
  if (!host) return null;
  
  try {
    const decoded = atob(host);
    const [shopDomain] = decoded.split('/admin');
    return shopDomain;
  } catch (e) {
    console.warn('[AppBridge] Failed to decode host:', e);
    return null;
  }
}

// Singleton App Bridge instance
let appBridgeInstance = null;

/**
 * Initialize or get existing App Bridge instance
 */
export function getAppBridge(overrides = {}) {
  if (appBridgeInstance) {
    return appBridgeInstance;
  }
  
  const apiKey = overrides.apiKey || getApiKey();
  const host = overrides.host || getHostFromUrl();
  
  if (!apiKey) {
    console.error('[AppBridge] Cannot initialize without API key');
    return null;
  }
  
  if (!host) {
    console.warn('[AppBridge] Cannot initialize without host - running outside Shopify Admin');
    return null;
  }
  
  console.log('[AppBridge] Initializing with apiKey:', apiKey.substring(0, 8) + '...');
  
  try {
    appBridgeInstance = createApp({
      apiKey,
      host,
      forceRedirect: false, // Don't force redirect on origin mismatch
    });
    
    console.log('[AppBridge] Initialized successfully');
  } catch (error) {
    console.error('[AppBridge] Initialization error:', error.message);
    // Return null but don't crash the app
    return null;
  }
  
  return appBridgeInstance;
}

/**
 * Get session token from App Bridge
 * This is the RELIABLE way to get tokens (vs window.shopify.idToken)
 */
export async function fetchSessionToken() {
  const app = getAppBridge();
  
  if (!app) {
    console.log('[AppBridge] No app instance, cannot get token');
    return null;
  }
  
  try {
    console.log('[AppBridge] Fetching session token...');
    const token = await getSessionToken(app);
    console.log('[AppBridge] Session token acquired');
    return token;
  } catch (error) {
    // Handle INVALID_ORIGIN error gracefully
    if (error.message && error.message.includes('INVALID_ORIGIN')) {
      console.warn('[AppBridge] Origin mismatch - check App URL in Partner Dashboard');
      console.warn('[AppBridge] Expected origin should match your Vercel URL');
    } else {
      console.error('[AppBridge] Failed to get session token:', error.message);
    }
    return null;
  }
}

/**
 * Redirect to OAuth if needed
 */
export function redirectToAuth() {
  const app = getAppBridge();
  if (!app) return;
  
  const redirect = Redirect.create(app);
  const shop = getShopFromHost();
  
  redirect.dispatch(Redirect.Action.REMOTE, `/auth?shop=${shop}`);
}

/**
 * Make authenticated fetch request with session token
 */
export async function authenticatedFetch(url, options = {}) {
  const token = await fetchSessionToken();
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('[AppBridge] Request authenticated with session token');
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle unauthorized responses
  if (response.status === 401 || response.status === 403) {
    console.warn('[AppBridge] Unauthorized, may need to re-authenticate');
  }
  
  return response;
}

export default {
  getAppBridge,
  fetchSessionToken,
  authenticatedFetch,
  getShopFromHost,
  redirectToAuth,
};
