import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ';

interface LocationResult {
  latitude: number;
  longitude: number;
  address: string;
  label: string;
}

export default function LocationPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Create responsive styles
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);

  // Get initial values from params if they exist
  const initialLat = params.latitude ? parseFloat(params.latitude as string) : 18.5204;
  const initialLng = params.longitude ? parseFloat(params.longitude as string) : 73.8567;

  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [markerPosition, setMarkerPosition] = useState({
    latitude: initialLat,
    longitude: initialLng,
  });
  const [showCurrentLocationButton, setShowCurrentLocationButton] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState({
    name: '',
    fullAddress: '',
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [flatNo, setFlatNo] = useState((params.flatNo as string) || '');
  const [landmark, setLandmark] = useState((params.landmark as string) || '');
  const [saveAsType, setSaveAsType] = useState((params.saveAsType as string) || 'Home');

  // Get current location on mount or use passed location
  useEffect(() => {
    // If location params were passed, use them
    if (params.latitude && params.longitude && params.address) {
      setShowLocationCard(true);
      setSearchQuery(params.address as string);
      reverseGeocode(initialLat, initialLng);
      
      // Animate map to passed location
      if (mapRef.current) {
        const newRegion = {
          latitude: initialLat,
          longitude: initialLng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setTimeout(() => {
          mapRef.current?.animateToRegion(newRegion, 1000);
        }, 100);
      }
    } else {
      // No params, get current GPS location
      getCurrentLocation();
    }
    
    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to use this feature');
          return;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setRegion(newRegion);
      setMarkerPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Fetch address for current location and show card
      reverseGeocode(location.coords.latitude, location.coords.longitude);
      setShowLocationCard(true);

      // Animate map to current location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const handleUseCurrentLocation = async () => {
    await getCurrentLocation();
    setShowCurrentLocationButton(false);
    setSearchQuery('');
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const fullAddress = result.formatted_address;
        
        // Extract place name from address components
        let placeName = '';
        const addressComponents = result.address_components;
        
        // Try to get a meaningful place name (premise, establishment, or neighborhood)
        const nameComponent = addressComponents.find((component: any) => 
          component.types.includes('premise') || 
          component.types.includes('establishment') ||
          component.types.includes('neighborhood') ||
          component.types.includes('sublocality')
        );
        
        placeName = nameComponent ? nameComponent.long_name : addressComponents[0]?.long_name || 'Selected Location';
        
        // Update both search input and bottom card
        setSearchQuery(fullAddress);
        setSelectedAddress({
          name: placeName,
          fullAddress: fullAddress,
        });
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const fetchPlaceSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
        setSuggestions(data.predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    fetchPlaceSuggestions(text);
  };

  const handleSuggestionSelect = async (placeId: string, description: string) => {
    setSearchQuery(description);
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();

    try {
      const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(placeDetailsUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const location = data.result.geometry.location;
        const newRegion = {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        
        setRegion(newRegion);
        setMarkerPosition({
          latitude: location.lat,
          longitude: location.lng,
        });
        
        setShowLocationCard(true);
        reverseGeocode(location.lat, location.lng);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      }
    } catch (error) {
      console.error('Place details error:', error);
      Alert.alert('Error', 'Unable to get location details');
    }
  };

  const handleRegionChange = () => {
    setIsMapMoving(true);
    setShowSuggestions(false);
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    setIsMapMoving(false);
    setRegion(newRegion);
    setMarkerPosition({
      latitude: newRegion.latitude,
      longitude: newRegion.longitude,
    });
    setShowCurrentLocationButton(true);
    setShowLocationCard(true);
    
    // Debounce reverse geocoding to avoid too many API calls
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      reverseGeocode(newRegion.latitude, newRegion.longitude);
    }, 500) as unknown as number;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    Keyboard.dismiss();
    
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        searchQuery
      )}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const newRegion = {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        
        setRegion(newRegion);
        setMarkerPosition({
          latitude: location.lat,
          longitude: location.lng,
        });
        
        setShowLocationCard(true);
        
        // Fetch address for searched location
        reverseGeocode(location.lat, location.lng);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } else {
        Alert.alert('Not Found', 'Location not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Unable to search location');
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleConfirmLocation = () => {
    setShowBottomSheet(true);
  };

  const handleProceed = async () => {
    try {
      // Create location object with all details
      const locationData = {
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
        label: selectedAddress.name,
        address: selectedAddress.fullAddress,
        flatNo,
        landmark,
        saveAsType,
      };

      // Save as default location
      await AsyncStorage.setItem('defaultLocation', JSON.stringify(locationData));
      
      console.log('✅ Location saved as default:', locationData);
      
      // Go back to previous screen
      router.back();
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar with Back Button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={styles.backIcon.fontSize} color="#000" />
          </TouchableOpacity>
          <Ionicons name="location" size={styles.searchIcon.fontSize} color="#00BFFF" style={styles.searchIconStyle} />
          <TextInput
            style={styles.searchInput}
            placeholder="search your society or nearest landmark"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
              }} 
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={styles.clearIcon.fontSize} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <ScrollView 
            style={styles.suggestionsContainer}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(suggestion.place_id, suggestion.description)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={styles.suggestionIcon.fontSize} color="#666" />
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionMainText} numberOfLines={1}>
                    {suggestion.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                    {suggestion.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
      />

      {/* Center Marker Overlay */}
      <View style={styles.centerMarkerContainer} pointerEvents="none">
        <View style={[styles.customMarker, isMapMoving && styles.markerMoving]}>
          <Ionicons name="location" size={40} color="#FF0000" />
        </View>
      </View>

      {/* Use Current Location Button */}
      {showCurrentLocationButton && (
        <View style={[styles.bottomContainer, showLocationCard && styles.bottomContainerRaised]}>
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={styles.locationButtonIcon.fontSize} color="#666" />
            <Text style={styles.currentLocationText}>Use current location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity 
          style={styles.zoomButton}
          onPress={() => {
            const newRegion = {
              ...region,
              latitudeDelta: region.latitudeDelta / 2,
              longitudeDelta: region.longitudeDelta / 2,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 300);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={styles.zoomIcon.fontSize} color="#000" />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity 
          style={styles.zoomButton}
          onPress={() => {
            const newRegion = {
              ...region,
              latitudeDelta: region.latitudeDelta * 2,
              longitudeDelta: region.longitudeDelta * 2,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 300);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={styles.zoomIcon.fontSize} color="#000" />
        </TouchableOpacity>
      </View>

      {/* My Location Button */}
      <TouchableOpacity 
        style={styles.myLocationButton}
        onPress={handleUseCurrentLocation}
        activeOpacity={0.7}
      >
        <Ionicons name="locate" size={styles.myLocationIcon.fontSize} color="#666" />
      </TouchableOpacity>

      {/* Location Details Card */}
      {showLocationCard && selectedAddress.fullAddress && (
        <View style={styles.locationCard}>
          <View style={styles.locationCardHeader}>
            <View style={styles.locationIconContainer}>
              <Ionicons name="home" size={styles.locationCardIcon.fontSize} color="#FF0000" />
            </View>
            <View style={styles.locationDetails}>
              <View style={styles.locationNameRow}>
                <Text style={styles.locationName} numberOfLines={1}>
                  {selectedAddress.name}
                </Text>
                <TouchableOpacity onPress={() => setShowBottomSheet(true)}>
                  <Ionicons name="chevron-up" size={styles.chevronIcon.fontSize} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {selectedAddress.fullAddress}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirmLocation}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>Confirm location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Sheet with Address Details */}
      {showBottomSheet && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <View style={styles.bottomSheetTitleRow}>
                <View style={styles.bottomSheetIconContainer}>
                  <Ionicons name="home" size={styles.bottomSheetIcon.fontSize} color="#FF0000" />
                </View>
                <Text style={styles.bottomSheetTitle} numberOfLines={1}>
                  {selectedAddress.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBottomSheet(false)}>
                <Text style={styles.showMapLink}>Show Map</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.bottomSheetForm}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  House / Flat/ Block No. <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your flat / house no."
                  placeholderTextColor="#999"
                  value={flatNo}
                  onChangeText={setFlatNo}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Landmark / Society name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Street Address"
                  placeholderTextColor="#999"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Save as <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.saveAsButtons}>
                  <TouchableOpacity
                    style={[styles.saveAsButton, saveAsType === 'Home' && styles.saveAsButtonActive]}
                    onPress={() => setSaveAsType('Home')}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="home" 
                      size={styles.saveAsIcon.fontSize} 
                      color={saveAsType === 'Home' ? '#000' : '#666'} 
                    />
                    <Text style={[styles.saveAsText, saveAsType === 'Home' && styles.saveAsTextActive]}>
                      Home
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveAsButton, saveAsType === 'Work' && styles.saveAsButtonActive]}
                    onPress={() => setSaveAsType('Work')}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="briefcase" 
                      size={styles.saveAsIcon.fontSize} 
                      color={saveAsType === 'Work' ? '#000' : '#666'} 
                    />
                    <Text style={[styles.saveAsText, saveAsType === 'Work' && styles.saveAsTextActive]}>
                      Work
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveAsButton, saveAsType === 'Other' && styles.saveAsButtonActive]}
                    onPress={() => setSaveAsType('Other')}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="location" 
                      size={styles.saveAsIcon.fontSize} 
                      color={saveAsType === 'Other' ? '#000' : '#666'} 
                    />
                    <Text style={[styles.saveAsText, saveAsType === 'Other' && styles.saveAsTextActive]}>
                      Other
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.proceedButton,
                  (!flatNo.trim() || !landmark.trim()) && styles.proceedButtonDisabled
                ]}
                onPress={handleProceed}
                activeOpacity={0.8}
                disabled={!flatNo.trim() || !landmark.trim()}
              >
                <Text style={styles.proceedButtonText}>Proceed</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (screenHeight: number, screenWidth: number) => {
  // Base dimensions for responsive scaling
  const baseWidth = 375;
  const baseHeight = 812;

  const scale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * factor;
  };

  const scaleHeight = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenHeight) / baseHeight;
    return size + (scaledSize - size) * factor;
  };

  const getResponsiveFontSize = (baseSize: number) => {
    const scaledSize = scale(baseSize, 0.5);
    return Math.max(10, Math.min(28, scaledSize));
  };

  const getResponsiveSpacing = (baseSpacing: number) => {
    return Math.max(2, scale(baseSpacing, 0.5));
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    searchContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? scaleHeight(50, 0.5) : scaleHeight(45, 0.5),
      left: getResponsiveSpacing(16),
      right: getResponsiveSpacing(16),
      zIndex: 10,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(8),
      paddingHorizontal: getResponsiveSpacing(10),
      paddingVertical: getResponsiveSpacing(8),
      borderWidth: 1,
      borderColor: '#E0E0E0',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    backButton: {
      padding: getResponsiveSpacing(4),
      marginRight: getResponsiveSpacing(6),
      marginLeft: getResponsiveSpacing(-4),
    },
    backIcon: {
      fontSize: getResponsiveFontSize(22),
    },
    searchIconStyle: {
      marginRight: getResponsiveSpacing(6),
    },
    searchIcon: {
      fontSize: getResponsiveFontSize(20),
    },
    searchInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(13),
      color: '#000',
      padding: 0,
    },
    clearButton: {
      padding: getResponsiveSpacing(4),
    },
    clearIcon: {
      fontSize: getResponsiveFontSize(16),
    },
    suggestionsContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(8),
      marginTop: getResponsiveSpacing(8),
      maxHeight: scaleHeight(300, 0.5),
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(12),
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    suggestionIcon: {
      fontSize: getResponsiveFontSize(20),
      marginRight: getResponsiveSpacing(12),
    },
    suggestionTextContainer: {
      flex: 1,
    },
    suggestionMainText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveSpacing(2),
    },
    suggestionSecondaryText: {
      fontSize: getResponsiveFontSize(12),
      color: '#666',
    },
    map: {
      flex: 1,
      width: '100%',
    },
    centerMarkerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
    },
    customMarker: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
    },
    markerMoving: {
      transform: [{ translateY: -10 }],
    },
    bottomContainer: {
      position: 'absolute',
      bottom: getResponsiveSpacing(20),
      left: 0,
      right: 0,
      zIndex: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomContainerRaised: {
      bottom: getResponsiveSpacing(180),
    },
    currentLocationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(12),
      borderRadius: getResponsiveSpacing(8),
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    locationButtonIcon: {
      fontSize: getResponsiveFontSize(20),
      marginRight: getResponsiveSpacing(10),
    },
    currentLocationText: {
      fontSize: getResponsiveFontSize(15),
      color: '#333',
      fontWeight: '500',
    },
    zoomControls: {
      position: 'absolute',
      bottom: getResponsiveSpacing(250),
      right: getResponsiveSpacing(16),
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(8),
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    zoomButton: {
      width: getResponsiveSpacing(44),
      height: getResponsiveSpacing(44),
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomIcon: {
      fontSize: getResponsiveFontSize(24),
    },
    zoomDivider: {
      height: 1,
      backgroundColor: '#E0E0E0',
    },
    myLocationButton: {
      position: 'absolute',
      bottom: getResponsiveSpacing(360),
      right: getResponsiveSpacing(16),
      width: getResponsiveSpacing(44),
      height: getResponsiveSpacing(44),
      borderRadius: getResponsiveSpacing(22),
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    myLocationIcon: {
      fontSize: getResponsiveFontSize(24),
    },
    locationCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: getResponsiveSpacing(20),
      borderTopRightRadius: getResponsiveSpacing(20),
      paddingHorizontal: getResponsiveSpacing(20),
      paddingTop: getResponsiveSpacing(10),
      paddingBottom: Platform.OS === 'ios' ? getResponsiveSpacing(20) : getResponsiveSpacing(8),
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      zIndex: 15,
    },
    locationCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(16),
    },
    locationIconContainer: {
      width: getResponsiveSpacing(48),
      height: getResponsiveSpacing(48),
      borderRadius: getResponsiveSpacing(24),
      backgroundColor: '#FFE5E5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(12),
    },
    locationCardIcon: {
      fontSize: getResponsiveFontSize(24),
    },
    locationDetails: {
      flex: 1,
    },
    locationNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getResponsiveSpacing(4),
    },
    locationName: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#000',
      flex: 1,
    },
    locationAddress: {
      fontSize: getResponsiveFontSize(13),
      color: '#666',
      lineHeight: getResponsiveFontSize(18),
    },
    chevronIcon: {
      fontSize: getResponsiveFontSize(24),
    },
    confirmButton: {
      backgroundColor: '#00A896',
      paddingVertical: getResponsiveSpacing(10),
      borderRadius: getResponsiveSpacing(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButtonText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#FFFFFF',
    },
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 20,
      justifyContent: 'flex-end',
    },
    bottomSheetContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: getResponsiveSpacing(16),
      borderTopRightRadius: getResponsiveSpacing(16),
      maxHeight: '80%',
      paddingBottom: Platform.OS === 'ios' ? getResponsiveSpacing(24) : getResponsiveSpacing(12),
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getResponsiveSpacing(16),
      paddingTop: getResponsiveSpacing(12),
      paddingBottom: getResponsiveSpacing(12),
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    bottomSheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: getResponsiveSpacing(10),
    },
    bottomSheetIconContainer: {
      width: getResponsiveSpacing(36),
      height: getResponsiveSpacing(36),
      borderRadius: getResponsiveSpacing(18),
      backgroundColor: '#FFE5E5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(10),
    },
    bottomSheetIcon: {
      fontSize: getResponsiveFontSize(18),
    },
    bottomSheetTitle: {
      fontSize: getResponsiveFontSize(15),
      fontWeight: '600',
      color: '#000',
      flex: 1,
    },
    showMapLink: {
      fontSize: getResponsiveFontSize(13),
      fontWeight: '600',
      color: '#00A896',
    },
    bottomSheetForm: {
      paddingHorizontal: getResponsiveSpacing(16),
      paddingTop: getResponsiveSpacing(12),
    },
    formGroup: {
      marginBottom: getResponsiveSpacing(14),
    },
    formLabel: {
      fontSize: getResponsiveFontSize(13),
      fontWeight: '500',
      color: '#000',
      marginBottom: getResponsiveSpacing(6),
    },
    required: {
      color: '#FF0000',
    },
    formInput: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: getResponsiveSpacing(6),
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(10),
      fontSize: getResponsiveFontSize(13),
      color: '#000',
      backgroundColor: '#FAFAFA',
    },
    saveAsButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    saveAsButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: getResponsiveSpacing(6),
      paddingVertical: getResponsiveSpacing(10),
      paddingHorizontal: getResponsiveSpacing(6),
      backgroundColor: '#FFFFFF',
      marginHorizontal: getResponsiveSpacing(3),
    },
    saveAsButtonActive: {
      borderColor: '#000',
      backgroundColor: '#F5F5F5',
    },
    saveAsIcon: {
      fontSize: getResponsiveFontSize(18),
      marginRight: getResponsiveSpacing(4),
    },
    saveAsText: {
      fontSize: getResponsiveFontSize(12),
      color: '#666',
      fontWeight: '500',
    },
    saveAsTextActive: {
      color: '#000',
      fontWeight: '600',
    },
    proceedButton: {
      backgroundColor: '#00A896',
      paddingVertical: getResponsiveSpacing(11),
      borderRadius: getResponsiveSpacing(6),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: getResponsiveSpacing(6),
      marginBottom: getResponsiveSpacing(6),
    },
    proceedButtonDisabled: {
      backgroundColor: '#B0B0B0',
      opacity: 0.6,
    },
    proceedButtonText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
};

