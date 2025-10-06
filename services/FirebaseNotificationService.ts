import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '../constants/api';

export interface NotificationData {
  booking_id?: string;
  status?: string;
  worker_id?: string;
  user_id?: string;
  [key: string]: any;
}

class FirebaseNotificationService {
  private static instance: FirebaseNotificationService;
  private fcmToken: string | null = null;
  private userId: number | null = null;
  private userType: 'professional' | 'seeker' | null = null;
  private isWorkerApp: boolean = false;

  private constructor() {
    // Detect if this is the worker app
    this.isWorkerApp = this.detectWorkerApp();
  }

  public static getInstance(): FirebaseNotificationService {
    if (!FirebaseNotificationService.instance) {
      FirebaseNotificationService.instance = new FirebaseNotificationService();
    }
    return FirebaseNotificationService.instance;
  }

  /**
   * Detect if this is the worker app
   */
  private detectWorkerApp(): boolean {
    try {
      // Check using Constants from expo-constants
      const appType = Constants.expoConfig?.extra?.appType;
      if (appType === 'worker') {
        return true;
      }

      // Fallback: check manifest or other indicators
      // This could also check the app name or bundle identifier
      return false;
    } catch (error) {
      console.log('Could not detect app type, defaulting to non-worker');
      return false;
    }
  }

  /**
   * Initialize Firebase messaging and request permissions
   */
  public async initialize(): Promise<void> {
    try {
      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Notification permission denied');
        return;
      }

      console.log('Notification permission granted');

      // Get FCM token
      await this.getFCMToken();

      // Set up message handlers
      this.setupMessageHandlers();

      // Handle background messages - MINIMAL interference with native Android service
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('🚨 React Native background message received:', remoteMessage);
        
        // For worker app booking alerts, let the native Android service handle fullscreen notifications
        // We ONLY store minimal data for when the app opens later
        if (remoteMessage.data?.type === 'booking_alert' && this.isWorkerApp) {
          console.log('🚨 Worker app booking alert - NATIVE SERVICE WILL HANDLE FULLSCREEN');
          console.log('🚨 React Native will NOT interfere - storing minimal data only');
          
          // Store ONLY essential data for when app opens later
          const minimalAlertData = {
            booking_id: remoteMessage.data.booking_id,
            customer_name: remoteMessage.data.customer_name,
            work_location: remoteMessage.data.work_location,
            timestamp: Date.now(),
            handled_by_native: true,
            isBackground: true
          };
          
          await AsyncStorage.setItem('pending_booking_alert', JSON.stringify(minimalAlertData));
          
          // CRITICAL: Do NOTHING else - let native service handle everything
          return;
        } else if (remoteMessage.data?.type === 'booking_alert') {
          // Regular booking alert handling for customer app (non-worker)
          console.log('🚨 Customer app booking alert - React Native will handle');
          await this.handleBackgroundBookingAlert(remoteMessage);
        } else {
          console.log('🚨 Regular background message - React Native will handle');
          // Handle other types of background messages normally
        }
      });

    } catch (error) {
      console.error('Firebase notification initialization error:', error);
    }
  }

  /**
   * Get FCM token and store it
   */
  public async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('fcm_token', token);
      
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend
   */
  public async registerTokenWithBackend(userId: number, userType: 'professional' | 'seeker', retryCount: number = 0): Promise<boolean> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    try {
      if (!this.fcmToken) {
        await this.getFCMToken();
      }

      if (!this.fcmToken) {
        console.error('No FCM token available');
        return false;
      }

      this.userId = userId;
      this.userType = userType;

      console.log('Attempting to register FCM token with backend:', {
        url: `${API_BASE_URL}/fcm-token`,
        userId,
        userType,
        tokenLength: this.fcmToken.length,
        attempt: retryCount + 1
      });

      const response = await fetch(`${API_BASE_URL}/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_type: userType === 'professional' ? 'worker' : 'customer',
          fcm_token: this.fcmToken,
        }),
      });

      if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return false;
      }

      const result = await response.json();

      if (result.success) {
        console.log('FCM token registered successfully');
        return true;
      } else {
        console.error('Failed to register FCM token:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error registering FCM token:', error);
      
      // Log more details about the error
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('Network request failed - check if backend server is running and accessible');
        console.error('Backend URL:', API_BASE_URL);
        
        // Retry logic for network failures
        if (retryCount < maxRetries) {
          console.log(`Retrying FCM token registration in ${retryDelay}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.registerTokenWithBackend(userId, userType, retryCount + 1);
        } else {
          console.error('Max retries reached for FCM token registration');
        }
      }
      
      return false;
    }
  }

  /**
   * Set up message handlers for foreground and background notifications
   */
  private setupMessageHandlers(): void {
    // Handle foreground messages - MINIMAL interference for worker app booking alerts
    messaging().onMessage(async (remoteMessage) => {
      console.log('🚨 React Native foreground message received:', remoteMessage);
      
      // For worker app booking alerts, let the native service handle fullscreen even in foreground
      // This ensures consistent behavior regardless of app state
      if (this.isWorkerApp && remoteMessage.data?.type === 'booking_alert') {
        console.log('🚨 Worker app FOREGROUND booking alert - NATIVE SERVICE WILL HANDLE');
        console.log('🚨 React Native will NOT show notification - letting native take over');
        
        // Store minimal alert data for potential app state tracking
        const minimalAlertData = {
          booking_id: remoteMessage.data.booking_id,
          customer_name: remoteMessage.data.customer_name,
          work_location: remoteMessage.data.work_location,
          timestamp: Date.now(),
          handled_by_native: true,
          isForeground: true
        };
        
        await AsyncStorage.setItem('pending_booking_alert', JSON.stringify(minimalAlertData));
        
        // CRITICAL: Do NOTHING else - let native service handle fullscreen
        return;
      }
      
      // Show local notification when app is in foreground for OTHER cases (customer app, regular notifications)
      if (remoteMessage.notification) {
        console.log('🚨 Showing React Native notification for non-worker app or non-booking alert');
        this.showLocalNotification(
          remoteMessage.notification.title || 'Notification',
          remoteMessage.notification.body || '',
          remoteMessage.data
        );
      } else if (remoteMessage.data?.notification_title) {
        // Handle data-only messages for customer app
        console.log('🚨 Showing React Native notification for data-only message');
        this.showLocalNotification(
          remoteMessage.data.notification_title as string,
          (remoteMessage.data.notification_body as string) || '',
          remoteMessage.data
        );
      }
    });

    // Handle notification tap when app is in background/closed
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationTap(remoteMessage.data);
    });

    // Handle notification tap when app is completely closed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from notification:', remoteMessage);
          this.handleNotificationTap(remoteMessage.data);
        }
      });
  }

  /**
   * Show local notification
   */
  private showLocalNotification(title: string, body: string, data?: NotificationData): void {
    if (Platform.OS === 'android') {
      // For Android, you might want to use a local notification library
      // For now, we'll just show an alert
      Alert.alert(title, body, [
        { text: 'OK', onPress: () => this.handleNotificationTap(data) }
      ]);
    } else {
      // For iOS, show alert
      Alert.alert(title, body, [
        { text: 'OK', onPress: () => this.handleNotificationTap(data) }
      ]);
    }
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(data?: NotificationData): void {
    if (!data) return;

    console.log('Handling notification tap with data:', data);

    // Handle different types of notifications
    if (data.booking_id) {
      // Navigate to booking details
      this.navigateToBooking(data.booking_id, data.status);
    } else {
      // Handle other notification types
      console.log('General notification tapped');
    }
  }

  /**
   * Navigate to booking details
   */
  private navigateToBooking(bookingId: string, status?: string): void {
    // This would typically use navigation
    // For now, we'll just log the action
    console.log(`Navigate to booking ${bookingId} with status ${status}`);
    
    // You can implement navigation logic here
    // Example: navigation.navigate('BookingDetails', { bookingId, status });
  }

  /**
   * Send test notification
   */
  public async sendTestNotification(): Promise<boolean> {
    try {
      if (!this.userId || !this.userType) {
        console.error('User not logged in');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
          user_type: this.userType,
          title: 'Test Notification',
          body: 'This is a test notification from your app!',
          data: {
            type: 'test',
            timestamp: Date.now().toString(),
          },
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  /**
   * Get current FCM token
   */
  public getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Check if notifications are enabled
   */
  public async areNotificationsEnabled(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  /**
   * Handle background booking alert
   */
  private async handleBackgroundBookingAlert(remoteMessage: any): Promise<void> {
    try {
      console.log('🚨 Handling background booking alert:', remoteMessage);
      
      // Store the alert data for when app opens
      const alertData = {
        ...remoteMessage.data,
        timestamp: Date.now(),
        isBackground: true
      };
      
      await AsyncStorage.setItem('pending_booking_alert', JSON.stringify(alertData));
      
      // Create a high-priority local notification
      await this.createBookingAlertNotification(remoteMessage);
      
    } catch (error) {
      console.error('Error handling background booking alert:', error);
    }
  }

  /**
   * Create high-priority local notification for booking alert
   */
  private async createBookingAlertNotification(remoteMessage: any): Promise<void> {
    try {
      const Notifications = await import('expo-notifications');
      
      // Configure notification behavior
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        }),
      });

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('booking-alerts', {
          name: 'Booking Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: true,
          enableLights: true,
          enableVibrate: true,
        });
      }

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 New Booking Request!',
          body: `${remoteMessage.data?.customer_name || 'Customer'} needs ${remoteMessage.data?.work_type || 'service'} at ${remoteMessage.data?.work_location}`,
          data: remoteMessage.data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'booking-alert',
        },
        trigger: null, // Show immediately
      });

    } catch (error) {
      console.error('Error creating booking alert notification:', error);
    }
  }

  /**
   * Check for pending background alerts
   */
  public async checkPendingBackgroundAlerts(): Promise<any> {
    try {
      const pendingAlert = await AsyncStorage.getItem('pending_booking_alert');
      if (pendingAlert) {
        await AsyncStorage.removeItem('pending_booking_alert');
        return JSON.parse(pendingAlert);
      }
      return null;
    } catch (error) {
      console.error('Error checking pending alerts:', error);
      return null;
    }
  }

  /**
   * Get whether this is the worker app
   */
  public isWorkerApplication(): boolean {
    return this.isWorkerApp;
  }

  /**
   * Force fullscreen notification for worker app (for testing)
   */
  public async triggerWorkerFullscreenNotification(notificationData: any): Promise<void> {
    if (!this.isWorkerApp) {
      console.log('Not a worker app, skipping fullscreen notification');
      return;
    }

    try {
      // Create a test notification that will trigger fullscreen behavior
      const testMessage = {
        notification: {
          title: notificationData.title || '🚨 New Booking Request!',
          body: notificationData.body || 'You have a new urgent booking request'
        },
        data: {
          type: 'booking_alert',
          booking_id: notificationData.booking_id || 'test_' + Date.now(),
          customer_name: notificationData.customer_name || 'Test Customer',
          work_location: notificationData.work_location || 'Test Location',
          booking_time: notificationData.booking_time || new Date().toLocaleString(),
          ...notificationData
        }
      };

      await this.handleBackgroundBookingAlert(testMessage);
    } catch (error) {
      console.error('Error triggering fullscreen notification:', error);
    }
  }

  /**
   * Clear stored data
   */
  public async clearData(): Promise<void> {
    this.fcmToken = null;
    this.userId = null;
    this.userType = null;
    await AsyncStorage.removeItem('fcm_token');
  }
}

export default FirebaseNotificationService;
