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
    
    // If we're in embedded Shopify context, try to add session token
    if (isEmbedded() && window.shopify && typeof window.shopify.idToken === 'function') {
      try {
        // Get token with a short timeout to not block requests
        const tokenPromise = window.shopify.idToken();
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve(null), 3000)
        );
        
        const token = await Promise.race([tokenPromise, timeoutPromise]);
        
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('[API] Request authenticated with session token');
        } else {
          console.log('[API] Token timeout, proceeding without');
        }
      } catch (error) {
        console.log('[API] Token error, proceeding without:', error.message);
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
      console.error('Authentication failed - session may have expired');
    }
    return Promise.reject(error);
  }
);

export default api;
