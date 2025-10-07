
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
  REGISTER_SERVICESEEKER: `${getBaseUrl()}/register-serviceseeker`,
  UPDATE_SERVICESEEKER: (id: string) => `${getBaseUrl()}/serviceseeker/${id}`,
  SERVICESEEKER_BY_MOBILE: (mobile: string) => `${getBaseUrl()}/serviceseeker/mobile/${mobile}`,
  CATEGORIES: `${getBaseUrl()}/categories`,
  CATEGORY_SUBCATEGORY: `${getBaseUrl()}/category-subcategory`,
  CATEGORIE_SUGGESTIONS: (query: string) => `${getBaseUrl()}/categorie-suggestions?query=${encodeURIComponent(query)}`,
  WORKERS_NEARBY: (lat: number, lng: number, skillId: string) =>
    `${getBaseUrl()}/workers-nearby?lat=${lat}&lng=${lng}&skill_id=${skillId}`,
  LOGIN: `${getBaseUrl()}/login`,
  SEND_OTP: `${getBaseUrl()}/send-otp`,
  VERIFY_OTP: `${getBaseUrl()}/verify-otp`,
  BOOKINGS: `${getBaseUrl()}/bookings`,
  BOOKINGS_BY_WORKER: (workerId: string) => `${getBaseUrl()}/bookings/worker/${workerId}?status=0,4`,
  // Add this new endpoint for total bookings (status != 0)
  TOTAL_BOOKINGS_BY_WORKER: (workerId: string) => `${getBaseUrl()}/bookings/worker/${workerId}?status=1,2,3,4`,
  UPDATE_BOOKING_STATUS: (bookingId: number) => `${getBaseUrl()}/bookings/${bookingId}/status`,
  CHECK_USER_EXISTS: (mobile?: string, email?: string, userType?: string) => {
    const params = new URLSearchParams();
    if (mobile) params.append('mobile', mobile);
    if (email) params.append('email', email);
    if (userType) params.append('userType', userType);
    return `${getBaseUrl()}/check-user-exists?${params.toString()}`;
  },
  
  // Add these new endpoints for service seeker bookings
  BOOKINGS_BY_USER: (userId: string) => `${getBaseUrl()}/bookings/user/${userId}?status=0`,
  TOTAL_BOOKINGS_BY_USER: (userId: string) => `${getBaseUrl()}/bookings/user/${userId}`,
  
  // Add this new endpoint for getting all service seekers
  ALL_SERVICESEEKERS: `${getBaseUrl()}/serviceseekers`,
  
  // Add endpoint for uploading work documents
  UPLOAD_WORK_DOCUMENTS: `${getBaseUrl()}/upload-work-documents`,
  
  // Add endpoints for worker location tracking
  WORKER_LOCATION: `${getBaseUrl()}/worker-location`,
  WORKER_LOCATION_BY_ID: (workerId: string) => `${getBaseUrl()}/worker-location/${workerId}`,
};

export const API_BASE_URL = getBaseUrl();

export default getBaseUrl;