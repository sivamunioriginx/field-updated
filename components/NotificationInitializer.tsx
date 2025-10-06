import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseNotifications } from '../hooks/useFirebaseNotifications';

interface NotificationInitializerProps {
  children: React.ReactNode;
}

const NotificationInitializer: React.FC<NotificationInitializerProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { isInitialized, registerToken } = useFirebaseNotifications();

  useEffect(() => {
    // Register FCM token when user logs in
    if (isInitialized && isAuthenticated && user) {
      const userType = user.type === 1 ? 'professional' : 'seeker';
      registerToken(parseInt(user.id), userType).catch((error) => {
        console.error('Failed to register FCM token:', error);
      });
    }
  }, [isInitialized, isAuthenticated, user, registerToken]);

  return <>{children}</>;
};

export default NotificationInitializer;
