import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import { API_ENDPOINTS } from '../../constants/api';

interface LocationSuggestion {
  id: string;
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface SelectedLocation {
  place_id: string;
  description: string;
  pincode: string;
}

interface Service {
  id: number;
  name: string;
  category_name: string;
  subcaregory_name: string;
  price: number;
  rating: number;
  instant_service: number;
  image: string;
  created_at: string;
  status?: number;
  visibility?: boolean | number;
}

interface ServicesProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Services({ searchQuery: externalSearchQuery, onSearchChange }: ServicesProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [visibilityStates, setVisibilityStates] = useState<Record<number, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [subcategories, setSubcategories] = useState<{ id: number; name: string; category_id: number; category_name?: string }[]>([]);
  const [serviceImage, setServiceImage] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [price, setPrice] = useState('');
  const [rating, setRating] = useState('');
  const [instantService, setInstantService] = useState<number>(1);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [showInstantServiceDropdown, setShowInstantServiceDropdown] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<number>(1);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [serviceToActivate, setServiceToActivate] = useState<{ id: number; name: string } | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<SelectedLocation[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Google Places API function (using backend proxy to avoid CORS)
  const fetchPlaceSuggestions = async (input: string) => {
    if (input.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    
    try {
      const response = await fetch(API_ENDPOINTS.GOOGLE_PLACES_AUTOCOMPLETE(input));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.predictions && Array.isArray(data.predictions)) {
        const suggestions = data.predictions.map((prediction: any) => ({
          id: prediction.place_id,
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: prediction.structured_formatting
        }));
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  // Debounced search function
  const handleLocationInputChange = (text: string) => {
    setLocationInput(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      fetchPlaceSuggestions(text);
    }, 300);
  };

  // Fetch place details to extract pincode (using backend proxy to avoid CORS)
  const fetchPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.GOOGLE_PLACES_DETAILS(placeId));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.result) {
        // First try: Get postal_code from address_components
        if (data.result.address_components) {
          const postalCode = data.result.address_components.find((component: any) => 
            component.types.includes('postal_code')
          );
          
          if (postalCode) {
            return postalCode.long_name;
          }
        }
        
        // Second try: If no postal_code found, use reverse geocoding with coordinates
        if (data.result.geometry && data.result.geometry.location) {
          const { lat, lng } = data.result.geometry.location;
          
          try {
            const reverseResponse = await fetch(API_ENDPOINTS.GOOGLE_GEOCODE_REVERSE(lat, lng));
            
            if (reverseResponse.ok) {
              const reverseData = await reverseResponse.json();
              
              if (reverseData.success && reverseData.results && reverseData.results.length > 0) {
                // Search through results to find one with postal_code
                for (const result of reverseData.results) {
                  if (result.address_components) {
                    const postalCode = result.address_components.find((component: any) => 
                      component.types.includes('postal_code')
                    );
                    
                    if (postalCode) {
                      return postalCode.long_name;
                    }
                  }
                }
              }
            }
          } catch (reverseError) {
            console.error('Error in reverse geocoding:', reverseError);
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  };

  // Handle location suggestion selection
  const selectLocationSuggestion = async (suggestion: LocationSuggestion) => {
    // Close suggestions and clear input
    setLocationInput('');
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    
    const pincode = await fetchPlaceDetails(suggestion.place_id);
    
    if (pincode) {
      // Check if this pincode is already added
      const isDuplicate = selectedLocations.some(loc => loc.pincode === pincode);
      
      if (!isDuplicate) {
        const newLocation: SelectedLocation = {
          place_id: suggestion.place_id,
          description: suggestion.description,
          pincode: pincode
        };
        // Append to existing locations (don't clear previous)
        setSelectedLocations([...selectedLocations, newLocation]);
      } else {
        Alert.alert('Info', 'This pincode is already added');
      }
    } else {
      Alert.alert('Warning', 'Could not extract pincode from selected location');
    }
  };

  // Remove location
  const removeLocation = (placeId: string) => {
    setSelectedLocations(selectedLocations.filter(loc => loc.place_id !== placeId));
  };

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

   const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchServices = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_ENDPOINTS.ADMIN_SERVICES);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setServices([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        const servicesData = data.services || data.data || [];
        setServices(servicesData);

        const initialVisibility: Record<number, boolean> = {};
        servicesData.forEach((service: Service) => {
          const visValue = service.visibility !== undefined 
          ? (typeof service.visibility === 'boolean' ? service.visibility : service.visibility === 1)
          : true;
          initialVisibility[service.id] = visValue;
        });
        setVisibilityStates(initialVisibility);
        setCurrentPage(1);
      } else {
        console.error('❌ Failed to fetch services:', data.message);
        setServices([]);
      }
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchServices();
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_SUBCATEGORIES);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const subcategoriesData = data.subcategories || data.data || [];
          // Fetch categories once
          try {
            const catResponse = await fetch(API_ENDPOINTS.ADMIN_CATEGORIES);
            if (catResponse.ok) {
              const catData = await catResponse.json();
              if (catData.success) {
                const categoriesData = catData.categories || catData.data || [];
                const subcategoriesWithCategories = subcategoriesData.map((subcat: any) => {
                  const category = categoriesData.find((cat: any) => cat.id === subcat.category_id);
                  return {
                    id: subcat.id,
                    name: subcat.name,
                    category_id: subcat.category_id,
                    category_name: category?.title || ''
                  };
                });
                setSubcategories(subcategoriesWithCategories);
                return;
              }
            }
          } catch (error) {
            console.error('Error fetching categories:', error);
          }
          // Fallback if categories fetch fails
          setSubcategories(subcategoriesData.map((subcat: any) => ({
            id: subcat.id,
            name: subcat.name,
            category_id: subcat.category_id,
            category_name: ''
          })));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching subcategories:', error);
    }
  };

  // Filter and sort services
  const getFilteredAndSortedServices = () => {
    let filtered = [...services];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(Service =>
        Service.name.toLowerCase().includes(query) ||
        Service.category_name.toLowerCase().includes(query) ||
        Service.subcaregory_name.toLowerCase().includes(query) ||
        Service.price.toString().toLowerCase().includes(query) ||
        Service.rating.toString().toLowerCase().includes(query) ||
        Service.instant_service.toString().toLowerCase().includes(query) ||
        (Service.image && Service.image.toLowerCase().includes(query)) ||
        (Service.created_at && Service.created_at.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'desc':
          return b.id - a.id;
        case 'asc':
          return a.id - b.id;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Pagination logic
  const getPaginatedServices = () => {
    const filtered = getFilteredAndSortedServices();
    if (recordsPerPage === 'ALL') {
      return filtered;
    }
    const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = recordsPerPage === 'ALL' 
    ? 1 
    : Math.ceil(getFilteredAndSortedServices().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

  const sortOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const recordOptions = [5, 10, 50, 100, 'ALL'];

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
    if (onSearchChange) {
      onSearchChange(text);
    }
  };

  const handleVisibilityToggle = async (serviceId: number, value: boolean) => {
    try {
      const service = services.find(ser => ser.id === serviceId);
      if (!service) {
        Alert.alert('Error', 'Service not found');
        return;
      }

      // Update local state optimistically
      setVisibilityStates(prev => ({
        ...prev,
        [serviceId]: value
      }));

      const formData = new FormData();
      formData.append('name', service.name);
      formData.append('subcategory_id', (service as any).subcategory_id?.toString() || '');
      formData.append('price', service.price.toString());
      formData.append('rating', service.rating.toString());
      formData.append('instant_service', service.instant_service.toString());
      // Keep existing status, only update visibility
      const existingStatus = service.status !== undefined ? service.status : 1;
      formData.append('status', existingStatus.toString());
      const visibilityValue = value ? 1 : 0;
      formData.append('visibility', visibilityValue.toString());

      const response = await fetch(`${API_ENDPOINTS.ADMIN_SERVICES}/${serviceId}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: value ? 'Visibility On Successfully' : 'Visibility Off Successfully',
        });
        await fetchServices();
      } else {
        // Revert local state on error
        setVisibilityStates(prev => ({
          ...prev,
          [serviceId]: !value
        }));
        Alert.alert('Error', data.message || 'Failed to update visibility');
      }
    } catch (error) {
      console.error('❌ Error updating visibility:', error);
      // Revert local state on error
      setVisibilityStates(prev => ({
        ...prev,
        [serviceId]: !value
      }));
      Alert.alert('Error', 'Failed to update visibility. Please try again.');
    }
  };

  const handleEdit = async (serviceId: number) => {
    const service = services.find(ser => ser.id === serviceId);
    if (service) {
      setEditingServiceId(serviceId);
      setServiceName(service.name || '');
      setSelectedSubcategoryId((service as any).subcategory_id ? parseInt((service as any).subcategory_id.toString()) : null);
      setCategoryName(service.category_name || '');
      // Construct image URL - check if it's already a full URL or just filename
      let imageUrl = service.image;
      if (imageUrl && !imageUrl.startsWith('http')) {
        // If it's just a filename, construct full URL
        imageUrl = `http://192.168.31.84:3001/uploads/services/${imageUrl}`;
      }
      const finalImageUrl = imageUrl || null;
      setServiceImage(finalImageUrl);
      setPrice(service.price.toString());
      setRating(service.rating.toString());
      setInstantService(service.instant_service);
      // Set visibility - check both status and visibility fields
      const visValue = service.visibility !== undefined 
        ? (typeof service.visibility === 'boolean' ? (service.visibility ? 1 : 0) : service.visibility)
        : (service.status !== undefined ? service.status : 1);
      setVisibility(visValue);
      
      // Fetch existing pincodes for this service
      try {
        const response = await fetch(`${API_ENDPOINTS.ADMIN_SERVICES}/${serviceId}/pincodes`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.pincodes) {
            // Convert pincodes to selectedLocations format
            const locations: SelectedLocation[] = data.pincodes.map((p: any) => ({
              place_id: `pincode_${p.pincode}`,
              description: p.locality || `Pincode: ${p.pincode}`,
              pincode: p.pincode
            }));
            setSelectedLocations(locations);
          } else {
            setSelectedLocations([]);
          }
        } else {
          setSelectedLocations([]);
        }
      } catch (error) {
        console.error('Error fetching pincodes:', error);
        setSelectedLocations([]);
      }
      
      setShowAddModal(true);
    }
  };

  const handleDelete = (serviceId: number) => {
    const service = services.find(ser => ser.id === serviceId);
    if (service) {
      setServiceToDelete({ id: serviceId, name: service.name });
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    try {
      setLoading(true);
      const service = services.find(ser => ser.id === serviceToDelete.id);
      if (!service) {
        Alert.alert('Error', 'Service not found');
        return;
      }

      const formData = new FormData();
      formData.append('name', service.name);
      formData.append('subcategory_id', (service as any).subcategory_id?.toString() || '');
      formData.append('price', service.price.toString());
      formData.append('rating', service.rating.toString());
      formData.append('instant_service', service.instant_service.toString());
      // Get current visibility value and preserve it
      const currentVisibility = service.visibility !== undefined 
        ? (typeof service.visibility === 'boolean' ? (service.visibility ? 1 : 0) : service.visibility)
        : 1;
      formData.append('status', '0');
      formData.append('visibility', currentVisibility.toString());

      const response = await fetch(`${API_ENDPOINTS.ADMIN_SERVICES}/${serviceToDelete.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Service Inactivated Successfully',
        });
        await fetchServices();
        setShowDeleteModal(false);
        setServiceToDelete(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to inactivate service');
      }
    } catch (error) {
      console.error('❌ Error inactivating service:', error);
      Alert.alert('Error', 'Failed to inactivate service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setServiceToDelete(null);
  };

  const handleActivate = (serviceId: number) => {
    const service = services.find(ser => ser.id === serviceId);
    if (service) {
      setServiceToActivate({ id: serviceId, name: service.name });
      setShowActivateModal(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!serviceToActivate) return;

    try {
      setLoading(true);
      const service = services.find(ser => ser.id === serviceToActivate.id);
      if (!service) {
        Alert.alert('Error', 'Service not found');
        return;
      }

      const formData = new FormData();
      formData.append('name', service.name);
      formData.append('subcategory_id', (service as any).subcategory_id?.toString() || '');
      formData.append('price', service.price.toString());
      formData.append('rating', service.rating.toString());
      formData.append('instant_service', service.instant_service.toString());
      // Get current visibility value
      const currentVisibility = service.visibility !== undefined 
        ? (typeof service.visibility === 'boolean' ? (service.visibility ? 1 : 0) : service.visibility)
        : 1;
      formData.append('status', '1');
      formData.append('visibility', currentVisibility.toString());

      const response = await fetch(`${API_ENDPOINTS.ADMIN_SERVICES}/${serviceToActivate.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Service Activated Successfully',
        });
        await fetchServices();
        setShowActivateModal(false);
        setServiceToActivate(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to activate service');
      }
    } catch (error) {
      console.error('❌ Error activating service:', error);
      Alert.alert('Error', 'Failed to activate service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelActivate = () => {
    setShowActivateModal(false);
    setServiceToActivate(null);
  };

  const handleAddService = () => {
    setEditingServiceId(null);
    setServiceName('');
    setSelectedSubcategoryId(null);
    setCategoryName('');
    setServiceImage(null);
    setPrice('');
    setRating('');
    setInstantService(1);
    setVisibility(1);
    setLocationInput('');
    setSelectedLocations([]);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingServiceId(null);
    setServiceName('');
    setSelectedSubcategoryId(null);
    setCategoryName('');
    setServiceImage(null);
    setPrice('');
    setRating('');
    setInstantService(1);
    setVisibility(1);
    setLocationInput('');
    setSelectedLocations([]);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setShowSubcategoryDropdown(false);
    setShowInstantServiceDropdown(false);
    setShowVisibilityDropdown(false);
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setServiceImage(asset.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSubcategorySelect = (subcategoryId: number) => {
    setSelectedSubcategoryId(subcategoryId);
    const subcategory = subcategories.find(sub => sub.id === subcategoryId);
    if (subcategory) {
      setCategoryName(subcategory.category_name || '');
    }
    setShowSubcategoryDropdown(false);
  };

  const handlePriceChange = (text: string) => {
    // Only allow positive integers (no decimals, no negative, no alphabets)
    const filtered = text.replace(/[^0-9]/g, '');
    setPrice(filtered);
  };

  const handleRatingChange = (text: string) => {
    // Only allow positive numbers with decimals (no negative, no alphabets)
    const filtered = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = filtered.split('.');
    if (parts.length > 2) {
      setRating(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setRating(filtered);
    }
  };

  const handleSubmitService = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Validation Error', 'Please enter service name');
      return;
    }

    if (!selectedSubcategoryId) {
      Alert.alert('Validation Error', 'Please select a subcategory');
      return;
    }

    // In edit mode, image is optional if not changed; in create mode, image is required
    const isEditMode = editingServiceId !== null;
    const isNewImage = serviceImage && (serviceImage.startsWith('blob:') || serviceImage.startsWith('data:') || serviceImage.startsWith('file://'));
    
    if (!isEditMode && !serviceImage) {
      Alert.alert('Validation Error', 'Please upload service image');
      return;
    }

    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    if (!rating.trim() || isNaN(Number(rating))) {
      Alert.alert('Validation Error', 'Please enter a valid rating');
      return;
    }

    if (selectedLocations.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one available location');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', serviceName.trim());
      formData.append('subcategory_id', selectedSubcategoryId.toString());
      formData.append('price', price.trim());
      formData.append('rating', rating.trim());
      formData.append('instant_service', instantService.toString());
      formData.append('status', visibility.toString());
      formData.append('visibility', visibility.toString());
      
      // Extract pincodes and localities from selectedLocations and append as JSON string
      const pincodes = selectedLocations.map(loc => ({
        pincode: loc.pincode,
        locality: loc.description
      }));
      formData.append('pincodes', JSON.stringify(pincodes));

      // Only append image if it's a new upload (blob/data/file URLs) or create mode
      if (serviceImage && (isNewImage || !isEditMode)) {
        const uriParts = serviceImage.split('.');
        const fileExtension = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'jpg';
        const fileName = `service_${Date.now()}.${fileExtension}`;
        
        let mimeType = 'image/jpeg';
        if (fileExtension === 'png') {
          mimeType = 'image/png';
        } else if (fileExtension === 'gif') {
          mimeType = 'image/gif';
        }

        const isWeb = typeof window !== 'undefined';
        if (isWeb) {
          try {
            if (serviceImage.startsWith('blob:') || serviceImage.startsWith('data:')) {
              const response = await fetch(serviceImage);
              const blob = await response.blob();
              const fileToUpload = new File([blob], fileName, { type: mimeType });
              formData.append('image', fileToUpload);
            } else if (!serviceImage.startsWith('http')) {
              const response = await fetch(serviceImage);
              const blob = await response.blob();
              const fileToUpload = new File([blob], fileName, { type: mimeType });
              formData.append('image', fileToUpload);
            }
          } catch (error) {
            console.error('❌ Error converting image:', error);
            formData.append('image', {
              uri: serviceImage,
              name: fileName,
              type: mimeType,
            } as any);
          }
        } else {
          formData.append('image', {
            uri: serviceImage,
            name: fileName,
            type: mimeType,
          } as any);
        }
      }

      const url = isEditMode 
        ? `${API_ENDPOINTS.ADMIN_SERVICES}/${editingServiceId}`
        : API_ENDPOINTS.ADMIN_SERVICES;
      
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isEditMode ? 'Service Updated Successfully' : 'Service Created Successfully',
        });
        await fetchServices();
        handleCloseModal();
      } else {
        Alert.alert('Error', data.message || `Failed to ${isEditMode ? 'update' : 'create'} service`);
      }
    } catch (error) {
      console.error(`❌ Error ${editingServiceId ? 'updating' : 'creating'} service:`, error);
      Alert.alert('Error', `Failed to ${editingServiceId ? 'update' : 'create'} service. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const instantServiceOptions = [
    { label: 'ON', value: 1 },
    { label: 'OFF', value: 0 },
  ];

  const visibilityOptions = [
    { label: 'On', value: 1 },
    { label: 'Off', value: 0 },
  ];

  const styles = createStyles(width, height);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Loading Services...</Text>
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="people-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Services Found</Text>
        <Text style={styles.emptyText}>There are no services available at the moment.</Text>
      </View>
    );
  }

  const filteredServices = getFilteredAndSortedServices();
  const paginatedServices = getPaginatedServices();

  return (
    <View style={{ flex: 1 }}>
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      scrollEnabled={true}
      bounces={true}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#06b6d4']} />
      }
    >
      <View style={styles.customersContainer}>
        <View style={styles.customersHeader}>
          <View style={styles.controlsRow}>
            {/* Left side - Title */}
            <Text style={styles.customersTitle}>
              Services
            </Text>
            
            {/* Right side - Add Service, Sort and Records */}
            <View style={styles.controlsRight}>
              {/* Add Service Button */}
              <View style={styles.addButtonWrapper}>
                <View style={styles.labelSpacer} />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddService}
                >
                  <Ionicons name="add" size={isDesktop ? 18 : 16} color="#ffffff" />
                  <Text style={styles.addButtonText}>Add Service</Text>
                </TouchableOpacity>
              </View>

              {/* Sort Dropdown */}
              <View style={styles.dropdownWrapperSort}>
                <Text style={styles.dropdownLabel}>Sort By:</Text>
                <TouchableOpacity 
                  style={styles.dropdownButtonSort}
                  onPress={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowRecordsDropdown(false);
                  }}
                >
                  <Ionicons name="swap-vertical" size={isDesktop ? 16 : 14} color="#64748b" />
                  <Text style={styles.dropdownButtonText}>
                    {sortOptions.find(opt => opt.value === sortBy)?.label}
                  </Text>
                  <Ionicons 
                    name={showSortDropdown ? "chevron-up" : "chevron-down"} 
                    size={isDesktop ? 16 : 14} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                {showSortDropdown && (
                  <View style={styles.dropdownMenu}>
                    {sortOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.dropdownMenuItem,
                          sortBy === option.value && styles.dropdownMenuItemActive
                        ]}
                        onPress={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownMenuItemText,
                          sortBy === option.value && styles.dropdownMenuItemTextActive
                        ]}>
                          {option.label}
                        </Text>
                        {sortBy === option.value && (
                          <Ionicons name="checkmark" size={16} color="#06b6d4" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Records Per Page Dropdown */}
              <View style={styles.dropdownWrapperShow}>
                <Text style={styles.dropdownLabel}>Show:</Text>
                <TouchableOpacity 
                  style={styles.dropdownButtonShow}
                  onPress={() => {
                    setShowRecordsDropdown(!showRecordsDropdown);
                    setShowSortDropdown(false);
                  }}
                >
                  <Ionicons name="list" size={isDesktop ? 14 : 12} color="#64748b" />
                  <Text style={styles.dropdownButtonTextShow}>
                    {recordsPerPage === 'ALL' ? 'ALL' : recordsPerPage}
                  </Text>
                  <Ionicons 
                    name={showRecordsDropdown ? "chevron-up" : "chevron-down"} 
                    size={isDesktop ? 14 : 12} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                {showRecordsDropdown && (
                  <View style={styles.dropdownMenuShow}>
                    {recordOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownMenuItem,
                          recordsPerPage === option && styles.dropdownMenuItemActive
                        ]}
                        onPress={() => {
                          setRecordsPerPage(option as number | 'ALL');
                          setCurrentPage(1);
                          setShowRecordsDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownMenuItemText,
                          recordsPerPage === option && styles.dropdownMenuItemTextActive
                        ]}>
                          {option === 'ALL' ? 'ALL' : option}
                        </Text>
                        {recordsPerPage === option && (
                          <Ionicons name="checkmark" size={16} color="#10b981" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tableWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true} 
            style={styles.tableScrollView}
            persistentScrollbar={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                  <Ionicons name="list" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>S NO</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 120 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 310 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Category Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 340 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>SubCategory Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 75 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Price</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 190 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>rating</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 190 : isTablet ? 75 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Instant Service</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 200 : isTablet ? 70 : 35 }]}>
                  <Ionicons name="location" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Created On</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 100 : isTablet ? 100 : 80 }]}>
                  <Ionicons name="eye" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Visibility</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                  <Ionicons name="settings" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Action</Text>
                </View>
              </View>

              {/* Table Body */}
              {paginatedServices.map((services, index) => {
                const serialNumber = recordsPerPage === 'ALL' 
                  ? index + 1 
                  : (currentPage - 1) * recordsPerPage + index + 1;
                return (
                  <View 
                    key={services.id} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                    ]}
                  >
                    <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                      <Text style={styles.tableCellText}>{serialNumber}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 220 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.category_name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.subcaregory_name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.price || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.rating || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.instant_service === 1 ? 'ON' : 'OFF'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 220 : isTablet ? 70 : 35  }]}>
                      <Text style={styles.tableCellText}>{formatDate(services.created_at) || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 100 : isTablet ? 100 : 80 }]}>
                      <Switch
                        value={visibilityStates[services.id] !== undefined ? visibilityStates[services.id] : true}
                        onValueChange={(value) => handleVisibilityToggle(services.id, value)}
                        trackColor={{ false: '#e2e8f0', true: '#06b6d4' }}
                        thumbColor="#ffffff"
                        ios_backgroundColor="#e2e8f0"
                      />
                    </View>
                    <View style={[styles.tableCell, styles.actionCell, { width: isDesktop ? 200 : isTablet ? 100 : 80 }]}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleEdit(services.id)}
                      >
                        <Ionicons name="create-outline" size={isDesktop ? 18 : 16} color="#06b6d4" />
                      </TouchableOpacity>
                      {(services.status === 0) ? (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleActivate(services.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={isDesktop ? 18 : 16} color="#10b981" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleDelete(services.id)}
                        >
                          <Ionicons name="trash-outline" size={isDesktop ? 18 : 16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            {recordsPerPage === 'ALL' 
              ? `Showing all ${filteredServices.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredServices.length);
                  return `Showing ${start} to ${end} of ${filteredServices.length} entries`;
                })()
            }
          </Text>
          
          <View style={styles.paginationButtons}>
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="play-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="chevron-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>

            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages || 1}
            </Text>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="chevron-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="play-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>

    {/* Add Service Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingServiceId ? 'Edit Service' : 'Add Service'}</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Service Name */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Service Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter service name"
                  placeholderTextColor="#94a3b8"
                  value={serviceName}
                  onChangeText={setServiceName}
                />
              </View>

              {/* Subcategory and Category in one row */}
              <View style={[styles.modalRow, showSubcategoryDropdown && { zIndex: 10000 }]}>
                <View style={[styles.modalField, styles.modalFieldHalf, showSubcategoryDropdown && { zIndex: 10001 }]}>
                  <Text style={styles.modalLabel}>Subcategory</Text>
                  <View style={styles.categoryDropdownWrapper}>
                    <TouchableOpacity
                      style={styles.categoryDropdownButton}
                      onPress={() => {
                        setShowSubcategoryDropdown(!showSubcategoryDropdown);
                        setShowInstantServiceDropdown(false);
                      }}
                    >
                      <Text style={styles.categoryDropdownText}>
                        {selectedSubcategoryId 
                          ? subcategories.find(sub => sub.id === selectedSubcategoryId)?.name || 'Select Subcategory'
                          : 'Select Subcategory'}
                      </Text>
                      <Ionicons
                        name={showSubcategoryDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                    {showSubcategoryDropdown && (
                      <View style={styles.categoryDropdownMenu}>
                        <ScrollView 
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          style={styles.categoryDropdownScrollView}
                        >
                          {subcategories.map((subcategory) => (
                            <TouchableOpacity
                              key={subcategory.id}
                              style={[
                                styles.categoryDropdownItem,
                                selectedSubcategoryId === subcategory.id && styles.categoryDropdownItemActive
                              ]}
                              onPress={() => handleSubcategorySelect(subcategory.id)}
                            >
                              <Text style={[
                                styles.categoryDropdownItemText,
                                selectedSubcategoryId === subcategory.id && styles.categoryDropdownItemTextActive
                              ]}>
                                {subcategory.name}
                              </Text>
                              {selectedSubcategoryId === subcategory.id && (
                                <Ionicons name="checkmark" size={20} color="#06b6d4" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.modalField, styles.modalFieldHalf]}>
                  <Text style={styles.modalLabel}>Category Name</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalInputDisabled]}
                    placeholder="Category Name"
                    placeholderTextColor="#94a3b8"
                    value={categoryName}
                    editable={false}
                  />
                </View>
              </View>

              {/* Service Image */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Service Image</Text>
                <TouchableOpacity
                  style={styles.imageUploadInput}
                  onPress={handleImageUpload}
                >
                  <Text style={styles.imageUploadInputText}>
                    {serviceImage ? 'Image Selected' : 'Tap to upload image'}
                  </Text>
                  <Ionicons name="cloud-upload-outline" size={20} color="#06b6d4" />
                </TouchableOpacity>
                {serviceImage && (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: serviceImage }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setServiceImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Price and Rating in one row */}
              <View style={styles.modalRow}>
                <View style={[styles.modalField, styles.modalFieldHalf]}>
                  <Text style={styles.modalLabel}>Price</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter price"
                    placeholderTextColor="#94a3b8"
                    value={price}
                    onChangeText={handlePriceChange}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.modalField, styles.modalFieldHalf]}>
                  <Text style={styles.modalLabel}>Rating</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter rating"
                    placeholderTextColor="#94a3b8"
                    value={rating}
                    onChangeText={handleRatingChange}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Visibility and Instant Service in one row */}
              <View style={styles.modalRow}>
                <View style={[styles.modalField, styles.modalFieldHalf]}>
                  <Text style={styles.modalLabel}>Visibility</Text>
                  <View style={styles.visibilityDropdownWrapper}>
                    <TouchableOpacity
                      style={styles.visibilityDropdownButton}
                      onPress={() => {
                        setShowVisibilityDropdown(!showVisibilityDropdown);
                        setShowSubcategoryDropdown(false);
                        setShowInstantServiceDropdown(false);
                        setShowLocationSuggestions(false);
                      }}
                    >
                      <Text style={styles.visibilityDropdownText}>
                        {visibilityOptions.find(opt => opt.value === visibility)?.label || 'On'}
                      </Text>
                      <Ionicons
                        name={showVisibilityDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                    {showVisibilityDropdown && (
                      <View style={styles.visibilityDropdownMenu}>
                        {visibilityOptions.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.visibilityDropdownItem,
                              visibility === option.value && styles.visibilityDropdownItemActive
                            ]}
                            onPress={() => {
                              setVisibility(option.value);
                              setShowVisibilityDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.visibilityDropdownItemText,
                              visibility === option.value && styles.visibilityDropdownItemTextActive
                            ]}>
                              {option.label}
                            </Text>
                            {visibility === option.value && (
                              <Ionicons name="checkmark" size={20} color="#06b6d4" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.modalField, styles.modalFieldHalf]}>
                  <Text style={styles.modalLabel}>Instant Service</Text>
                  <View style={styles.visibilityDropdownWrapper}>
                    <TouchableOpacity
                      style={styles.visibilityDropdownButton}
                      onPress={() => {
                        setShowInstantServiceDropdown(!showInstantServiceDropdown);
                        setShowSubcategoryDropdown(false);
                        setShowVisibilityDropdown(false);
                      }}
                    >
                      <Text style={styles.visibilityDropdownText}>
                        {instantServiceOptions.find(opt => opt.value === instantService)?.label || 'ON'}
                      </Text>
                      <Ionicons
                        name={showInstantServiceDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                    {showInstantServiceDropdown && (
                      <View style={styles.visibilityDropdownMenu}>
                        {instantServiceOptions.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.visibilityDropdownItem,
                              instantService === option.value && styles.visibilityDropdownItemActive
                            ]}
                            onPress={() => {
                              setInstantService(option.value);
                              setShowInstantServiceDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.visibilityDropdownItemText,
                              instantService === option.value && styles.visibilityDropdownItemTextActive
                            ]}>
                              {option.label}
                            </Text>
                            {instantService === option.value && (
                              <Ionicons name="checkmark" size={20} color="#06b6d4" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Available Locations */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Available Locations <Text style={{color: '#ef4444'}}>*</Text></Text>
                <View style={styles.locationInputWrapper}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Type location (min 2 letters)"
                    placeholderTextColor="#94a3b8"
                    value={locationInput}
                    onChangeText={handleLocationInputChange}
                    onFocus={() => {
                      if (locationInput.length >= 2) {
                        setShowLocationSuggestions(true);
                      }
                      setShowSubcategoryDropdown(false);
                      setShowInstantServiceDropdown(false);
                      setShowVisibilityDropdown(false);
                    }}
                  />
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <View style={styles.locationSuggestionsMenu}>
                      <ScrollView 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        style={styles.locationSuggestionsScrollView}
                      >
                        {locationSuggestions.map((suggestion) => (
                          <TouchableOpacity
                            key={suggestion.id}
                            style={styles.locationSuggestionItem}
                            onPress={() => selectLocationSuggestion(suggestion)}
                          >
                            <Ionicons name="location-outline" size={18} color="#06b6d4" />
                            <View style={styles.locationSuggestionTextContainer}>
                              <Text style={styles.locationSuggestionMainText}>
                                {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
                              </Text>
                              <Text style={styles.locationSuggestionSecondaryText}>
                                {suggestion.structured_formatting?.secondary_text || suggestion.description}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                {/* Selected Locations */}
                {selectedLocations.length > 0 && (
                  <View style={styles.pincodesContainer}>
                    <Text style={styles.pincodesLabel}>Selected Locations:</Text>
                    <View style={styles.pincodesChipsContainer}>
                      {selectedLocations.map((location, index) => (
                        <View key={location.place_id || index} style={styles.locationChip}>
                          <View style={styles.locationChipContent}>
                            <Ionicons name="location" size={14} color="#06b6d4" />
                            <View style={styles.locationChipTextContainer}>
                              <Text style={styles.locationChipText} numberOfLines={1}>
                                {location.description}
                              </Text>
                              <Text style={styles.locationChipPincode}>
                                Pincode: {location.pincode}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeLocation(location.place_id)}
                            style={styles.pincodeChipRemove}
                          >
                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton, 
                  (loading || !serviceName.trim() || !selectedSubcategoryId || (!editingServiceId && !serviceImage) || !price.trim() || !rating.trim() || selectedLocations.length === 0) && styles.modalSubmitButtonDisabled
                ]}
                onPress={handleSubmitService}
                disabled={loading || !serviceName.trim() || !selectedSubcategoryId || (!editingServiceId && !serviceImage) || !price.trim() || !rating.trim() || selectedLocations.length === 0}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash" size={isDesktop ? 32 : 28} color="#ef4444" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Inactive Service Type?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Inactive The {serviceToDelete?.name || 'Service'}?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Inactive</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activate Confirmation Modal */}
      <Modal
        visible={showActivateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelActivate}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={styles.activateIconCircle}>
                <Ionicons name="checkmark-circle" size={isDesktop ? 32 : 28} color="#10b981" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Make Active?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Make Active The {serviceToActivate?.name || 'Service'}?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={handleCancelActivate}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activateConfirmButton}
                onPress={handleConfirmActivate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.activateConfirmButtonText}>Active</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (width: number, height: number) => {
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;

  return StyleSheet.create({
    container: {
      flex: 1,
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
    },
    emptyIconContainer: {
      width: isDesktop ? 120 : isTablet ? 100 : 80,
      height: isDesktop ? 120 : isTablet ? 100 : 80,
      borderRadius: isDesktop ? 60 : isTablet ? 50 : 40,
      backgroundColor: '#f8fafc',
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
      maxWidth: isDesktop ? 300 : isTablet ? 280 : width - 40,
    },
    customersContainer: {
      width: '100%',
    },
    customersHeader: {
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    customersTitle: {
      fontSize: isDesktop ? 24 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      paddingBottom: 2,
      flexShrink: 1,
    },
    controlsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'flex-end',
      gap: isMobile ? 16 : 12,
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    controlsRight: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 10,
      alignItems: isMobile ? 'stretch' : 'center',
      width: isMobile ? '100%' : 'auto',
      zIndex: 500,
      overflow: 'visible',
    },
    dropdownWrapperSort: {
      position: 'relative',
      width: isDesktop ? 160 : isTablet ? 140 : '100%',
      zIndex: 1000,
    },
    dropdownWrapperShow: {
      position: 'relative',
      width: isDesktop ? 80 : isTablet ? 70 : '100%',
      zIndex: 1000,
    },
    dropdownLabel: {
      fontSize: isDesktop ? 11 : 10,
      fontWeight: '600',
      color: '#64748b',
      marginBottom: 4,
    },
    dropdownButtonSort: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      gap: isDesktop ? 8 : 6,
    },
    dropdownButtonShow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 8 : 6,
      paddingVertical: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      gap: 4,
    },
    dropdownButtonText: {
      flex: 1,
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownButtonTextShow: {
      flex: 1,
      fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenu: {
      position: 'absolute',
      top: 62,
      right: 0,
      minWidth: 120,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 10000,
      maxHeight: 180,
    },
    dropdownMenuShow: {
      position: 'absolute',
      top: 62,
      right: 0,
      minWidth: 80,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 10000,
      maxHeight: 180,
    },
    dropdownMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    dropdownMenuItemActive: {
      backgroundColor: '#f8fafc',
    },
    dropdownMenuItemText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenuItemTextActive: {
      fontWeight: '600',
      color: '#06b6d4',
    },
    // Table Styles
    tableWrapper: {
      marginBottom: 12,
    },
    tableScrollView: {
      width: '100%',
    },
    tableContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#6366f1',
      borderBottomWidth: 2,
      borderBottomColor: '#4f46e5',
    },
    tableHeaderCell: {
      paddingVertical: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tableHeaderText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    tableRowEven: {
      backgroundColor: '#ffffff',
    },
    tableRowOdd: {
      backgroundColor: '#fafafa',
    },
    tableCell: {
      paddingVertical: isDesktop ? 14 : isTablet ? 12 : 10,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      justifyContent: 'center',
    },
    tableCellText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#0f172a',
      fontWeight: '500',
    },
    actionCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
      justifyContent: 'center',
    },
    actionButton: {
      padding: isDesktop ? 6 : isTablet ? 5 : 4,
      borderRadius: 6,
      backgroundColor: '#f8fafc',
    },
    addButtonWrapper: {
      position: 'relative',
      zIndex: 1000,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    labelSpacer: {
      height: 20,
      marginBottom: 0,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#06b6d4',
      borderRadius: 10,
      paddingHorizontal: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingVertical: isDesktop ? 10 : isTablet ? 8 : 6,
      gap: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      flexShrink: 0,
      justifyContent: 'center',
    },
    addButtonText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    // Pagination Styles
    paginationContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isDesktop ? 'center' : 'flex-start',
      marginTop: isDesktop ? 20 : isTablet ? 16 : 12,
      paddingTop: isDesktop ? 20 : isTablet ? 16 : 12,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
    },
    paginationInfo: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#64748b',
      fontWeight: '500',
    },
    paginationButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    paginationButton: {
      width: isDesktop ? 36 : isTablet ? 34 : 32,
      height: isDesktop ? 36 : isTablet ? 34 : 32,
      borderRadius: 8,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationButtonDisabled: {
      backgroundColor: '#f8fafc',
      opacity: 0.5,
    },
    paginationText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#0f172a',
      marginHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: isDesktop ? 550 : isTablet ? 480 : width - 40,
      maxHeight: height * 0.98,
      backgroundColor: '#ffffff',
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
      backgroundColor: '#6366f1',
      borderBottomWidth: 0,
    },
    modalTitle: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#ffffff',
    },
    modalCloseButton: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    modalBody: {
      maxHeight: height * 0.85,
      padding: isDesktop ? 24 : isTablet ? 20 : 18,
      backgroundColor: '#f8fafc',
      overflow: 'visible',
    },
    modalRow: {
      flexDirection: 'row',
      gap: isDesktop ? 16 : isTablet ? 14 : 12,
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
      zIndex: 1,
      overflow: 'visible',
    },
    modalField: {
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
      overflow: 'visible',
    },
    modalFieldHalf: {
      flex: 1,
    },
    modalLabel: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: 8,
    },
    modalInput: {
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },
    modalInputDisabled: {
      backgroundColor: '#f1f5f9',
      color: '#64748b',
    },
    // Category Dropdown Styles
    categoryDropdownWrapper: {
      position: 'relative',
      zIndex: 99999,
    },
    categoryDropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    categoryDropdownText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
      flex: 1,
    },
    categoryDropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 99999,
      zIndex: 99999,
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
      overflow: 'hidden',
    },
    categoryDropdownScrollView: {
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
    },
    categoryDropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    categoryDropdownItemActive: {
      backgroundColor: '#f0fdfa',
    },
    categoryDropdownItemText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    categoryDropdownItemTextActive: {
      color: '#06b6d4',
      fontWeight: '600',
    },
    // Image Upload Styles
    imageUploadInput: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    imageUploadInputText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#64748b',
      flex: 1,
    },
    imagePreviewContainer: {
      position: 'relative',
      width: '100%',
      height: isDesktop ? 80 : isTablet ? 70 : 60,
      marginTop: 12,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      backgroundColor: '#ffffff',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 50,
      padding: 4,
    },
    // Visibility Dropdown Styles
    visibilityDropdownWrapper: {
      position: 'relative',
    },
    visibilityDropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    visibilityDropdownText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    visibilityDropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 1001,
      zIndex: 1001,
    },
    visibilityDropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    visibilityDropdownItemActive: {
      backgroundColor: '#f0fdfa',
    },
    visibilityDropdownItemText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    visibilityDropdownItemTextActive: {
      color: '#06b6d4',
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
      backgroundColor: '#f1f5f9',
      borderTopWidth: 2,
      borderTopColor: '#e2e8f0',
    },
    modalCancelButton: {
      paddingHorizontal: isDesktop ? 24 : isTablet ? 20 : 18,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#94a3b8',
      backgroundColor: '#cbd5e1',
    },
    modalCancelButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#475569',
    },
    modalSubmitButton: {
      paddingHorizontal: isDesktop ? 24 : isTablet ? 20 : 18,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 12,
      backgroundColor: '#06b6d4',
      shadowColor: '#06b6d4',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    modalSubmitButtonDisabled: {
      opacity: 0.6,
    },
    modalSubmitButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    // Delete Modal Styles
    deleteModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalContent: {
      width: isDesktop ? 400 : isTablet ? 360 : width - 60,
      backgroundColor: '#ffffff',
      borderRadius: 20,
      padding: isDesktop ? 32 : isTablet ? 28 : 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    deleteIconContainer: {
      marginBottom: isDesktop ? 20 : isTablet ? 18 : 16,
    },
    deleteIconCircle: {
      width: isDesktop ? 80 : isTablet ? 72 : 64,
      height: isDesktop ? 80 : isTablet ? 72 : 64,
      borderRadius: isDesktop ? 40 : isTablet ? 36 : 32,
      backgroundColor: '#fee2e2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalTitle: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
      textAlign: 'center',
    },
    deleteModalText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: isDesktop ? 28 : isTablet ? 24 : 20,
      lineHeight: isDesktop ? 22 : isTablet ? 20 : 18,
    },
    deleteModalButtons: {
      flexDirection: 'row',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
      width: '100%',
    },
    deleteCancelButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#cbd5e1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteCancelButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#475569',
    },
    deleteConfirmButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteConfirmButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    // Activate Modal Styles
    activateIconCircle: {
      width: isDesktop ? 80 : isTablet ? 72 : 64,
      height: isDesktop ? 80 : isTablet ? 72 : 64,
      borderRadius: isDesktop ? 40 : isTablet ? 36 : 32,
      backgroundColor: '#d1fae5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    activateConfirmButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#10b981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activateConfirmButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    // Location Input Styles
    locationInputWrapper: {
      position: 'relative',
      zIndex: 1000,
    },
    locationSuggestionsMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 1000,
      zIndex: 1000,
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
      overflow: 'hidden',
    },
    locationSuggestionsScrollView: {
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
    },
    locationSuggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      gap: 12,
    },
    locationSuggestionTextContainer: {
      flex: 1,
    },
    locationSuggestionMainText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: 2,
    },
    locationSuggestionSecondaryText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      color: '#64748b',
    },
    // Pincodes Styles
    pincodesContainer: {
      marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    pincodesLabel: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '600',
      color: '#64748b',
      marginBottom: 8,
    },
    pincodesChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pincodeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0fdfa',
      borderWidth: 1,
      borderColor: '#06b6d4',
      borderRadius: 8,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 6 : isTablet ? 5 : 4,
      gap: 6,
    },
    pincodeChipText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#06b6d4',
    },
    pincodeChipRemove: {
      padding: 2,
    },
    // Location Chip Styles
    locationChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f0fdfa',
      borderWidth: 1,
      borderColor: '#06b6d4',
      borderRadius: 8,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 8 : isTablet ? 7 : 6,
      gap: 8,
      width: '48%', // 2 chips per row (48% width + 4% gap = 100%)
    },
    locationChipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    locationChipTextContainer: {
      flex: 1,
    },
    locationChipText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: 2,
    },
    locationChipPincode: {
      fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
      fontWeight: '500',
      color: '#06b6d4',
    },
  });
};