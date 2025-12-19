import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

import NotificationInitializer from '@/components/NotificationInitializer';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { useColorScheme } from '@/hooks/useColorScheme';

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[
        styles.toastContainer,
        styles.toastRight,
        { backgroundColor: '#ecfdf5', borderRightColor: '#10b981' }, // light green background with green accent
      ]}
      contentContainerStyle={styles.toastContent}
      text1Style={[styles.toastText1, { color: '#065f46' }]}
      text2Style={[styles.toastText2, { color: '#065f46' }]}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[
        styles.toastContainer,
        styles.toastRight,
        { backgroundColor: '#fff1f2', borderRightColor: '#ef4444' }, // light red background with red accent
      ]}
      contentContainerStyle={styles.toastContent}
      text1Style={[styles.toastText1, { color: '#7f1d1d' }]}
      text2Style={[styles.toastText2, { color: '#7f1d1d' }]}
    />
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    alignSelf: 'flex-end',
    marginRight: 20,
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  toastRight: {
    transform: [{ translateX: 0 }],
  },
  toastContent: {
    paddingHorizontal: 15,
  },
  toastText1: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  toastText2: {
    fontSize: 13,
  },
});

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
                <Stack.Screen name="admin/index" options={{ headerShown: false }} />
                <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
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
      <Toast 
        config={toastConfig}
        position="top"
        autoHide={true}
        visibilityTime={3000}
        topOffset={60}
      />
    </GestureHandlerRootView>
  );
}
