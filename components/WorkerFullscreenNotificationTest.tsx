import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FirebaseNotificationService from '../services/FirebaseNotificationService';

interface WorkerFullscreenNotificationTestProps {
  workerId?: string;
}

const WorkerFullscreenNotificationTest: React.FC<WorkerFullscreenNotificationTestProps> = ({ 
  workerId 
}) => {
  const notificationService = FirebaseNotificationService.getInstance();
  
  // Only show this component if it's the worker app
  if (!notificationService.isWorkerApplication()) {
    return null;
  }

  const triggerTestFullscreenNotification = async () => {
    try {
      const testData = {
        title: '🚨 URGENT: New Booking Request!',
        body: 'Emergency plumbing service needed immediately',
        booking_id: `TEST_${Date.now()}`,
        customer_name: 'John Smith',
        work_location: '123 Emergency Street, Urgent City',
        booking_time: new Date(Date.now() + 30 * 60000).toLocaleString(), // 30 minutes from now
        work_type: 'Emergency Plumbing',
        description: 'Burst pipe in basement - water everywhere!'
      };

      await notificationService.triggerWorkerFullscreenNotification(testData);
      
      Alert.alert(
        'Test Triggered', 
        'Fullscreen notification should appear now!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error triggering test notification:', error);
      Alert.alert(
        'Error', 
        'Failed to trigger fullscreen notification. Check console for details.',
        [{ text: 'OK' }]
      );
    }
  };

  const triggerMultipleNotifications = async () => {
    const notifications = [
      {
        title: '🚨 Urgent: Electrical Issue',
        body: 'Power outage reported',
        customer_name: 'Emergency Services',
        work_location: 'Downtown Office Building',
        work_type: 'Electrical Emergency'
      },
      {
        title: '🔧 High Priority: HVAC Repair',
        body: 'Air conditioning system failure',
        customer_name: 'City Hospital',
        work_location: 'Main Hospital Building',
        work_type: 'HVAC Emergency'
      },
      {
        title: '🚰 Critical: Water Leak',
        body: 'Major water leak in apartment complex',
        customer_name: 'Property Manager',
        work_location: 'Residential Complex A',
        work_type: 'Plumbing Emergency'
      }
    ];

    for (let i = 0; i < notifications.length; i++) {
      setTimeout(async () => {
        const testData = {
          ...notifications[i],
          booking_id: `MULTI_TEST_${Date.now()}_${i}`,
          booking_time: new Date(Date.now() + (i + 1) * 5 * 60000).toLocaleString(), // 5, 10, 15 minutes from now
          description: `Test notification ${i + 1} of ${notifications.length}`
        };
        
        await notificationService.triggerWorkerFullscreenNotification(testData);
      }, i * 3000); // 3 seconds apart
    }

    Alert.alert(
      'Multiple Tests Triggered', 
      `${notifications.length} fullscreen notifications will appear over the next ${notifications.length * 3} seconds!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={24} color="#E53E3E" />
        <Text style={styles.title}>Worker Fullscreen Notification Test</Text>
      </View>
      
      <Text style={styles.description}>
        This panel is only visible on the Worker APK. Use these buttons to test fullscreen notifications.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.testButton}
          onPress={triggerTestFullscreenNotification}
        >
          <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Test Single Fullscreen</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.testButton, styles.multiTestButton]}
          onPress={triggerMultipleNotifications}
        >
          <Ionicons name="duplicate-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Test Multiple (3x)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={16} color="#666" />
        <Text style={styles.infoText}>
          Fullscreen notifications will appear even when the phone is locked or the app is in the background.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  multiTestButton: {
    backgroundColor: '#D69E2E',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default WorkerFullscreenNotificationTest;
