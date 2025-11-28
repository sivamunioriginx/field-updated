import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import NotificationInitializer from '@/components/NotificationInitializer';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <CartProvider>
          <NotificationInitializer>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="register-professional" options={{ headerShown: false }} />
                <Stack.Screen name="register-serviceseeker" options={{ headerShown: false }} />
                <Stack.Screen name="workers-list" options={{ headerShown: false }} />
                <Stack.Screen name="workerindex" options={{ headerShown: false }} />
                <Stack.Screen name="serviceseekerindex" options={{ headerShown: false }} />
                <Stack.Screen name="services-screen" options={{ headerShown: false }} />
                <Stack.Screen name="search-screen" options={{ headerShown: false }} />
                <Stack.Screen name="location-picker" options={{ headerShown: false }} />
                <Stack.Screen name="checkout" options={{ headerShown: false }} />
                <Stack.Screen name="cart" options={{ headerShown: false }} />
                <Stack.Screen name="quote" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </NotificationInitializer>
        </CartProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
