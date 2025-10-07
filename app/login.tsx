import { API_ENDPOINTS } from '@/constants/api';
import { isCustomerApp, isWorkerApp } from '@/constants/features';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { login, isAuthenticated, user } = useAuth();
  const { width, height } = useWindowDimensions();
  
  // Responsive scaling functions
  const scale = (size: number) => (width / 375) * size; // Base width 375 (iPhone X)
  const verticalScale = (size: number) => (height / 812) * size; // Base height 812
  const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;
  
  const [showOtpInput, setShowOtpInput] = useState(false);
  // Automatically set user type based on app type
  const [userType] = useState<'professional' | 'seeker'>(() => {
    if (isCustomerApp()) {
      return 'seeker'; // type = 2 for customers
    } else if (isWorkerApp()) {
      return 'professional'; // type = 1 for workers
    }
    return 'professional'; // default fallback
  });
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.type === 1) {
        router.replace('/workerindex');
      } else if (user.type === 2) {
        router.replace('/serviceseekerindex');
      }
    }
  }, [isAuthenticated, user]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSendOTP = async () => {
    if (!mobile || mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, userType }),
      });

      const data = await response.json();

      if (data.success) {
        setShowOtpInput(true);
        setCountdown(60); // 60 seconds countdown
        Alert.alert('Success', 'OTP sent successfully to your mobile number');
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, userType }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.requiresRegistration) {
          // User needs to register
          if (userType === 'professional') {
            router.push('/register-professional');
          } else {
            router.push('/register-serviceseeker');
          }
        } else {
          // User exists - login successful
          const userData = {
            id: data.data.id,
            name: data.data.name,
            mobile: data.data.mobile,
            email: data.data.email,
            profileImage: data.data.profile_image,
            type: data.data.type
          };
          
          // Save user data to context and storage
          await login(userData);
          
          // Navigate based on user type
          if (data.data.type === 1) {
            router.replace('/workerindex');
          } else if (data.data.type === 2) {
            router.replace('/serviceseekerindex');
          }
        }
      } else {
        Alert.alert('Error', data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (countdown === 0) {
      handleSendOTP();
    }
  };

  const goBack = () => {
    if (showOtpInput) {
      setShowOtpInput(false);
      setOtp('');
      setCountdown(0);
    } else {
      // Only go back if we're in customer app
      if (isCustomerApp()) {
        router.replace('/(tabs)');
      }
    }
  };

  // Create responsive styles
  const styles = createStyles(width, height, scale, verticalScale, moderateScale);

  const renderOTPLogin = () => (
    <>
      {/* Mobile Number Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputContainer}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="call" size={moderateScale(20)} color="#667eea" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter your mobile number"
            placeholderTextColor="#a0aec0"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      </View>

      {/* User Type Display */}
      <View style={styles.userTypeDisplay}>
        <View style={styles.userTypeBadge}>
          <Ionicons 
            name={userType === 'professional' ? "construct" : "search"} 
            size={moderateScale(16)} 
            color="#667eea" 
          />
          <Text style={styles.userTypeText}>
            {userType === 'professional' ? 'Work Professional' : 'Service Seeker'}
          </Text>
        </View>
      </View>

      {/* Send OTP Button */}
      <TouchableOpacity 
        style={[styles.authButton, isLoading && styles.disabledButton]} 
        onPress={handleSendOTP}
        disabled={isLoading}
      >
        <View style={styles.authButtonContent}>
          <Text style={styles.authButtonText}>
            {isLoading ? 'Sending...' : 'Send OTP'}
          </Text>
          <View style={styles.authButtonIcon}>
            <Ionicons name="send" size={moderateScale(20)} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    </>
  );

  const renderOTPInput = () => (
    <>
      <View style={styles.inputGroup}>
        <View style={styles.inputContainer}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="key" size={moderateScale(20)} color="#667eea" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor="#a0aec0"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={true}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        style={[styles.authButton, isLoading && styles.disabledButton]} 
        onPress={handleVerifyOTP}
        disabled={isLoading}
      >
        <View style={styles.authButtonContent}>
          <Text style={styles.authButtonText}>
            {isLoading ? 'Verifying...' : 'Submit'}
          </Text>
          <View style={styles.authButtonIcon}>
            <Ionicons name="checkmark" size={moderateScale(20)} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Resend OTP */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity 
          onPress={handleResendOTP}
          disabled={countdown > 0}
        >
          <Text style={[
            styles.resendLink,
            countdown > 0 && styles.disabledLink
          ]}>
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        
        <View style={styles.background}>
          {/* Animated Background Elements */}
          <View style={[styles.gradientCircle1, { width: width * 1.1, height: width * 1.1, borderRadius: width * 0.55 }]} />
          <View style={[styles.gradientCircle2, { width: width * 1.4, height: width * 1.4, borderRadius: width * 0.7 }]} />
          <View style={[styles.gradientCircle3, { width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35 }]} />
          <View style={[styles.floatingShape1, { width: width * 0.27, height: width * 0.27, borderRadius: width * 0.135 }]} />
          <View style={[styles.floatingShape2, { width: width * 0.22, height: width * 0.22, borderRadius: width * 0.11 }]} />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              {/* Only show back button for customer app */}
              {isCustomerApp() && (
                <TouchableOpacity 
                  style={styles.menuButton}
                  onPress={goBack}
                >
                  <Ionicons name="arrow-back" size={moderateScale(28)} color="#fff" />
                </TouchableOpacity>
              )}
              
              <View style={[
                styles.logoContainer,
                !isCustomerApp() && styles.logoContainerCentered
              ]}>
                <Image
                  source={require('@/assets/images/OriginX.png')}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
            </View>

            {/* Main Content */}
            <View style={[styles.mainContent, showOtpInput && styles.mainContentOtp]}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {showOtpInput ? 'Enter OTP' : `Welcome ${userType === 'professional' ? 'Worker' : 'Customer'}!`}
                </Text>
                <Text style={styles.subtitle}>
                  {showOtpInput 
                    ? `We've sent a 6-digit code to ${mobile}`
                    : 'Sign in with your mobile number'
                  }
                </Text>
              </View>

              {/* Form Container */}
              <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {showOtpInput ? 'Enter OTP' : `${userType === 'professional' ? 'Worker' : 'Customer'} Login`}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    {showOtpInput 
                      ? 'Enter the verification code sent to your mobile'
                      : 'Enter your mobile number to continue'
                    }
                  </Text>
                </View>

                {showOtpInput ? (
                  renderOTPInput()
                ) : (
                  renderOTPLogin()
                )}
              </View>

                             {/* Sign Up Button */}
               {!showOtpInput && (
                 <View style={styles.signupContainer}>
                   <TouchableOpacity 
                     onPress={() => {
                       if (userType === 'professional') {
                         router.push('/register-professional');
                       } else {
                         router.push('/register-serviceseeker');
                       }
                     }}
                   >
                     <Text style={styles.signupButtonText}>Don't have an account? <Text style={styles.signupLink}>Sign Up</Text></Text>
                   </TouchableOpacity>
                 </View>
               )}
            </View>
          </Animated.View>
        </ScrollView>
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
  background: {
    flex: 1,
    backgroundColor: '#667eea',
    position: 'relative',
  },
  gradientCircle1: {
    position: 'absolute',
    top: verticalScale(-150),
    right: scale(-150),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradientCircle2: {
    position: 'absolute',
    bottom: verticalScale(-200),
    left: scale(-200),
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
  },
  gradientCircle3: {
    position: 'absolute',
    top: '40%',
    right: scale(-100),
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
  },
  floatingShape1: {
    position: 'absolute',
    top: '20%',
    left: scale(-50),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '45deg' }],
  },
  floatingShape2: {
    position: 'absolute',
    bottom: '30%',
    right: scale(50),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    transform: [{ rotate: '-30deg' }],
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: width * 0.06,
    paddingVertical: verticalScale(20),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    paddingTop: verticalScale(10),
  },
  menuButton: {
    padding: scale(5),
    marginLeft: scale(-15),
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoContainerCentered: {
    marginLeft: 0,
  },
  logo: {
    height: verticalScale(60),
    width: '50%',
    maxWidth: scale(180),
    tintColor: '#fff',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    marginTop: verticalScale(-30),
  },
  mainContentOtp: {
    marginTop: verticalScale(-90),
  },
  titleContainer: {
    marginBottom: verticalScale(40),
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: verticalScale(12),
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: verticalScale(2) },
    textShadowRadius: scale(4),
  },
  subtitle: {
    fontSize: moderateScale(15),
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: moderateScale(22),
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: scale(30),
    padding: width * 0.06,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: verticalScale(20),
    },
    shadowOpacity: 0.3,
    shadowRadius: scale(30),
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  formHeader: {
    marginBottom: verticalScale(25),
    alignItems: 'center',
  },
  formTitle: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: verticalScale(8),
  },
  formSubtitle: {
    fontSize: moderateScale(14),
    color: '#718096',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: verticalScale(20),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: scale(20),
    paddingHorizontal: width * 0.05,
    borderWidth: scale(2),
    borderColor: '#e2e8f0',
    minHeight: verticalScale(56),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: verticalScale(2),
    },
    shadowOpacity: 0.05,
    shadowRadius: scale(4),
    elevation: 2,
  },
  inputIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(15),
    color: '#2d3748',
    fontWeight: '600',
  },
  radioGroup: {
    marginBottom: verticalScale(25),
  },
  radioGroupTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: verticalScale(15),
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  radioButton: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: scale(2),
    borderColor: '#667eea',
    marginRight: scale(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#667eea',
  },
  radioLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#2d3748',
    marginLeft: scale(10),
  },
  userTypeDisplay: {
    marginBottom: verticalScale(25),
    alignItems: 'center',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  userTypeText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#667eea',
    marginLeft: scale(8),
  },
  authButton: {
    borderRadius: scale(25),
    overflow: 'hidden',
    marginBottom: verticalScale(25),
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: verticalScale(10),
    },
    shadowOpacity: 0.4,
    shadowRadius: scale(20),
    elevation: 15,
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
    shadowOpacity: 0.2,
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: width * 0.08,
  },
  authButtonText: {
    color: '#fff',
    fontSize: moderateScale(17),
    fontWeight: '700',
    marginRight: scale(10),
  },
  authButtonIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#718096',
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  resendLink: {
    color: '#667eea',
    fontSize: moderateScale(16),
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  disabledLink: {
    color: '#a0aec0',
    textDecorationLine: 'none',
  },
  signupContainer: {
    marginTop: verticalScale(20),
    alignItems: 'center',
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(20),
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: scale(15),
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  signupLink: {
    color: '#fff',
    fontWeight: '700',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: verticalScale(1) },
    textShadowRadius: scale(2),
  },
}); 