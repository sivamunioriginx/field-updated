import { isCustomerApp, isWorkerApp } from './features';

// Shared backend configuration for both APKs
export const BACKEND_CONFIG = {
  // Base URL - Same for both APKs
  BASE_URL: 'https://your-backend-domain.com/api',
  
  // API endpoints - Shared between both APKs
  ENDPOINTS: {
    // Authentication
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    
    // User management
    USER_PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile/update',
    
    // File upload
    UPLOAD_FILE: '/upload/file',
    UPLOAD_IMAGE: '/upload/image',
    
    // Messaging
    SEND_MESSAGE: '/messages/send',
    GET_MESSAGES: '/messages',
    
    // Customer specific endpoints (only available in customer app)
    CUSTOMER: {
      SEARCH_WORKERS: '/customer/search-workers',
      BOOK_SERVICE: '/customer/book-service',
      GET_BOOKINGS: '/customer/bookings',
      RATE_WORKER: '/customer/rate-worker',
      PAYMENT: '/customer/payment',
      LOCATION_SERVICES: '/customer/location-services',
    },
    
    // Worker specific endpoints (only available in worker app)
    WORKER: {
      GET_BOOKINGS: '/worker/bookings',
      UPDATE_BOOKING_STATUS: '/worker/booking-status',
      GET_EARNINGS: '/worker/earnings',
      UPDATE_SCHEDULE: '/worker/schedule',
      UPLOAD_DOCUMENTS: '/worker/documents',
    }
  },
  
  // Headers configuration
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Timeout configuration
  TIMEOUT: 30000, // 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Helper function to get appropriate endpoints based on app type
export const getEndpoints = () => {
  if (isCustomerApp()) {
    return {
      ...BACKEND_CONFIG.ENDPOINTS,
      ...BACKEND_CONFIG.ENDPOINTS.CUSTOMER,
    };
  } else if (isWorkerApp()) {
    return {
      ...BACKEND_CONFIG.ENDPOINTS,
      ...BACKEND_CONFIG.ENDPOINTS.WORKER,
    };
  }
  
  return BACKEND_CONFIG.ENDPOINTS;
};

// Helper function to check if endpoint is available for current app type
export const isEndpointAvailable = (endpoint: string): boolean => {
  const endpoints = getEndpoints();
  return Object.values(endpoints).includes(endpoint);
};

// Helper function to get full URL for endpoint
export const getFullUrl = (endpoint: string): string => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};
