import { isCustomerApp, isWorkerApp } from '@/constants/features';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for router to be ready
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady) {
      // Web platform - redirect to admin
      if (Platform.OS === 'web') {
        router.replace('/admin');
        return;
      }
      
      // Redirect based on app type
      if (isCustomerApp()) {
        // Customer app - go to main tabs (which will handle auth checks)
        router.replace('/(tabs)');
      } else if (isWorkerApp()) {
        // Worker app - go to login screen
        router.replace('/login');
      } else {
        // Default fallback - go to login
        router.replace('/login');
      }
    }
  }, [isReady, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#667eea' }}>
      <Text style={{ color: 'white', fontSize: 18 }}>Loading...</Text>
    </View>
  );
}
