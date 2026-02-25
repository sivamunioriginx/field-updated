import { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router, Stack } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = 'AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ';

// Type definitions
interface Suggestion {
  id: string;
  place_id?: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export default function RegisterServiceSeekerScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);
  
  // Helper function for responsive icon sizes
  const getIconSize = (baseSize: number) => {
    const baseWidth = 375;
    const scaledSize = (baseSize * screenWidth) / baseWidth;
    const moderateScaled = baseSize + (scaledSize - baseSize) * 0.5;
    return Math.max(12, Math.min(32, moderateScaled));
  };
  
  // Helper function for responsive height values
  const getResponsiveHeight = (baseHeight: number) => {
    const baseHeightRef = 812;
    const scaledHeight = (baseHeight * screenHeight) / baseHeightRef;
    const moderateScaled = baseHeight + (scaledHeight - baseHeight) * 0.5;
    return moderateScaled;
  };
  
  // Form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [personalDocuments, setPersonalDocuments] = useState<any[]>([]);
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  
  // Hidden location fields
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Location autocomplete
  const [locationSuggestions, setLocationSuggestions] = useState<Suggestion[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  // Validation states
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  
  // Error auto-dismiss timers
  const errorTimers = useRef<{ [key: string]: any }>({});
  
  // Function to auto-dismiss error after 5 seconds
  const setErrorWithAutoDismiss = (errorType: string, errorMessage: string) => {
    // Clear existing timer for this error type
    if (errorTimers.current[errorType]) {
      clearTimeout(errorTimers.current[errorType]);
    }
    
    // Set the error message
    switch (errorType) {
      case 'name':
        setNameError(errorMessage);
        break;
      case 'mobile':
        setMobileError(errorMessage);
        break;
      case 'email':
        setEmailError(errorMessage);
        break;
      case 'location':
        setLocationError(errorMessage);
        break;
      case 'address':
        setAddressError(errorMessage);
        break;
    }
    
    // Set timer to clear error after 5 seconds
    errorTimers.current[errorType] = setTimeout(() => {
      switch (errorType) {
        case 'name':
          setNameError('');
          break;
        case 'mobile':
          setMobileError('');
          break;
        case 'email':
          setEmailError('');
          break;
        case 'location':
          setLocationError('');
          break;
        case 'address':
          setAddressError('');
          break;
      }
      // Clean up timer reference
      delete errorTimers.current[errorType];
    }, 5000);
  };
  
  // Debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const emailValidationTimer = useRef<NodeJS.Timeout | null>(null);
  const isSelectingSuggestion = useRef(false);

  // Add ref for location input tracking
  const locationInputRef = useRef<TextInput>(null);

  // Add areaName state
  const [areaName, setAreaName] = useState('');

  // Cleanup function to clear all error timers when component unmounts
  React.useEffect(() => {
    return () => {
      Object.values(errorTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      errorTimers.current = {};
    };
  }, []);

  // Profile photo functions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  };

  const handleProfilePhotoUpload = () => {
    setShowPhotoModal(true);
  };

  const handleCameraCapture = async () => {
    setShowPhotoModal(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const handleGallerySelection = async () => {
    setShowPhotoModal(false);
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
  };

  // Google Places API function
  const fetchPlaceSuggestions = async (input: string, callback: (suggestions: Suggestion[]) => void) => {
    if (input.length < 2) {
      callback([]);
      return;
    }
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&key=${GOOGLE_PLACES_API_KEY}&types=geocode`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.predictions && Array.isArray(data.predictions)) {
        const suggestions = data.predictions.map((prediction: any) => ({
          id: prediction.place_id,
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: prediction.structured_formatting
        }));
        callback(suggestions);
      } else {
        callback([]);
      }
    } catch (error) {
      callback([]);
    }
  };

  // Debounced search function
  const debouncedSearch = (input: string, callback: (suggestions: Suggestion[]) => void) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchPlaceSuggestions(input, callback);
    }, 300) as any;
  };

  // Handle location input changes
  const handleLocationChange = (text: string) => {
    setLocation(text);
    if (text.length >= 2) {
      setShowLocationModal(true);
      debouncedSearch(text, setLocationSuggestions);
    } else {
      setShowLocationModal(false);
      setLocationSuggestions([]);
    }
  };

  // Handle location suggestion selection
  const selectLocationSuggestion = async (suggestion: Suggestion) => {
    isSelectingSuggestion.current = true;
    setLocation(suggestion.description);
    setShowLocationModal(false);
    setLocationSuggestions([]);
    
    await extractLocationDetails(suggestion.place_id || suggestion.id, suggestion.description);
    
    setTimeout(() => { isSelectingSuggestion.current = false; }, 100);
  };

  // Handle outside touch to close dropdowns and clear inputs
  const handleOutsideTouch = () => {
    if (showLocationModal) {
      setShowLocationModal(false);
      setLocationSuggestions([]);
      setLocation('');
      locationInputRef.current?.blur();
    }
  };

  // Fetch detailed place information using place_id
  const fetchPlaceDetails = async (placeId: string) => {
    if (!placeId) {
      return null;
    }
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,formatted_address,geometry&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.result && data.result.address_components) {
        return data.result;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  // Extract location details from address components
  const extractLocationDetails = async (placeId: string, description: string) => {
    
    setPincode('');
    setDistrict('');
    setState('');
    setCountry('');
    setLatitude('');
    setLongitude('');
    
    try {
      const placeDetails = await fetchPlaceDetails(placeId);
      
      if (placeDetails && placeDetails.address_components) {
        const addressComponents = placeDetails.address_components;
        
        const postalCode = addressComponents.find((component: any) => 
          component.types.includes('postal_code')
        );
        
        const administrativeAreaLevel1 = addressComponents.find((component: any) => 
          component.types.includes('administrative_area_level_1')
        );
        
        const administrativeAreaLevel2 = addressComponents.find((component: any) => 
          component.types.includes('administrative_area_level_2')
        );
        
        const administrativeAreaLevel3 = addressComponents.find((component: any) => 
          component.types.includes('administrative_area_level_3')
        );
        
        const country = addressComponents.find((component: any) => 
          component.types.includes('country')
        );
        
        const locality = addressComponents.find((component: any) => 
          component.types.includes('locality')
        );
        
        if (placeDetails.geometry && placeDetails.geometry.location) {
          const lat = placeDetails.geometry.location.lat;
          const lng = placeDetails.geometry.location.lng;
          
          setLatitude(lat.toString());
          setLongitude(lng.toString());
        }
        
        if (postalCode) {
          setPincode(postalCode.long_name);
        }
        
        if (administrativeAreaLevel1) {
          setState(administrativeAreaLevel1.long_name);
        }
        
        if (administrativeAreaLevel2) {
          setDistrict(administrativeAreaLevel2.long_name);
        } else if (administrativeAreaLevel3) {
          setDistrict(administrativeAreaLevel3.long_name);
        } else if (locality) {
          setDistrict(locality.long_name);
        }
        
        if (country) {
          setCountry(country.long_name);
        }
        
        if (!postalCode && placeDetails.geometry && placeDetails.geometry.location) {
          await fetchPincodeFromCoordinates(
            placeDetails.geometry.location.lat,
            placeDetails.geometry.location.lng
          );
        }
        
        if (locality) {
          setAreaName(locality.long_name);
        } else if (description) {
          setAreaName(description.split(',')[0]);
        }
        
      } else {
        const parts = description.split(', ');
        
        if (parts.length >= 2) {
          const pincodeMatch = description.match(/\b\d{6}\b/);
          if (pincodeMatch) {
            setPincode(pincodeMatch[0]);
          }
          
          if (parts.length >= 4) {
            setDistrict(parts[parts.length - 3]?.trim() || '');
            setState(parts[parts.length - 2]?.trim() || '');
            setCountry(parts[parts.length - 1]?.trim() || '');
          } else if (parts.length === 3) {
            setState(parts[parts.length - 2]?.trim() || '');
            setCountry(parts[parts.length - 1]?.trim() || '');
          } else if (parts.length === 2) {
            setCountry(parts[parts.length - 1]?.trim() || '');
          }
        }
        if (parts.length > 0) {
          setAreaName(parts[0]);
        }
      }
    } catch (error) {
      const parts = description.split(', ');
      if (parts.length >= 2) {
        const pincodeMatch = description.match(/\b\d{6}\b/);
        if (pincodeMatch) {
          setPincode(pincodeMatch[0]);
        }
        if (parts.length >= 3) {
          setState(parts[parts.length - 2]?.trim() || '');
          setCountry(parts[parts.length - 1]?.trim() || '');
        }
      }
    }
  };

  // Function to get pincode from coordinates using reverse geocoding
  const fetchPincodeFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const addressComponents = data.results[0].address_components;
        const postalCode = addressComponents.find((component: any) => 
          component.types.includes('postal_code')
        );
        
        if (postalCode) {
          setPincode(postalCode.long_name);
        }
      }
    } catch (error) {
    }
  };

  // Handle document upload with options
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [currentDocumentType, setCurrentDocumentType] = useState<'personal'>('personal');
  
  const handleDocumentUploadWithOptions = async (documentType: 'personal') => {
    setCurrentDocumentType(documentType);
    setShowDocumentModal(true);
  };
  
  const closeDocumentModal = () => {
    setShowDocumentModal(false);
  };

  const handleDocumentFileSelection = async () => {
    setShowDocumentModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*'
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        // Add new documents to existing ones with unique IDs
        const newDocuments = result.assets.map(doc => ({
          ...doc,
          id: `doc_${Date.now()}_${Math.random()}`,
          // Ensure we have proper mimeType
          mimeType: doc.mimeType || 'application/octet-stream'
        }));
        
        setPersonalDocuments([...personalDocuments, ...newDocuments]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select documents. Please try again.');
    }
  };

  // Handle camera capture for documents
  const handleCameraCaptureForDocuments = async () => {
    setShowDocumentModal(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        
        // Add to documents with unique ID
        const newDocument = {
          id: `photo_${Date.now()}_${Math.random()}`,
          name: `Photo_${new Date().getTime()}.jpg`,
          uri: photo.uri,
          size: photo.fileSize || 0,
          mimeType: 'image/jpeg'
        };
        setPersonalDocuments([...personalDocuments, newDocument]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  // Remove uploaded document
  const removeDocument = (documentId: string) => {
    const newDocuments = personalDocuments.filter(doc => doc.id !== documentId);
    setPersonalDocuments(newDocuments);
  };

  // Clear all documents
  const clearAllDocuments = () => {
    Alert.alert(
      'Clear All Documents',
      'Are you sure you want to remove all selected documents?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            setPersonalDocuments([]);
          }
        }
      ]
    );
  };

  // Check if user exists in database
  const checkUserExists = async (mobile: string, email: string) => {
    try {
      setIsCheckingUser(true);
      setMobileError('');
      setEmailError('');
      
      const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS(mobile, email, 'seeker'));
      const result = await response.json();
      
      if (result.success && result.data.exists) {
        // Check for mobile conflicts
        if (result.data.existingMobile) {
          setErrorWithAutoDismiss('mobile', 'Mobile number already registered in our system');
        }
        // Check for email conflicts
        if (result.data.existingEmail) {
          setErrorWithAutoDismiss('email', 'Email address already registered in our system');
        }
        return true; // User exists
      }
      return false; // User doesn't exist
    } catch (error) {
      // Set generic error if API call fails
      setErrorWithAutoDismiss('mobile', 'Unable to verify mobile number. Please try again.');
      setErrorWithAutoDismiss('email', 'Unable to verify email. Please try again.');
      return false;
    } finally {
      setIsCheckingUser(false);
    }
  };

  // Real-time mobile validation
  const validateMobileInRealTime = async (mobileNumber: string) => {
    if (mobileNumber.trim().length === 0) {
      setMobileError('');
      return;
    }
    
    // Basic mobile format validation
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber.trim())) {
      setErrorWithAutoDismiss('mobile', 'Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }
    
    // Check if mobile already exists
    try {
      const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS(mobileNumber.trim(), '', 'seeker'));
      const result = await response.json();
      
      if (result.success && result.data.existingMobile) {
        setErrorWithAutoDismiss('mobile', 'Mobile number already registered in our system');
      } else {
        setMobileError(''); // Clear error if mobile is available
      }
    } catch (error) {
    }
  };

  // Real-time email validation
  const validateEmailInRealTime = async (email: string) => {
    if (emailValidationTimer.current) {
      clearTimeout(emailValidationTimer.current);
    }
    
    emailValidationTimer.current = setTimeout(async () => {
      if (email.trim().length === 0) {
        setEmailError('');
        setIsValidatingEmail(false);
        return;
      }
      
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorWithAutoDismiss('email', 'Please enter a valid email address');
        setIsValidatingEmail(false);
        return;
      }
      
      // Check if email already exists
      try {
        setIsValidatingEmail(true);
        const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS('', email.trim(), 'seeker'));
        const result = await response.json();
        
        if (result.success && result.data.existingEmail) {
          setErrorWithAutoDismiss('email', 'Email address already registered in our system');
          setIsEmailValid(false);
        } else {
          setEmailError(''); // Clear error if email is available
          setIsEmailValid(true);
        }
      } catch (error) {
      } finally {
        setIsValidatingEmail(false);
      }
    }, 1000) as any; // 1 second delay
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Clear previous errors
    setNameError('');
    setMobileError('');
    setEmailError('');
    setLocationError('');
    setAddressError('');
    
    let hasErrors = false;
    
    // Check name
    if (!name.trim()) {
      setErrorWithAutoDismiss('name', 'Full name is required');
      hasErrors = true;
    }
    
    // Check mobile
    if (!mobile.trim()) {
      setErrorWithAutoDismiss('mobile', 'Mobile number is required');
      hasErrors = true;
    } else if (mobile.length !== 10) {
      setErrorWithAutoDismiss('mobile', 'Mobile number must be exactly 10 digits');
      hasErrors = true;
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      setErrorWithAutoDismiss('mobile', 'Please enter a valid mobile number starting with 6-9');
      hasErrors = true;
    }
    
    // Check email
    if (!email.trim()) {
      setErrorWithAutoDismiss('email', 'Email is required');
      hasErrors = true;
    } else {
      // Enhanced email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorWithAutoDismiss('email', 'Please enter a valid email address');
        hasErrors = true;
      }
    }
    
    // Check location
    if (!location.trim()) {
      setErrorWithAutoDismiss('location', 'Location is required');
      hasErrors = true;
    }
    
    // Check address
    if (!address.trim()) {
      setErrorWithAutoDismiss('address', 'Address is required');
      hasErrors = true;
    }
    
    if (hasErrors) {
      return;
    }

    // Check if user already exists
    const userExists = await checkUserExists(mobile.trim(), email.trim());
    
    if (userExists) {
      // Don't proceed, errors are already set
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('mobile', mobile);
      formData.append('email', email);
      formData.append('pincode', pincode);
      formData.append('district', district);
      formData.append('state', state);
      formData.append('country', country);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('address', address);
      formData.append('city', location.split(',')[0].trim());

      // Profile photo
      if (profilePhoto) {
        formData.append('profilePhoto', {
          uri: profilePhoto,
          name: 'profile.jpg',
          type: 'image/jpeg'
        } as any);
      }

      // Personal documents - append each document to the formData
      if (personalDocuments.length > 0) {
        personalDocuments.forEach((doc, index) => {
          // For the first document, use 'personalDocuments' field name
          // The backend will store this in document1 column
          formData.append('personalDocuments', {
            uri: doc.uri,
            name: doc.name,
            type: doc.mimeType || 'application/octet-stream'
          } as any);
        });
      }

      // POST to backend
      const response = await fetch(API_ENDPOINTS.REGISTER_SERVICESEEKER, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Success!',
          'Your service seeker registration has been submitted successfully. Welcome to OriginX!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setName('');
                setMobile('');
                setEmail('');
                setProfilePhoto(null);
                setPersonalDocuments([]);
                setLocation('');
                setAddress('');
                setPincode('');
                setDistrict('');
                setState('');
                setCountry('');
                setLatitude('');
                setLongitude('');
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SuggestionDropdown component
  const SuggestionDropdown = ({ visible, suggestions, onSelect, style }: any) => {
    if (!visible || suggestions.length === 0) return null;
    return (
      <View style={[styles.suggestionDropdown, style]}>
        <ScrollView style={styles.suggestionList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
          {suggestions.map((suggestion: Suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPressIn={() => onSelect(suggestion)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={getIconSize(16)} color="#666" />
              <View style={styles.suggestionTextContainer}>
                <Text style={styles.suggestionMainText}>
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </Text>
                {suggestion.structured_formatting?.secondary_text && (
                  <Text style={styles.suggestionSecondaryText}>
                    {suggestion.structured_formatting.secondary_text}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Single Page Form
  const renderForm = () => (
    <View style={styles.formContainer}>
      {/* Profile Photo Upload */}
      <View style={styles.profilePhotoContainer}>
        <TouchableOpacity style={styles.profilePhotoButton} onPress={handleProfilePhotoUpload}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="camera" size={getIconSize(30)} color="#A1CEDC" />
              <Text style={styles.profilePhotoText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Name Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={getIconSize(20)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={(text) => {
              setName(text);
              // Clear error immediately when user types
              if (nameError) {
                if (errorTimers.current['name']) {
                  clearTimeout(errorTimers.current['name']);
                  delete errorTimers.current['name'];
                }
                setNameError('');
              }
            }}
          />
        </View>
        {nameError ? (
          <Text style={styles.errorText}>{nameError}</Text>
        ) : null}
      </View>

      {/* Mobile Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Mobile Number *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={getIconSize(20)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your mobile number"
            placeholderTextColor="#999"
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              // Clear error immediately when user types
              if (mobileError) {
                if (errorTimers.current['mobile']) {
                  clearTimeout(errorTimers.current['mobile']);
                  delete errorTimers.current['mobile'];
                }
                setMobileError('');
              }
              // Real-time mobile validation
              if (text.length === 10) {
                validateMobileInRealTime(text);
              }
            }}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
        {mobileError ? (
          <Text style={styles.errorText}>{mobileError}</Text>
        ) : null}
        {mobile.length === 10 && !mobileError && (
          <Text style={styles.successText}>Mobile number format is valid</Text>
        )}
      </View>

      {/* Email Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={getIconSize(20)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              // Clear error immediately when user types
              if (emailError) {
                if (errorTimers.current['email']) {
                  clearTimeout(errorTimers.current['email']);
                  delete errorTimers.current['email'];
                }
                setEmailError('');
              }
              setIsEmailValid(false); // Reset validation state
              validateEmailInRealTime(text); // Real-time validation
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {isValidatingEmail && (
            <Ionicons name="reload" size={getIconSize(16)} color="#A1CEDC" style={styles.spinningIcon} />
          )}
          {isEmailValid && !isValidatingEmail && (
            <Ionicons name="checkmark-circle" size={getIconSize(20)} color="#27ae60" />
          )}
        </View>
        {emailError ? (
          <Text style={styles.errorText}>{emailError}</Text>
        ) : null}
        {isValidatingEmail && !emailError && (
          <Text style={styles.validatingText}>Validating email...</Text>
        )}
        {isEmailValid && !emailError && !isValidatingEmail && (
          <Text style={styles.successText}>Email is available</Text>
        )}
      </View>

      {/* Personal Documents Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Personal Documents</Text>
        <View style={styles.uploadOptionsContainer}>
          <TouchableOpacity
            style={styles.uploadOptionButton}
            onPress={() => handleDocumentUploadWithOptions('personal')}
          >
            <Ionicons name="document-text-outline" size={getIconSize(20)} color="#666" />
            <Text style={styles.uploadOptionText}>Upload Aadhar/Pan/Ration</Text>
          </TouchableOpacity>
          {personalDocuments.length > 0 && (
            <Text style={styles.documentCountText}>
              {personalDocuments.length} document{personalDocuments.length !== 1 ? 's' : ''} selected
              {personalDocuments.length > 0 && (
                <Text style={styles.documentSizeText}>
                  {' '}(Total: {(personalDocuments.reduce((total, doc) => total + (doc.size || 0), 0) / 1024 / 1024).toFixed(2)} MB)
                </Text>
              )}
            </Text>
          )}
        </View>

        {/* Selected Personal Documents Display */}
        {personalDocuments.length > 0 && (
          <View style={styles.uploadedDocumentsContainer}>
            <View style={styles.documentHeaderRow}>
              <Text style={styles.newDocumentsTitle}>Selected Documents ({personalDocuments.length}):</Text>
              <TouchableOpacity onPress={clearAllDocuments} style={styles.clearAllButton}>
                <Ionicons name="trash-outline" size={getIconSize(16)} color="#e74c3c" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {personalDocuments.map((doc) => (
              <View key={doc.id} style={styles.uploadedDocumentItem}>
                <Ionicons 
                  name={doc.mimeType?.startsWith('image/') ? "image-outline" : "document-outline"} 
                  size={getIconSize(16)} 
                  color="#666" 
                />
                <View style={styles.documentInfoContainer}>
                  <Text style={styles.uploadedDocumentName}>{doc.name}</Text>
                  {doc.size && (
                    <Text style={styles.documentSizeInfo}>
                      {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => removeDocument(doc.id)}>
                  <Ionicons name="close-circle" size={getIconSize(20)} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Location Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Location *</Text>
        <View style={styles.locationInputWrapper}>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={getIconSize(20)} color="#666" style={styles.inputIcon} />
            <TextInput
              ref={locationInputRef}
              style={styles.input}
              placeholder="Type to search location"
              placeholderTextColor="#999"
              value={location}
              onChangeText={(text) => {
                handleLocationChange(text);
                // Clear error immediately when user types
                if (locationError) {
                  if (errorTimers.current['location']) {
                    clearTimeout(errorTimers.current['location']);
                    delete errorTimers.current['location'];
                  }
                  setLocationError('');
                }
              }}
              onFocus={() => {
                if (location.length >= 2) {
                  setShowLocationModal(true);
                }
              }}
            />
          </View>
          <SuggestionDropdown
            visible={showLocationModal}
            suggestions={locationSuggestions}
            onSelect={selectLocationSuggestion}
            style={styles.suggestionDropdownPositioned}
          />
        </View>
        {locationError ? (
          <Text style={styles.errorText}>{locationError}</Text>
        ) : null}
      </View>

      {/* Address Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Address *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="home-outline" size={getIconSize(30)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="Enter your complete address"
            placeholderTextColor="#999"
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              // Clear error immediately when user types
              if (addressError) {
                if (errorTimers.current['address']) {
                  clearTimeout(errorTimers.current['address']);
                  delete errorTimers.current['address'];
                }
                setAddressError('');
              }
            }}
            multiline={true}
            numberOfLines={3}
          />
        </View>
        {addressError ? (
          <Text style={styles.errorText}>{addressError}</Text>
        ) : null}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (isSubmitting || isCheckingUser) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting || isCheckingUser}
      >
        {isSubmitting ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="reload" size={getIconSize(20)} color="#fff" style={styles.spinningIcon} />
            <Text style={styles.submitButtonText}>Submitting...</Text>
          </View>
        ) : isCheckingUser ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="reload" size={getIconSize(20)} color="#fff" style={styles.spinningIcon} />
            <Text style={styles.submitButtonText}>Checking...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={getIconSize(20)} color="#fff" />
            <Text style={styles.submitButtonText}>Register as Service Seeker</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={handleOutsideTouch}>
          <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
          {/* Header - moved outside ScrollView */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.menuButton} onPress={() => router.back()}>
              <Ionicons style={styles.menuicon} name="arrow-back" size={getIconSize(28)} color="black" />
            </TouchableOpacity>
            <Image
              source={require('@/assets/images/OriginX.png')}
              style={styles.mainlogo}
              contentFit="contain"
            />
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {renderForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closePhotoModal}
      >
        <TouchableWithoutFeedback onPress={closePhotoModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Add profile photo</Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleCameraCapture}
                >
                  <Ionicons name="camera" size={getIconSize(24)} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Take a photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleGallerySelection}
                >
                  <Ionicons name="images-outline" size={getIconSize(24)} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Upload from Photos</Text>
                </TouchableOpacity>
                <Text style={styles.modalDescription}>
                  On OriginX, we require members to use their real identities, so upload a photo of yourself.
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Document Upload Modal */}
      <Modal
        visible={showDocumentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDocumentModal}
      >
        <TouchableWithoutFeedback onPress={closeDocumentModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <TouchableOpacity onPress={closeDocumentModal}>
                  <View style={styles.modalHandle} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Upload Personal Documents</Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleDocumentFileSelection}
                >
                  <Ionicons name="document-text-outline" size={getIconSize(24)} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Select Multiple Files</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleCameraCaptureForDocuments}
                >
                  <Ionicons name="camera" size={getIconSize(24)} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Take a photo</Text>
                </TouchableOpacity>
                <Text style={styles.modalDescription}>
                  Upload your Aadhar, PAN, or Ration card documents for verification. You can select multiple documents.
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      </SafeAreaView>
    </>
  );
}

// Function to create responsive styles
const createStyles = (screenHeight: number, screenWidth: number) => {
  // Base dimensions for better scaling (using standard mobile dimensions)
  const baseWidth = 375; // iPhone standard - better scaling base
  const baseHeight = 812; // iPhone standard - better scaling base
  
  // Moderate scale function to prevent extreme sizes
  const scale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * factor;
  };

  const scaleHeight = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenHeight) / baseHeight;
    return size + (scaledSize - size) * factor;
  };

  // Helper function to get responsive values based on screen height with min/max constraints
  const getResponsiveValue = (baseValue: number, minValue?: number, maxValue?: number) => {
    const scaledValue = scaleHeight(baseValue, 1);
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  // Helper function to get responsive values based on screen width with min/max constraints
  const getResponsiveWidth = (baseValue: number, minValue?: number, maxValue?: number) => {
    const scaledValue = scale(baseValue, 1);
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  // Helper function to get responsive font sizes with moderate scaling
  const getResponsiveFontSize = (baseSize: number) => {
    const scaledSize = scale(baseSize, 0.5);
    return Math.max(10, Math.min(28, scaledSize));
  };

  // Helper function to get responsive padding/margins with moderate scaling
  const getResponsiveSpacing = (baseSpacing: number) => {
    return Math.max(2, scale(baseSpacing, 0.5));
  };

  // Helper function to get responsive spacing that supports negative values
  const getResponsiveSpacingWithNegative = (baseSpacing: number) => {
    return scale(baseSpacing, 0.5);
  };

  // Device type detection with more accurate breakpoints
  const isSmallScreen = screenWidth < 360; // Small phones
  const isMediumScreen = screenWidth >= 360 && screenWidth < 414; // Regular phones  
  const isLargeScreen = screenWidth >= 414 && screenWidth < 768; // Large phones
  const isTablet = screenWidth >= 768; // Tablets

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(16),
    paddingTop: getResponsiveValue(1, 0, 4),
    paddingBottom: getResponsiveValue(5, 4, 8),
    backgroundColor: '#667eea',
  },
  menuButton: {
    padding: getResponsiveSpacing(5),
  },
  mainlogo: {
    height: getResponsiveValue(45, 35, 55),
    width: screenWidth * 0.45,
    maxWidth: getResponsiveWidth(180, 150, 200),
    marginRight: screenWidth * 0.50,
  },
  menuicon: {
    marginRight: getResponsiveSpacing(10),
  },
  formContainer: {
    paddingHorizontal: getResponsiveWidth(20),
    paddingVertical: getResponsiveValue(25, 20, 30),
    backgroundColor: '#f8f9fa',
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveValue(20, 15, 25),
    marginTop: getResponsiveSpacingWithNegative(-15),
  },
  profilePhotoButton: {
    width: getResponsiveWidth(95, 80, 110),
    height: getResponsiveWidth(95, 80, 110),
    borderRadius: getResponsiveWidth(48, 40, 55),
    overflow: 'hidden',
    borderWidth: getResponsiveSpacing(3),
    borderColor: '#A1CEDC',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: getResponsiveValue(4, 2, 6),
    },
    shadowOpacity: 0.2,
    shadowRadius: getResponsiveSpacing(8),
    elevation: 8,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoText: {
    fontSize: getResponsiveFontSize(12),
    color: '#A1CEDC',
    marginTop: getResponsiveValue(5, 3, 7),
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: getResponsiveValue(15, 12, 18),
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: getResponsiveValue(8, 6, 10),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: getResponsiveSpacing(15),
    paddingHorizontal: getResponsiveSpacing(15),
    borderWidth: getResponsiveSpacing(2),
    borderColor: '#A1CEDC',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: getResponsiveValue(2, 1, 3),
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSpacing(4),
    elevation: 3,
  },
  inputIcon: {
    marginRight: getResponsiveSpacing(10),
  },
  input: {
    flex: 1,
    height: getResponsiveValue(50, 45, 55),
    fontSize: getResponsiveFontSize(16),
    color: '#2c3e50',
  },

  uploadOptionsContainer: {
    marginTop: getResponsiveValue(10, 8, 12),
    marginBottom: getResponsiveValue(10, 8, 12),
  },
  uploadOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f7',
    borderRadius: getResponsiveSpacing(10),
    paddingVertical: getResponsiveValue(10, 8, 12),
    paddingHorizontal: getResponsiveSpacing(15),
    borderWidth: 1,
    borderColor: '#a7dbd8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveValue(2, 1, 3) },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSpacing(4),
    elevation: 3,
  },
  uploadOptionText: {
    marginLeft: getResponsiveSpacing(10),
    fontSize: getResponsiveFontSize(14),
    color: '#2c3e50',
    fontWeight: '600',
  },
  uploadedDocumentsContainer: {
    marginTop: getResponsiveValue(10, 8, 12),
    paddingHorizontal: getResponsiveSpacing(10),
  },
  uploadedDocumentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: getResponsiveSpacing(10),
    paddingVertical: getResponsiveValue(8, 6, 10),
    paddingHorizontal: getResponsiveSpacing(12),
    marginBottom: getResponsiveValue(8, 6, 10),
  },
  uploadedDocumentName: {
    fontSize: getResponsiveFontSize(14),
    color: '#2c3e50',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#A1CEDC',
    borderRadius: getResponsiveSpacing(15),
    paddingVertical: getResponsiveValue(18, 15, 22),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveValue(20, 15, 25),
    shadowColor: '#A1CEDC',
    shadowOffset: {
      width: 0,
      height: getResponsiveValue(6, 4, 8),
    },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSpacing(10),
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinningIcon: {
    marginRight: getResponsiveSpacing(8),
  },
  submitButtonText: {
    color: '#fff',
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    marginLeft: getResponsiveSpacing(8),
  },
  suggestionDropdown: {
    backgroundColor: '#fff',
    borderRadius: getResponsiveSpacing(15),
    maxHeight: getResponsiveValue(250, 200, 300),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveValue(5, 3, 7) },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSpacing(10),
    elevation: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: getResponsiveValue(2, 1, 3),
  },
  suggestionList: {
    maxHeight: getResponsiveValue(230, 180, 280),
  },
  locationInputWrapper: {
    position: 'relative',
  },
  suggestionDropdownPositioned: {
    position: 'absolute',
    top: getResponsiveValue(55, 45, 65),
    left: 0,
    right: 0,
    zIndex: 10,
  },
  addressInput: {
    height: getResponsiveValue(80, 70, 90),
    textAlignVertical: 'top',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSpacing(15),
    paddingVertical: getResponsiveValue(15, 12, 18),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  suggestionTextContainer: {
    marginLeft: getResponsiveSpacing(10),
    flex: 1,
  },
  suggestionMainText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: getResponsiveValue(2, 1, 3),
  },
  suggestionSecondaryText: {
    fontSize: getResponsiveFontSize(13),
    color: '#7f8c8d',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: getResponsiveSpacing(20),
    borderTopRightRadius: getResponsiveSpacing(20),
    padding: getResponsiveSpacing(20),
    paddingBottom: getResponsiveValue(40, 30, 50),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveSpacingWithNegative(-4) },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSpacing(10),
    elevation: 10,
  },
  modalHandle: {
    width: getResponsiveWidth(40, 35, 45),
    height: getResponsiveValue(4, 3, 5),
    backgroundColor: '#ddd',
    borderRadius: getResponsiveSpacing(2),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: getResponsiveValue(20, 15, 25),
    textAlign: 'center',
  },
  modalOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingVertical: getResponsiveValue(15, 12, 18),
    paddingHorizontal: getResponsiveSpacing(20),
    borderRadius: getResponsiveSpacing(10),
    marginBottom: getResponsiveValue(10, 8, 12),
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalOptionText: {
    marginLeft: getResponsiveSpacing(15),
    fontSize: getResponsiveFontSize(16),
    color: '#2c3e50',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: getResponsiveFontSize(12),
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: getResponsiveValue(15, 12, 18),
    lineHeight: getResponsiveFontSize(18),
    paddingHorizontal: getResponsiveSpacing(20),
  },
  errorText: {
    color: '#e74c3c',
    fontSize: getResponsiveFontSize(14),
    marginTop: getResponsiveValue(5, 3, 7),
    marginLeft: getResponsiveSpacing(15),
    fontWeight: '500',
  },
  validatingText: {
    color: '#A1CEDC',
    fontSize: getResponsiveFontSize(14),
    marginTop: getResponsiveValue(5, 3, 7),
    marginLeft: getResponsiveSpacing(15),
    fontStyle: 'italic',
  },
  successText: {
    color: '#27ae60',
    fontSize: getResponsiveFontSize(14),
    marginTop: getResponsiveValue(5, 3, 7),
    marginLeft: getResponsiveSpacing(15),
    fontWeight: '500',
  },
  newDocumentsTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: getResponsiveValue(8, 6, 10),
    marginTop: getResponsiveValue(10, 8, 12),
  },
  documentCountText: {
    fontSize: getResponsiveFontSize(12),
    color: '#27ae60',
    marginTop: getResponsiveValue(8, 6, 10),
    textAlign: 'center',
    fontStyle: 'italic',
  },
  documentSizeText: {
    fontSize: getResponsiveFontSize(11),
    color: '#666',
    fontStyle: 'italic',
  },
  documentInfoContainer: {
    flex: 1,
    marginLeft: getResponsiveSpacing(8),
  },
  documentSizeInfo: {
    fontSize: getResponsiveFontSize(11),
    color: '#666',
    fontStyle: 'italic',
    marginTop: getResponsiveValue(2, 1, 3),
  },
  documentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(10, 8, 12),
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSpacing(8),
    paddingVertical: getResponsiveValue(4, 3, 5),
    borderRadius: getResponsiveSpacing(6),
    backgroundColor: '#ffeaea',
  },
  clearAllText: {
    fontSize: getResponsiveFontSize(12),
    color: '#e74c3c',
    marginLeft: getResponsiveSpacing(4),
    fontWeight: '500',
  },
  });
};