import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export default function EditServiceSeekerScreen() {
  const { width, height } = useWindowDimensions();
  const { updateUser } = useAuth();
  
  // Helper function for responsive values (needed for inline styles)
  const getResponsiveValue = (baseValue: number) => {
    const baseHeight = 800;
    return (baseValue * height) / baseHeight;
  };
  
  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(height, width), [height, width]);
  // Get user data from navigation params
  const params = useLocalSearchParams();
  const initialName = typeof params.name === 'string' ? params.name : '';
  const initialMobile = typeof params.mobile === 'string' ? params.mobile : '';
  const initialEmail = typeof params.email === 'string' ? params.email : '';
  const initialProfileImage = typeof params.profileImage === 'string' ? params.profileImage : null;
  const initialPincode = typeof params.pincode === 'string' ? params.pincode : '';
  const initialDistrict = typeof params.district === 'string' ? params.district : '';
  const initialState = typeof params.state === 'string' ? params.state : '';
  const initialCountry = typeof params.country === 'string' ? params.country : '';
  const initialAddress = typeof params.address === 'string' ? params.address : '';
  const initialCity = typeof params.city === 'string' ? params.city : '';
  const initialLatitude = typeof params.latitude === 'string' ? params.latitude : '';
  const initialLongitude = typeof params.longitude === 'string' ? params.longitude : '';
  const userId = typeof params.id === 'string' ? params.id : '';

  // Form state - pre-populated with user data
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [email, setEmail] = useState(initialEmail);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(initialProfileImage);
  const [personalDocuments, setPersonalDocuments] = useState<any[]>([]);
  const [existingPersonalDocuments, setExistingPersonalDocuments] = useState<any[]>([]);
  const [location, setLocation] = useState(initialCity);
  const [address, setAddress] = useState(initialAddress);
  
  // Hidden location fields - pre-populated with user data
  const [pincode, setPincode] = useState(initialPincode);
  const [district, setDistrict] = useState(initialDistrict);
  const [state, setState] = useState(initialState);
  const [country, setCountry] = useState(initialCountry);
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  
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
  const [areaName, setAreaName] = useState(initialCity);

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
        setPersonalDocuments([...personalDocuments, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload document. Please try again.');
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
        
        // Add to documents
        const newDocument = {
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
  const removeDocument = (index: number, documentType: 'personal') => {
    const newDocuments = personalDocuments.filter((_, i) => i !== index);
    setPersonalDocuments(newDocuments);
  };

  // Remove existing document
  const removeExistingDocument = (documentId: string) => {
    setExistingPersonalDocuments(prev => prev.filter(doc => doc.id !== documentId));
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
        // Only show error for the specific field that conflicts
        if (result.data.existingMobile && mobile !== initialMobile) {
          setErrorWithAutoDismiss('mobile', 'Mobile number already registered in our system');
        }
        if (result.data.existingEmail && email !== initialEmail) {
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
    // Clear any existing error first
    setMobileError('');
    
    if (mobileNumber.trim().length === 0) {
      return;
    }
    
    // Basic mobile format validation
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber.trim())) {
      setErrorWithAutoDismiss('mobile', 'Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }
    
    // Only check if mobile has changed from initial value
    if (mobileNumber.trim() !== initialMobile) {
      try {
        const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS(mobileNumber.trim(), '', 'seeker'));
        const result = await response.json();
        
        if (result.success && result.data.existingMobile) {
          setErrorWithAutoDismiss('mobile', 'Mobile number already registered in our system');
        }
      } catch (error) {
        console.log('Mobile validation network error:', error);
      }
    }
  };

  // Real-time email validation
  const validateEmailInRealTime = async (email: string) => {
    // Clear any existing error first
    setEmailError('');
    setIsEmailValid(false);
    
    if (email.trim().length === 0) {
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
    
    // Only check email if it's different from the initial email
    if (email.trim() !== initialEmail) {
      try {
        setIsValidatingEmail(true);
        const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS('', email.trim(), 'seeker'));
        const result = await response.json();
        
        if (result.success && result.data.existingEmail) {
          setErrorWithAutoDismiss('email', 'Email address already registered in our system');
          setIsEmailValid(false);
        } else {
          setIsEmailValid(true);
        }
      } catch (error) {
        console.log('Email validation network error:', error);
      } finally {
        setIsValidatingEmail(false);
      }
    } else {
      // Email hasn't changed, mark as valid
      setIsEmailValid(true);
      setIsValidatingEmail(false);
    }
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

    // Check for duplicates only if values have changed
    const mobileChanged = mobile.trim() !== initialMobile;
    const emailChanged = email.trim() !== initialEmail;
    
    if (mobileChanged || emailChanged) {
      try {
        const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS(mobile.trim(), email.trim(), 'seeker'));
        const result = await response.json();
        
        if (result.success && result.data.exists) {
          // Show specific errors for conflicting fields
          if (mobileChanged && result.data.existingMobile) {
            setErrorWithAutoDismiss('mobile', 'Mobile number already registered in our system');
            hasErrors = true;
          }
          if (emailChanged && result.data.existingEmail) {
            setErrorWithAutoDismiss('email', 'Email address already registered in our system');
            hasErrors = true;
          }
          if (hasErrors) {
            return;
          }
        }
      } catch (error) {
        Alert.alert('Error', 'Unable to verify user details. Please try again.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('mobile', mobile.trim());
      formData.append('email', email.trim());
      formData.append('pincode', pincode);
      formData.append('district', district);
      formData.append('state', state);
      formData.append('country', country);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('address', address.trim());
      formData.append('city', location.split(',')[0].trim());

      // Profile photo - only append if it's a new photo (not a URL)
      if (profilePhoto && !profilePhoto.startsWith('http')) {
        formData.append('profilePhoto', {
          uri: profilePhoto,
          name: 'profile.jpg',
          type: 'image/jpeg'
        } as any);
      }

      // IMPORTANT: Send existing documents that should be kept
      if (existingPersonalDocuments.length > 0) {
        // Extract just the filenames from existing documents
        const existingDocNames = existingPersonalDocuments.map(doc => {
          // If doc.filename exists, use it, otherwise extract from the URL
          if (doc.filename) {
            return doc.filename;
          } else if (doc.uri) {
            // Extract filename from URL like "/uploads/documents/document1-123.jpg"
            const urlParts = doc.uri.split('/');
            return urlParts[urlParts.length - 1];
          }
          return null;
        }).filter(name => name !== null);
        
        formData.append('existingDocuments', JSON.stringify(existingDocNames));
      }

      // New documents - append each document with field name 'document1'
      if (personalDocuments.length > 0) {
        personalDocuments.forEach((doc, index) => {
          // Use 'document1' as the field name to match your database column
          formData.append('document1', {
            uri: doc.uri,
            name: doc.name,
            type: doc.mimeType || 'application/octet-stream'
          } as any);
        });
      }

      // POST to backend
      const response = await fetch(API_ENDPOINTS.UPDATE_SERVICESEEKER(userId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Success!',
          'Your profile has been updated successfully!',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Update the AuthContext with new user data
                try {
                  await updateUser({
                    name: data.data.name,
                    email: data.data.email,
                    mobile: data.data.mobile,
                    profileImage: data.data.profile_image,
                  });
                } catch (error) {
                  console.error('Error updating user context:', error);
                }
                // Navigate back to service seeker index instead of login
                router.replace('/serviceseekerindex');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Update failed');
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
              <Ionicons name="location-outline" size={16} color="#666" />
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

  // Fetch existing documents when component mounts
  useEffect(() => {
    if (userId) {
      fetchExistingDocuments();
    }
  }, [userId]);

  // Function to fetch existing documents from the server
  const fetchExistingDocuments = async () => {
    try {
      // Get the current user's documents from the service seeker data
      if (userId) {
        // Use the correct API endpoint - we need to get user by ID
        const response = await fetch(`http://192.168.31.84:3001/api/serviceseeker/${userId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const userData = result.data;
          const existingDocs: any[] = [];
          
          // Check if document1 exists and add it to existing documents
          if (userData.document1) {
            // Split the comma-separated documents and filter out non-filename entries
            const docNames = userData.document1.split(',')
              .filter((name: string) => {
                const trimmed = name.trim();
                // Only keep entries that look like filenames (contain timestamp and extension)
                return trimmed.includes('-') && (trimmed.includes('.jpg') || trimmed.includes('.jpeg') || trimmed.includes('.png') || trimmed.includes('.pdf'));
              })
              .map((name: string) => name.trim());
                        
            docNames.forEach((docName: string, index: number) => {
              existingDocs.push({
                id: `doc${index + 1}`,
                name: `Document ${index + 1}`,
                filename: docName,
                uri: `http://192.168.31.84:3001/uploads/documents/${docName}`,
                isExisting: true,
                serverPath: docName
              });
            });
          }
          
          setExistingPersonalDocuments(existingDocs);
        }
      }
    } catch (error) {
      console.error('Error fetching existing documents:', error);
      setExistingPersonalDocuments([]);
    }
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
              <Ionicons name="camera" size={30} color="#A1CEDC" />
              <Text style={styles.profilePhotoText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Name Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
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
          <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
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
              // Real-time mobile validation - only when length is 10
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
        {mobile.length === 10 && !mobileError && mobile.trim() !== initialMobile && (
          <Text style={styles.successText}>Mobile number format is valid</Text>
        )}
      </View>

      {/* Email Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
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
              // Reset validation state when user types
              setIsEmailValid(false);
              // Start real-time validation with debounce
              if (emailValidationTimer.current) {
                clearTimeout(emailValidationTimer.current);
              }
              emailValidationTimer.current = setTimeout(() => {
                validateEmailInRealTime(text);
              }, 1000) as any;
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {isValidatingEmail && (
            <Ionicons name="reload" size={16} color="#A1CEDC" style={styles.spinningIcon} />
          )}
          {isEmailValid && !isValidatingEmail && email.trim() !== initialEmail && (
            <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
          )}
        </View>
        {emailError ? (
          <Text style={styles.errorText}>{emailError}</Text>
        ) : null}
        {isValidatingEmail && !emailError && (
          <Text style={styles.validatingText}>Validating email...</Text>
        )}
        {isEmailValid && !emailError && !isValidatingEmail && email.trim() !== initialEmail && (
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
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <Text style={styles.uploadOptionText}>Upload Aadhar/Pan/Ration</Text>
          </TouchableOpacity>
        </View>

        {/* Existing Personal Documents Display - Moved here */}
        {existingPersonalDocuments.length > 0 && (
          <View style={styles.existingDocumentsContainer}>
            <Text style={styles.existingDocumentsTitle}>Existing Documents:</Text>
            {existingPersonalDocuments.map((doc) => (
              <View key={doc.id} style={styles.existingDocumentItem}>
                <Ionicons 
                  name={doc.filename?.includes('.pdf') ? "document-outline" : "image-outline"} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.existingDocumentName}>{doc.filename}</Text>
                <TouchableOpacity onPress={() => removeExistingDocument(doc.id)}>
                  <Ionicons name="close-circle" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Selected Personal Documents Display */}
        {personalDocuments.length > 0 && (
          <View style={styles.uploadedDocumentsContainer}>
            <Text style={styles.newDocumentsTitle}>New Documents:</Text>
            {personalDocuments.map((doc, index) => (
              <View key={index} style={styles.uploadedDocumentItem}>
                <Ionicons 
                  name={doc.mimeType?.startsWith('image/') ? "image-outline" : "document-outline"} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.uploadedDocumentName}>{doc.name}</Text>
                <TouchableOpacity onPress={() => removeDocument(index, 'personal')}>
                  <Ionicons name="close-circle" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Location Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Location *</Text>
        <View style={{ position: 'relative' }}>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
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
            style={{ position: 'absolute', top: 55, left: 0, right: 0, zIndex: 10 }}
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
          <Ionicons name="home-outline" size={30} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { height: getResponsiveValue(80), textAlignVertical: 'top' }]}
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
            <Ionicons name="reload" size={20} color="#fff" style={styles.spinningIcon} />
            <Text style={styles.submitButtonText}>Submitting...</Text>
          </View>
        ) : isCheckingUser ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="reload" size={20} color="#fff" style={styles.spinningIcon} />
            <Text style={styles.submitButtonText}>Checking...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Update Profile</Text>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          {/* Header - moved outside ScrollView */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.menuButton} onPress={() => router.back()}>
              <Ionicons style={styles.menuicon} name="arrow-back" size={28} color="black" />
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
                  <Ionicons name="camera" size={24} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Take a photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleGallerySelection}
                >
                  <Ionicons name="images-outline" size={24} color="#2c3e50" />
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
                  <Ionicons name="document-text-outline" size={24} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Select Files</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleCameraCaptureForDocuments}
                >
                  <Ionicons name="camera" size={24} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Take a photo</Text>
                </TouchableOpacity>
                <Text style={styles.modalDescription}>
                  Upload your Aadhar, PAN, or Ration card documents for verification.
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

const createStyles = (screenHeight: number, screenWidth: number) => {
  // Helper function to get responsive values based on screen height
  const getResponsiveValue = (baseValue: number, screenHeight: number) => {
    const baseHeight = 800;
    return (baseValue * screenHeight) / baseHeight;
  };

  // Helper function to get responsive values based on screen width
  const getResponsiveWidth = (baseValue: number, screenWidth: number) => {
    const baseWidth = 400;
    return (baseValue * screenWidth) / baseWidth;
  };

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
    paddingHorizontal: getResponsiveWidth(10, screenWidth),
    paddingTop: getResponsiveValue(50, screenHeight),
    paddingBottom: getResponsiveValue(10, screenHeight),
    backgroundColor: '#A1CEDC',
    marginTop: getResponsiveValue(-40, screenHeight),
  },
  menuButton: {
    padding: getResponsiveValue(5, screenHeight),
  },
  mainlogo: {
    height: getResponsiveValue(50, screenHeight),
    width: getResponsiveWidth(180, screenWidth),
    marginRight: getResponsiveWidth(190, screenWidth),
  },
  menuicon: {
    marginRight: getResponsiveWidth(4, screenWidth),
  },
  formContainer: {
    paddingHorizontal: getResponsiveWidth(20, screenWidth),
    paddingVertical: getResponsiveValue(30, screenHeight),
    backgroundColor: '#f8f9fa',
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveValue(20, screenHeight),
    marginTop: getResponsiveValue(-15, screenHeight),
  },
  profilePhotoButton: {
    width: getResponsiveValue(100, screenHeight),
    height: getResponsiveValue(100, screenHeight),
    borderRadius: getResponsiveValue(60, screenHeight),
    overflow: 'hidden',
    borderWidth: getResponsiveValue(3, screenHeight),
    borderColor: '#A1CEDC',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: getResponsiveValue(4, screenHeight),
    },
    shadowOpacity: 0.2,
    shadowRadius: getResponsiveValue(8, screenHeight),
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
    fontSize: 12,
    color: '#A1CEDC',
    marginTop: getResponsiveValue(5, screenHeight),
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: getResponsiveValue(15, screenHeight),
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: getResponsiveValue(8, screenHeight),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: getResponsiveValue(15, screenHeight),
    paddingHorizontal: getResponsiveWidth(15, screenWidth),
    borderWidth: getResponsiveValue(2, screenHeight),
    borderColor: '#A1CEDC',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: getResponsiveValue(2, screenHeight),
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveValue(4, screenHeight),
    elevation: 3,
  },
  inputIcon: {
    marginRight: getResponsiveWidth(10, screenWidth),
  },
  input: {
    flex: 1,
    height: getResponsiveValue(50, screenHeight),
    fontSize: 16,
    color: '#2c3e50',
  },

  uploadOptionsContainer: {
    marginTop: getResponsiveValue(10, screenHeight),
    marginBottom: getResponsiveValue(10, screenHeight),
  },
  uploadOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f7',
    borderRadius: getResponsiveValue(10, screenHeight),
    paddingVertical: getResponsiveValue(10, screenHeight),
    paddingHorizontal: getResponsiveWidth(15, screenWidth),
    borderWidth: getResponsiveValue(1, screenHeight),
    borderColor: '#a7dbd8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveValue(2, screenHeight) },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveValue(4, screenHeight),
    elevation: 3,
  },
  uploadOptionText: {
    marginLeft: getResponsiveWidth(10, screenWidth),
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  uploadedDocumentsContainer: {
    marginTop: getResponsiveValue(10, screenHeight),
    paddingHorizontal: getResponsiveWidth(10, screenWidth),
  },
  uploadedDocumentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: getResponsiveValue(10, screenHeight),
    paddingVertical: getResponsiveValue(8, screenHeight),
    paddingHorizontal: getResponsiveWidth(12, screenWidth),
    marginBottom: getResponsiveValue(8, screenHeight),
  },
  uploadedDocumentName: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#A1CEDC',
    borderRadius: getResponsiveValue(15, screenHeight),
    paddingVertical: getResponsiveValue(18, screenHeight),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveValue(20, screenHeight),
    shadowColor: '#A1CEDC',
    shadowOffset: {
      width: 0,
      height: getResponsiveValue(6, screenHeight),
    },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveValue(10, screenHeight),
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
    marginRight: getResponsiveWidth(8, screenWidth),
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: getResponsiveWidth(8, screenWidth),
  },
  suggestionDropdown: {
    backgroundColor: '#fff',
    borderRadius: getResponsiveValue(15, screenHeight),
    maxHeight: getResponsiveValue(250, screenHeight),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveValue(5, screenHeight) },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveValue(10, screenHeight),
    elevation: 15,
    borderWidth: getResponsiveValue(1, screenHeight),
    borderColor: '#e0e0e0',
    marginTop: getResponsiveValue(2, screenHeight),
  },
  suggestionList: {
    maxHeight: getResponsiveValue(230, screenHeight),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(15, screenWidth),
    paddingVertical: getResponsiveValue(15, screenHeight),
    borderBottomWidth: getResponsiveValue(1, screenHeight),
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  suggestionTextContainer: {
    marginLeft: getResponsiveWidth(10, screenWidth),
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: getResponsiveValue(2, screenHeight),
  },
  suggestionSecondaryText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: getResponsiveValue(20, screenHeight),
    borderTopRightRadius: getResponsiveValue(20, screenHeight),
    padding: getResponsiveWidth(20, screenWidth),
    paddingBottom: getResponsiveValue(40, screenHeight),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveValue(-4, screenHeight) },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveValue(10, screenHeight),
    elevation: 10,
  },
  modalHandle: {
    width: getResponsiveWidth(40, screenWidth),
    height: getResponsiveValue(4, screenHeight),
    backgroundColor: '#ddd',
    borderRadius: getResponsiveValue(2, screenHeight),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: getResponsiveValue(20, screenHeight),
    textAlign: 'center',
  },
  modalOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingVertical: getResponsiveValue(15, screenHeight),
    paddingHorizontal: getResponsiveWidth(20, screenWidth),
    borderRadius: getResponsiveValue(10, screenHeight),
    marginBottom: getResponsiveValue(10, screenHeight),
    backgroundColor: '#fff',
    borderWidth: getResponsiveValue(1, screenHeight),
    borderColor: '#e0e0e0',
  },
  modalOptionText: {
    marginLeft: getResponsiveWidth(15, screenWidth),
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: getResponsiveValue(15, screenHeight),
    lineHeight: getResponsiveValue(18, screenHeight),
    paddingHorizontal: getResponsiveWidth(20, screenWidth),
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: getResponsiveValue(5, screenHeight),
    marginLeft: getResponsiveWidth(15, screenWidth),
    fontWeight: '500',
  },
  validatingText: {
    color: '#A1CEDC',
    fontSize: 14,
    marginTop: getResponsiveValue(5, screenHeight),
    marginLeft: getResponsiveWidth(15, screenWidth),
    fontStyle: 'italic',
  },
  successText: {
    color: '#27ae60',
    fontSize: 14,
    marginTop: getResponsiveValue(5, screenHeight),
    marginLeft: getResponsiveWidth(15, screenWidth),
    fontWeight: '500',
  },
  existingDocumentsContainer: {
    marginTop: getResponsiveValue(-5, screenHeight),
    marginBottom: getResponsiveValue(-20, screenHeight),
    paddingHorizontal: getResponsiveWidth(10, screenWidth),
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveValue(10, screenHeight),
    paddingVertical: getResponsiveValue(10, screenHeight),
  },
  existingDocumentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: getResponsiveValue(8, screenHeight),
  },
  existingDocumentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: getResponsiveValue(8, screenHeight),
    paddingVertical: getResponsiveValue(8, screenHeight),
    paddingHorizontal: getResponsiveWidth(12, screenWidth),
    marginBottom: getResponsiveValue(6, screenHeight),
    borderLeftWidth: getResponsiveValue(3, screenHeight),
    borderLeftColor: '#3498db',
  },
  existingDocumentName: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
    marginLeft: getResponsiveWidth(8, screenWidth),
  },
  newDocumentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: getResponsiveValue(8, screenHeight),
    marginTop: getResponsiveValue(10, screenHeight),
  },
  });
};