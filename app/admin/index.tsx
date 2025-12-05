import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminIndexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const handleLogout = async () => {
    try {
      // Clear admin authentication data
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('adminUser');
      
      // Redirect to admin login
      router.replace('/admin/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect even if there's an error
      router.replace('/admin/login');
    }
  };

  const styles = createStyles(width);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarContent}>
            <Text style={styles.topBarTitle}>Admin Dashboard</Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons 
                name="log-out-outline" 
                size={width > 768 ? 24 : 22} 
                color="#1e3a8a" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.contentText}>Hello</Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const createStyles = (width: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: width > 768 ? 24 : 16,
    paddingVertical: width > 768 ? 16 : 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentText: {
    fontSize: width > 768 ? 24 : 20,
    color: '#333',
  },
});