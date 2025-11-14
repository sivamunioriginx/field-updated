import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ';

interface LocationResult {
  latitude: number;
  longitude: number;
  address: string;
  label: string;
}

export default function LocationPickerScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Create responsive styles
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);

  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState({
    latitude: 18.5204,
    longitude: 73.8567,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [markerPosition, setMarkerPosition] = useState({
    latitude: 18.5204,
    longitude: 73.8567,
  });

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
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

      // Animate map to current location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const handleMapPress = (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    setMarkerPosition(coordinate);
  };

  const handleUseCurrentLocation = async () => {
    await getCurrentLocation();
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
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={styles.clearIcon.fontSize} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        region={region}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={markerPosition}
          draggable
          onDragEnd={(e) => setMarkerPosition(e.nativeEvent.coordinate)}
        >
          <View style={styles.customMarker}>
            <Ionicons name="location" size={40} color="#FF0000" />
          </View>
        </Marker>
      </MapView>

      {/* Use Current Location Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={handleUseCurrentLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="locate" size={styles.locationButtonIcon.fontSize} color="#666" />
          <Text style={styles.currentLocationText}>Use current location</Text>
        </TouchableOpacity>
      </View>

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
    map: {
      flex: 1,
      width: '100%',
    },
    customMarker: {
      alignItems: 'center',
      justifyContent: 'center',
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
    currentLocationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(14),
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
      bottom: getResponsiveSpacing(100),
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
      bottom: getResponsiveSpacing(210),
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
  });
};

