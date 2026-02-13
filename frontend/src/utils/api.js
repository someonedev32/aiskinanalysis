/**
 * API utility with Shopify session token authentication
 * 
 * IMPORTANT: The current version of App Bridge CDN automatically adds
 * session tokens to fetch() requests. We use the native fetch API
 * which App Bridge enhances automatically.
 */
import { isEmbedded } from './shopifyAuth';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://aiskinanalysis.onrender.com';

console.log('API_URL configured as:', API_URL);

// Use native fetch which App Bridge CDN automatically authenticates
const api = {
  async request(method, endpoint, data = null, params = {}) {
    // Build URL with query params
    let url = `${API_URL}/api${endpoint}`;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    
    console.log(`API Request: ${method} ${endpoint}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    try {
      // Use native fetch - App Bridge CDN automatically adds session token
      const response = await fetch(url, options);
      
      // Log if authenticated (check for Authorization header in request)
      if (isEmbedded()) {
        console.log('[API] Request sent via fetch (App Bridge handles auth)');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || `HTTP ${response.status}`);
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      const responseData = await response.json();
      return { data: responseData, status: response.status };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  get(endpoint, config = {}) {
    return this.request('GET', endpoint, null, config.params || {});
  },
  
  post(endpoint, data = {}, config = {}) {
    return this.request('POST', endpoint, data, config.params || {});
  },
  
  put(endpoint, data = {}, config = {}) {
    return this.request('PUT', endpoint, data, config.params || {});
  },
  
  delete(endpoint, config = {}) {
    return this.request('DELETE', endpoint, null, config.params || {});
  }
};

// Export setCachedToken for backwards compatibility (no longer needed)
export const setCachedToken = () => {};

export default api;
