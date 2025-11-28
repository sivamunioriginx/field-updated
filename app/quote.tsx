import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

export default function QuoteScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  // Form state
  const [workDescription, setWorkDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
  const [showVideoActionSheet, setShowVideoActionSheet] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Create responsive styles
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);
  
  // Calculate footer padding
  const footerPaddingBottom = useMemo(() => {
    const basePadding = screenHeight * 0.12;
    return basePadding;
  }, [screenHeight]);
  
  // Get responsive icon size (similar to cart.tsx)
  const getIconSize = (baseSize: number) => {
    const baseWidth = 375;
    const scaledSize = (baseSize * screenWidth) / baseWidth;
    return Math.max(18, Math.min(30, scaledSize));
  };
  
  // Request permissions for media
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera and media library permissions to upload images and videos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };
  
  // Handle photo selection from gallery
  const handleSelectPhotos = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMedia(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access gallery. Please try again.');
    }
  };
  
  // Handle photo capture from camera
  const handleCapturePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMedia(prev => [...prev, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };
  
  // Handle video selection from gallery
  const handleSelectVideos = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        allowsEditing: false,
        videoMaxDuration: 60,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMedia(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access gallery. Please try again.');
    }
  };
  
  // Handle video capture from camera
  const handleCaptureVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        videoMaxDuration: 60,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMedia(prev => [...prev, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture video. Please try again.');
    }
  };
  
  // Show photo selection options
  const showPhotoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleCapturePhoto();
          } else if (buttonIndex === 2) {
            handleSelectPhotos();
          }
        }
      );
    } else {
      setShowPhotoActionSheet(true);
    }
  };
  
  // Show video selection options
  const showVideoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleCaptureVideo();
          } else if (buttonIndex === 2) {
            handleSelectVideos();
          }
        }
      );
    } else {
      setShowVideoActionSheet(true);
    }
  };
  
  // Remove media item
  const removeMediaItem = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };
  
  // Upload media files
  const uploadMediaFiles = async (mediaFiles: ImagePicker.ImagePickerAsset[]) => {
    if (mediaFiles.length === 0) return null;
    
    try {
      const formData = new FormData();
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        
        if (!media.uri) continue;
        
        const fileExtension = media.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `quote_${Date.now()}_${i}.${fileExtension}`;
        
        let mimeType = 'image/jpeg';
        if (['mp4', 'mov', 'avi', 'mkv', 'm4v', 'webm'].includes(fileExtension)) {
          mimeType = 'video/mp4';
        } else if (['jpg', 'jpeg'].includes(fileExtension)) {
          mimeType = 'image/jpeg';
        } else if (fileExtension === 'png') {
          mimeType = 'image/png';
        } else if (fileExtension === 'gif') {
          mimeType = 'image/gif';
        }
        
        const fileObject = {
          uri: media.uri,
          type: mimeType,
          name: fileName,
        } as any;
        
        formData.append('quoteDocuments', fileObject);
      }
      
      const response = await fetch(API_ENDPOINTS.UPLOAD_QUOTE_DOCUMENTS, {
        method: 'POST',
        body: formData,
        headers: {},
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      
      if (result.success && result.files) {
        return result.files.map((file: any) => file.path).join(',');
      }
      
      throw new Error(result.message || 'Upload failed');
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Login Required', 'Please login to request a quote');
      router.push('/login');
      return;
    }

    if (!workDescription.trim()) {
      Alert.alert('Error', 'Please provide a work description.');
      return;
    }
    
    if (!location.trim()) {
      Alert.alert('Error', 'Please provide the work location.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload media files if any
      let mediaPaths = null;
      if (selectedMedia.length > 0) {
        mediaPaths = await uploadMediaFiles(selectedMedia);
      }
      
      // Prepare quote data
      const quoteData = {
        customer_id: user.id,
        work_description: workDescription,
        location: location,
        documents: mediaPaths,
      };
      
      // Submit quote request
      const response = await fetch(API_ENDPOINTS.REQUEST_QUOTE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setShowSuccessModal(true);
      } else {
        throw new Error(result.message || 'Failed to submit quote request');
      }
    } catch (error: any) {
      console.error('Error submitting quote:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to submit quote request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={getIconSize(22)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request a Quote</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Work Description *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the work you need to be done..."
            placeholderTextColor="#999"
            value={workDescription}
            onChangeText={setWorkDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>
        
        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Work Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the work location address"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            value={location}
            onChangeText={setLocation}
          />
        </View>
        
        {/* Media Upload Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Work-Related Images/Videos</Text>
          <Text style={styles.hint}>Upload images or videos related to your work (Optional)</Text>
          
          {/* Photo and Video Upload Buttons */}
          <View style={styles.uploadButtonsContainer}>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={showPhotoOptions}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={24} color="#00BFFF" />
              <Text style={styles.uploadButtonText}>Add Photos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={showVideoOptions}
              activeOpacity={0.7}
            >
              <Ionicons name="videocam-outline" size={24} color="#00BFFF" />
              <Text style={styles.uploadButtonText}>Add Videos</Text>
            </TouchableOpacity>
          </View>
          
          {/* Display selected media */}
          {selectedMedia.length > 0 && (
            <View style={styles.mediaContainer}>
              {selectedMedia.map((media, index) => (
                <View key={index} style={styles.mediaItem}>
                  {media.type === 'video' ? (
                    <Video
                      source={{ uri: media.uri }}
                      style={styles.mediaPreview}
                      resizeMode={ResizeMode.COVER}
                      useNativeControls
                    />
                  ) : (
                    <Image
                      source={{ uri: media.uri }}
                      style={styles.mediaPreview}
                      contentFit="cover"
                    />
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => removeMediaItem(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer with Submit Button */}
      <View style={styles.footer}>
        {isAuthenticated ? (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Request a Quote</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
            <Text style={styles.primaryButtonText}>Login/Sign up to proceed</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Android Action Sheet Modal for Photos */}
      <Modal
        visible={showPhotoActionSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhotoActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoActionSheet(false)}
        >
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetContent}>
              {/* Handle indicator */}
              <View style={styles.actionSheetHandle} />
              
              <TouchableOpacity
                style={styles.actionSheetButton}
                activeOpacity={0.7}
                onPress={() => {
                  setShowPhotoActionSheet(false);
                  handleCapturePhoto();
                }}
              >
                <View style={styles.actionSheetIconContainer}>
                  <Ionicons name="camera" size={26} color="#00BFFF" />
                </View>
                <Text style={styles.actionSheetButtonText}>Camera</Text>
              </TouchableOpacity>
              
              <View style={styles.actionSheetDivider} />
              
              <TouchableOpacity
                style={styles.actionSheetButton}
                activeOpacity={0.7}
                onPress={() => {
                  setShowPhotoActionSheet(false);
                  handleSelectPhotos();
                }}
              >
                <View style={styles.actionSheetIconContainer}>
                  <Ionicons name="images" size={26} color="#00BFFF" />
                </View>
                <Text style={styles.actionSheetButtonText}>Gallery</Text>
              </TouchableOpacity>
              
              <View style={styles.actionSheetCancelDivider} />
              
              <TouchableOpacity
                style={styles.actionSheetCancelButton}
                activeOpacity={0.7}
                onPress={() => setShowPhotoActionSheet(false)}
              >
                <Text style={styles.actionSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Android Action Sheet Modal for Videos */}
      <Modal
        visible={showVideoActionSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVideoActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowVideoActionSheet(false)}
        >
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetContent}>
              {/* Handle indicator */}
              <View style={styles.actionSheetHandle} />
              
              <TouchableOpacity
                style={styles.actionSheetButton}
                activeOpacity={0.7}
                onPress={() => {
                  setShowVideoActionSheet(false);
                  handleCaptureVideo();
                }}
              >
                <View style={styles.actionSheetIconContainer}>
                  <Ionicons name="videocam" size={26} color="#00BFFF" />
                </View>
                <Text style={styles.actionSheetButtonText}>Camera</Text>
              </TouchableOpacity>
              
              <View style={styles.actionSheetDivider} />
              
              <TouchableOpacity
                style={styles.actionSheetButton}
                activeOpacity={0.7}
                onPress={() => {
                  setShowVideoActionSheet(false);
                  handleSelectVideos();
                }}
              >
                <View style={styles.actionSheetIconContainer}>
                  <Ionicons name="film" size={26} color="#00BFFF" />
                </View>
                <Text style={styles.actionSheetButtonText}>Gallery</Text>
              </TouchableOpacity>
              
              <View style={styles.actionSheetCancelDivider} />
              
              <TouchableOpacity
                style={styles.actionSheetCancelButton}
                activeOpacity={0.7}
                onPress={() => setShowVideoActionSheet(false)}
              >
                <Text style={styles.actionSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={48} color="#32CD32" />
            </View>
            <Text style={styles.successModalTitle}>Quote Request Sent</Text>
            <Text style={styles.successModalMessage}>
              We received your request. Our team will contact you soon.
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => {
                setShowSuccessModal(false);
                setWorkDescription('');
                setLocation('');
                setSelectedMedia([]);
                router.back();
              }}
            >
              <Text style={styles.successModalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (screenHeight: number, screenWidth: number) => {
  const baseWidth = 375;
  const baseHeight = 812;

  const moderateScale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * factor;
  };

  const scale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * factor;
  };

  const scaleHeight = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenHeight) / baseHeight;
    return size + (scaledSize - size) * factor;
  };

  const getResponsiveValue = (baseValue: number, minValue?: number, maxValue?: number) => {
    const scaledValue = scaleHeight(baseValue, 1);
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  const getResponsiveWidth = (baseValue: number, minValue?: number, maxValue?: number) => {
    const scaledValue = scale(baseValue, 1);
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  const getResponsiveFontSize = (baseSize: number) => {
    const scaledSize = moderateScale(baseSize, 0.5);
    return Math.max(10, Math.min(28, scaledSize));
  };

  const getResponsiveSpacing = (baseSpacing: number) => {
    return Math.max(2, scale(baseSpacing, 0.5));
  };

  const getResponsiveSpacingWithNegative = (baseSpacing: number) => {
    return scale(baseSpacing, 0.5);
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getResponsiveWidth(20),
      paddingTop: getResponsiveValue(35, 25, 45),
      paddingBottom: getResponsiveValue(10, 8, 12),
      backgroundColor: '#8B5CF6',
    },
    backButton: {
      marginRight: getResponsiveSpacing(12),
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700',
      color: '#FFFFFF',
    },
    headerRight: {
      width: getResponsiveWidth(32),
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: getResponsiveSpacing(16),
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: getResponsiveSpacing(12),
      paddingBottom: getResponsiveSpacing(10),
      paddingTop: getResponsiveSpacing(2),
      backgroundColor: '#FFFFFF',
    },
    primaryButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(26),
      paddingVertical: getResponsiveValue(12, 10, 14),
      alignItems: 'center',
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    primaryButtonText: {
      color: '#FFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    section: {
      marginBottom: getResponsiveSpacing(24),
    },
    sectionTitle: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '700',
      color: '#000',
      marginBottom: getResponsiveSpacing(12),
    },
    label: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveSpacing(8),
    },
    hint: {
      fontSize: getResponsiveFontSize(12),
      color: '#999',
      marginTop: getResponsiveSpacing(4),
    },
    input: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: getResponsiveSpacing(8),
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(12),
      fontSize: getResponsiveFontSize(14),
      color: '#000',
      backgroundColor: '#F8F9FA',
    },
    textArea: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: getResponsiveSpacing(8),
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(12),
      fontSize: getResponsiveFontSize(14),
      color: '#000',
      backgroundColor: '#F8F9FA',
      minHeight: scaleHeight(100),
    },
    uploadButtonsContainer: {
      flexDirection: 'row',
      gap: getResponsiveSpacing(12),
      marginTop: getResponsiveSpacing(8),
    },
    uploadButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#00BFFF',
      borderStyle: 'dashed',
      borderRadius: getResponsiveSpacing(8),
      paddingVertical: getResponsiveSpacing(16),
      backgroundColor: '#F0F8FF',
    },
    uploadButtonText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#00BFFF',
      marginLeft: getResponsiveSpacing(8),
    },
    mediaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: getResponsiveSpacing(12),
      gap: getResponsiveSpacing(12),
    },
    mediaItem: {
      width: (screenWidth - getResponsiveSpacing(64)) / 3,
      height: (screenWidth - getResponsiveSpacing(64)) / 3,
      borderRadius: getResponsiveSpacing(8),
      overflow: 'hidden',
      position: 'relative',
    },
    mediaPreview: {
      width: '100%',
      height: '100%',
    },
    removeMediaButton: {
      position: 'absolute',
      top: getResponsiveSpacing(4),
      right: getResponsiveSpacing(4),
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: getResponsiveSpacing(12),
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#00BFFF',
      borderRadius: getResponsiveSpacing(26),
      paddingVertical: getResponsiveValue(12, 10, 14),
      gap: getResponsiveSpacing(8),
      shadowColor: '#00BFFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '700',
      color: '#FFF',
    },
    // Action Sheet Styles (Android)
    actionSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    actionSheetContainer: {
      justifyContent: 'flex-end',
    },
    actionSheetContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: getResponsiveSpacing(24),
      borderTopRightRadius: getResponsiveSpacing(24),
      paddingBottom: getResponsiveValue(12, 10, 16),
      paddingTop: getResponsiveSpacing(8),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: getResponsiveSpacing(12),
      elevation: 16,
    },
    actionSheetHandle: {
      width: getResponsiveWidth(40),
      height: getResponsiveSpacing(4),
      backgroundColor: '#D0D0D0',
      borderRadius: getResponsiveSpacing(2),
      alignSelf: 'center',
      marginBottom: getResponsiveSpacing(4),
    },
    actionSheetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getResponsiveSpacing(10),
      paddingHorizontal: getResponsiveWidth(20),
      gap: getResponsiveSpacing(12),
    },
    actionSheetIconContainer: {
      width: getResponsiveWidth(36),
      height: getResponsiveWidth(36),
      borderRadius: getResponsiveWidth(18),
      backgroundColor: '#F0F8FF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionSheetButtonText: {
      fontSize: getResponsiveFontSize(18),
      color: '#1A1A1A',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    actionSheetDivider: {
      height: 1,
      backgroundColor: '#D0D0D0',
      marginHorizontal: getResponsiveWidth(20),
    },
    actionSheetCancelDivider: {
      height: getResponsiveSpacing(3),
      backgroundColor: '#F8F8F8',
    },
    actionSheetCancelButton: {
      paddingVertical: getResponsiveSpacing(8),
      paddingHorizontal: getResponsiveWidth(20),
      alignItems: 'center',
      borderRadius: getResponsiveSpacing(12),
      marginHorizontal: getResponsiveWidth(16),
      marginTop: getResponsiveSpacing(16),
      marginBottom: getResponsiveSpacing(-5),
      backgroundColor: '#bbdce7ff',
    },
    actionSheetCancelText: {
      fontSize: getResponsiveFontSize(16),
      color: '#242323ff',
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    successModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: getResponsiveSpacing(24),
    },
    successModalContent: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(16),
      padding: getResponsiveSpacing(24),
      alignItems: 'center',
    },
    successIconWrapper: {
      width: getResponsiveWidth(70),
      height: getResponsiveWidth(70),
      borderRadius: getResponsiveWidth(35),
      backgroundColor: '#E8FBE8',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(16),
    },
    successModalTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: getResponsiveSpacing(8),
      textAlign: 'center',
    },
    successModalMessage: {
      fontSize: getResponsiveFontSize(14),
      color: '#475569',
      textAlign: 'center',
      marginBottom: getResponsiveSpacing(20),
      lineHeight: getResponsiveFontSize(18),
    },
    successModalButton: {
      width: '100%',
      backgroundColor: '#00BFFF',
      paddingVertical: getResponsiveSpacing(12),
      borderRadius: getResponsiveSpacing(10),
      alignItems: 'center',
    },
    successModalButtonText: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
};

