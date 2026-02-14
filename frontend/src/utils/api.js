/**
 * API utility for making authenticated requests to our backend
 * 
 * Uses @shopify/app-bridge with getSessionToken for reliable authentication
 */

import { getAppBridge, fetchSessionToken } from './app-bridge';

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

/**
 * Make authenticated request using XMLHttpRequest
 * We use XHR because fetch gets intercepted by CDN app-bridge causing hangs
 * But we still get session tokens from the npm package (reliable)
 */
async function authenticatedXhr(method, url, body = null, headers = {}) {
  // Get session token from App Bridge (npm package - reliable)
  const token = await fetchSessionToken();
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    
    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Add session token if available
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      console.log('[API] Request authenticated with session token');
    }
    
    Object.keys(headers).forEach(key => {
      xhr.setRequestHeader(key, headers[key]);
    });
    
    xhr.onload = function() {
      const endpoint = url.includes('?') 
        ? url.substring(url.indexOf('/api'), url.indexOf('?')) 
        : url.substring(url.indexOf('/api'));
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
    
    const endpoint = url.includes('?') 
      ? url.substring(url.indexOf('/api'), url.indexOf('?')) 
      : url.substring(url.indexOf('/api'));
    console.log('API Request:', method, endpoint);
    xhr.send(body ? JSON.stringify(body) : null);
  });
}

// API wrapper
const api = {
  async get(endpoint, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    return authenticatedXhr('GET', url, null, headers);
  },
  
  async post(endpoint, body = {}, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    return authenticatedXhr('POST', url, body, headers);
  }
};

export default api;
