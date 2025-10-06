import { useEffect, useState } from 'react';
import FirebaseNotificationService from '../services/FirebaseNotificationService';

interface UseFirebaseNotificationsReturn {
  isInitialized: boolean;
  fcmToken: string | null;
  areNotificationsEnabled: boolean;
  sendTestNotification: () => Promise<boolean>;
  registerToken: (userId: number, userType: 'professional' | 'seeker') => Promise<boolean>;
  clearData: () => Promise<void>;
}

export const useFirebaseNotifications = (): UseFirebaseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(false);

  const notificationService = FirebaseNotificationService.getInstance();

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
      const token = notificationService.getCurrentToken();
      const enabled = await notificationService.areNotificationsEnabled();
      
      setFcmToken(token);
      setAreNotificationsEnabled(enabled);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setIsInitialized(true); // Still mark as initialized to prevent infinite loading
    }
  };

  const registerToken = async (userId: number, userType: 'professional' | 'seeker'): Promise<boolean> => {
    try {
      const success = await notificationService.registerTokenWithBackend(userId, userType);
      if (success) {
        const token = notificationService.getCurrentToken();
        setFcmToken(token);
      }
      return success;
    } catch (error) {
      console.error('Failed to register token:', error);
      return false;
    }
  };

  const sendTestNotification = async (): Promise<boolean> => {
    try {
      return await notificationService.sendTestNotification();
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  };

  const clearData = async (): Promise<void> => {
    try {
      await notificationService.clearData();
      setFcmToken(null);
      setAreNotificationsEnabled(false);
    } catch (error) {
      console.error('Failed to clear notification data:', error);
    }
  };

  return {
    isInitialized,
    fcmToken,
    areNotificationsEnabled,
    sendTestNotification,
    registerToken,
    clearData,
  };
};
