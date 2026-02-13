/**
 * Axios instance with Shopify session token authentication
 * 
 * CRITICAL: Shopify "Embedded app checks" requires:
 * 1. App Bridge CDN script loaded with data-api-key
 * 2. Session tokens used for API authentication (Authorization header)
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

// Request interceptor - add session token for Shopify compliance
api.interceptors.request.use(
  async (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    
    // Add session token if in embedded context
    if (isEmbedded() && window.shopify && typeof window.shopify.idToken === 'function') {
      try {
        const token = await window.shopify.idToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('[Auth] Session token added to request');
        }
      } catch (e) {
        console.log('[Auth] Could not get token:', e.message);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export const setCachedToken = () => {};

export default api;
