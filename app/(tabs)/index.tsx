import ParallaxScrollView from '@/components/ParallaxScrollView';
import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = 'AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ';

// Type definitions
interface Suggestion {
  id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface Service {
  id: number;
  title: string;
  image: string;
  rating: string;
  price: string;
}

interface CategoryItem {
  id: number;
  title: string;
  image: string;
  description: string;
}

interface CategorySection {
  id: string;
  title: string;
  sub_title: string;
  items: CategoryItem[];
}

interface SelectedSubcategory {
  sectionId: string;
  sectionTitle: string;
  item: CategoryItem;
  location: string;
}

interface CategorySelection {
  [categoryId: string]: {
    item: CategoryItem;
    location: string;
  } | null;
}

export default function HomeScreen() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [mainLocation, setMainLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showMainLocationModal, setShowMainLocationModal] = useState(false);
  const [mainLocationSuggestions, setMainLocationSuggestions] = useState<Suggestion[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [categorySelections, setCategorySelections] = useState<CategorySelection>({});
  const [subcategoryLocation, setSubcategoryLocation] = useState('');
  const [showSubcategoryLocationModal, setShowSubcategoryLocationModal] = useState(false);
  const [subcategoryLocationSuggestions, setSubcategoryLocationSuggestions] = useState<Suggestion[]>([]);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [hasShownLocationOptions, setHasShownLocationOptions] = useState(false);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const [isLoadingMainLocationSuggestions, setIsLoadingMainLocationSuggestions] = useState(false);
  const [isLoadingSubcategoryLocationSuggestions, setIsLoadingSubcategoryLocationSuggestions] = useState(false);

  // New states for service input suggestions
  const [serviceInput, setServiceInput] = useState('');
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [serviceSuggestions, setServiceSuggestions] = useState<any[]>([]);

  const mainLocationInputRef = useRef<TextInput>(null);
  const subcategoryLocationInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const categoryFlatListRef = useRef<FlatList>(null);

  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const [categorySections, setCategorySections] = useState<CategorySection[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categorySectionsError, setCategorySectionsError] = useState<string | null>(null);

  // Handle authentication state - only redirect if user explicitly wants to go to dashboard
  // Don't auto-redirect from home screen, let user choose

  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const response = await fetch(API_ENDPOINTS.CATEGORIES);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const mapped = data.data.map((cat: any) => ({
            label: cat.name,
            value: String(cat.id),
          }));
          setCategories([{ label: 'Select Category', value: '' }, ...mapped]);
        } else {
          setCategoriesError('Invalid data format');
        }
      } catch (err: any) {
        setCategoriesError('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCategoriesAndSubcategories = async () => {
      setIsLoadingCategories(true);
      setCategorySectionsError(null);
      try {
        const response = await fetch(API_ENDPOINTS.CATEGORY_SUBCATEGORY);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setCategorySections(data.data);
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err: any) {
        setCategorySectionsError('Failed to load categories and subcategories');
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategoriesAndSubcategories();
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentSection = categorySections[currentCategoryIndex];
    const currentSelection = categorySelections[currentSection?.id || ''];
    if (currentSelection) {
      setSubcategoryLocation(currentSelection.location || '');
    } else {
      setSubcategoryLocation('');
    }
  }, [currentCategoryIndex, categorySelections, categorySections]);

  const fetchServiceSuggestions = async (input: string) => {
    if (input.length < 1) {
      setServiceSuggestions([]);
      setShowServiceSuggestions(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIE_SUGGESTIONS(input));
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        const mappedSuggestions = data.data.map((service: any) => ({
          id: service.id,
          title: service.name,
          category: String(service.category_id || ''),
          keywords: service.keywords ? service.keywords.split(', ') : [],
        }));

        setServiceSuggestions(mappedSuggestions.slice(0, 8));
        setShowServiceSuggestions(mappedSuggestions.length > 0);
      } else {
        setServiceSuggestions([]);
        setShowServiceSuggestions(false);
      }
    } catch (error) {
      setServiceSuggestions([]);
      setShowServiceSuggestions(false);
    }
  };

  const debouncedServiceSearch = (input: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (input.length < 1) {
      setServiceSuggestions([]);
      setShowServiceSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchServiceSuggestions(input);
    }, 300) as any;
  };

  const handleServiceInputChange = (text: string) => {
    setServiceInput(text);
    debouncedServiceSearch(text);
  };

  const handleServiceSuggestionSelect = (service: any) => {
    setServiceInput(service.title);
    setSelectedServiceId(service.id);
    // Clear category selection when service is selected
    setSelectedCategory('');
    setShowServiceSuggestions(false);
  };

  const fetchPlaceSuggestions = async (input: string, callback: (suggestions: Suggestion[]) => void, setLoading: (loading: boolean) => void) => {
    if (input.length < 2) {
      callback([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&key=${GOOGLE_PLACES_API_KEY}&types=geocode&sessiontoken=${Date.now()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.predictions && Array.isArray(data.predictions)) {
        const suggestions = data.predictions.map((prediction: any) => ({
          id: prediction.place_id,
          description: prediction.description,
          structured_formatting: prediction.structured_formatting
        }));
        callback(suggestions);
      } else {
        callback([]);
      }
    } catch (error) {
      callback([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = (input: string, callback: (suggestions: Suggestion[]) => void, setLoading: (loading: boolean) => void) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (input.length < 2) {
      callback([]);
      setLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchPlaceSuggestions(input, callback, setLoading);
    }, 500) as any;
  };

  const handleMainLocationChange = (text: string) => {
    setMainLocation(text);
    if (text.length >= 2) {
      setShowMainLocationModal(true);
      debouncedSearch(text, setMainLocationSuggestions, setIsLoadingMainLocationSuggestions);
    } else {
      setShowMainLocationModal(false);
      setMainLocationSuggestions([]);
      setIsLoadingMainLocationSuggestions(false);
    }
  };

  const selectMainLocationSuggestion = (suggestion: Suggestion) => {
    setMainLocation(suggestion.description);
    setShowMainLocationModal(false);
    setMainLocationSuggestions([]);
    setIsLoadingMainLocationSuggestions(false);
    mainLocationInputRef.current?.blur();
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  const handleOutsideTouch = () => {
    if (showMainLocationModal) {
      setShowMainLocationModal(false);
      setMainLocationSuggestions([]);
      setIsLoadingMainLocationSuggestions(false);
      mainLocationInputRef.current?.blur();
    }
    if (showSubcategoryLocationModal) {
      setShowSubcategoryLocationModal(false);
      setSubcategoryLocationSuggestions([]);
      setIsLoadingSubcategoryLocationSuggestions(false);
      subcategoryLocationInputRef.current?.blur();
    }
    if (showLocationOptions) {
      setShowLocationOptions(false);
    }
    if (showServiceSuggestions) {
      setShowServiceSuggestions(false);
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  const SuggestionDropdown = ({ visible, suggestions, onSelect, style, isLoading }: any) => {
    if (!visible) return null;

    return (
      <View style={[styles.suggestionDropdown, style]}>
        <ScrollView style={styles.suggestionList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No locations found</Text>
            </View>
          ) : (
            suggestions.map((suggestion: any) => (
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
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const handleMenuPress = () => {
    if (isAuthenticated && user) {
      // User is logged in - go to service seeker index
      if (user.type === 2) {
        router.push('/serviceseekerindex');
      } else if (user.type === 1) {
        router.push('/workerindex');
      }
    } else {
      // User is not logged in - go to login
      router.push('/login');
    }
  };

const handleSearchWorkersNearby = async () => {
  try {
    const currentSection = categorySections[currentCategoryIndex];
    const selectedSubcategory = categorySelections[currentSection?.id || ''];
    const skillId = selectedSubcategory?.item?.id;

    if (!skillId) {
      Alert.alert("Please select a subcategory first");
      return;
    }

    if (!subcategoryLocation) {
      Alert.alert("Please enter your location");
      return;
    }

    // Step 1: Get latitude & longitude using Google Maps Geocoding API
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(subcategoryLocation)}&key=${GOOGLE_PLACES_API_KEY}`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      Alert.alert("Location not found");
      return;
    }

    const { lat, lng } = geoData.results[0].geometry.location;

    const url = API_ENDPOINTS.WORKERS_NEARBY(lat.toString(), lng.toString(), skillId.toString());
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data.length > 0) {
        router.push({
          pathname: '/workers-list',
          params: { workers: JSON.stringify(json.data) }
        });
      } else {
        Alert.alert('No workers found nearby');
      }
    } catch (err) {
      Alert.alert('Error searching for services');
    }
};


  const handleMainSearch = async () => {
    try {
      if (!mainLocation) {
        Alert.alert('Please enter location');
        return;
      }

      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(mainLocation)}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        Alert.alert('Location not found');
        return;
      }

      const { lat, lng } = geoData.results[0].geometry.location;

      if (!selectedCategory && !selectedServiceId) {
        Alert.alert('Please select a category and service');
        return;
      }

      let categoryId = selectedCategory ? selectedCategory : selectedServiceId;

      const url = API_ENDPOINTS.WORKERS_NEARBY(lat.toString(), lng.toString(), categoryId || '');

      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data.length > 0) {
        router.push({
          pathname: '/workers-list',
          params: { workers: JSON.stringify(json.data) }
        });
      } else {
        Alert.alert('No workers found nearby');
      }
    } catch (err) {
      Alert.alert('Error searching for services');
    }
  };

  const handleCategoryChange = (categoryValue: string) => {
    
    // Clear service input when category is selected
    if (categoryValue && categoryValue !== '') {
      setServiceInput('');
      setSelectedServiceId(null);
      setShowServiceSuggestions(false);
    }
    
    setSelectedCategory(categoryValue);

    if (categoryValue && categoryValue !== '') {
      const categoryIndex = categorySections.findIndex(section => section.id === categoryValue);
      if (categoryIndex !== -1) {
        setCurrentCategoryIndex(categoryIndex);
        categoryFlatListRef.current?.scrollToIndex({ index: categoryIndex, animated: true });
        setSubcategoryLocation('');
        setShowSubcategoryLocationModal(false);
        setSubcategoryLocationSuggestions([]);
        setShowLocationOptions(false);
        setHasShownLocationOptions(false);
        setCategorySelections({});
      }
    }
  };

  const isCategoryDropdownDisabled = false;
  const isServiceInputDisabled = false;

  const clearServiceInput = () => {
    setServiceInput('');
    setSelectedServiceId(null);
    setShowServiceSuggestions(false);
  };

  const clearCategorySelection = () => {
    setSelectedCategory('');
    setServiceInput('');
    setSelectedServiceId(null);
    setShowServiceSuggestions(false);
  };

  const handleSignInSignUp = () => {
    // Only show login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      // If authenticated, go to appropriate dashboard
      if (user?.type === 2) {
        router.push('/serviceseekerindex');
      } else if (user?.type === 1) {
        router.push('/workerindex');
      }
    }
  };

  const handleSubcategorySelect = (section: CategorySection, item: CategoryItem) => {
    setCategorySelections(prev => ({
      ...prev,
      [section.id]: {
        item: item,
        location: ''
      }
    }));
    setSubcategoryLocation('');
    setShowSubcategoryLocationModal(false);
    setSubcategoryLocationSuggestions([]);
    setShowLocationOptions(false);
    setHasShownLocationOptions(false);
  };

  const handleSubcategoryLocationChange = (text: string) => {
    setSubcategoryLocation(text);
    const currentSection = categorySections[currentCategoryIndex];
    const currentSelection = categorySelections[currentSection?.id || ''];
    if (currentSelection) {
      setCategorySelections(prev => ({
        ...prev,
        [currentSection.id]: {
          ...currentSelection,
          location: text
        }
      }));
    }
    if (text.length >= 2) {
      setShowSubcategoryLocationModal(true);
      debouncedSearch(text, setSubcategoryLocationSuggestions, setIsLoadingSubcategoryLocationSuggestions);
    } else {
      setShowSubcategoryLocationModal(false);
      setSubcategoryLocationSuggestions([]);
      setIsLoadingSubcategoryLocationSuggestions(false);
    }
  };

  const selectSubcategoryLocationSuggestion = (suggestion: Suggestion) => {
    setSubcategoryLocation(suggestion.description);
    const currentSection = categorySections[currentCategoryIndex];
    const currentSelection = categorySelections[currentSection?.id || ''];
    if (currentSelection) {
      setCategorySelections(prev => ({
        ...prev,
        [currentSection.id]: {
          ...currentSelection,
          location: suggestion.description
        }
      }));
    }
    setShowSubcategoryLocationModal(false);
    setSubcategoryLocationSuggestions([]);
    setIsLoadingSubcategoryLocationSuggestions(false);
    subcategoryLocationInputRef.current?.blur();
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingCurrentLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to get your current location.',
          [{ text: 'OK' }]
        );
        setIsGettingCurrentLocation(false);
        return;
      }

      await Location.enableNetworkProviderAsync();

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 3000,
        distanceInterval: 5,
      });

      const geocodingResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${GOOGLE_PLACES_API_KEY}&result_type=street_address|route|premise|subpremise`
      );

      if (geocodingResponse.ok) {
        const geocodingData = await geocodingResponse.json();

        if (geocodingData.results && geocodingData.results.length > 0) {
          const result = geocodingData.results[0];
          const formattedAddress = result.formatted_address;
          setSubcategoryLocation(formattedAddress);
          setShowLocationOptions(false);
        } else {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (reverseGeocode.length > 0) {
            const address = reverseGeocode[0];
            const locationString = [
              address.street,
              address.subregion,
              address.city,
              address.region,
              address.country
            ].filter(Boolean).join(', ');
            setSubcategoryLocation(locationString);
            setShowLocationOptions(false);
          } else {
            setSubcategoryLocation(`${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
            setShowLocationOptions(false);
          }
        }
      } else {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          const locationString = [
            address.street,
            address.subregion,
            address.city,
            address.region,
            address.country
          ].filter(Boolean).join(', ');
          setSubcategoryLocation(locationString);
          setShowLocationOptions(false);
        } else {
          setSubcategoryLocation(`${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
          setShowLocationOptions(false);
        }
      }
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again or enter manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingCurrentLocation(false);
    }
  };

  const handleSubcategoryLocationFocus = () => {
    if (!hasShownLocationOptions && !subcategoryLocation.trim()) {
      setShowLocationOptions(true);
      setHasShownLocationOptions(true);
    }
    if (subcategoryLocation.length >= 2) {
      setShowSubcategoryLocationModal(true);
      debouncedSearch(subcategoryLocation, setSubcategoryLocationSuggestions, setIsLoadingSubcategoryLocationSuggestions);
    }
  };

  const handleManualEntry = () => {
    setShowLocationOptions(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    setSubcategoryLocationSuggestions([]);
    setIsLoadingSubcategoryLocationSuggestions(false);
    subcategoryLocationInputRef.current?.focus();
  };

  const handleSubcategorySearch = () => {
    const currentSection = categorySections[currentCategoryIndex];
    const currentSelection = categorySelections[currentSection?.id || ''];
    if (currentSelection && subcategoryLocation) {
    }
  };

  const clearSelectedSubcategory = () => {
    const currentSection = categorySections[currentCategoryIndex];
    setCategorySelections(prev => ({
      ...prev,
      [currentSection.id]: null
    }));
    setSubcategoryLocation('');
    setShowSubcategoryLocationModal(false);
    setSubcategoryLocationSuggestions([]);
    setShowLocationOptions(false);
    setHasShownLocationOptions(false);
  };

  const groupCategoryItems = (items: CategoryItem[]) => {
    const grouped = [];
    for (let i = 0; i < items.length; i += 3) {
      const chunk = items.slice(i, i + 3);
      grouped.push(chunk);
    }
    return grouped;
  };

  const renderServiceRow = ({ item: rowData }: { item: Service[] }) => (
    <View style={styles.serviceRow}>
      {rowData.map((service: Service) => (
        <TouchableOpacity key={service.id} style={styles.serviceCardSmall}>
          <View style={styles.serviceImageContainerSmall}>
            <Image
              source={{ uri: service.image }}
              style={styles.serviceImageSmall}
              contentFit="cover"
            />
          </View>
          <View style={styles.serviceInfoSmall}>
            <Text style={styles.serviceTitleSmall}>{service.title}</Text>
            <Text style={styles.servicePriceSmall}>{service.price}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {rowData.length < 3 && (
        <View style={{ flex: 3 - rowData.length }} />
      )}
    </View>
  );

  const renderCategoryItemRow = ({ item: rowData }: { item: CategoryItem[] }) => (
    <View style={styles.categoryItemRow}>
      {rowData.length > 0 ? (
        rowData.map((item: CategoryItem) => {
          const currentSection = categorySections[currentCategoryIndex];
          const currentSelection = categorySelections[currentSection?.id || ''];
          const isSelected = currentSelection?.item.id === item.id;
          const BASE_URL = getBaseUrl().replace('/api', '');
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.categoryItemCard,
                isSelected && styles.categoryItemCardSelected,
              ]}
              onPress={() => handleSubcategorySelect(categorySections[currentCategoryIndex], item)}
            >
              <View style={styles.categoryItemImageContainer}>
                <Image
                  source={{ uri: `${BASE_URL}/uploads/subcategorys/${item.image}` }}
                  style={styles.categoryItemImage}
                  contentFit="cover"
                />
                <View style={styles.categoryItemOverlay}>
                  <Text style={styles.categoryItemTitle}>{item.title}</Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <Text>No items available</Text>
      )}
      {rowData.length < 3 && rowData.length > 0 && (
        Array.from({ length: 3 - rowData.length }, (_, index) => (
          <View key={`empty-${index}`} style={styles.categoryItemCardEmpty} />
        ))
      )}
    </View>
  );

  const renderCategorySection = ({ item: section, index }: { item: CategorySection, index: number }) => {
    const groupedItems = groupCategoryItems(section.items);
    const isCurrentSection = currentCategoryIndex === index;
    const isSelectedSubcategoryInThisSection = categorySelections[section.id] !== null && categorySelections[section.id] !== undefined;

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{section.title}</Text>
          <Text style={styles.categorySubtitle}>{section.sub_title}</Text>
        </View>

        <FlatList
          data={groupedItems}
          renderItem={renderCategoryItemRow}
          keyExtractor={(item, index) => `${section.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContainer}
          snapToInterval={width - 20}
          decelerationRate="fast"
          pagingEnabled
        />

        {categorySelections[categorySections[currentCategoryIndex]?.id || ''] && (
          <View style={styles.subcategoryLocationInline}>
            <View style={styles.subcategoryLocationRow}>
              <View style={styles.subcategoryLocationInputWrapper}>
                <Ionicons name="location" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  ref={subcategoryLocationInputRef}
                  style={styles.subcategoryLocationInput}
                  placeholder="Enter your location"
                  placeholderTextColor="#999"
                  value={subcategoryLocation}
                  onChangeText={handleSubcategoryLocationChange}
                  onFocus={handleSubcategoryLocationFocus}
                />
                <TouchableOpacity onPress={handleSearchWorkersNearby}>
                <Ionicons name="search" size={20} color="#4299e1" style={styles.subcategorySearchIcon} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.clearSubcategoryButton}
                onPress={clearSelectedSubcategory}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <SuggestionDropdown
              visible={showSubcategoryLocationModal}
              suggestions={subcategoryLocationSuggestions}
              onSelect={selectSubcategoryLocationSuggestion}
              style={{ position: 'absolute', bottom: 80, left: -18, right: 18, zIndex: 99999, elevation: 999999 }}
              isLoading={isLoadingSubcategoryLocationSuggestions}
            />
          </View>
        )}
      </View>
    );
  };

  const handleCategoryScroll = (event: any) => {
    const slideSize = width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== currentCategoryIndex && categorySections[index]) {
      setCurrentCategoryIndex(index);
      setSubcategoryLocation('');
      setShowSubcategoryLocationModal(false);
      setSubcategoryLocationSuggestions([]);
      setShowLocationOptions(false);
      setHasShownLocationOptions(false);
      setCategorySelections({});
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={handleOutsideTouch}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Ionicons style={styles.menuicon} name="menu" size={28} color="black" />
          </TouchableOpacity>
          <Image
            source={require('@/assets/images/OriginX.png')}
            style={styles.mainlogo}
            contentFit="contain"
          />
          {isAuthenticated && user ? (
            <TouchableOpacity onPress={() => {
              if (user.type === 2) {
                router.push('/serviceseekerindex');
              } else if (user.type === 1) {
                router.push('/workerindex');
              }
            }}>
              <Ionicons name="person-circle-outline" size={35} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSignInSignUp}>
              <Ionicons name="log-in-outline" size={35} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#A1CEDC' }}
          headerImage={<View />}
        >
          <View style={styles.searchSection}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>🔍 Search for Service</Text>
              <Text style={styles.searchSubtitle}>Find the perfect service provider near you</Text>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="search"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputBox}
                    placeholder="What service do you need?"
                    placeholderTextColor="#999"
                    value={serviceInput}
                    onChangeText={handleServiceInputChange}
                    onFocus={() => {
                      if (serviceInput.length >= 2) {
                        setShowServiceSuggestions(true);
                      }
                    }}
                  />
                  {serviceInput && (
                    <TouchableOpacity
                      style={styles.clearServiceButton}
                      onPress={clearServiceInput}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                {showServiceSuggestions && (
                  <View style={styles.serviceSuggestionsDropdown}>
                    <ScrollView style={styles.serviceSuggestionsList} nestedScrollEnabled={true}>
                      {serviceSuggestions.map((service) => (
                        <TouchableOpacity
                          key={service.id}
                          style={styles.serviceSuggestionItem}
                          onPress={() => handleServiceSuggestionSelect(service)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.serviceSuggestionEmoji}>{service.emoji}</Text>
                          <View style={styles.serviceSuggestionTextContainer}>
                            <Text style={styles.serviceSuggestionTitle}>{service.title}</Text>
                            <Text style={styles.serviceSuggestionCategory}>
                              {categories.find(cat => cat.value === service.category)?.label || service.category}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#ccc" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={[
                  styles.dropdownContainer,
                  selectedCategory && selectedCategory !== '' && styles.dropdownContainerSelected,
                  (categoriesLoading || categoriesError) && styles.dropdownContainerDisabled
                ]}>
                  <Ionicons
                    name={selectedCategory && selectedCategory !== '' ? "checkmark-circle" : "list-outline"}
                    size={16}
                    color={(categoriesLoading || categoriesError) ? "#ccc" : (selectedCategory && selectedCategory !== '' ? "#3498db" : "#666")}
                    style={styles.dropdownIcon}
                  />
                  <View style={styles.pickerWrapper}>
                    {categoriesLoading ? (
                      <Text style={{ padding: 12, color: '#999' }}>Loading categories...</Text>
                    ) : categoriesError ? (
                      <Text style={{ padding: 12, color: 'red' }}>{categoriesError}</Text>
                    ) : (
                      <Picker
                        selectedValue={selectedCategory}
                        onValueChange={handleCategoryChange}
                        style={styles.categoryPicker}
                        itemStyle={{ fontSize: 16, color: 'red' }}
                        enabled={!categoriesLoading && !categoriesError}
                      >
                        {categories.map((category) => (
                          <Picker.Item
                            key={category.value}
                            label={category.label}
                            value={category.value}
                            color={category.value === '' ? '#999' : '#2c3e50'}
                          />
                        ))}
                      </Picker>
                    )}
                  </View>
                  {(categoriesLoading || categoriesError) && (
                    <View style={styles.disabledOverlay}></View>
                  )}
                  {selectedCategory && selectedCategory !== '' && !categoriesLoading && !categoriesError && (
                    <TouchableOpacity
                      style={styles.clearCategoryButton}
                      onPress={clearCategorySelection}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ position: 'relative', zIndex: 999999 }}>
                  <View style={styles.pincodeWrapper}>
                    <Ionicons name="location" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      ref={mainLocationInputRef}
                      style={styles.pincodeBox}
                      placeholder="Enter Location"
                      placeholderTextColor="#999"
                      value={mainLocation}
                      onChangeText={handleMainLocationChange}
                      onFocus={() => {
                        if (mainLocation.length >= 2) {
                          setShowMainLocationModal(true);
                        }
                      }}
                    />
                  </View>
                  <SuggestionDropdown
                    visible={showMainLocationModal}
                    suggestions={mainLocationSuggestions}
                    onSelect={selectMainLocationSuggestion}
                    style={{ position: 'absolute', top: 55, left: 0, right: 0, zIndex: 999999, elevation: 999999 }}
                    isLoading={isLoadingMainLocationSuggestions}
                  />
                </View>
              </View>
              <View style={styles.searchRow}>
                <TouchableOpacity style={styles.searchButton} onPress={handleMainSearch}>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.searchButtonText}>Search For Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.categorySectionsContainer}>
            {isLoadingCategories ? (
              <View style={styles.loadingContainer}>
                <Text>Loading categories...</Text>
              </View>
            ) : categorySectionsError ? (
              <View style={styles.loadingContainer}>
                <Text style={{ color: 'red' }}>{categorySectionsError}</Text>
              </View>
            ) : categorySections.length > 0 ? (
              <>
                <FlatList
                  ref={categoryFlatListRef}
                  data={categorySections}
                  renderItem={renderCategorySection}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={width}
                  decelerationRate="fast"
                  pagingEnabled
                  onMomentumScrollEnd={handleCategoryScroll}
                  contentContainerStyle={styles.categoryScrollContainer}
                  style={{ flex: 1 }}
                />

                <View style={styles.categoryNavigationFixed}>
                  {categorySections.map((_, dotIndex) => (
                    <TouchableOpacity
                      key={dotIndex}
                      style={[
                        styles.categoryDot,
                        dotIndex === currentCategoryIndex && styles.categoryDotActive
                      ]}
                      onPress={() => {
                        setCurrentCategoryIndex(dotIndex);
                        categoryFlatListRef.current?.scrollToIndex({ index: dotIndex, animated: true });
                      }}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <Text>No categories available</Text>
              </View>
            )}
          </View>
        </ParallaxScrollView>

        {showLocationOptions && (
          <View style={styles.locationOptionsModal}>
            <TouchableOpacity
              style={styles.locationOptionsOverlay}
              activeOpacity={1}
              onPress={() => {
                setShowLocationOptions(false);
                setHasShownLocationOptions(true);
              }}
            >
              <View style={styles.locationOptionsContainer}>
                <View style={styles.locationOptionsHeader}>
                  <Text style={styles.locationOptionsTitle}>Choose Location Option</Text>
                  <TouchableOpacity
                    style={styles.locationOptionsCloseButton}
                    onPress={() => {
                      setShowLocationOptions(false);
                      setHasShownLocationOptions(true);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.locationOptionButton}
                  onPress={getCurrentLocation}
                  disabled={isGettingCurrentLocation}
                >
                  <Ionicons
                    name={isGettingCurrentLocation ? "hourglass-outline" : "location"}
                    size={20}
                    color="#3498db"
                  />
                  <Text style={styles.locationOptionText}>
                    {isGettingCurrentLocation ? "Getting location..." : "Use Current Location"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.locationOptionButton}
                  onPress={handleManualEntry}
                >
                  <Ionicons name="create-outline" size={20} color="#e74c3c" />
                  <Text style={styles.locationOptionText}>Enter Manually</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.locationOptionCancelButton}
                  onPress={() => {
                    setShowLocationOptions(false);
                    setHasShownLocationOptions(true);
                  }}
                >
                  <Text style={styles.locationOptionCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 50,
    backgroundColor: '#A1CEDC',
  },
  menuButton: {
    padding: 5,
  },
  mainlogo: {
    height: 50,
    width: 180,
    marginLeft: -160,
  },
  menuicon: {
    marginRight: 10,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    paddingBottom: 20,
    paddingTop: 15,
    backgroundColor: '#e9e5e5ff',
    marginTop: -20,
    marginLeft: -21,
    marginRight: -21,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 999999,
    position: 'relative',
  },
  searchHeader: {
    marginBottom: 25,
    alignItems: 'center',
  },
  searchTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  searchSubtitle: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 999999,
    position: 'relative',
    marginLeft: -12,
    marginRight: -12,
    marginTop: -15,
    marginBottom: -12,
  },
  inputRow: {
    flexDirection: 'column',
    gap: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 18,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e0',
    opacity: 0.7,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 18,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    height: 55,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownContainerSelected: {
    borderColor: '#4299e1',
    backgroundColor: '#ebf8ff',
    shadowColor: '#4299e1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  pickerWrapper: {
    flex: 1,
  },
  categoryPicker: {
    height: 55,
    width: '100%',
    color: '#2d3748',
    fontSize: 16,
    fontWeight: '600',
  },
  pincodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 18,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputBox: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  inputBoxDisabled: {
    color: '#a0aec0',
    opacity: 0.7,
  },
  pincodeBox: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  searchButton: {
    height: 60,
    backgroundColor: '#4299e1',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    shadowColor: '#4299e1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    marginTop: 5,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  categorySectionsContainer: {
    marginTop: -6,
    backgroundColor: '#e9e5e5ff',
    marginBottom: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    marginLeft: -21,
    marginRight: -21,
    paddingBottom: 25, // Further reduced to minimize gap when location input is present
    position: 'relative', // Added for absolute positioning of dots
  },
  categorySection: {
    width: width,
    paddingVertical: 25,
    paddingBottom: 20,
    paddingTop: 15,
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    marginBottom: 0, 
  },
  categoryHeader: {
    marginBottom: 25,
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginRight: 40,
  },
  categorySubtitle: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
    marginRight: 40,
  },
  categoryScrollContainer: {
    paddingHorizontal: 8,
    paddingBottom: 5, // Reduced padding to minimize gap
  },
  categoryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 30,
    paddingRight: 10,
    marginTop: -15,
    marginBottom: 8, // Reduced margin to minimize gap
  },
  categoryItemCard: {
    width: (width - 75) / 3,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    marginRight: 12,
  },
  categoryItemCardEmpty: {
    width: (width - 75) / 3,
    height: 140,
  },
  categoryItemCardSelected: {
    borderWidth: 3,
    borderColor: '#4299e1',
    shadowColor: '#4299e1',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  categoryItemImageContainer: {
    flex: 1,
    position: 'relative',
  },
  categoryItemImage: {
    width: '100%',
    height: '100%',
  },
  categoryItemOverlay: {
    position: 'absolute',
    bottom: 1,
    left: 0,
    right: 0,
    padding: 2,
    alignItems: 'center',
  },
  categoryItemTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  categoryNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 15,
  },
  categoryNavigationFixed: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5, // Further reduced padding
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 2, // Moved dots even closer
    left: 0,
    right: 0,
    zIndex: 10,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(45, 55, 72, 0.3)',
    marginHorizontal: 5,
  },
  categoryDotActive: {
    backgroundColor: '#4299e1',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  servicesSection: {
    paddingVertical: 25,
    paddingBottom: 15,
    paddingTop: 15,
    marginTop: -10,
    marginLeft: -21,
    marginRight: -21,
    backgroundColor: '#f8fafc',
  },
  suggestionDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 9999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    zIndex: 99999,
  },
  suggestionList: {
    maxHeight: 260,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  suggestionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 3,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  searchRow: {
    marginTop: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4299e1',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  subcategoryLocationInline: {
    marginTop: 10, // Reduced from 20 to minimize gap
    paddingHorizontal: 15,
    paddingBottom: 5, // Reduced from 15 to minimize gap
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  subcategoryLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 18,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    height: 55,
    marginLeft: -5,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subcategoryLocationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subcategoryLocationInput: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  subcategorySearchIcon: {
    marginLeft: 12,
  },
  subcategorySearchButton: {
    height: 55,
    width: 55,
    backgroundColor: '#4299e1',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#4299e1',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    marginRight: -8,
  },
  clearSubcategoryButton: {
    height: 55,
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -18,
  },
  locationOptionsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 9999,
  },
  locationOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationOptionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 9999,
    minWidth: 300,
    zIndex: 99999,
  },
  locationOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: -5,
    letterSpacing: -0.5,
    marginLeft: 20,
  },
  locationOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  locationOptionsCloseButton: {
    marginTop: -50,
    marginRight: -10,
  },
  locationOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 15,
    backgroundColor: '#f7fafc',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationOptionText: {
    fontSize: 16,
    color: '#2d3748',
    marginLeft: 18,
    fontWeight: '600',
  },
  locationOptionCancelButton: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 15,
    backgroundColor: '#e53e3e',
    marginTop: 15,
    alignItems: 'center',
    shadowColor: '#e53e3e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  locationOptionCancelText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 25,
  },
  loadingText: {
    fontSize: 16,
    color: '#4299e1',
    fontWeight: '600',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 25,
  },
  noResultsText: {
    fontSize: 16,
    color: '#4a5568',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  serviceCardSmall: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceImageContainerSmall: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  serviceImageSmall: {
    width: '100%',
    height: '100%',
  },
  serviceInfoSmall: {
    alignItems: 'center',
  },
  serviceTitleSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  servicePriceSmall: {
    fontSize: 12,
    color: '#4299e1',
    fontWeight: '700',
  },
  serviceSuggestionsDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    maxHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 9999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 6,
    zIndex: 99999,
  },
  serviceSuggestionsList: {
    maxHeight: 300,
  },
  serviceSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  serviceSuggestionEmoji: {
    fontSize: 22,
    marginRight: 15,
  },
  serviceSuggestionTextContainer: {
    flex: 1,
  },
  serviceSuggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 3,
  },
  serviceSuggestionCategory: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  dropdownContainerDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e0',
    opacity: 0.7,
  },
  categoryPickerDisabled: {
    opacity: 0.5,
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  disabledText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  clearServiceButton: {
    padding: 6,
    marginRight: 6,
  },
  clearCategoryButton: {
    padding: 6,
    marginRight: 6,
  },
  featureButtonsSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: -35,
    marginLeft: -21,
    marginRight: -21,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  featureButtonsContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  featureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureButtonText: {
    color: '#2d3748',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});