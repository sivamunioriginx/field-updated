import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';

// Construct base image URL from API base URL
const getImageBaseUrl = () => {
  return API_BASE_URL.replace('/api', '');
};

interface Worker {
  id: number;
  name: string;
  mobile: string;
  email: string;
  price: number;
  skill_id: string;
  category_title?: string;
  pincode: string;
  mandal: string;
  city: string;
  district: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  address: string;
  type: string;
  status: number;
  profile_image?: string;
  document1?: string;
  document2?: string;
  created_at: string;
}

interface Category {
  id: number;
  title: string;
  image: string;
}

interface EditWorkerProps {
  workerId: number;
  onBack: () => void;
  onSave?: () => void;
}

export default function EditWorker({ workerId, onBack, onSave }: EditWorkerProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [mandal, setMandal] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [areaName, setAreaName] = useState(''); // Store area name for city column
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const GOOGLE_PLACES_API_KEY = 'AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ';
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{description: string; place_id?: string}>>([]);
  const debounceTimer = useRef<any>(null);

  const fetchPlaceSuggestions = async (input: string) => {
    if (!input || input.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    if (typeof document !== 'undefined') {
      setLocationSuggestions([]);
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status && data.status !== 'OK') {
        // log the message for easier debugging (ZERO_RESULTS, REQUEST_DENIED, etc.)
        setLocationSuggestions([]);
        return;
      }

      const preds = data.predictions || [];
      const suggestions = preds.map((p: any) => ({ description: p.description, place_id: p.place_id }));
      setLocationSuggestions(suggestions);
    } catch (err) {
      setLocationSuggestions([]);
    }
  };

  // --- Web: load Google Maps JS SDK and use AutocompleteService (avoids CORS) ---
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const loadGoogleMapsScript = () => {
    if (typeof window === 'undefined') return Promise.resolve();
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      setGoogleMapsLoaded(true);
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[data-google-maps]`);
      if (existing) {
        existing.addEventListener('load', () => {
          setGoogleMapsLoaded(true);
          resolve();
        });
        existing.addEventListener('error', reject);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-maps', '1');
      script.onload = () => {
        setGoogleMapsLoaded(true);
        resolve();
      };
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  };

  const fetchPlaceSuggestionsWeb = async (input: string) => {
    if (!input || input.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    if (!googleMapsLoaded) {
      try {
        await loadGoogleMapsScript();
      } catch (err) {
        setLocationSuggestions([]);
        return;
      }
    }

    try {
      const service = new (window as any).google.maps.places.AutocompleteService();
      service.getPlacePredictions({ input }, (preds: any[], status: string) => {
        if (status !== (window as any).google.maps.places.PlacesServiceStatus.OK) {
          setLocationSuggestions([]);
          return;
        }
        const suggestions = (preds || []).map((p: any) => ({ description: p.description, place_id: p.place_id }));
        setLocationSuggestions(suggestions);
      });
    } catch (err) {
      setLocationSuggestions([]);
    }
  };

  const debouncedSearch = (input: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (Platform.OS === 'web') {
        fetchPlaceSuggestionsWeb(input);
      } else {
        fetchPlaceSuggestions(input);
      }
    }, 300);
  };

  const handleCityChange = (text: string) => {
    setCity(text);
    if (text.length >= 2) debouncedSearch(text);
    else setLocationSuggestions([]);
  };

  const selectLocationSuggestion = async (suggestion: { description: string; place_id?: string }) => {
    setCity(suggestion.description);
    setLocationSuggestions([]);

    // Extract area name from the selected location
    const locationParts = suggestion.description.split(', ');
    if (locationParts.length > 0) {
      const extractedAreaName = locationParts[0].trim();
      setAreaName(extractedAreaName);
    }

    await extractLocationDetails(suggestion.place_id || suggestion.description, suggestion.description);
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

        const countryComp = addressComponents.find((component: any) =>
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
          setMandal(administrativeAreaLevel2.long_name);
        } else if (administrativeAreaLevel3) {
          setDistrict(administrativeAreaLevel3.long_name);
          setMandal(administrativeAreaLevel3.long_name);
        } else if (locality) {
          setDistrict(locality.long_name);
          setMandal(locality.long_name);
        }

        if (countryComp) {
          setCountry(countryComp.long_name);
        }

        if (!postalCode && placeDetails.geometry && placeDetails.geometry.location) {
          await fetchPincodeFromCoordinates(
            placeDetails.geometry.location.lat,
            placeDetails.geometry.location.lng
          );
        }

      } else {
        // Try geocoding the full description to get geometry and address components
        try {
          const geoResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(description)}&key=${GOOGLE_PLACES_API_KEY}`
          );

          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.results && geoData.results.length > 0) {
              const result = geoData.results[0];

              if (result.geometry && result.geometry.location) {
                setLatitude(result.geometry.location.lat.toString());
                setLongitude(result.geometry.location.lng.toString());
              }

              const addressComponents = result.address_components || [];

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

              const countryComp = addressComponents.find((component: any) =>
                component.types.includes('country')
              );

              const locality = addressComponents.find((component: any) =>
                component.types.includes('locality')
              );

              if (postalCode) {
                setPincode(postalCode.long_name);
              }

              if (administrativeAreaLevel1) {
                setState(administrativeAreaLevel1.long_name);
              }

              if (administrativeAreaLevel2) {
                setDistrict(administrativeAreaLevel2.long_name);
                setMandal(administrativeAreaLevel2.long_name);
              } else if (administrativeAreaLevel3) {
                setDistrict(administrativeAreaLevel3.long_name);
                setMandal(administrativeAreaLevel3.long_name);
              } else if (locality) {
                setDistrict(locality.long_name);
                setMandal(locality.long_name);
              }

              if (countryComp) {
                setCountry(countryComp.long_name);
              }

              // Extract areaName from description if not already set
              const parts = description.split(', ');
              if (parts.length > 0 && parts[0]) setAreaName(parts[0].trim());

              return;
            }
          }
        } catch (err) {
          // ignore and fallback to string parsing
        }

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
              setAreaName(areaName);
            }
          }

          if (parts.length >= 4) {
            const districtVal = parts[parts.length - 3]?.trim() || '';
            setDistrict(districtVal);
            setMandal(districtVal);
            setState(parts[parts.length - 2]?.trim() || '');
            setCountry(parts[parts.length - 1]?.trim() || '');
          } else if (parts.length === 3) {
            const districtVal = parts[0]?.trim() || '';
            setDistrict(districtVal);
            setMandal(districtVal);
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

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);
  
  // Skills/Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  
  // Documents
  const [personalDocuments, setPersonalDocuments] = useState<any[]>([]);
  const [professionalDocuments, setProfessionalDocuments] = useState<any[]>([]);
  const [existingPersonalDocs, setExistingPersonalDocs] = useState<string[]>([]);
  const [existingProfessionalDocs, setExistingProfessionalDocs] = useState<string[]>([]);

  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  // Track initial values for change detection
  const [initialData, setInitialData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchWorkerDetails();
    fetchCategories();
  }, [workerId]);

  // Check for changes
  useEffect(() => {
    if (!initialData) {
      setHasChanges(false);
      return;
    }

    const arraysEqual = (arr1: any[], arr2: any[]) => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return sorted1.every((val, idx) => val === sorted2[idx]);
    };

    const changed = 
      name !== initialData.name ||
      mobile !== initialData.mobile ||
      email !== initialData.email ||
      price !== initialData.price ||
      pincode !== initialData.pincode ||
      address !== initialData.address ||
      mandal !== initialData.mandal ||
      city !== initialData.city ||
      district !== initialData.district ||
      state !== initialData.state ||
      country !== initialData.country ||
      !arraysEqual(selectedSkills, initialData.selectedSkills) ||
      !arraysEqual(existingPersonalDocs, initialData.existingPersonalDocs) ||
      !arraysEqual(existingProfessionalDocs, initialData.existingProfessionalDocs) ||
      personalDocuments.length > 0 ||
      professionalDocuments.length > 0 ||
      profilePhoto !== null;

    setHasChanges(changed);
  }, [
    name, mobile, email, price, pincode, address, mandal, city, district, state, country,
    areaName, latitude, longitude,
    selectedSkills, existingPersonalDocs, existingProfessionalDocs,
    personalDocuments, professionalDocuments, profilePhoto, initialData
  ]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories || data.data || []);
      }
    } catch (error) {
    }
  };

  const fetchWorkerDetails = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_ENDPOINTS.ADMIN_WORKERS}/${workerId}`);
      
      if (!response.ok) {
        Alert.alert('Error', 'Failed to fetch worker details');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        const workerData = data.worker || data.data;
        setWorker(workerData);
        
        // Populate form fields
        setName(workerData.name || '');
        setMobile(workerData.mobile || '');
        setEmail(workerData.email || '');
        setPrice(workerData.price?.toString() || '');
        setPincode(workerData.pincode || '');
        setAddress(workerData.address || '');
        setMandal(workerData.mandal || '');
        setCity(workerData.city || '');
        setDistrict(workerData.district || '');
        setState(workerData.state || '');
        setCountry(workerData.country || '');
        
        // Parse existing skills
        let skillIds: number[] = [];
        if (workerData.skill_id) {
          skillIds = workerData.skill_id.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
          setSelectedSkills(skillIds);
        }
        
        // Parse existing documents
        let personalDocs: string[] = [];
        let professionalDocs: string[] = [];
        if (workerData.document1) {
          personalDocs = workerData.document1.split(',').filter((doc: string) => doc.trim());
          setExistingPersonalDocs(personalDocs);
        }
        if (workerData.document2) {
          professionalDocs = workerData.document2.split(',').filter((doc: string) => doc.trim());
          setExistingProfessionalDocs(professionalDocs);
        }
        
        // Store initial values
        setInitialData({
          name: workerData.name || '',
          mobile: workerData.mobile || '',
          email: workerData.email || '',
          price: workerData.price?.toString() || '',
          pincode: workerData.pincode || '',
          address: workerData.address || '',
          mandal: workerData.mandal || '',
          city: workerData.city || '',
          district: workerData.district || '',
          state: workerData.state || '',
          country: workerData.country || '',
          areaName: workerData.city || workerData.district || '',
          latitude: workerData.latitude?.toString() || '',
          longitude: workerData.longitude?.toString() || '',
          selectedSkills: skillIds,
          existingPersonalDocs: personalDocs,
          existingProfessionalDocs: professionalDocs,
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch worker details');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching worker details');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillId: number) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter(id => id !== skillId));
    } else {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  };

  // Helper to normalize different result shapes returned by DocumentPicker across platforms/SDKs
  const parseDocumentPickerResult = (result: any) => {
    if (!result) return [];

    // Old ImagePicker-style shape: { canceled: false, assets: [...] }
    if (result.canceled === false && Array.isArray(result.assets) && result.assets.length > 0) {
      return result.assets.map((a: any) => ({
        uri: a.uri,
        name: a.name || a.filename || a.uri?.split('/').pop() || `document_${Date.now()}`,
        mimeType: a.mimeType || a.type || a.mime || 'application/octet-stream',
        size: a.size || a.fileSize || 0,
      }));
    }

    // Standard expo-document-picker shape (newer SDKs): { type: 'success', output: [...] } or { results: [...] } or { assets: [...] }
    if (result.type === 'success') {
      let assets: any[] = [];
      if (Array.isArray(result.output)) assets = result.output;
      else if (Array.isArray(result.results)) assets = result.results;
      else if (Array.isArray(result.assets)) assets = result.assets;
      else if (result.uri) assets = [{ uri: result.uri, name: result.name, mimeType: result.mimeType || result.mime || result.type }];

      if (assets.length === 0) return [];

      return assets.map((a: any) => ({
        uri: a.uri,
        name: a.name || a.filename || a.uri?.split('/').pop() || `document_${Date.now()}`,
        mimeType: a.mimeType || a.mime || a.type || 'application/octet-stream',
        size: a.size || a.fileSize || 0,
      }));
    }

    // Some platforms may return an array directly
    if (Array.isArray(result) && result.length > 0) {
      return result.map((a: any) => ({
        uri: a.uri,
        name: a.name || a.filename || a.uri?.split('/').pop() || `document_${Date.now()}`,
        mimeType: a.mimeType || a.type || 'application/octet-stream',
        size: a.size || a.fileSize || 0,
      }));
    }

    return [];
  };

  const handlePickPersonalDocuments = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      const picked = parseDocumentPickerResult(result);
      if (picked.length > 0) {
        setPersonalDocuments(prev => [...prev, ...picked]);
      } else {
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick personal documents. Please try again.');
    }
  };

  const handlePickProfessionalDocuments = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      const picked = parseDocumentPickerResult(result);
      if (picked.length > 0) {
        setProfessionalDocuments(prev => [...prev, ...picked]);
      } else {
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick professional documents. Please try again.');
    }
  };

  const removePersonalDocument = (index: number) => {
    setPersonalDocuments(personalDocuments.filter((_, i) => i !== index));
  };

  const removeProfessionalDocument = (index: number) => {
    setProfessionalDocuments(professionalDocuments.filter((_, i) => i !== index));
  };

  const removeExistingPersonalDoc = (index: number) => {
    setExistingPersonalDocs(existingPersonalDocs.filter((_, i) => i !== index));
  };

  const removeExistingProfessionalDoc = (index: number) => {
    setExistingProfessionalDocs(existingProfessionalDocs.filter((_, i) => i !== index));
  };

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

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim() || !mobile.trim()) {
      Alert.alert('Validation Error', 'Name and Mobile are required fields');
      return;
    }

    if (selectedSkills.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one skill');
      return;
    }

    setSaving(true);

    let formData = new FormData();
    formData.append('name', name.trim());
    formData.append('mobile', mobile.trim());
    formData.append('email', email.trim());
    formData.append('price', price || '0');
    formData.append('skills', JSON.stringify(selectedSkills));
    formData.append('pincode', pincode.trim());
    formData.append('address', address.trim());
    formData.append('mandal', mandal.trim());
    formData.append('city', city.trim());
    formData.append('district', district.trim());
    formData.append('state', state.trim());
    formData.append('country', country.trim());
    formData.append('latitude', latitude || '');
    formData.append('longitude', longitude || '');
    formData.append('areaName', areaName || ''); // Send area name for city column

    // Add existing documents (send filenames only)
    if (existingPersonalDocs.length > 0) {
      const existingPersonalNames = existingPersonalDocs.map((d) => d.split('/').pop() || d.split('\\').pop() || d);
      formData.append('existingPersonalDocuments', JSON.stringify(existingPersonalNames));
    }
    if (existingProfessionalDocs.length > 0) {
      const existingProfessionalNames = existingProfessionalDocs.map((d) => d.split('/').pop() || d.split('\\').pop() || d);
      formData.append('existingProfessionalDocuments', JSON.stringify(existingProfessionalNames));
    }

    // Add new personal documents (only those with a valid uri)
    let personalFilesAppended = 0;
    personalDocuments.forEach((doc, idx) => {
      if (doc && doc.uri) {
        const name = doc.name || doc.uri.split('/').pop() || `personal_doc_${Date.now()}_${idx}`;
        const type = doc.mimeType || doc.type || 'application/octet-stream';
        formData.append('document1', {
          uri: doc.uri,
          name,
          type,
        } as any);
        personalFilesAppended++;
      }
    });

    // Add new professional documents (only those with a valid uri)
    let professionalFilesAppended = 0;
    professionalDocuments.forEach((doc, idx) => {
      if (doc && doc.uri) {
        const name = doc.name || doc.uri.split('/').pop() || `professional_doc_${Date.now()}_${idx}`;
        const type = doc.mimeType || doc.type || 'application/octet-stream';
        formData.append('document2', {
          uri: doc.uri,
          name,
          type,
        } as any);
        professionalFilesAppended++;
      }
    });

    // Add profile photo (native FormData expects {uri, name, type})
    if (profilePhoto) {
      try {
        const name = profilePhoto.split('/').pop() || `profile_${Date.now()}.jpg`;
        const type = 'image/jpeg';
        // use 'profilePhoto' field name to match server multer config
        formData.append('profilePhoto', { uri: profilePhoto, name, type } as any);
      } catch (e) {
        // ignore
      }
    }


    // On web FormData needs File/Blob objects; try converting URIs to blobs when running on web
    // Include profilePhoto so single-photo updates on web are converted to Blobs (prevents '[object Object]' values)
    if (Platform.OS === 'web' && (personalFilesAppended > 0 || professionalFilesAppended > 0 || profilePhoto)) {
      try {
        const webForm = new FormData();
        // copy regular fields
        webForm.append('name', name.trim());
        webForm.append('mobile', mobile.trim());
        webForm.append('email', email.trim());
        webForm.append('price', price || '0');
        webForm.append('skills', JSON.stringify(selectedSkills));
        webForm.append('pincode', pincode.trim());
        webForm.append('address', address.trim());
        webForm.append('mandal', mandal.trim());
        webForm.append('city', city.trim());
        webForm.append('district', district.trim());
        webForm.append('state', state.trim());
        webForm.append('country', country.trim());
        webForm.append('latitude', latitude || '');
        webForm.append('longitude', longitude || '');
        webForm.append('areaName', areaName || '');

        if (existingPersonalDocs.length > 0) {
          const existingPersonalNames = existingPersonalDocs.map((d) => d.split('/').pop() || d.split('\\').pop() || d);
          webForm.append('existingPersonalDocuments', JSON.stringify(existingPersonalNames));
        }
        if (existingProfessionalDocs.length > 0) {
          const existingProfessionalNames = existingProfessionalDocs.map((d) => d.split('/').pop() || d.split('\\').pop() || d);
          webForm.append('existingProfessionalDocuments', JSON.stringify(existingProfessionalNames));
        }

        // Convert personal documents to blobs
        for (let i = 0; i < personalDocuments.length; i++) {
          const doc = personalDocuments[i];
          if (doc && doc.uri) {
            try {
              const res = await fetch(doc.uri);
              const blob = await res.blob();
              const name = doc.name || doc.uri.split('/').pop() || `personal_doc_${Date.now()}_${i}`;
              webForm.append('document1', blob, name);
            } catch (e) {
            }
          }
        }

        // Convert professional documents to blobs
        for (let i = 0; i < professionalDocuments.length; i++) {
          const doc = professionalDocuments[i];
          if (doc && doc.uri) {
            try {
              const res = await fetch(doc.uri);
              const blob = await res.blob();
              const name = doc.name || doc.uri.split('/').pop() || `professional_doc_${Date.now()}_${i}`;
              webForm.append('document2', blob, name);
            } catch (e) {
            }
          }
        }

        // Convert profile photo to blob (web)
        if (profilePhoto) {
          try {
            const res = await fetch(profilePhoto);
            const blob = await res.blob();
            const name = profilePhoto.split('/').pop() || `profile_${Date.now()}.jpg`;
            // use 'profilePhoto' field name to match server multer config
            webForm.append('profilePhoto', blob, name);
          } catch (e) {
          }
        }

        // Replace formData with the web-compatible version
        // @ts-ignore
        formData = webForm;
      } catch (err) {
      }
    }

    // Helpful debug: inspect FormData contents (native: _parts, web: entries())
    try {
      // no-op: skip FormData debug inspection in production
    } catch (err) {
    }

    // Use timeout with AbortController for file uploads
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_ENDPOINTS.ADMIN_WORKERS}/${workerId}`, {
        method: 'PUT',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Show toast and then native alert (keeps existing UX)
        Toast.show({ type: 'success', text1: 'Success', text2: 'Worker updated successfully' });
        Alert.alert('Success', 'Worker updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (onSave) onSave();
              onBack();
            }
          }
        ]);
      } else {
        Toast.show({ type: 'error', text1: 'Update failed', text2: 'Failed to update worker' });
        Alert.alert('Error', data.message || 'Failed to update worker');
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'An error occurred while updating worker' });
      Alert.alert('Error', 'An error occurred while updating worker');
    } finally {
      setSaving(false);
    }
  };

  const styles = createStyles(width, height);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading worker details...</Text>
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>Worker Not Found</Text>
        <Text style={styles.emptyText}>The worker you're looking for doesn't exist.</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Worker</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : worker.profile_image ? (
              <Image
                source={{ uri: `${getImageBaseUrl()}${worker.profile_image}` }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={isDesktop ? 50 : isTablet ? 45 : 40} color="#10b981" />
              </View>
            )}

            <TouchableOpacity style={styles.editPhotoButton} onPress={handleProfilePhotoUpload}>
              <Ionicons name="camera" size={isDesktop ? 20 : isTablet ? 18 : 16} color="#ffffff" />
            </TouchableOpacity>

            {/* Photo chooser modal */}
            <Modal visible={showPhotoModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Update Profile Photo</Text>
                  <TouchableOpacity style={styles.modalButton} onPress={handleCameraCapture}>
                    <Text style={styles.modalButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButton} onPress={handleGallerySelection}>
                    <Text style={styles.modalButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={closePhotoModal}>
                    <Text style={[styles.modalButtonText, styles.modalCancelText]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Contact Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter name"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Mobile *</Text>
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Price (₹/Per Hour)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Enter price"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Professional Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase-outline" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Professional Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Skills *</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowSkillsDropdown(!showSkillsDropdown)}
                >
                  <Text style={styles.dropdownButtonText} numberOfLines={1}>
                    {selectedSkills.length > 0 
                      ? categories
                          .filter(cat => selectedSkills.includes(cat.id))
                          .map(cat => cat.title)
                          .join(', ')
                      : 'Select skills'
                    }
                  </Text>
                  <Ionicons 
                    name={showSkillsDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                {showSkillsDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={styles.dropdownItem}
                          onPress={() => toggleSkill(category.id)}
                        >
                          <View style={[
                            styles.checkbox,
                            selectedSkills.includes(category.id) && styles.checkboxChecked
                          ]}>
                            {selectedSkills.includes(category.id) && (
                              <Ionicons name="checkmark" size={16} color="#ffffff" />
                            )}
                          </View>
                          <Text style={styles.dropdownItemText}>{category.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              <View style={styles.inputGroupHalf} />
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Location Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Location Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={handleCityChange}
                  placeholder="Enter Location"
                  placeholderTextColor="#94a3b8"
                />
                {locationSuggestions.length > 0 && (
                  <View style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#e0e0e0',borderRadius:8,marginTop:6,maxHeight:160}}>
                    <ScrollView nestedScrollEnabled>
                      {locationSuggestions.map((s, idx) => (
                        <TouchableOpacity key={idx} onPress={() => selectLocationSuggestion(s)} style={{padding:12,borderBottomWidth:1,borderBottomColor:'#f0f0f0'}}>
                          <Text style={{color:'#0f172a'}}>{s.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Documents Section - Two Columns */}
        <View style={styles.documentsRow}>
          {/* Personal Documents Section */}
          <View style={styles.documentSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>Personal Documents</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handlePickPersonalDocuments}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#10b981" />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
              {existingPersonalDocs.map((doc, index) => {
                const fileName = doc.split('/').pop() || doc.split('\\').pop() || doc;
                return (
                  <View key={`existing-${index}`} style={styles.documentItem}>
                    <Ionicons name="document" size={18} color="#10b981" />
                    <Text style={styles.documentName} numberOfLines={1}>{fileName}</Text>
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>Existing</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeExistingPersonalDoc(index)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {personalDocuments.map((doc, index) => (
                <View key={`new-${index}`} style={styles.documentItem}>
                  <Ionicons name="document" size={18} color="#64748b" />
                  <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                  <TouchableOpacity onPress={() => removePersonalDocument(index)}>
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Professional Documents Section */}
          <View style={styles.documentSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>Professional Documents</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handlePickProfessionalDocuments}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#10b981" />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
              {existingProfessionalDocs.map((doc, index) => {
                const fileName = doc.split('/').pop() || doc.split('\\').pop() || doc;
                return (
                  <View key={`existing-${index}`} style={styles.documentItem}>
                    <Ionicons name="document" size={18} color="#10b981" />
                    <Text style={styles.documentName} numberOfLines={1}>{fileName}</Text>
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>Existing</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeExistingProfessionalDoc(index)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {professionalDocuments.map((doc, index) => (
                <View key={`new-${index}`} style={styles.documentItem}>
                  <Ionicons name="document" size={18} color="#64748b" />
                  <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeProfessionalDocument(index)}>
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[
            styles.updateButton,
            (!hasChanges || saving) && styles.updateButtonDisabled
          ]} 
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#ffffff" />
              <Text style={styles.updateButtonText}>Update</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (width: number, height: number) => {
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    contentContainer: {
      padding: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      backgroundColor: '#f8fafc',
    },
    loadingText: {
      marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
      color: '#64748b',
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      paddingHorizontal: 20,
      backgroundColor: '#f8fafc',
    },
    emptyIconContainer: {
      width: isDesktop ? 120 : isTablet ? 100 : 80,
      height: isDesktop ? 120 : isTablet ? 100 : 80,
      borderRadius: isDesktop ? 60 : isTablet ? 50 : 40,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isDesktop ? 24 : isTablet ? 20 : 16,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: 24,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10b981',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    backButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isDesktop ? 32 : isTablet ? 24 : 20,
    },
    backIconButton: {
      width: isDesktop ? 44 : 40,
      height: isDesktop ? 44 : 40,
      borderRadius: 12,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    headerTitle: {
      fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
      fontWeight: '700',
      color: '#0f172a',
    },
    headerSpacer: {
      width: isDesktop ? 44 : 40,
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: isDesktop ? 24 : isTablet ? 20 : 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    profileSection: {
      alignItems: 'center',
      paddingVertical: isDesktop ? 8 : 6,
    },
    profileImageContainer: {
      marginBottom: 12,
    },
    profileImage: {
      width: isDesktop ? 100 : isTablet ? 90 : 80,
      height: isDesktop ? 100 : isTablet ? 90 : 80,
      borderRadius: isDesktop ? 50 : isTablet ? 45 : 40,
      borderWidth: 3,
      borderColor: '#10b981',
    },
    profileImagePlaceholder: {
      width: isDesktop ? 100 : isTablet ? 90 : 80,
      height: isDesktop ? 100 : isTablet ? 90 : 80,
      borderRadius: isDesktop ? 50 : isTablet ? 45 : 40,
      backgroundColor: '#d1fae5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#10b981',
    },
    section: {
      paddingVertical: isDesktop ? 8 : 6,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    sectionTitle: {
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
      fontWeight: '700',
      color: '#0f172a',
    },
    sectionContent: {
      gap: isDesktop ? 14 : isTablet ? 12 : 10,
    },
    divider: {
      height: 1,
      backgroundColor: '#e2e8f0',
      marginVertical: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#0f172a',
    },
    input: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: isDesktop ? 15 : 14,
      color: '#0f172a',
      fontWeight: '500',
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    inputDisabled: {
      backgroundColor: '#f1f5f9',
      color: '#64748b',
    },
    inputRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isDesktop ? 14 : isTablet ? 12 : 10,
    },
    inputGroupHalf: {
      flex: 1,
      gap: 6,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dropdownButtonText: {
      fontSize: isDesktop ? 15 : 14,
      color: '#0f172a',
      fontWeight: '500',
    },
    dropdownMenu: {
      marginTop: 8,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      maxHeight: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    dropdownScroll: {
      maxHeight: 200,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      gap: 10,
    },
    dropdownItemText: {
      fontSize: isDesktop ? 14 : 13,
      color: '#0f172a',
      fontWeight: '500',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: '#10b981',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
    },
    checkboxChecked: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#10b981',
      borderStyle: 'dashed',
      backgroundColor: '#f0fdf4',
    },
    uploadButtonText: {
      fontSize: isDesktop ? 13 : 12,
      fontWeight: '600',
      color: '#10b981',
    },
    documentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 8,
      backgroundColor: '#f8fafc',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    documentName: {
      flex: 1,
      fontSize: isDesktop ? 12 : 11,
      color: '#0f172a',
      fontWeight: '500',
    },
    existingBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: '#dbeafe',
      borderRadius: 3,
    },
    existingBadgeText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#1e40af',
    },
    newBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: '#d1fae5',
      borderRadius: 3,
    },
    newBadgeText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#065f46',
    },
    editPhotoButton: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#10b981',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '80%',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
    },
    modalButton: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: '#f1f5f9',
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    modalButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    modalCancel: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    modalCancelText: {
      color: '#ef4444',
    },
    documentsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isDesktop ? 14 : isTablet ? 12 : 10,
      paddingVertical: isDesktop ? 8 : 6,
    },
    documentSection: {
      flex: 1,
    },
    updateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: '#10b981',
      marginTop: isDesktop ? 24 : isTablet ? 20 : 16,
      alignSelf: 'center',
      minWidth: 120,
    },
    updateButtonDisabled: {
      backgroundColor: '#94a3b8',
      opacity: 0.6,
    },
    updateButtonText: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
};
