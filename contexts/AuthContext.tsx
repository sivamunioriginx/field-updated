import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import FirebaseNotificationService from '../services/FirebaseNotificationService';

interface User {
  id: string;
  name: string;
  mobile: string;
  email: string;
  profileImage?: string;
  type: number; // 1 for worker, 2 for service seeker
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isMountedRef = useRef(true);

  const isAuthenticated = !!user;

  // Check if user is already logged in when app starts
  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  // Login function
  const login = async (userData: User) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Register FCM token with backend after successful login
      const notificationService = FirebaseNotificationService.getInstance();
      const userType = userData.type === 1 ? 'professional' : 'seeker';
      await notificationService.registerTokenWithBackend(parseInt(userData.id), userType);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    if (isLoggingOut || !isMountedRef.current) {
      return; // Prevent multiple simultaneous logout attempts or updates after unmount
    }
    
    try {
      setIsLoggingOut(true);
      await AsyncStorage.removeItem('user');
      
      // Clear Firebase notification data
      const notificationService = FirebaseNotificationService.getInstance();
      await notificationService.clearData();
      
      if (isMountedRef.current) {
        setUser(null);
      }
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  };

  // Update user data
  const updateUser = async (userData: Partial<User>) => {
    if (!isMountedRef.current || !user) {
      return;
    }
    
    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  // Check auth state on mount
  useEffect(() => {
    // Add a small delay to ensure the provider is fully mounted
    const timer = setTimeout(() => {
      checkAuthState();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Cleanup effect to prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    login,
    logout,
    checkAuthState,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn('useAuth must be used within an AuthProvider. Returning default values.');
    // Return default context to prevent crashes during initialization
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: async () => {
        console.warn('Login called outside AuthProvider');
      },
      logout: async () => {
        console.warn('Logout called outside AuthProvider');
      },
      checkAuthState: async () => {
        console.warn('checkAuthState called outside AuthProvider');
      },
      updateUser: async () => {
        console.warn('updateUser called outside AuthProvider');
      },
    };
  }
  return context;
};
