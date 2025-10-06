import { isFeatureEnabled } from '@/constants/features';
import React from 'react';
import { Text, View } from 'react-native';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * FeatureGuard component to conditionally render features based on app type
 * Usage: <FeatureGuard feature="customerBooking">{<BookingComponent />}</FeatureGuard>
 */
export default function FeatureGuard({ 
  feature, 
  children, 
  fallback = null 
}: FeatureGuardProps) {
  if (isFeatureEnabled(feature as any)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Hook to check if a feature is enabled
 */
export const useFeature = (feature: string): boolean => {
  return isFeatureEnabled(feature as any);
};

/**
 * Component to show feature not available message
 */
export function FeatureNotAvailable({ feature }: { feature: string }) {
  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
        This feature ({feature}) is not available in this app version.
      </Text>
    </View>
  );
}
