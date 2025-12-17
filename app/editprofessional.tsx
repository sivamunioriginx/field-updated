import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

interface Skill {
  id: number;
  name: string;
}

interface WorkerData {
  id: string;
  name: string;
  mobile: string;
  email: string;
  price?: string;
  profile_image?: string;
  skill_id?: string;
  pincode?: string;
  district?: string;
  state?: string;
  country?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  city?: string;
  mandal?: string;
  type?: number;
  personal_documents?: string;
  professional_documents?: string;
  document1?: string;
  document2?: string;
}

export default function RegisterProfessionalScreen() {
  const { width, height } = useWindowDimensions();
  const { updateUser } = useAuth();
  const params = useLocalSearchParams();
  const { mode, workerData, workerId, onUpdateSuccess } = params;
  const isEditMode = mode === 'edit';
  
  // Calculate responsive values based on screen size
  const isSmallScreen = width < 360;
  const isMediumScreen = width >= 360 && width < 414;
  const isLargeScreen = width >= 414 && width < 768;
  const isTablet = width >= 768;
  
  // Base dimensions for better scaling (using standard mobile dimensions)
  const baseWidth = 375; // iPhone standard - better scaling base
  const baseHeight = 812; // iPhone standard - better scaling base
  
  // Moderate scale function to prevent extreme sizes
  const moderateScale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * width) / baseWidth;
    return size + (scaledSize - size) * factor;
  };
  
  const scale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * width) / baseWidth;
    return size + (scaledSize - size) * factor;
  };

  const scaleHeight = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * height) / baseHeight;
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
  
  // Create responsive styles
  const styles = createStyles(width, height, scale, moderateScale, scaleHeight, getResponsiveValue, getResponsiveWidth, getResponsiveFontSize, getResponsiveSpacing, getResponsiveSpacingWithNegative, isSmallScreen, isMediumScreen, isLargeScreen, isTablet);
  
  // Form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [personalDocuments, setPersonalDocuments] = useState<any[]>([]);
  const [professionalDocuments, setProfessionalDocuments] = useState<any[]>([]);
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  
  // Hidden location fields
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [areaName, setAreaName] = useState(''); // Store area name for city column
  
  // Location autocomplete
  const [locationSuggestions, setLocationSuggestions] = useState<Suggestion[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // UI states
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 for basic info, 2 for skills and documents
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  // Debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isSelectingSuggestion = useRef(false);

  // Add ref for location input tracking
  const locationInputRef = useRef<TextInput>(null);

  // Add skillsData state
  const [skillsData, setSkillsData] = useState<Skill[]>([]);

  // Add existing documents state
  const [existingPersonalDocuments, setExistingPersonalDocuments] = useState<any[]>([]);
  const [existingProfessionalDocuments, setExistingProfessionalDocuments] = useState<any[]>([]);

  // Add validation states
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [priceError, setPriceError] = useState('');
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
      case 'price':
        setPriceError(errorMessage);
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
        case 'price':
          setPriceError('');
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

  // Add email validation timer
  const emailValidationTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to clear all error timers when component unmounts
  React.useEffect(() => {
    return () => {
      Object.values(errorTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      errorTimers.current = {};
    };
  }, []);

  // Load worker data if in edit mode
  useEffect(() => {
    
    if (isEditMode && workerData) {
      try {
        const parsedWorkerData: WorkerData = JSON.parse(workerData as string);
        
        // Check if the parsed data has documents
        if (parsedWorkerData.document1 || parsedWorkerData.document2) {
          populateFormWithWorkerData(parsedWorkerData);
        } else {
          // If no documents in parameter, fetch from API
          if (workerId) {
            fetchWorkerDataFromAPI();
          }
        }
      } catch (error) {
        if (workerId) {
          fetchWorkerDataFromAPI();
        }
      }
    } else if (isEditMode && workerId) {
      fetchWorkerDataFromAPI();
    }
  }, [isEditMode, workerData, workerId]);

  // Function to fetch worker data from API
  const fetchWorkerDataFromAPI = async () => {
    try {
      const apiUrl = `${API_ENDPOINTS.UPDATE_WORKER}/${workerId}`.replace('/update-worker/', '/workers/');
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success && result.data) {
        const workerData = result.data;
        populateFormWithWorkerData(workerData);
      } else {
      }
    } catch (error) {
    }
  };

  // Function to populate form with worker data
  const populateFormWithWorkerData = (workerData: WorkerData) => {
    
    setName(workerData.name || '');
    setMobile(workerData.mobile || '');
    setEmail(workerData.email || '');
    
    // Format price to remove .00 if it's a whole number
    const priceValue = workerData.price || '';
    if (priceValue) {
      // Parse the price as a number and format it to remove unnecessary decimal places
      const numericPrice = parseFloat(priceValue);
      if (!isNaN(numericPrice)) {
        // If it's a whole number, display without decimals
        if (numericPrice % 1 === 0) {
          const formattedPrice = numericPrice.toString();
          setPrice(formattedPrice);
        } else {
          // Keep decimal places but remove trailing zeros
          const formattedPrice = numericPrice.toString().replace(/\.?0+$/, '');
          setPrice(formattedPrice);
        }
      } else {
        setPrice(priceValue);
      }
    } else {
      setPrice('');
    }
    
    setAddress(workerData.address || '');
    setPincode(workerData.pincode || '');
    setDistrict(workerData.district || '');
    setState(workerData.state || '');
    setCountry(workerData.country || '');
    setLatitude(workerData.latitude || '');
    setLongitude(workerData.longitude || '');
    
    // Set location (combine city and district)
    if (workerData.city || workerData.district) {
      const locationParts = [workerData.city, workerData.district, workerData.state, workerData.country].filter(Boolean);
      setLocation(locationParts.join(', '));
      setAreaName(workerData.city || workerData.district || '');
    }
    
    // Set profile photo
    if (workerData.profile_image) {
      setProfilePhoto(workerData.profile_image);
    }
    
    // Set skills
    if (workerData.skill_id) {
      try {
        const skillIds = workerData.skill_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        setSelectedSkills(skillIds);
      } catch (error) {
      }
    }
    
    // Set existing personal documents (document1 column)
    if (workerData.document1) {
      try {
        // Split comma-separated documents and filter out empty entries
        const docPaths = workerData.document1.split(',')
          .map((path: string) => path.trim())
          .filter((path: string) => path.length > 0);
        
        if (docPaths.length > 0) {
          const existingDocs: any[] = [];
          docPaths.forEach((docPath: string, index: number) => {
            // Extract filename from the full path
            const filename = docPath.split('/').pop() || docPath;
            existingDocs.push({
              id: `personal_doc${index + 1}`,
              name: `Personal Document ${index + 1}`,
              filename: filename,
              uri: `http://192.168.31.84:3001${docPath}`,
              isExisting: true,
              serverPath: filename
            });
          });
          
          setExistingPersonalDocuments(existingDocs);
        } else {
          setExistingPersonalDocuments([]);
        }
      } catch (error) {
        setExistingPersonalDocuments([]);
      }
    } else {
      setExistingPersonalDocuments([]);
    }
    
    // Set existing professional documents (document2 column)
    if (workerData.document2) {
      try {
        // Split comma-separated documents and filter out empty entries
        const docPaths = workerData.document2.split(',')
          .map((path: string) => path.trim())
          .filter((path: string) => path.length > 0);
        
        if (docPaths.length > 0) {
          const existingDocs: any[] = [];
          docPaths.forEach((docPath: string, index: number) => {
            // Extract filename from the full path
            const filename = docPath.split('/').pop() || docPath;
            existingDocs.push({
              id: `professional_doc${index + 1}`,
              name: `Professional Document ${index + 1}`,
              filename: filename,
              uri: `http://192.168.31.84:3001${docPath}`,
              isExisting: true,
              serverPath: filename
            });
          });
          
          setExistingProfessionalDocuments(existingDocs);
        } else {
          setExistingProfessionalDocuments([]);
        }
      } catch (error) {
        setExistingProfessionalDocuments([]);
      }
    } else {
      setExistingProfessionalDocuments([]);
    }
  };

  // Fetch categories from backend on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Use your backend IP or localhost if running on emulator
        const response = await fetch(API_ENDPOINTS.CATEGORIES);
        const result = await response.json();
        if (result.success) {
          setSkillsData(result.data.map((cat: any) => ({
            id: cat.id,
            name: cat.title,
          })));
        }
      } catch (error) {
      }
    };
    fetchCategories();
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
    
    // Extract area name from the selected location
    const locationParts = suggestion.description.split(', ');
    if (locationParts.length > 0) {
      const extractedAreaName = locationParts[0].trim();
      setAreaName(extractedAreaName);
    }
    
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
    
    if (showSkillsDropdown) {
      setShowSkillsDropdown(false);
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
        
        const sublocality = addressComponents.find((component: any) => 
          component.types.includes('sublocality')
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
        
        // Set district (mandal) - prefer level 2, then level 3, then locality
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
        
      } else {
        const parts = description.split(', ');
        
        if (parts.length >= 2) {
          const pincodeMatch = description.match(/\b\d{6}\b/);
          if (pincodeMatch) {
            setPincode(pincodeMatch[0]);
          }
          
          // For city/area name, use the first part of the location
          if (parts.length >= 1) {
            const areaName = parts[0]?.trim();
            if (areaName) {
            }
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

  // Handle skill selection
  const toggleSkill = (skillId: number) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Handle document upload with options
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [currentDocumentType, setCurrentDocumentType] = useState<'personal' | 'professional'>('personal');
  
    const handleDocumentUploadWithOptions = async (documentType: 'personal' | 'professional') => {
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
        if (currentDocumentType === 'personal') {
          setPersonalDocuments([...personalDocuments, ...result.assets]);
        } else {
          setProfessionalDocuments([...professionalDocuments, ...result.assets]);
        }
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
        
        if (currentDocumentType === 'personal') {
          setPersonalDocuments([...personalDocuments, newDocument]);
        } else {
          setProfessionalDocuments([...professionalDocuments, newDocument]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  // Handle document upload (legacy function for backward compatibility)
  const handleDocumentUpload = async (documentType: 'personal' | 'professional') => {
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
        if (documentType === 'personal') {
          setPersonalDocuments([...personalDocuments, ...result.assets]);
        } else {
          setProfessionalDocuments([...professionalDocuments, ...result.assets]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    }
  };

  // Remove uploaded document
  const removeDocument = (index: number, documentType: 'personal' | 'professional') => {
    if (documentType === 'personal') {
      const newDocuments = personalDocuments.filter((_, i) => i !== index);
      setPersonalDocuments(newDocuments);
    } else {
      const newDocuments = professionalDocuments.filter((_, i) => i !== index);
      setProfessionalDocuments(newDocuments);
    }
  };

  // Check if document is existing (from backend)
  const isExistingDocument = (doc: any) => {
    const isExisting = doc.isExisting || doc.uri?.startsWith('/uploads/') || doc.uri?.startsWith('http');
    return isExisting;
  };

  // Remove existing document function
  const removeExistingDocument = (documentId: string, documentType: 'personal' | 'professional') => {
    if (documentType === 'personal') {
      setExistingPersonalDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } else {
      setExistingProfessionalDocuments(prev => prev.filter(doc => doc.id !== documentId));
    }
  };

  // Check if user exists in database (checking against tbl_workers)
  const checkUserExists = async (mobile: string, email: string) => {
    try {
      setIsCheckingUser(true);
      setMobileError('');
      setEmailError('');
      
      const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS(mobile, email, 'professional'));
      const result = await response.json();
      
      if (result.success && result.data.exists) {
        // Only show error for the specific field that conflicts
        if (result.data.existingMobile && mobile !== (workerData ? JSON.parse(workerData as string)?.mobile : '')) {
          setErrorWithAutoDismiss('mobile', 'Mobile number already registered in our system');
          return true; // User exists
        }
        if (result.data.existingEmail && email !== (workerData ? JSON.parse(workerData as string)?.email : '')) {
          setErrorWithAutoDismiss('email', 'Email address already registered in our system');
          return true; // User exists
        }
        
        // If we reach here, the conflicts are with the current user's own data, which is fine
        return false; // No real conflict
      }
      return false; // User doesn't exist or no conflicts
    } catch (error) {
      // Set generic error if API call fails
      setErrorWithAutoDismiss('email', 'Unable to verify email. Please try again.');
      return false;
    } finally {
      setIsCheckingUser(false);
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
      
      // Only check email if it's different from the initial email
      if (isEditMode && workerData) {
        try {
          const parsedWorkerData = JSON.parse(workerData as string);
          if (email.trim() !== parsedWorkerData.email) {
            try {
              setIsValidatingEmail(true);
              const response = await fetch(API_ENDPOINTS.CHECK_USER_EXISTS('', email.trim(), 'professional'));
              const result = await response.json();
              
              if (result.success && result.data.existingEmail) {
                setErrorWithAutoDismiss('email', 'Email address already registered in our system');
                setIsEmailValid(false);
              } else {
                setEmailError(''); // Clear error if email is available
                setIsEmailValid(true);
              }
            } catch (error) {
              // Don't set error for network issues during real-time validation
            } finally {
              setIsValidatingEmail(false);
            }
          } else {
            // Email hasn't changed, mark as valid
            setEmailError('');
            setIsEmailValid(true);
            setIsValidatingEmail(false);
          }
        } catch (error) {
          setIsValidatingEmail(false);
        }
      } else {
        // Not in edit mode, just validate format
        setEmailError('');
        setIsEmailValid(true);
        setIsValidatingEmail(false);
      }
    }, 1000) as any; // 1 second delay
  };

  // Handle next button
  const handleNext = () => {
    // Clear previous errors
    setNameError('');
    setMobileError('');
    setEmailError('');
    setPriceError('');
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
    } else if (mobile.length < 10) {
      setErrorWithAutoDismiss('mobile', 'Please enter a valid mobile number');
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
    
    // Check price
    if (!price.trim()) {
      setErrorWithAutoDismiss('price', 'Price per hour is required');
      hasErrors = true;
    } else {
      // Validate price is a positive number
      const priceValue = parseFloat(price.trim());
      if (isNaN(priceValue) || priceValue <= 0) {
        setErrorWithAutoDismiss('price', 'Please enter a valid price (positive number)');
        hasErrors = true;
      }
    }
    
    // For edit mode, location is optional
    if (!isEditMode) {
      if (!location.trim()) {
        setErrorWithAutoDismiss('location', 'Location is required');
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      return;
    }

    // Only check for duplicates if the values have actually changed (in edit mode)
    if (isEditMode && workerData) {
      try {
        const parsedWorkerData = JSON.parse(workerData as string);
        const mobileChanged = mobile !== parsedWorkerData.mobile;
        const emailChanged = email !== parsedWorkerData.email;
        
        if (mobileChanged || emailChanged) {
          // Check for duplicates asynchronously
          checkUserExists(mobile.trim(), email.trim()).then(userExists => {
            if (!userExists) {
              setCurrentStep(2);
            } else {
            }
          }).catch(error => {
            setCurrentStep(2);
          });
          return;
        } else {
          setCurrentStep(2);
          return;
        }
      } catch (error) {
        setCurrentStep(2);
        return;
      }
    }
    setCurrentStep(2);
  };

  // Set initial step based on mode
  useEffect(() => {
    // Always start with step 1, regardless of mode
    setCurrentStep(1);
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    // Only require skills for new registrations
    if (!isEditMode && selectedSkills.length === 0) {
      Alert.alert('Error', 'Please select at least one skill');
      return;
    }

    // Check address
    if (!address.trim()) {
      setErrorWithAutoDismiss('address', 'Address is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Add basic form fields
      formData.append('name', name);
      formData.append('mobile', mobile);
      formData.append('email', email);
      formData.append('price', price);
      // Only append skills if they exist
      if (selectedSkills.length > 0) {
        formData.append('skills', JSON.stringify(selectedSkills));
      }
      formData.append('location', location || '');
      formData.append('address', address || '');
      formData.append('pincode', pincode || '');
      formData.append('district', district || '');
      formData.append('state', state || '');
      formData.append('country', country || '');
      formData.append('latitude', latitude || '');
      formData.append('longitude', longitude || '');
      formData.append('areaName', areaName || ''); // Send area name for city column

      // Add profile photo if exists and it's a new photo (not a URL)
      if (profilePhoto && !profilePhoto.startsWith('http') && !profilePhoto.startsWith('/uploads/')) {
        const profilePhotoObj = {
          uri: profilePhoto,
          type: 'image/jpeg',
          name: `profile_${Date.now()}.jpg`,
        };
        formData.append('profilePhoto', profilePhotoObj as any);
      }

      // IMPORTANT: Send existing documents that should be kept
      if (existingPersonalDocuments.length > 0) {
        const existingDocNames = existingPersonalDocuments.map(doc => doc.filename).filter(Boolean);
        formData.append('existingPersonalDocuments', JSON.stringify(existingDocNames));
      }

      if (existingProfessionalDocuments.length > 0) {
        // Extract just the filenames from existing professional documents
        const existingDocNames = existingProfessionalDocuments.map(doc => doc.filename).filter(Boolean);
        formData.append('existingProfessionalDocuments', JSON.stringify(existingDocNames));
      }
      personalDocuments.forEach((doc, index) => {
        if (!doc.isExisting) {
          const documentObj = {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name || `personal_doc_${index}.pdf`,
          };
          // Changed from 'personalDocuments' to 'document1' to match backend
          formData.append('document1', documentObj as any);
        }
      });

      // Add new professional documents (only new ones, not existing URLs)
      professionalDocuments.forEach((doc, index) => {
        if (!doc.isExisting) {
          const documentObj = {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name || `professional_doc_${index}.pdf`,
          };
          // Changed from 'professionalDocuments' to 'document2' to match backend
          formData.append('document2', documentObj as any);
        }
      });

      const apiEndpoint = isEditMode 
        ? `${API_ENDPOINTS.UPDATE_WORKER}/${workerId}`
        : API_ENDPOINTS.REGISTER_PROFESSIONAL;

      // Make API call to backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for file uploads

      try {
        const response = await fetch(apiEndpoint, {
          method: isEditMode ? 'PUT' : 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (response.ok && result.success) {
          const successMessage = isEditMode 
            ? 'Your profile has been updated successfully!'
            : 'Your professional registration has been submitted successfully. We will contact you soon.';
          
          Alert.alert(
            'Success!',
            successMessage,
            [
              {
                text: 'OK',
                onPress: async () => {
                  if (isEditMode) {
                    // Update the AuthContext with new user data
                    if (result.data) {
                      try {
                        await updateUser({
                          name: result.data.name,
                          email: result.data.email,
                          mobile: result.data.mobile,
                          profileImage: result.data.profile_image,
                        });
                      } catch (error) {
                        console.error('Error updating user context:', error);
                      }
                    }
                    // Navigate back to worker index instead of login
                    router.replace('/workerindex');
                  } else {
                    // Reset form for registration mode
                    setName('');
                    setMobile('');
                    setEmail('');
                    setPrice('');
                    setProfilePhoto(null);
                    setSelectedSkills([]);
                    setPersonalDocuments([]);
                    setProfessionalDocuments([]);
                    setLocation('');
                    setAddress('');
                    setPincode('');
                    setDistrict('');
                    setState('');
                    setCountry('');
                    setLatitude('');
                    setLongitude('');
                    setAreaName('');
                    setCurrentStep(1);
                    router.back();
                  }
                }
              }
            ]
          );
        } else {
          const errorMessage = result.message || (isEditMode ? 'Profile update failed. Please try again.' : 'Registration failed. Please try again.');
          Alert.alert(isEditMode ? 'Update Failed' : 'Registration Failed', errorMessage);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. The server took too long to respond. Please try again.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      let errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      
      if (error.message) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and ensure you are connected to the same WiFi network as your computer.';
        }
      }
      
      Alert.alert('Network Error', errorMessage);
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
              <Ionicons name="location-outline" size={moderateScale(16)} color="#666" />
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

  // Step 1: Basic Information
  const renderStep1 = () => (
    <View style={styles.formContainer1}>
      {/* Profile Photo Upload */}
      <View style={styles.profilePhotoContainer}>
        <TouchableOpacity style={styles.profilePhotoButton} onPress={handleProfilePhotoUpload}>
          {profilePhoto ? (
            <>
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            </>
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="camera" size={moderateScale(30)} color="#A1CEDC" />
              <Text style={styles.profilePhotoText}>
                {isEditMode ? 'Change Photo' : 'Add Photo'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Name Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={moderateScale(20)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
            value={name}
            editable={false}
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
          <Ionicons name="call-outline" size={moderateScale(20)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your mobile number"
            placeholderTextColor="#999"
            value={mobile}
            editable={false}
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
            }}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
        {mobileError ? (
          <Text style={styles.errorText}>{mobileError}</Text>
        ) : null}
      </View>

      {/* Email Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={moderateScale(20)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            value={email}
            editable={false}
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
            <Ionicons name="reload" size={moderateScale(16)} color="#A1CEDC" style={styles.spinningIcon} />
          )}
          {isEmailValid && !isValidatingEmail && (
            <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#27ae60" />
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

      {/* Price Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Price *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="cash-outline" size={moderateScale(20)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter price per hour"
            placeholderTextColor="#999"
            value={price}
            editable={false}
            onChangeText={(text) => {
              setPrice(text);
              // Clear error immediately when user types
              if (priceError) {
                if (errorTimers.current['price']) {
                  clearTimeout(errorTimers.current['price']);
                  delete errorTimers.current['price'];
                }
                setPriceError('');
              }
            }}
            keyboardType="numeric"
          />
        </View>
        {priceError ? (
          <Text style={styles.errorText}>{priceError}</Text>
        ) : null}
      </View>

      {/* Location Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          {isEditMode ? 'Location' : 'Location *'}
        </Text>
        <View style={{ position: 'relative' }}>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={moderateScale(20)} color="#666" style={styles.inputIcon} />
            <TextInput
              ref={locationInputRef}
              style={styles.input}
              placeholder="Type to search location"
              placeholderTextColor="#999"
              value={location}
              editable={false}
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
            style={{ position: 'absolute', top: getResponsiveValue(55, 50, 60), left: 0, right: 0, zIndex: 10 }}
          />
        </View>
        {locationError ? (
          <Text style={styles.errorText}>{locationError}</Text>
        ) : null}
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextButton, isCheckingUser && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={isCheckingUser}
      >
        {isCheckingUser ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="reload" size={moderateScale(20)} color="#fff" style={styles.spinningIcon} />
            <Text style={styles.nextButtonText}>Checking...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={moderateScale(20)} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Step 2: Skills and Documents
  const renderStep2 = () => (
    <View style={styles.formContainer2}>

      {/* Address Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          {isEditMode ? 'Address' : 'Address *'}
        </Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="home-outline" size={moderateScale(30)} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { height: getResponsiveValue(80, 70, 100), textAlignVertical: 'top' }]}
            placeholder="Enter your complete address"
            placeholderTextColor="#999"
            value={address}
            editable={false}
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

      {/* Skills Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          {isEditMode ? 'Skills' : 'Skills *'}
        </Text>
        <TouchableOpacity
          style={styles.skillsDropdown}
          disabled={true}
          onPress={() => setShowSkillsDropdown(!showSkillsDropdown)}
        >
          <View style={styles.skillsDropdownHeader}>
            <Ionicons name="briefcase-outline" size={moderateScale(20)} color="#666" style={styles.inputIcon} />
            <Text style={styles.skillsDropdownText}>
              {selectedSkills.length > 0 
                ? `${selectedSkills.length} skill(s) selected`
                : (isEditMode ? 'Current skills' : 'Select your skills')
              }
            </Text>
            <Ionicons 
              name={showSkillsDropdown ? "chevron-up" : "chevron-down"} 
              size={moderateScale(20)} 
              color="#666" 
            />
          </View>
        </TouchableOpacity>

        {/* Selected Skills Display */}
        {selectedSkills.length > 0 && (
          <View style={styles.selectedSkillsContainer}>
            {selectedSkills.map((id) => {
              const skill = skillsData.find(s => s.id === id);
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.selectedSkillTag}
                  disabled={true}
                  onPress={() => toggleSkill(id)}
                >
                  <Text style={styles.selectedSkillText}>{skill?.name}</Text>
                  {/* <Ionicons name="close-circle" size={moderateScale(16)} color="#e74c3c" /> */}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Skills Dropdown */}
        {showSkillsDropdown && (
          <View style={styles.skillsDropdownContent}>
            <ScrollView style={styles.skillsList} nestedScrollEnabled={true}>
              {skillsData.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  style={styles.skillItem}
                  onPress={() => toggleSkill(skill.id)}
                >
                  <Text style={styles.skillText}>{skill.name}</Text>
                  {selectedSkills.includes(skill.id) && (
                    <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#27ae60" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Personal Documents Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          {isEditMode ? 'Personal Documents' : 'Personal Documents'}
        </Text>
        
        <View style={styles.uploadOptionsContainer}>
          <TouchableOpacity
            style={styles.uploadOptionButton}
            onPress={() => handleDocumentUploadWithOptions('personal')}
          >
            <Ionicons name="document-text-outline" size={moderateScale(20)} color="#666" />
            <Text style={styles.uploadOptionText}>
              {isEditMode ? 'Change Aadhar/Pan/Ration' : 'Upload Aadhar/Pan/Ration'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Existing Personal Documents Display - Moved here */}
        {existingPersonalDocuments.length > 0 && (
          <View style={styles.existingDocumentsContainer}>
            <Text style={styles.existingDocumentsTitle}>Existing Personal Documents:</Text>
            {existingPersonalDocuments.map((doc) => (
              <View key={doc.id} style={styles.existingDocumentItem}>
                <Ionicons 
                  name={doc.filename?.includes('.pdf') ? "document-outline" : "image-outline"} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.existingDocumentName}>{doc.filename}</Text>
                <TouchableOpacity onPress={() => removeExistingDocument(doc.id, 'personal')}>
                  <Ionicons name="close-circle" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Selected Personal Documents Display */}
        {personalDocuments.length > 0 ? (
          <View style={styles.uploadedDocumentsContainer}>
            <Text style={styles.newDocumentsTitle}>New Personal Documents:</Text>
            {personalDocuments.map((doc, index) => (
              <View key={index} style={styles.uploadedDocumentItem}>
                <Ionicons 
                  name={doc.mimeType?.startsWith('image/') || doc.type?.startsWith('image/') ? "image-outline" : "document-outline"} 
                  size={16} 
                  color={doc.isExisting ? "#27ae60" : "#666"} 
                />
                <Text style={[styles.uploadedDocumentName, doc.isExisting && styles.existingDocumentName]}>
                  {doc.isExisting ? doc.name : (doc.name || doc.filename || `Document ${index + 1}`)}
                </Text>
                {doc.isExisting && (
                  <Text style={styles.existingDocumentLabel}>Existing</Text>
                )}
                <TouchableOpacity onPress={() => removeDocument(index, 'personal')}>
                  <Ionicons name="close-circle" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : isEditMode && existingPersonalDocuments.length === 0 && (
          <Text style={styles.noDocumentsText}>No personal documents uploaded yet</Text>
        )}
      </View>

      {/* Professional Documents Field */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          {isEditMode ? 'Professional Documents' : 'Professional Documents'}
        </Text>
        
        <View style={styles.uploadOptionsContainer}>
          <TouchableOpacity
            style={styles.uploadOptionButton}
            onPress={() => handleDocumentUploadWithOptions('professional')}
          >
            <Ionicons name="document-text-outline" size={moderateScale(20)} color="#666" />
            <Text style={styles.uploadOptionText}>
              {isEditMode ? 'Change License/Certificates' : 'Upload License/Certificates'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Existing Professional Documents Display - Moved here */}
        {existingProfessionalDocuments.length > 0 && (
          <View style={styles.existingDocumentsContainer}>
            <Text style={styles.existingDocumentsTitle}>Existing Professional Documents:</Text>
            {existingProfessionalDocuments.map((doc) => (
              <View key={doc.id} style={styles.existingDocumentItem}>
                <Ionicons 
                  name={doc.filename?.includes('.pdf') ? "document-outline" : "image-outline"} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.existingDocumentName}>{doc.filename}</Text>
                <TouchableOpacity onPress={() => removeExistingDocument(doc.id, 'professional')}>
                  <Ionicons name="close-circle" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Selected Professional Documents Display */}
        {professionalDocuments.length > 0 ? (
          <View style={styles.uploadedDocumentsContainer}>
            <Text style={styles.newDocumentsTitle}>New Professional Documents:</Text>
            {professionalDocuments.map((doc, index) => (
              <View key={index} style={styles.uploadedDocumentItem}>
                <Ionicons 
                  name={doc.mimeType?.startsWith('image/') || doc.type?.startsWith('image/') ? "image-outline" : "document-outline"} 
                  size={16} 
                  color={doc.isExisting ? "#27ae60" : "#666"} 
                />
                <Text style={[styles.uploadedDocumentName, doc.isExisting && styles.existingDocumentName]}>
                  {doc.isExisting ? doc.name : (doc.name || doc.filename || `Document ${index + 1}`)}
                </Text>
                {doc.isExisting && (
                  <Text style={styles.existingDocumentLabel}>Existing</Text>
                )}
                <TouchableOpacity onPress={() => removeDocument(index, 'professional')}>
                  <Ionicons name="close-circle" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : isEditMode && existingProfessionalDocuments.length === 0 && (
          <Text style={styles.noDocumentsText}>No professional documents uploaded yet</Text>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="reload" size={moderateScale(20)} color="#fff" style={styles.spinningIcon} />
            <Text style={styles.submitButtonText}>Submitting...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#fff" />
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Profile' : 'Register as Professional'}
            </Text>
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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Header - moved outside ScrollView */}
            <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.menuButton} onPress={() => router.back()}>
                <Ionicons style={styles.menuicon} name="arrow-back" size={moderateScale(28)} color="black" />
              </TouchableOpacity>
              <Image
                source={require('@/assets/images/OriginX.png')}
                style={styles.mainlogo}
                contentFit="contain"
              />
            </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${currentStep * 50}%` }]} />
              </View>
              <Text style={styles.progressText}>Step {currentStep} of 2</Text>
            </View>

            {/* Subtitle */}
            <View style={styles.logoContainer}>
              {currentStep === 2 && (
                <TouchableOpacity
                  style={styles.headerBackButton}
                  onPress={() => setCurrentStep(1)}
                >
                  <Ionicons name="arrow-back" size={moderateScale(20)} color="#A1CEDC" />
                  <Text style={styles.headerBackButtonText}>Back</Text>
                </TouchableOpacity>
              )}
                          <Text style={styles.logoSubtitle}>
              {isEditMode ? 'Edit Profile' : (currentStep === 1 ? '' : 'Skills & Documents')}
            </Text>
            </View>

            {/* Render current step */}
            {currentStep === 1 ? renderStep1() : renderStep2()}
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
                <Text style={styles.modalTitle}>
                  {isEditMode ? 'Change profile photo' : 'Add profile photo'}
                </Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleCameraCapture}
                >
                  <Ionicons name="camera" size={moderateScale(24)} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Take a photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleGallerySelection}
                >
                  <Ionicons name="images-outline" size={moderateScale(24)} color="#2c3e50" />
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
                <Text style={styles.modalTitle}>
                  {currentDocumentType === 'personal' 
                    ? (isEditMode ? 'Change Personal Documents' : 'Upload Personal Documents')
                    : (isEditMode ? 'Change Professional Documents' : 'Upload Professional Documents')
                  }
                </Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleDocumentFileSelection}
                >
                  <Ionicons name="document-text-outline" size={moderateScale(24)} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Select Files</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleCameraCaptureForDocuments}
                >
                  <Ionicons name="camera" size={moderateScale(24)} color="#2c3e50" />
                  <Text style={styles.modalOptionText}>Take a photo</Text>
                </TouchableOpacity>
                <Text style={styles.modalDescription}>
                  {currentDocumentType === 'personal' 
                    ? (isEditMode 
                        ? 'Change your Aadhar, PAN, or Ration card documents for verification.'
                        : 'Upload your Aadhar, PAN, or Ration card documents for verification.'
                      )
                    : (isEditMode 
                        ? 'Change your professional licenses, certificates, or other relevant documents.'
                        : 'Upload your professional licenses, certificates, or other relevant documents.'
                      )
                  }
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

const createStyles = (
  width: number, 
  height: number, 
  scale: (size: number, factor?: number) => number, 
  moderateScale: (size: number, factor?: number) => number,
  scaleHeight: (size: number, factor?: number) => number,
  getResponsiveValue: (baseValue: number, minValue?: number, maxValue?: number) => number,
  getResponsiveWidth: (baseValue: number, minValue?: number, maxValue?: number) => number,
  getResponsiveFontSize: (baseSize: number) => number,
  getResponsiveSpacing: (baseSpacing: number) => number,
  getResponsiveSpacingWithNegative: (baseSpacing: number) => number,
  isSmallScreen: boolean,
  isMediumScreen: boolean,
  isLargeScreen: boolean,
  isTablet: boolean
) => StyleSheet.create({
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
    paddingHorizontal: getResponsiveSpacing(10),
    paddingTop: getResponsiveValue(50, 25, 45),
    paddingBottom: getResponsiveSpacing(10),
    backgroundColor: '#A1CEDC',
    marginTop: getResponsiveSpacingWithNegative(-45),
  },
  menuButton: {
    padding: getResponsiveSpacing(5),
  },
  mainlogo: {
    height: getResponsiveValue(50, 40, 60),
    width: getResponsiveWidth(180, 150, 220),
    marginRight: isTablet ? getResponsiveWidth(250) : getResponsiveWidth(200),
  },
  menuicon: {
    marginRight: getResponsiveSpacing(10),
  },
  progressContainer: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: getResponsiveSpacing(15),
    backgroundColor: '#f8f9fa',
  },
  progressBar: {
    height: getResponsiveSpacing(4),
    backgroundColor: '#e0e0e0',
    borderRadius: getResponsiveSpacing(2),
    marginBottom: getResponsiveSpacing(8),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A1CEDC',
    borderRadius: getResponsiveSpacing(2),
  },
  progressText: {
    fontSize: getResponsiveFontSize(14),
    color: '#666',
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: getResponsiveSpacing(10),
    marginTop: getResponsiveSpacingWithNegative(-23),
    marginBottom: getResponsiveSpacing(7),
  },
  logoSubtitle: {
    fontSize: getResponsiveFontSize(20),
    color: '#2c3e50',
    fontStyle: 'italic',
    fontWeight: 'bold',
  },
  formContainer1: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: getResponsiveSpacing(30),
    backgroundColor: '#f8f9fa',
    marginTop: getResponsiveSpacingWithNegative(-5),
  },
  formContainer2: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: getResponsiveSpacing(30),
    backgroundColor: '#f8f9fa',
    marginTop: getResponsiveSpacingWithNegative(-24),
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSpacing(5),
    marginTop: getResponsiveSpacingWithNegative(-30),
  },
  profilePhotoButton: {
    width: getResponsiveValue(100, 80, 120),
    height: getResponsiveValue(100, 80, 120),
    borderRadius: getResponsiveValue(60, 50, 70),
    overflow: 'hidden',
    borderWidth: getResponsiveSpacing(3),
    borderColor: '#A1CEDC',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
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
    marginTop: getResponsiveSpacing(5),
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: getResponsiveSpacing(15),
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: getResponsiveSpacing(8),
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
      height: 2,
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
  nextButton: {
    backgroundColor: '#A1CEDC',
    borderRadius: getResponsiveSpacing(15),
    paddingVertical: getResponsiveSpacing(18),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveSpacing(20),
    shadowColor: '#A1CEDC',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSpacing(10),
    elevation: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    marginRight: getResponsiveSpacing(8),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: getResponsiveSpacing(10),
    paddingVertical: getResponsiveSpacing(10),
    paddingHorizontal: getResponsiveSpacing(15),
    marginBottom: getResponsiveSpacing(20),
    borderWidth: 1,
    borderColor: '#A1CEDC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSpacing(4),
    elevation: 3,
  },
  backButtonText: {
    color: '#A1CEDC',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    marginLeft: getResponsiveSpacing(8),
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: getResponsiveSpacing(20),
    top: 0,
    zIndex: 10,
    marginTop: getResponsiveSpacing(15),
  },
  headerBackButtonText: {
    color: '#A1CEDC',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    marginLeft: getResponsiveSpacing(8),
  },
  skillsDropdown: {
    backgroundColor: '#fff',
    borderRadius: getResponsiveSpacing(15),
    borderWidth: getResponsiveSpacing(2),
    borderColor: '#A1CEDC',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSpacing(4),
    elevation: 3,
  },
  skillsDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSpacing(15),
    paddingVertical: getResponsiveSpacing(15),
  },
  skillsDropdownText: {
    flex: 1,
    fontSize: getResponsiveFontSize(16),
    color: '#2c3e50',
    marginLeft: getResponsiveSpacing(10),
  },
  selectedSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: getResponsiveSpacing(10),
    gap: getResponsiveSpacing(8),
  },
  selectedSkillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    borderRadius: getResponsiveSpacing(20),
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: getResponsiveSpacing(6),
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  selectedSkillText: {
    fontSize: getResponsiveFontSize(14),
    color: '#27ae60',
    fontWeight: '600',
    marginRight: getResponsiveSpacing(5),
  },
  skillsDropdownContent: {
    backgroundColor: '#fff',
    borderRadius: getResponsiveSpacing(15),
    marginTop: getResponsiveSpacing(5),
    maxHeight: getResponsiveValue(200, 150, 250),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: getResponsiveSpacing(8),
    elevation: 8,
  },
  skillsList: {
    maxHeight: getResponsiveValue(180, 130, 230),
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSpacing(15),
    paddingVertical: getResponsiveSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  skillText: {
    fontSize: getResponsiveFontSize(16),
    color: '#2c3e50',
  },
  uploadOptionsContainer: {
    marginTop: getResponsiveSpacing(10),
    marginBottom: getResponsiveSpacing(10),
  },
  uploadOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f7',
    borderRadius: getResponsiveSpacing(10),
    paddingVertical: getResponsiveSpacing(10),
    paddingHorizontal: getResponsiveSpacing(15),
    borderWidth: 1,
    borderColor: '#a7dbd8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    marginTop: getResponsiveSpacing(10),
    paddingHorizontal: getResponsiveSpacing(10),
  },
  uploadedDocumentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: getResponsiveSpacing(10),
    paddingVertical: getResponsiveSpacing(8),
    paddingHorizontal: getResponsiveSpacing(12),
    marginBottom: getResponsiveSpacing(8),
  },
  uploadedDocumentName: {
    fontSize: getResponsiveFontSize(14),
    color: '#2c3e50',
    flex: 1,
  },
  noDocumentsText: {
    fontSize: getResponsiveFontSize(14),
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: getResponsiveSpacing(10),
  },
  existingDocumentName: {
    fontSize: getResponsiveFontSize(14),
    color: '#2c3e50',
    flex: 1,
    marginLeft: getResponsiveSpacing(8),
  },
  existingDocumentLabel: {
    fontSize: getResponsiveFontSize(10),
    color: '#27ae60',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: getResponsiveSpacing(6),
    paddingVertical: getResponsiveSpacing(2),
    borderRadius: getResponsiveSpacing(8),
    marginRight: getResponsiveSpacing(8),
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: getResponsiveSpacing(15),
    paddingVertical: getResponsiveSpacing(18),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveSpacing(20),
    shadowColor: '#3498db',
    shadowOffset: {
      width: 0,
      height: 6,
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
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSpacing(10),
    elevation: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: getResponsiveSpacing(2),
  },
  suggestionList: {
    maxHeight: getResponsiveValue(230, 180, 280),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSpacing(15),
    paddingVertical: getResponsiveSpacing(15),
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
    marginBottom: getResponsiveSpacing(2),
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
    paddingBottom: getResponsiveSpacing(40),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSpacing(10),
    elevation: 10,
  },
  modalHandle: {
    width: getResponsiveWidth(40, 30, 50),
    height: getResponsiveSpacing(4),
    backgroundColor: '#ddd',
    borderRadius: getResponsiveSpacing(2),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: getResponsiveSpacing(20),
    textAlign: 'center',
  },
  modalOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingVertical: getResponsiveSpacing(15),
    paddingHorizontal: getResponsiveSpacing(20),
    borderRadius: getResponsiveSpacing(10),
    marginBottom: getResponsiveSpacing(10),
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
    marginTop: getResponsiveSpacing(15),
    lineHeight: getResponsiveFontSize(18),
    paddingHorizontal: getResponsiveSpacing(20),
  },
  errorText: {
    color: '#e74c3c',
    fontSize: getResponsiveFontSize(14),
    marginTop: getResponsiveSpacing(5),
    marginLeft: getResponsiveSpacing(15),
    fontWeight: '500',
  },
  validatingText: {
    color: '#A1CEDC',
    fontSize: getResponsiveFontSize(14),
    marginTop: getResponsiveSpacing(5),
    marginLeft: getResponsiveSpacing(15),
    fontStyle: 'italic',
  },
  successText: {
    color: '#27ae60',
    fontSize: getResponsiveFontSize(14),
    marginTop: getResponsiveSpacing(5),
    marginLeft: getResponsiveSpacing(15),
    fontWeight: '500',
  },
  nextButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  existingDocumentsContainer: {
    marginTop: getResponsiveSpacingWithNegative(-5),
    marginBottom: getResponsiveSpacingWithNegative(-20),
    paddingHorizontal: getResponsiveSpacing(10),
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveSpacing(10),
    paddingVertical: getResponsiveSpacing(10),
  },
  existingDocumentsTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: getResponsiveSpacing(8),
  },
  existingDocumentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: getResponsiveSpacing(8),
    paddingVertical: getResponsiveSpacing(8),
    paddingHorizontal: getResponsiveSpacing(12),
    marginBottom: getResponsiveSpacing(6),
    borderLeftWidth: getResponsiveSpacing(3),
    borderLeftColor: '#3498db',
  },
  newDocumentsTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: getResponsiveSpacing(8),
    marginTop: getResponsiveSpacing(10),
  },
});