/**
 * Axios instance for API requests
 * App Bridge CDN automatically handles session tokens for fetch,
 * but we use axios for better error handling.
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

// Simple request logging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
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

// Export for backwards compatibility
export const setCachedToken = () => {};

export default api;
