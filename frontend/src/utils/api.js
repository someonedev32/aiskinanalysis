/**
 * API utility for making authenticated requests
 * 
 * App Bridge v4 may auto-inject session tokens into fetch() requests
 * We also check for id_token in URL params as fallback
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://aiskinanalysis.onrender.com';

console.log('API_URL configured as:', API_URL);

// Get session token from URL if present (App Bridge sometimes passes it this way)
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

// API wrapper using native fetch
const api = {
  async get(endpoint, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    
    console.log('API Request: GET', endpoint, url);
    
    // Check for id_token in URL (fallback method)
    const urlToken = getIdTokenFromUrl();
    const authHeaders = {};
    if (urlToken) {
      console.log('[Auth] Using id_token from URL');
      authHeaders['Authorization'] = `Bearer ${urlToken}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers
        },
        credentials: 'include'
      });
      
      console.log('API Response:', response.status, endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || `HTTP ${response.status}`);
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error('API Error:', error.response?.status || 'Network', error.message);
      throw error;
    }
  },
  
  async post(endpoint, body = {}, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    
    console.log('API Request: POST', endpoint);
    
    // Check for id_token in URL (fallback method)
    const urlToken = getIdTokenFromUrl();
    const authHeaders = {};
    if (urlToken) {
      console.log('[Auth] Using id_token from URL');
      authHeaders['Authorization'] = `Bearer ${urlToken}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers
        },
        body: JSON.stringify(body),
        credentials: 'include'
      });
      
      console.log('API Response:', response.status, endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || `HTTP ${response.status}`);
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error('API Error:', error.response?.status || 'Network', error.message);
      throw error;
    }
  }
};

// Legacy helper
export const withSessionToken = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

export default api;
