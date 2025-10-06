import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseNotifications } from '../hooks/useFirebaseNotifications';

const NotificationTest: React.FC = () => {
  const { fcmToken, areNotificationsEnabled, sendTestNotification, isInitialized } = useFirebaseNotifications();
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);

  const handleSendTestNotification = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    setIsSending(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        Alert.alert('Success', 'Test notification sent successfully!');
      } else {
        Alert.alert('Error', 'Failed to send test notification');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while sending notification');
    } finally {
      setIsSending(false);
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Initializing notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Notifications Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.label}>Notifications Enabled:</Text>
        <Text style={[styles.value, { color: areNotificationsEnabled ? 'green' : 'red' }]}>
          {areNotificationsEnabled ? 'Yes' : 'No'}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.label}>FCM Token:</Text>
        <Text style={styles.value} numberOfLines={3}>
          {fcmToken ? fcmToken.substring(0, 50) + '...' : 'Not available'}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.label}>User Logged In:</Text>
        <Text style={[styles.value, { color: user ? 'green' : 'red' }]}>
          {user ? 'Yes' : 'No'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (!areNotificationsEnabled || !user || isSending) && styles.buttonDisabled]}
        onPress={handleSendTestNotification}
        disabled={!areNotificationsEnabled || !user || isSending}
      >
        <Text style={styles.buttonText}>
          {isSending ? 'Sending...' : 'Send Test Notification'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        Make sure you have logged in and granted notification permissions to test notifications.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});

export default NotificationTest;
