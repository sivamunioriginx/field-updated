import * as Application from 'expo-application';
import Constants from 'expo-constants';

// Get the app type from package name or environment variables
const getAppTypeFromPackage = (): 'customer' | 'worker' => {
  // Try multiple methods to get the package name
  const packageName = 
    Application.applicationId || 
    Constants.expoConfig?.android?.package || 
    Constants.expoConfig?.ios?.bundleIdentifier || 
    '';
  
  console.log('Package Name from Application:', Application.applicationId);
  console.log('Package Name from Constants:', Constants.expoConfig?.android?.package);
  console.log('Final Package Name:', packageName);
  console.log('Constants.expoConfig:', Constants.expoConfig);
  
  if (packageName.includes('customer')) {
    console.log('Detected as Customer app');
    return 'customer';
  } else if (packageName.includes('worker')) {
    console.log('Detected as Worker app');
    return 'worker';
  }
  
  // Fallback to environment variable
  const fallbackType = Constants.expoConfig?.extra?.appType || 'customer';
  console.log('Using fallback app type:', fallbackType);
  return fallbackType;
};

const appType = getAppTypeFromPackage();
console.log('Final app type determined:', appType);

export interface FeatureConfig {
  // Customer features
  customerBooking: boolean;
  customerSearch: boolean;
  customerProfile: boolean;
  customerReviews: boolean;
  customerPayments: boolean;
  customerNotifications: boolean;
  customerLocationServices: boolean;
  
  // Worker features
  workerBookings: boolean;
  workerProfile: boolean;
  workerEarnings: boolean;
  workerSchedule: boolean;
  workerDocuments: boolean;
  workerNotifications: boolean;
  
  // Shared features
  authentication: boolean;
  messaging: boolean;
  fileUpload: boolean;
  cameraAccess: boolean;
}

// Feature configuration based on app type
export const features: FeatureConfig = {
  // Customer APK - All features enabled
  customerBooking: appType === 'customer',
  customerSearch: appType === 'customer',
  customerProfile: appType === 'customer',
  customerReviews: appType === 'customer',
  customerPayments: appType === 'customer',
  customerNotifications: appType === 'customer',
  customerLocationServices: appType === 'customer',
  
  // Worker APK - Limited features
  workerBookings: appType === 'worker',
  workerProfile: appType === 'worker',
  workerEarnings: appType === 'worker',
  workerSchedule: appType === 'worker',
  workerDocuments: appType === 'worker',
  workerNotifications: appType === 'worker',
  
  // Shared features - Available in both APKs
  authentication: true,
  messaging: true,
  fileUpload: true,
  cameraAccess: true,
};

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof FeatureConfig): boolean => {
  return features[feature];
};

// Helper function to get app type
export const getAppType = (): 'customer' | 'worker' => {
  return appType as 'customer' | 'worker';
};

// Helper function to check if current app is customer app
export const isCustomerApp = (): boolean => {
  return appType === 'customer';
};

// Helper function to check if current app is worker app
export const isWorkerApp = (): boolean => {
  return appType === 'worker';
};
