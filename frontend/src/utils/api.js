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

// Shared token cache - can be set from anywhere
let cachedToken = null;
let tokenTimestamp = 0;

// Export function to set token from App.js background acquisition
export const setCachedToken = (token) => {
  if (token) {
    cachedToken = token;
    tokenTimestamp = Date.now();
    console.log('[API] Token cached from background acquisition');
  }
};

// Get token - first check cache, then try to get fresh one
const getToken = async () => {
  // Use cached token if less than 50 seconds old
  if (cachedToken && (Date.now() - tokenTimestamp) < 50000) {
    return cachedToken;
  }
  
  // Try to get fresh token if App Bridge is ready
  if (window.shopify && typeof window.shopify.idToken === 'function') {
    try {
      const token = await Promise.race([
        window.shopify.idToken(),
        new Promise((resolve) => setTimeout(() => resolve(null), 2000))
      ]);
      
      if (token) {
        cachedToken = token;
        tokenTimestamp = Date.now();
        return token;
      }
    } catch (e) {
      console.log('[API] Token fetch error:', e.message);
    }
  }
  
  return cachedToken; // Return cached even if expired, better than nothing
};

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Request interceptor to add session token
api.interceptors.request.use(
  async (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    
    if (isEmbedded()) {
      const token = await getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('[API] Request authenticated with session token');
      } else {
        console.log('[API] No token available, proceeding without');
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
    if (error.response?.status === 401) {
      console.error('Authentication failed - clearing cached token');
      cachedToken = null;
      tokenTimestamp = 0;
    }
    return Promise.reject(error);
  }
);

export default api;
