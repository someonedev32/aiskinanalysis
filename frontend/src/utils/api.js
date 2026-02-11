/**
 * Axios instance with Shopify session token authentication
 * This ensures all API requests include the session token when in embedded context
 * 
 * IMPORTANT: Session token authentication is REQUIRED for Shopify App Store approval
 */
import axios from 'axios';
import { isEmbedded } from './shopifyAuth';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://aiskinanalysis.onrender.com';

console.log('API_URL configured as:', API_URL);

// Cache for session token to avoid repeated calls
let cachedToken = null;
let tokenExpiry = 0;
let tokenPromiseInFlight = null;

// Wait for App Bridge to be available
const waitForAppBridge = (timeout = 5000) => {
  return new Promise((resolve) => {
    if (window.shopify && typeof window.shopify.idToken === 'function') {
      resolve(window.shopify);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.shopify && typeof window.shopify.idToken === 'function') {
        clearInterval(checkInterval);
        console.log('[Session Token] App Bridge loaded after', Date.now() - startTime, 'ms');
        resolve(window.shopify);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.warn('[Session Token] App Bridge timeout after', timeout, 'ms');
        resolve(null);
      }
    }, 100);
  });
};

// Get session token with caching and retry
const getSessionToken = async () => {
  // Return cached token if still valid (tokens expire in 60s, we refresh at 50s)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  // If a token request is already in flight, wait for it
  if (tokenPromiseInFlight) {
    return tokenPromiseInFlight;
  }
  
  // Start new token request
  tokenPromiseInFlight = (async () => {
    try {
      // Wait for App Bridge if not ready
      const shopify = await waitForAppBridge(5000);
      
      if (!shopify) {
        console.warn('[Session Token] App Bridge not available');
        return null;
      }
      
      // CRITICAL: Call shopify.idToken() - this is what Shopify checks for approval
      console.log('[Session Token] Calling shopify.idToken()...');
      const token = await shopify.idToken();
      
      if (token) {
        // Cache the token
        cachedToken = token;
        tokenExpiry = Date.now() + 50000; // Refresh 10s before expiry
        
        console.log('[Session Token] Successfully retrieved session token');
        console.log('[Session Token] Using session token for user authentication');
        
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('[Session Token] Error getting token:', error.message);
      return null;
    } finally {
      tokenPromiseInFlight = null;
    }
  })();
  
  return tokenPromiseInFlight;
};

// Initialize session token on app load (for Shopify to detect)
if (isEmbedded()) {
  console.log('[Session Token] Embedded context detected, initializing...');
  // Start fetching token immediately (non-blocking)
  getSessionToken().then(token => {
    if (token) {
      console.log('[Session Token] Initial token acquired successfully');
    }
  });
}

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Request interceptor to add session token
// This is REQUIRED for Shopify App Store compliance
api.interceptors.request.use(
  async (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    
    // If we're in embedded Shopify context, add session token
    if (isEmbedded()) {
      try {
        const token = await getSessionToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('[Session Token] Request authenticated with session token');
        } else {
          console.warn('[Session Token] No token available for request');
        }
      } catch (error) {
        console.error('[Session Token] Failed to get token:', error.message);
      }
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors (session expired or invalid)
    if (error.response?.status === 401) {
      console.error('Authentication failed - session may have expired');
      // Clear cached token to force refresh
      cachedToken = null;
      tokenExpiry = 0;
    }
    return Promise.reject(error);
  }
);

export default api;
