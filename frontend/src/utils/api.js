/**
 * API utility for making authenticated requests
 * 
 * Uses XMLHttpRequest (not intercepted by App Bridge) but manually
 * fetches and adds session tokens for Shopify authentication.
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://aiskinanalysis.onrender.com';

console.log('API_URL configured as:', API_URL);

// Cache for session token
let cachedToken = null;
let tokenExpiry = 0;

// Get session token from Shopify App Bridge with retry
async function getSessionToken() {
  // Return cached token if still valid (tokens last ~1 minute, refresh at 50 seconds)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  // Check for id_token in URL first (fallback)
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('id_token');
  if (urlToken) {
    console.log('[Auth] Using id_token from URL');
    return urlToken;
  }
  
  // Try to get token from App Bridge
  if (window.shopify && typeof window.shopify.idToken === 'function') {
    // Try up to 3 times with increasing delays
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Auth] Fetching session token (attempt ${attempt})...`);
        
        // Create a promise that rejects after timeout
        const tokenPromise = window.shopify.idToken();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Token timeout')), 5000)
        );
        
        const token = await Promise.race([tokenPromise, timeoutPromise]);
        
        if (token) {
          console.log('[Auth] Session token acquired successfully');
          cachedToken = token;
          tokenExpiry = Date.now() + 50000; // Cache for 50 seconds
          return token;
        }
      } catch (e) {
        console.log(`[Auth] Token attempt ${attempt} failed:`, e.message);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 500 * attempt)); // Wait before retry
        }
      }
    }
  }
  
  console.log('[Auth] Could not get session token, proceeding without');
  return null;
}

// Helper function to build URL with query params
function buildUrl(endpoint, params = {}) {
  const url = new URL(`${API_URL}/api${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
}

// Promise-based XMLHttpRequest wrapper with session token support
async function xhrRequest(method, url, body = null, headers = {}) {
  // Get session token
  const token = await getSessionToken();
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    
    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Add session token if available
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      console.log('[Auth] Request includes session token');
    }
    
    Object.keys(headers).forEach(key => {
      xhr.setRequestHeader(key, headers[key]);
    });
    
    xhr.onload = function() {
      console.log('API Response:', xhr.status, url.substring(url.lastIndexOf('/') + 1));
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ data, status: xhr.status });
        } catch (e) {
          resolve({ data: xhr.responseText, status: xhr.status });
        }
      } else {
        const error = new Error(`HTTP ${xhr.status}`);
        try {
          error.response = { status: xhr.status, data: JSON.parse(xhr.responseText) };
        } catch (e) {
          error.response = { status: xhr.status, data: xhr.responseText };
        }
        reject(error);
      }
    };
    
    xhr.onerror = function() {
      console.error('API Network Error');
      reject(new Error('Network error'));
    };
    
    xhr.ontimeout = function() {
      console.error('API Timeout');
      reject(new Error('Request timeout'));
    };
    
    xhr.timeout = 30000;
    
    console.log('API Request:', method, url.substring(url.indexOf('/api')));
    xhr.send(body ? JSON.stringify(body) : null);
  });
}

// API wrapper
const api = {
  async get(endpoint, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    return xhrRequest('GET', url, null, headers);
  },
  
  async post(endpoint, body = {}, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    return xhrRequest('POST', url, body, headers);
  }
};

// Legacy helper
export const withSessionToken = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

export default api;
