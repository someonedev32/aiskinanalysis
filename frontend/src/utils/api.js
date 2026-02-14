/**
 * API utility for making authenticated requests
 * 
 * App Bridge v4 automatically injects session tokens into fetch() requests
 * So we use native fetch instead of axios for automatic authentication
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

// API wrapper using native fetch (App Bridge v4 auto-injects session tokens)
const api = {
  async get(endpoint, options = {}) {
    const { params = {}, headers = {} } = options;
    const url = buildUrl(endpoint, params);
    
    console.log('API Request: GET', endpoint);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
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
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
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

// Legacy helper (no longer needed with App Bridge v4 auto-injection)
export const withSessionToken = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

export default api;
