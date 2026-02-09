/**
 * Axios instance with Shopify session token authentication
 * This ensures all API requests include the session token when in embedded context
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
api.interceptors.request.use(
  async (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    
    // If we're in embedded Shopify context, try to add session token
    if (isEmbedded() && window.shopify) {
      try {
        const token = await getSessionToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('Added session token to request');
        }
      } catch (error) {
        console.log('Could not add session token (non-blocking):', error.message);
        // Continue without token - backend will still work for public endpoints
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
    // Handle 401 errors (session expired)
    if (error.response?.status === 401) {
      console.log('Session expired, may need to re-authenticate');
    }
    return Promise.reject(error);
  }
);

export default api;
