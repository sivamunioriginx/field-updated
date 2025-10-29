import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

interface Service {
  id: number;
  name: string;
  subcategory_id: string;
  image: string;
  created_at: string;
}

interface ServicesScreenProps {
  subcategoryId?: string;
  subcategoryName?: string;
}

export default function ServicesScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const subcategoryId = params.subcategoryId as string;
  const subcategoryName = params.subcategoryName as string;
  const categoryId = params.categoryId as string;
  const categoryName = params.categoryName as string;
  const searchQuery = params.searchQuery as string;
  const showTopServices = params.showTopServices as string;
  const showTopDeals = params.showTopDeals as string;
  const screenTitle = params.screenTitle as string;
  
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const videoRef = useRef<Video>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);

  // Fetch services by category ID, subcategory ID, search query, top services, or top deals
  const fetchServices = async () => {
    try {
      setLoading(true);
      let response;
      
      if (searchQuery) {
        // Fetch services based on search query
        response = await fetch(API_ENDPOINTS.SEARCH_SERVICES(searchQuery));
      } else if (showTopServices === 'true') {
        // Fetch all top services using existing endpoint
        response = await fetch(`${getBaseUrl()}/top-services?format=services`);
      } else if (showTopDeals === 'true') {
        // Fetch all top deals using existing endpoint
        response = await fetch(`${getBaseUrl()}/top-deals?format=services`);
      } else if (categoryId) {
        // Fetch services by category ID (all services in category)
        response = await fetch(`${getBaseUrl()}/services-by-category/${categoryId}`);
      } else if (subcategoryId) {
        // Fetch services by subcategory ID
        response = await fetch(API_ENDPOINTS.SERVICES_BY_SUBCATEGORY(subcategoryId));
      } else {
        console.log('No categoryId, subcategoryId, showTopServices, showTopDeals or searchQuery provided');
        setServices([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        data.data.forEach((service: Service) => {
          if (service.image) {
            const fullUrl = `${getBaseUrl().replace('/api', '')}${service.image}`;
          }
        });
        setServices(data.data);
        setAllServices(data.data);
      } else {
        console.log('No services found or unsuccessful response:', data);
        setServices([]);
        setAllServices([]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
      setAllServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  useEffect(() => {
    if (categoryId || subcategoryId || searchQuery || showTopServices === 'true' || showTopDeals === 'true') {
      fetchServices();
    }
  }, [categoryId, subcategoryId, searchQuery, showTopServices, showTopDeals]);

  // Initialize search input with current search query
  useEffect(() => {
    if (searchQuery) {
      setSearchInput(searchQuery);
    }
  }, [searchQuery]);

  // Ensure video plays when component mounts
  useEffect(() => {
    const videoUrl = `${getBaseUrl().replace('/api', '')}/uploads/service_videos/electrical.mov`;
    
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.playAsync();
      }
    }, 1000); // Wait 1 second for video to load

    return () => clearTimeout(timer);
  }, []);

  const handleServicePress = (service: Service) => {
    // Navigate to service details or booking screen
    // You can add navigation to service details here
    // router.push(`/service-details/${service.id}`);
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleImageError = (serviceId: number) => {
    setImageErrors(prev => new Set(prev).add(serviceId));
  };

  const handleAddService = (service: Service) => {
    // Handle adding service to cart or booking
  };

  const handleViewDetails = (service: Service) => {
    // Navigate to service details
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      // Navigate to services screen with search query
      router.push({
        pathname: '/services-screen',
        params: {
          searchQuery: searchInput.trim(),
        }
      });
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setServices(allServices); // Reset to show all services
  };

  const closeHeader = () => {
    setShowHeader(false);
  };

  const filterServices = (query: string) => {
    if (query.length >= 2) {
      const filtered = allServices.filter(service =>
        service.name.toLowerCase().includes(query.toLowerCase())
      );
      setServices(filtered);
    } else if (query.length === 0) {
      setServices(allServices); // Show all services when search is cleared
    }
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    
    // Show header when scrolling starts (any scroll movement)
    setShowHeader(scrollPosition > 0);
    
    // Update animated value
    scrollY.setValue(scrollPosition);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: showHeader ? 1 : 0,
            transform: [{
              translateY: showHeader ? 0 : -100
            }]
          }
        ]}
        pointerEvents={showHeader ? 'auto' : 'none'}
      >
        <View style={styles.searchBarContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={20} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Look for services"
            placeholderTextColor="#999"
            value={searchInput}
            onChangeText={(text) => {
              setSearchInput(text);
              filterServices(text);
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Scrollable Content with Video */}
      <TouchableOpacity 
        style={styles.mainContent}
        activeOpacity={1}
        onPress={closeHeader}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
        {/* Video Section */}
        <View style={styles.videoContainer}>
        {videoLoading && !videoError && (
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.videoLoadingText}>Loading video...</Text>
          </View>
        )}
        
        {videoError ? (
          <View style={styles.videoErrorContainer}>
            <Ionicons name="play-circle-outline" size={60} color="#8B5CF6" />
            <Text style={styles.videoErrorText}>Video not supported</Text>
            <Text style={styles.videoErrorSubtext}>Format not compatible with device</Text>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ 
              uri: `${getBaseUrl().replace('/api', '')}/uploads/service_videos/electrical.mov`,
              // Fallback to MP4 if available
              // uri: `${getBaseUrl().replace('/api', '')}/uploads/service_videos/electrical.mp4`,
            }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={true}
            isLooping={true}
            isMuted={true}
            volume={0.0}
            rate={1.0}
            progressUpdateIntervalMillis={1000}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                setVideoLoading(false);
                if (!status.isPlaying && !status.didJustFinish) {
                  console.log('Restarting video...');
                  videoRef.current?.playAsync();
                }
              } else if (status.error) {
                console.error('Video error:', status.error);
                setVideoLoading(false);
                setVideoError(true);
              }
            }}
            onLoad={() => {
              setVideoLoading(false);
              videoRef.current?.playAsync();
            }}
            onError={(error) => {
              console.error('Video load error:', error);
              setVideoLoading(false);
              setVideoError(true);
            }}
          />
        )}

        {/* Back Button Overlay - Only visible when header is hidden */}
        {!showHeader && (
          <TouchableOpacity 
            style={styles.videoBackButton} 
            onPress={(e) => {
              e.stopPropagation();
              handleBackPress();
            }}
          >
            <View style={styles.videoBackButtonBackground}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Search Button Overlay - Only visible when header is hidden */}
        {!showHeader && (
          <TouchableOpacity 
            style={styles.videoSearchButton} 
            onPress={(e) => {
              e.stopPropagation();
              setShowHeader(true);
            }}
          >
            <View style={styles.videoSearchButtonBackground}>
              <Ionicons name="search-outline" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}
        </View>
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Services Found' : 'No Services Available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? `No services found for "${searchQuery}". Try searching with different keywords.`
                : 'No services found for this category. Check back later!'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services.map((service, index) => (
              <View key={service.id}>
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleServicePress(service);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.serviceContent}>
                    {/* Left Section - Service Details */}
                    <View style={styles.serviceDetails}>
                      <Text style={styles.serviceName} numberOfLines={2}>
                        {service.name}
                      </Text>
                      
                      {/* Rating */}
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>4.85</Text>
                        <Text style={styles.reviewsText}>(138K reviews)</Text>
                      </View>
                      
                      {/* Price */}
                      <Text style={styles.priceText}>
                        Starts at ₹299
                      </Text>
                      
                      {/* Description (optional) */}
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>
                          Professional service with quality materials
                        </Text>
                      </View>
                      
                      {/* View Details Link */}
                      <TouchableOpacity 
                        style={styles.viewDetailsButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleViewDetails(service);
                        }}
                      >
                        <Text style={styles.viewDetailsText}>View details</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Right Section - Image and Actions */}
                    <View style={styles.serviceActions}>
                      {/* Service Image */}
                      <View style={styles.serviceImageContainer}>
                        {service.image && !imageErrors.has(service.id) ? (
                          <Image
                            source={{ uri: `${getBaseUrl().replace('/api', '')}${service.image}` }}
                            style={styles.serviceImage}
                            contentFit="cover"
                            onError={() => handleImageError(service.id)}
                            onLoad={() => {
                            }}
                          />
                        ) : (
                          <View style={styles.serviceImagePlaceholder}>
                            <Ionicons name="construct-outline" size={30} color="#8B5CF6" />
                          </View>
                        )}
                      </View>
                      
                      {/* Add Button */}
                      <TouchableOpacity 
                        style={styles.addButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleAddService(service);
                        }}
                      >
                        <Text style={styles.addButtonText}>Add</Text>
                      </TouchableOpacity>
                      
                      {/* Options Text */}
                      <Text style={styles.optionsText}>2 options</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                {/* Separator Line */}
                {index < services.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </TouchableOpacity>

    </View>
  );
}

const createStyles = (screenHeight: number, screenWidth: number) => {
  // Enhanced responsive helper functions for better screen size adaptation
  
  // Determine device type based on screen dimensions with more granular breakpoints
  const isSmallScreen = screenWidth < 360; // Small phones (iPhone SE, etc.)
  const isMediumScreen = screenWidth >= 360 && screenWidth < 414; // Standard phones
  const isLargeScreen = screenWidth >= 414 && screenWidth < 768; // Large phones (iPhone Pro Max, etc.)
  const isTabletScreen = screenWidth >= 768 && screenWidth < 1024; // Tablets
  const isLargeTabletScreen = screenWidth >= 1024; // Large tablets/desktop
  
  // Calculate aspect ratio for better responsive decisions
  const aspectRatio = screenWidth / screenHeight;
  const isPortrait = aspectRatio < 0.8;
  const isLandscape = aspectRatio >= 1.2;
  
  // Enhanced responsive width calculation with better scaling and aspect ratio consideration
  const getResponsiveWidth = (baseValue: number, screenWidth: number, minValue?: number, maxValue?: number) => {
    let scaledValue;
    
    if (isSmallScreen) {
      // For small screens, use conservative scaling
      scaledValue = baseValue * 0.8;
    } else if (isMediumScreen) {
      // For medium screens, use standard scaling
      scaledValue = baseValue;
    } else if (isLargeScreen) {
      // For large phones, scale up slightly
      scaledValue = baseValue * 1.15;
    } else if (isTabletScreen) {
      // For tablets, scale up more
      scaledValue = baseValue * 1.4;
    } else if (isLargeTabletScreen) {
      // For large tablets/desktop, scale up significantly
      scaledValue = baseValue * 1.6;
    } else {
      // For very large screens, use proportional scaling
      const baseWidth = 414; // iPhone 11 Pro Max as reference
      scaledValue = (baseValue * screenWidth) / baseWidth;
    }
    
    // Adjust for landscape orientation
    if (isLandscape) {
      scaledValue *= 0.9; // Slightly reduce in landscape
    }
    
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  // Enhanced responsive font sizes with better scaling and readability considerations
  const getResponsiveFontSize = (baseSize: number, screenWidth: number) => {
    let scaledSize;
    
    if (isSmallScreen) {
      scaledSize = Math.max(10, baseSize * 0.9);
    } else if (isMediumScreen) {
      scaledSize = baseSize;
    } else if (isLargeScreen) {
      scaledSize = baseSize * 1.1;
    } else if (isTabletScreen) {
      scaledSize = baseSize * 1.25;
    } else if (isLargeTabletScreen) {
      scaledSize = baseSize * 1.4;
    } else {
      const baseWidth = 414;
      scaledSize = (baseSize * screenWidth) / baseWidth;
    }
    
    // Adjust for landscape orientation (slightly smaller fonts)
    if (isLandscape) {
      scaledSize *= 0.95;
    }
    
    // Ensure font sizes stay within reasonable bounds for readability
    return Math.max(10, Math.min(32, scaledSize));
  };

  // Enhanced responsive spacing with better scaling and orientation awareness
  const getResponsiveSpacing = (baseSpacing: number, screenWidth: number) => {
    let scaledSpacing;
    
    if (isSmallScreen) {
      scaledSpacing = Math.max(2, baseSpacing * 0.8);
    } else if (isMediumScreen) {
      scaledSpacing = baseSpacing;
    } else if (isLargeScreen) {
      scaledSpacing = baseSpacing * 1.1;
    } else if (isTabletScreen) {
      scaledSpacing = baseSpacing * 1.3;
    } else if (isLargeTabletScreen) {
      scaledSpacing = baseSpacing * 1.5;
    } else {
      const baseWidth = 414;
      scaledSpacing = (baseSpacing * screenWidth) / baseWidth;
    }
    
    // Adjust for landscape orientation (reduce spacing)
    if (isLandscape) {
      scaledSpacing *= 0.85;
    }
    
    return Math.max(2, scaledSpacing);
  };

  // Helper function for responsive padding
  const getResponsivePadding = (basePadding: number, screenWidth: number) => {
    return getResponsiveSpacing(basePadding, screenWidth);
  };

  // Helper function for responsive margins
  const getResponsiveMargin = (baseMargin: number, screenWidth: number) => {
    return getResponsiveSpacing(baseMargin, screenWidth);
  };

  // Helper function for responsive border radius
  const getResponsiveBorderRadius = (baseRadius: number, screenWidth: number) => {
    return getResponsiveSpacing(baseRadius, screenWidth);
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    videoContainer: {
      width: '100%',
      height: isSmallScreen ? screenHeight * 0.22 : 
              isTabletScreen ? screenHeight * 0.3 : 
              isLargeTabletScreen ? screenHeight * 0.35 :
              screenHeight * 0.25, // Enhanced responsive video height
      backgroundColor: '#000',
      position: 'relative',
    },
    video: {
      width: '100%',
      height: '100%',
    },
    videoLoadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    videoLoadingText: {
      color: '#FFFFFF',
      marginTop: getResponsiveSpacing(8, screenWidth),
      fontSize: getResponsiveFontSize(14, screenWidth),
    },
    videoErrorContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    videoErrorText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(16, screenWidth),
      fontWeight: '600',
      marginTop: getResponsiveSpacing(12, screenWidth),
    },
    videoErrorSubtext: {
      color: '#CCCCCC',
      fontSize: getResponsiveFontSize(12, screenWidth),
      marginTop: getResponsiveSpacing(4, screenWidth),
      textAlign: 'center',
    },
    videoBackButton: {
      position: 'absolute',
      top: getResponsiveSpacing(
        isSmallScreen ? 35 : 
        isTabletScreen ? 50 : 
        isLargeTabletScreen ? 60 : 40, 
        screenWidth
      ),
      left: getResponsiveSpacing(
        isSmallScreen ? 12 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 30 : 16, 
        screenWidth
      ),
      zIndex: 10,
    },
    videoBackButtonBackground: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: getResponsiveBorderRadius(20, screenWidth),
      padding: getResponsivePadding(
        isSmallScreen ? 6 : 
        isTabletScreen ? 12 : 
        isLargeTabletScreen ? 16 : 8, 
        screenWidth
      ),
    },
    videoSearchButton: {
      position: 'absolute',
      top: getResponsiveSpacing(
        isSmallScreen ? 35 : 
        isTabletScreen ? 50 : 
        isLargeTabletScreen ? 60 : 40, 
        screenWidth
      ),
      right: getResponsiveSpacing(
        isSmallScreen ? 12 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 30 : 16, 
        screenWidth
      ),
      zIndex: 10,
    },
    videoSearchButtonBackground: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: getResponsiveBorderRadius(20, screenWidth),
      padding: getResponsivePadding(
        isSmallScreen ? 6 : 
        isTabletScreen ? 12 : 
        isLargeTabletScreen ? 16 : 8, 
        screenWidth
      ),
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: getResponsiveSpacing(16, screenWidth),
      fontSize: getResponsiveFontSize(16, screenWidth),
      color: '#666',
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 12 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 16, 
        screenWidth
      ),
      paddingTop: getResponsivePadding(
        isSmallScreen ? 30 : 
        isTabletScreen ? 45 : 
        isLargeTabletScreen ? 55 : 35, 
        screenWidth
      ),
      paddingBottom: getResponsivePadding(
        isSmallScreen ? 5 : 
        isTabletScreen ? 8 : 
        isLargeTabletScreen ? 10 : 5, 
        screenWidth
      ),
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#e2dcdcff',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    searchBarContainer: {
      flex: 1,
      position: 'relative',
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveBorderRadius(12, screenWidth),
      height: getResponsiveSpacing(44, screenWidth),
      borderWidth: 1,
      borderColor: '#b3b2b2ff',
    },
    backButton: {
      position: 'absolute',
      left: getResponsiveSpacing(12, screenWidth),
      top: '50%',
      transform: [{ translateY: -getResponsiveSpacing(10, screenWidth) }],
      zIndex: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(16, screenWidth),
      color: '#000',
      paddingLeft: getResponsiveSpacing(40, screenWidth),
      paddingRight: getResponsiveSpacing(40, screenWidth),
      paddingVertical: getResponsiveSpacing(12, screenWidth),
    },
    clearButton: {
      position: 'absolute',
      right: getResponsiveSpacing(12, screenWidth),
      top: '50%',
      transform: [{ translateY: -getResponsiveSpacing(10, screenWidth) }],
      zIndex: 1,
    },
    mainContent: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: getResponsiveSpacing(20, screenWidth),
    },
    servicesList: {
      backgroundColor: '#FFFFFF',
    },
    serviceCard: {
      backgroundColor: '#FFFFFF',
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 12 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 16, 
        screenWidth
      ),
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 12 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 16, 
        screenWidth
      ),
    },
    serviceContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    serviceDetails: {
      flex: 1,
      marginRight: getResponsiveSpacing(
        isSmallScreen ? 12 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 16, 
        screenWidth
      ),
    },
    serviceName: {
      fontSize: getResponsiveFontSize(16, screenWidth),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(20, screenWidth),
      marginBottom: getResponsiveSpacing(6, screenWidth),
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(4, screenWidth),
    },
    ratingText: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      fontWeight: '500',
      color: '#000',
      marginLeft: getResponsiveSpacing(4, screenWidth),
    },
    reviewsText: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#666',
      marginLeft: getResponsiveSpacing(4, screenWidth),
    },
    priceText: {
      fontSize: getResponsiveFontSize(16, screenWidth),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveSpacing(8, screenWidth),
    },
    descriptionContainer: {
      marginBottom: getResponsiveSpacing(8, screenWidth),
    },
    descriptionText: {
      fontSize: getResponsiveFontSize(13, screenWidth),
      color: '#666',
      lineHeight: getResponsiveFontSize(18, screenWidth),
    },
    viewDetailsButton: {
      alignSelf: 'flex-start',
    },
    viewDetailsText: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#8B5CF6',
      fontWeight: '500',
    },
    serviceActions: {
      alignItems: 'center',
      width: getResponsiveWidth(
        isSmallScreen ? 70 : 
        isTabletScreen ? 100 : 
        isLargeTabletScreen ? 120 : 80, 
        screenWidth
      ),
    },
    serviceImageContainer: {
      width: getResponsiveWidth(
        isSmallScreen ? 50 : 
        isTabletScreen ? 80 : 
        isLargeTabletScreen ? 100 : 60, 
        screenWidth
      ),
      height: getResponsiveWidth(
        isSmallScreen ? 50 : 
        isTabletScreen ? 80 : 
        isLargeTabletScreen ? 100 : 60, 
        screenWidth
      ),
      borderRadius: getResponsiveBorderRadius(8, screenWidth),
      overflow: 'hidden',
      marginBottom: getResponsiveMargin(8, screenWidth),
    },
    serviceImage: {
      width: '100%',
      height: '100%',
    },
    serviceImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveBorderRadius(6, screenWidth),
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 6 : 
        isTabletScreen ? 12 : 
        isLargeTabletScreen ? 16 : 8, 
        screenWidth
      ),
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 3 : 
        isTabletScreen ? 6 : 
        isLargeTabletScreen ? 8 : 4, 
        screenWidth
      ),
      marginBottom: getResponsiveMargin(4, screenWidth),
      marginTop: -20,
    },
    addButtonText: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      color: '#8B5CF6',
      fontWeight: '600',
    },
    optionsText: {
      fontSize: getResponsiveFontSize(11, screenWidth),
      color: '#999',
      textAlign: 'center',
    },
    separator: {
      height: 1,
      backgroundColor: '#e6ddddff',
      marginHorizontal: getResponsiveMargin(
        isSmallScreen ? 12 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 16, 
        screenWidth
      ),
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 40 : 
        isTabletScreen ? 80 : 
        isLargeTabletScreen ? 100 : 60, 
        screenWidth
      ),
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 20 : 
        isTabletScreen ? 40 : 
        isLargeTabletScreen ? 60 : 30, 
        screenWidth
      ),
    },
    emptyTitle: {
      fontSize: getResponsiveFontSize(20, screenWidth),
      fontWeight: '600',
      color: '#666',
      marginTop: getResponsiveSpacing(16, screenWidth),
    },
    emptySubtitle: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#999',
      textAlign: 'center',
      marginTop: getResponsiveMargin(8, screenWidth),
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 20 : 
        isTabletScreen ? 60 : 
        isLargeTabletScreen ? 80 : 40, 
        screenWidth
      ),
    },
  });
};
