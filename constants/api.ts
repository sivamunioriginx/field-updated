
// API Configuration
const getBaseUrl = () => {
  if (!__DEV__) {
    // ngrok URL for sharing APKs with friends
    return 'https://lois-nonenvironmental-alisa.ngrok-free.dev/api';
  }
  
  // For physical devices, use your computer's IP address:
  return 'http://192.168.31.84:3001/api'; // Physical device IP
  
  // For emulators (uncomment if needed):
  // if (Platform.OS === 'android') {
  //   // For Android emulator
  //   return 'http://10.0.2.2:3001/api';
  // } else {
  //   // For iOS simulator
  //   return 'http://localhost:3001/api';
  // }
  
  // Alternative: Use ngrok tunnel (if available)
  // return 'https://your-ngrok-url.ngrok.io/api'; // Replace with actual ngrok URL
};

// Get your computer's IP address and update the line above
// Windows: ipconfig
// Mac/Linux: ifconfig
// Look for your WiFi IP (usually starts with 192.168.x.x or 10.0.x.x)

export const API_ENDPOINTS = {
  HEALTH: `${getBaseUrl()}/health`,
  REGISTER_PROFESSIONAL: `${getBaseUrl()}/register-professional`,
  UPDATE_WORKER: `${getBaseUrl()}/workers`,
  WORKERS: `${getBaseUrl()}/workers`,
  WORKER_BY_ID: (id: string) => `${getBaseUrl()}/workers/${id}`,
  CUSTOMER_BY_ID: (id: number | string) => `${getBaseUrl()}/admin/customers/${id}`,
  REGISTER_SERVICESEEKER: `${getBaseUrl()}/register-serviceseeker`,
  UPDATE_SERVICESEEKER: (id: string) => `${getBaseUrl()}/serviceseeker/${id}`,
  SERVICESEEKER_BY_MOBILE: (mobile: string) => `${getBaseUrl()}/serviceseeker/mobile/${mobile}`,
  CATEGORIES: `${getBaseUrl()}/categories`,
  SUBCATEGORIES: `${getBaseUrl()}/subcategories`,
  SUBCATEGORY_BY_ID: (id: string) => `${getBaseUrl()}/subcategory/${id}`,
  BANNERS: `${getBaseUrl()}/banners`,
  CATEGORY_SUBCATEGORY: `${getBaseUrl()}/category-subcategory`,
  CATEGORIES_WITH_SUBCATEGORIES: `${getBaseUrl()}/categories-with-subcategories`,
  CATEGORIE_SUGGESTIONS: (query: string) => `${getBaseUrl()}/categorie-suggestions?query=${encodeURIComponent(query)}`,
  WORKERS_NEARBY: (lat: number, lng: number, skillId: string) =>
    `${getBaseUrl()}/workers-nearby?lat=${lat}&lng=${lng}&skill_id=${skillId}`,
  LOGIN: `${getBaseUrl()}/login`,
  ADMIN_LOGIN: `${getBaseUrl()}/admin/login`,
  SEND_OTP: `${getBaseUrl()}/send-otp`,
  VERIFY_OTP: `${getBaseUrl()}/verify-otp`,
  BOOKINGS: `${getBaseUrl()}/bookings`,
  BOOKINGS_BY_WORKER: (workerId: string) => `${getBaseUrl()}/bookings/worker/${workerId}?status=1`,
  TOTAL_BOOKINGS_BY_WORKER: (workerId: string) => `${getBaseUrl()}/bookings/worker/${workerId}?status=2,3`,
  UPDATE_BOOKING_STATUS: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/status`,
  REQUEST_BOOKING_START: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/request-start`,
  CONFIRM_BOOKING_START: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/confirm-start`,
  EXPIRE_BOOKING_START_CODE: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/expire-start-code`,
  REQUEST_BOOKING_COMPLETE: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/request-complete`,
  CONFIRM_BOOKING_COMPLETE: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/confirm-complete`,
  EXPIRE_BOOKING_COMPLETE_CODE: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/expire-complete-code`,
  WORKER_BOOKING_ONHOLD_COMMENT: (bookingId: number) =>
    `${getBaseUrl()}/bookings/${bookingId}/worker-on-hold-comment`,
  CUSTOMER_BOOKING_ONHOLD_COMMENT: (bookingId: number) =>
    `${getBaseUrl()}/bookings/${bookingId}/customer-on-hold-comment`,
  CUSTOMER_BOOKING_WORK_COMMENT: (bookingId: number) =>
    `${getBaseUrl()}/bookings/${bookingId}/customer-work-comment`,
  WORKER_BOOKING_WORK_COMMENT: (bookingId: number) =>
    `${getBaseUrl()}/bookings/${bookingId}/worker-work-comment`,
  UPDATE_BOOKING_PAYMENT: (bookingId: string) => `${getBaseUrl()}/bookings/${bookingId}/payment`,
  ASSIGN_TO_OTHER_WORKER: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/assign-other-worker`,
  CHECK_BOOKING_STATUS: (bookingId: string) => `${getBaseUrl()}/bookings/check-status/${bookingId}`,
  REVERT_TO_CANCEL_REQUEST: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/revert-to-cancel-request`,
  ACCEPT_CANCEL_REQUEST: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/accept-cancel-request`,
  REJECT_CANCEL_REQUEST: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/reject-cancel-request`,
  REJECT_RESCHEDULE_REQUEST: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/reject-reschedule-request`,
  CHECK_USER_EXISTS: (mobile?: string, email?: string, userType?: string) => {
    const params = new URLSearchParams();
    if (mobile) params.append('mobile', mobile);
    if (email) params.append('email', email);
    if (userType) params.append('userType', userType);
    return `${getBaseUrl()}/check-user-exists?${params.toString()}`;
  },
  
  // Add these new endpoints for service seeker bookings
  BOOKINGS_BY_USER: (userId: string) => `${getBaseUrl()}/bookings/user/${userId}?status=1,2,3,4,5,6`,
  TOTAL_BOOKINGS_BY_USER: (userId: string) => `${getBaseUrl()}/bookings/user/${userId}`,
  PAYMENTS_BY_USER: (userId: string) => `${getBaseUrl()}/payments/user/${userId}`,
  
  // Add this new endpoint for getting all service seekers
  ALL_SERVICESEEKERS: `${getBaseUrl()}/serviceseekers`,
  
  // Add endpoint for uploading work documents
  UPLOAD_WORK_DOCUMENTS: `${getBaseUrl()}/upload-work-documents`,
  UPLOAD_QUOTE_DOCUMENTS: `${getBaseUrl()}/upload-quote-documents`,
  
  // Add endpoints for worker location tracking
  WORKER_LOCATION: `${getBaseUrl()}/worker-location`,
  WORKER_LOCATION_BY_ID: (workerId: string) => `${getBaseUrl()}/worker-location/${workerId}`,
  
  // Add endpoints for services
  SERVICES: `${getBaseUrl()}/services`,
  SERVICES_BY_SUBCATEGORY: (subcategoryId: string) => `${getBaseUrl()}/services/${subcategoryId}`,
  SEARCH_SERVICES: (query: string) => `${getBaseUrl()}/services/search?q=${encodeURIComponent(query)}`,
  REQUEST_QUOTE: `${getBaseUrl()}/request-quote`,
  
  // Admin endpoints
  ADMIN_BOOKINGS: `${getBaseUrl()}/admin/bookings`,
  ADMIN_RESCHEDULE_BOOKING: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/admin-reschedule`,
  ADMIN_PAYMENTS: `${getBaseUrl()}/admin/payments`,
  ADMIN_CUSTOMERS: `${getBaseUrl()}/admin/customers`,
  ADMIN_WORKERS: `${getBaseUrl()}/admin/workers`,
  ADMIN_QUOTES: `${getBaseUrl()}/admin/quotes`,
  ADMIN_CATEGORIES: `${getBaseUrl()}/admin/categories`,
  ADMIN_SUBCATEGORIES: `${getBaseUrl()}/admin/subcategories`,
  ADMIN_SERVICES: `${getBaseUrl()}/admin/services`,
  ADMIN_ANIMATIONS: `${getBaseUrl()}/admin/animations`,
  ACTIVE_ANIMATION: `${getBaseUrl()}/active-animation`,
  SUBMIT_RATING: `${getBaseUrl()}/customer-ratings`,
  GET_RATINGS: `${getBaseUrl()}/customer-ratings`,
  ADMIN_REVIEWS_RATINGS: `${getBaseUrl()}/admin/reviews-ratings`,
  ADMIN_FAQS_PROCESS: `${getBaseUrl()}/admin/faqs-process`,
  ADMIN_ANALYSIS_CATEGORY_BOOKINGS: `${getBaseUrl()}/admin/analysis/category-bookings`,
  ADMIN_ANALYSIS_SUBCATEGORY_BOOKINGS: `${getBaseUrl()}/admin/analysis/subcategory-bookings`,
  ADMIN_ANALYSIS_SERVICE_BOOKINGS: `${getBaseUrl()}/admin/analysis/service-bookings`,
  ADMIN_ANALYSIS_BOOKING_BREAKDOWN: `${getBaseUrl()}/admin/analysis/booking-breakdown`,
  ADMIN_ANALYSIS_PAYMENT_MONTHLY: `${getBaseUrl()}/admin/analysis/payment-monthly`,
  ADMIN_ANALYSIS_PAYMENT_DAILY: `${getBaseUrl()}/admin/analysis/payment-daily`,
  
  // Google Places API proxy endpoints (to avoid CORS)
  GOOGLE_PLACES_AUTOCOMPLETE: (input: string) => `${getBaseUrl()}/google/places/autocomplete?input=${encodeURIComponent(input)}`,
  GOOGLE_PLACES_DETAILS: (placeId: string) => `${getBaseUrl()}/google/places/details?place_id=${encodeURIComponent(placeId)}`,
  GOOGLE_GEOCODE_REVERSE: (lat: number, lng: number) => `${getBaseUrl()}/google/geocode/reverse?lat=${lat}&lng=${lng}`,
};

export const API_BASE_URL = getBaseUrl();

// Base URL without /api suffix (for image/document URLs)
export const BASE_URL = API_BASE_URL.replace('/api', '');

export default getBaseUrl;