import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NotificationPermissionPromptProps {
  visible: boolean;
  onClose: () => void;
  onGrantPermissions: () => void;
}

const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  visible,
  onClose,
  onGrantPermissions
}) => {
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onGrantPermissions();
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>🔔 Enable Notifications</Text>
            <Text style={styles.stepDescription}>
              To receive urgent booking alerts even when your phone is locked or the app is closed, 
              please enable notification permissions.
            </Text>
            <View style={styles.benefitsList}>
              <Text style={styles.benefit}>✅ Get instant booking alerts</Text>
              <Text style={styles.benefit}>✅ Receive notifications when app is closed</Text>
              <Text style={styles.benefit}>✅ See alerts when phone is locked</Text>
              <Text style={styles.benefit}>✅ Never miss urgent requests</Text>
            </View>
          </>
        );
      
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>📱 Enable Display Over Other Apps</Text>
            <Text style={styles.stepDescription}>
              To show fullscreen booking alerts when your phone is locked or app is closed, 
              please enable "Display over other apps" permission.
            </Text>
            <View style={styles.benefitsList}>
              <Text style={styles.benefit}>✅ Fullscreen alerts when app is closed</Text>
              <Text style={styles.benefit}>✅ Alerts appear over lock screen</Text>
              <Text style={styles.benefit}>✅ Urgent booking notifications</Text>
              <Text style={styles.benefit}>✅ Never miss critical requests</Text>
            </View>
          </>
        );
      
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>🔋 Disable Battery Optimization</Text>
            <Text style={styles.stepDescription}>
              Android may kill background services to save battery. To ensure notifications work 
              when the app is closed, please disable battery optimization for this app.
            </Text>
            <View style={styles.benefitsList}>
              <Text style={styles.benefit}>✅ Notifications work when app is closed</Text>
              <Text style={styles.benefit}>✅ Background services stay active</Text>
              <Text style={styles.benefit}>✅ Reliable notification delivery</Text>
              <Text style={styles.benefit}>✅ Minimal battery impact</Text>
            </View>
          </>
        );
      
      default:
        return null;
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>{step} of 3</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            {renderStepContent()}
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.nextButton} 
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {step === 3 ? 'Complete Setup' : 'Next'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(step / 3) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    alignSelf: 'stretch',
  },
  benefit: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
    paddingLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E53E3E',
    borderRadius: 2,
  },
});

export default NotificationPermissionPrompt;
