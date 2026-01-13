import { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  // Ensure dimensions are available, use defaults for initial render
  const width = windowWidth || 1920; // Default to desktop width
  const height = windowHeight || 1080; // Default to desktop height
  
  // Responsive scaling functions
  const scale = (size: number) => (width / 375) * size; // Base width 375
  const verticalScale = (size: number) => (height / 812) * size; // Base height 812
  const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Helper function to check if session is expired (1 hour = 3600000 ms)
  const isSessionExpired = (loginTime: number): boolean => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return (now - loginTime) > oneHour;
  };

  // Helper function to clear admin session
  const clearAdminSession = async () => {
    try {
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('adminUser');
      await AsyncStorage.removeItem('adminLoginTime');
    } catch (error) {
      console.error('Error clearing admin session:', error);
    }
  };

  // Check if admin is already logged in
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const adminToken = await AsyncStorage.getItem('adminToken');
        const loginTimeStr = await AsyncStorage.getItem('adminLoginTime');
        
        if (adminToken && loginTimeStr) {
          const loginTime = parseInt(loginTimeStr, 10);
          
          // Check if session has expired
          if (isSessionExpired(loginTime)) {
            // Session expired, clear it
            await clearAdminSession();
            // Stay on login page
            return;
          }
          
          // Session is valid, redirect to admin dashboard
          router.replace('/admin/dashboard');
        } else if (adminToken && !loginTimeStr) {
          // Old session without timestamp, clear it for security
          await clearAdminSession();
        }
      } catch (error) {
        console.error('Error checking admin auth:', error);
      }
    };
    checkAdminAuth();
  }, []);

  // Auto-clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);


  const handleLogin = async () => {
    // Clear previous error
    setErrorMessage('');
    
    if (!username || !password) {
      setErrorMessage('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.admin) {
        // Save admin token, user data, and login timestamp
        const loginTime = Date.now();
        await AsyncStorage.setItem('adminToken', data.token || 'admin_authenticated');
        await AsyncStorage.setItem('adminUser', JSON.stringify(data.admin));
        await AsyncStorage.setItem('adminLoginTime', loginTime.toString());
        
        // Navigate to admin dashboard
        router.replace({
          pathname: '/admin/dashboard',
        } as any);
      } else {
        // Show error message below input fields
        setErrorMessage('Invalid username or password');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please contact your administrator to reset your password.');
  };

  // Create responsive styles
  const styles = createStyles(width, height, scale, verticalScale, moderateScale);

  // Add global style to remove default focus outline on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus {
          outline: none !important;
          border: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        
        <View style={styles.backgroundContainer}>
          {/* Background Image - Full Screen */}
          <Image
            source={require('@/assets/images/adminscreen.png')}
            style={styles.backgroundImage}
            contentFit="cover"
          />
          
          {/* Form Card - Centered (Web View Style) */}
          <View style={styles.formContainer}>
            <View style={styles.contentWrapper}>
              <View style={styles.formCard}>
                <View style={styles.headerSection}>
                  <View style={styles.iconContainer}>
                    <Image
                      source={require('@/assets/images/OriginX.png')}
                      style={styles.logoImage}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={styles.title}>Welcome Back</Text>
                  <Text style={styles.subtitle}>Sign in to your admin account</Text>
                </View>
                
                {/* Username Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username</Text>
                  <View style={[
                    styles.inputWrapper,
                    focusedInput === 'username' && styles.inputWrapperFocused,
                    errorMessage && styles.inputWrapperError
                  ]}>
                    <View style={styles.iconWrapper}>
                      <Ionicons 
                        name="person-outline" 
                        size={width > 768 ? 22 : 20} 
                        color={focusedInput === 'username' ? "#1e3a8a" : "#8B6F47"} 
                      />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your username"
                      placeholderTextColor="#999"
                      value={username}
                      onChangeText={(text) => {
                        setUsername(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      onFocus={() => setFocusedInput('username')}
                      onBlur={() => setFocusedInput(null)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.passwordLabelContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[
                    styles.inputWrapper,
                    focusedInput === 'password' && styles.inputWrapperFocused,
                    errorMessage && styles.inputWrapperError
                  ]}>
                    <View style={styles.iconWrapper}>
                      <Ionicons 
                        name="lock-closed-outline" 
                        size={width > 768 ? 22 : 20} 
                        color={focusedInput === 'password' ? "#1e3a8a" : "#8B6F47"} 
                      />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      underlineColorAndroid="transparent"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={width > 768 ? 20 : 18} 
                        color={focusedInput === 'password' ? "#1e3a8a" : "#8B6F47"} 
                      />
                    </TouchableOpacity>
                  </View>
                  {errorMessage && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  )}
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, (isLoading || !username || !password) && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={isLoading || !username || !password}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.loginButtonText}>Log In</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Function to create responsive styles
const createStyles = (
  width: number,
  height: number,
  scale: (size: number) => number,
  verticalScale: (size: number) => number,
  moderateScale: (size: number, factor?: number) => number
) => StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: width > 768 ? 450 : Math.max(width * 0.9, 320),
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: '#ddc9aeff',
    borderRadius: 20,
    padding: width > 768 ? 28 : 24,
    width: '100%',
    minWidth: width > 768 ? 420 : 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: width > 768 ? 120 : 100,
    height: width > 768 ? 50 : 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: verticalScale(25),
  },
  logo: {
    width: scale(200),
    height: verticalScale(70),
    marginBottom: verticalScale(10),
  },
  divider: {
    width: scale(60),
    height: 2,
    backgroundColor: '#FFC107',
    marginBottom: verticalScale(10),
  },
  websiteText: {
    fontSize: moderateScale(13),
    color: '#333',
    fontWeight: '400',
  },
  title: {
    fontSize: width > 768 ? 38 : 32,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 6,
    width: '100%',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    width: '100%',
    letterSpacing: 0.2,
  },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: width > 768 ? 15 : 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: width > 768 ? 52 : 48,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: '#1e3a8a',
    borderWidth: 2.5,
    backgroundColor: '#ffffff',
    shadowColor: '#1e3a8a',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    transform: [{ scale: 1.01 }],
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  iconWrapper: {
    width: width > 768 ? 36 : 32,
    height: width > 768 ? 36 : 32,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputIcon: {
    marginRight: 14,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: width > 768 ? 16 : 15,
    color: '#1e293b',
    paddingVertical: width > 768 ? 16 : 14,
    fontWeight: '600',
    borderWidth: 0,
    letterSpacing: 0.2,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
    cursor: 'pointer',
    borderRadius: 8,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    paddingVertical: width > 768 ? 16 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 0,
    width: '100%',
    cursor: 'pointer',
    shadowColor: '#1e3a8a',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
    opacity: 0.7,
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: width > 768 ? 17 : 16,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  forgotPasswordText: {
    fontSize: width > 768 ? 13 : 12,
    color: '#1e3a8a',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  errorText: {
    fontSize: width > 768 ? 13 : 12,
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});

