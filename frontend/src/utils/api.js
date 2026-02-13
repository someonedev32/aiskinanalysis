/**
 * API utility for making authenticated requests
 * 
 * Session tokens are handled by individual components using useShopifySessionToken hook
 * This is the base axios instance with common configuration
 */
import axios from 'axios';

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

// Request logging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    if (config.headers['Authorization']) {
      console.log('[Auth] Request includes session token');
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response logging
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

// Helper to create authenticated request config
export const withSessionToken = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

export default api;
