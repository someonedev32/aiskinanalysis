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

// Shared token cache
let cachedToken = null;
let tokenTimestamp = 0;
let tokenAcquisitionInProgress = null;

// Export function to set token from App.js background acquisition
export const setCachedToken = (token) => {
  if (token) {
    cachedToken = token;
    tokenTimestamp = Date.now();
    console.log('[API] Token cached successfully');
  }
};

// Start acquiring token immediately on module load
const startTokenAcquisition = () => {
  if (!isEmbedded()) return Promise.resolve(null);
  
  tokenAcquisitionInProgress = new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 40; // 20 seconds max
    
    const tryGetToken = () => {
      attempts++;
      
      if (window.shopify && typeof window.shopify.idToken === 'function') {
        console.log('[API] App Bridge found, getting token...');
        
        window.shopify.idToken()
          .then(token => {
            if (token) {
              cachedToken = token;
              tokenTimestamp = Date.now();
              console.log('[API] Initial token acquired successfully');
              resolve(token);
            } else {
              resolve(null);
            }
          })
          .catch(err => {
            console.log('[API] Token error:', err.message);
            resolve(null);
          });
      } else if (attempts < maxAttempts) {
        setTimeout(tryGetToken, 500);
      } else {
        console.log('[API] App Bridge not available after timeout');
        resolve(null);
      }
    };
    
    // Start immediately
    tryGetToken();
  });
  
  return tokenAcquisitionInProgress;
};

// Start acquisition immediately when module loads
startTokenAcquisition();

// Get token - wait for initial acquisition if in progress
const getToken = async () => {
  // If we have a fresh cached token, use it
  if (cachedToken && (Date.now() - tokenTimestamp) < 50000) {
    return cachedToken;
  }
  
  // If initial acquisition is in progress, wait for it (max 3 seconds)
  if (tokenAcquisitionInProgress) {
    try {
      const token = await Promise.race([
        tokenAcquisitionInProgress,
        new Promise(resolve => setTimeout(() => resolve(null), 3000))
      ]);
      if (token) return token;
    } catch (e) {
      // Continue
    }
  }
  
  // Try to get fresh token
  if (window.shopify && typeof window.shopify.idToken === 'function') {
    try {
      const token = await Promise.race([
        window.shopify.idToken(),
        new Promise(resolve => setTimeout(() => resolve(null), 2000))
      ]);
      
      if (token) {
        cachedToken = token;
        tokenTimestamp = Date.now();
        return token;
      }
    } catch (e) {
      console.log('[API] Token refresh error:', e.message);
    }
  }
  
  return cachedToken;
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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Auth failed - clearing token');
      cachedToken = null;
      tokenTimestamp = 0;
    }
    return Promise.reject(error);
  }
);

export default api;
