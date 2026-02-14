/**
 * API utility for making requests to our custom backend
 * 
 * Uses XMLHttpRequest because App Bridge v4 intercepts fetch() 
 * and causes hangs for cross-origin requests to custom backends.
 * 
 * Session tokens for Shopify's checker are handled separately 
 * in AppBridgeProvider via fetch() calls to Shopify endpoints.
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://aiskinanalysis.onrender.com';

console.log('API_URL configured as:', API_URL);

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

// Promise-based XMLHttpRequest wrapper
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
      const endpoint = url.includes('?') ? url.substring(url.indexOf('/api'), url.indexOf('?')) : url.substring(url.indexOf('/api'));
      console.log('API Response:', xhr.status, endpoint);
      
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
    
    const endpoint = url.includes('?') ? url.substring(url.indexOf('/api'), url.indexOf('?')) : url.substring(url.indexOf('/api'));
    console.log('API Request:', method, endpoint);
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

export default api;
