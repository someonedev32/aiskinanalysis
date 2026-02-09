/**
 * Axios instance with Shopify session token authentication
 * This ensures all API requests include the session token when in embedded context
 */
import axios from 'axios';
import { getSessionToken, isEmbedded } from './shopifyAuth';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add session token
api.interceptors.request.use(
  async (config) => {
    // If we're in embedded Shopify context, add session token
    if (isEmbedded() && window.shopify) {
      try {
        const token = await getSessionToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('Added session token to API request:', config.url);
        }
      } catch (error) {
        console.log('Could not add session token:', error.message);
      }
    }
    return config;
  },
  (error) => {
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
