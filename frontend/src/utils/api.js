/**
 * Axios instance with Shopify session token authentication
 * This ensures all API requests include the session token when in embedded context
 * 
 * IMPORTANT: Session token authentication is REQUIRED for Shopify App Store approval
 */
import axios from 'axios';
import { getSessionToken, isEmbedded } from './shopifyAuth';

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
    
    // If we're in embedded Shopify context, try to add session token (non-blocking)
    if (isEmbedded()) {
      try {
        // Check if App Bridge is already available (don't wait if not)
        if (window.shopify && typeof window.shopify.idToken === 'function') {
          // App Bridge ready - get token with short timeout
          const tokenPromise = window.shopify.idToken();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Token timeout')), 2000)
          );
          
          try {
            const token = await Promise.race([tokenPromise, timeoutPromise]);
            if (token) {
              config.headers['Authorization'] = `Bearer ${token}`;
              console.log('Request authenticated with session token');
            }
          } catch (e) {
            console.log('Session token not ready, proceeding without:', e.message);
          }
        } else {
          console.log('App Bridge not ready, proceeding without session token');
        }
      } catch (error) {
        console.error('Failed to get session token:', error.message);
        // Continue without token - some endpoints may still work
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
      // Could trigger re-authentication here if needed
    }
    return Promise.reject(error);
  }
);

export default api;
