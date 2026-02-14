/**
 * API utility for making authenticated requests
 * 
 * IMPORTANT: Using XMLHttpRequest instead of fetch because App Bridge v4
 * intercepts fetch() calls and causes them to hang for cross-origin requests.
 * XMLHttpRequest is not intercepted by App Bridge.
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://aiskinanalysis.onrender.com';

console.log('API_URL configured as:', API_URL);

// Get session token from URL if present
function getIdTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id_token');
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

// Promise-based XMLHttpRequest wrapper (not intercepted by App Bridge)
function xhrRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    
    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    Object.keys(headers).forEach(key => {
      xhr.setRequestHeader(key, headers[key]);
    });
    
    xhr.onload = function() {
      console.log('API Response:', xhr.status, url);
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
    
    xhr.timeout = 30000; // 30 second timeout
    
    console.log('API Request:', method, url);
    xhr.send(body ? JSON.stringify(body) : null);
  });
}

// API wrapper using XMLHttpRequest
const api = {
  async get(endpoint, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    
    // Check for id_token in URL (fallback method)
    const urlToken = getIdTokenFromUrl();
    const authHeaders = { ...headers };
    if (urlToken) {
      console.log('[Auth] Using id_token from URL');
      authHeaders['Authorization'] = `Bearer ${urlToken}`;
    }
    
    return xhrRequest('GET', url, null, authHeaders);
  },
  
  async post(endpoint, body = {}, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    
    // Check for id_token in URL (fallback method)
    const urlToken = getIdTokenFromUrl();
    const authHeaders = { ...headers };
    if (urlToken) {
      console.log('[Auth] Using id_token from URL');
      authHeaders['Authorization'] = `Bearer ${urlToken}`;
    }
    
    return xhrRequest('POST', url, body, authHeaders);
  }
};

// Legacy helper
export const withSessionToken = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

export default api;
