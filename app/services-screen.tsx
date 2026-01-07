import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import type { CartService } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

interface Service {
  id: number;
  name: string;
  subcategory_id: string;
  image: string;
  price?: number;
  deal_price?: number;
  rating?: number;
  created_at: string;
  instant_service?: number | string | boolean;
}

interface Subcategory {
  id: number;
  name: string;
  image: string;
  video_title?: string;
  category_id: string;
}

interface ServicesScreenProps {
  subcategoryId?: string;
  subcategoryName?: string;
}

export default function ServicesScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cart, addToCart, incrementItem, decrementItem, getTotalItems, getTotalPrice } = useCart();
  
  const subcategoryId = params.subcategoryId as string;
  const subcategoryName = params.subcategoryName as string;
  const categoryId = params.categoryId as string;
  const categoryName = params.categoryName as string;
  const searchQuery = params.searchQuery as string;
  const showTopServices = params.showTopServices as string;
  const showTopDeals = params.showTopDeals as string;
  const screenTitle = params.screenTitle as string;
  const serviceId = params.serviceId as string;
  
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [subcategoryData, setSubcategoryData] = useState<Subcategory | null>(null);
  const videoRef = useRef<Video>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);

  // Fetch subcategory details including video
  const fetchSubcategoryData = async () => {
    if (!subcategoryId) return;
    
    try {
      const response = await fetch(`${getBaseUrl()}/subcategory/${subcategoryId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setSubcategoryData(data.data);
      }
    } catch (error) {
      console.error('Error fetching subcategory data:', error);
    }
  };

  // Fetch services by category ID, subcategory ID, search query, top services, top deals, or single service ID
  const fetchServices = async () => {
    try {
      setLoading(true);
      let response;
      
      if (serviceId) {
        // Fetch single service by ID - try top-services first, then top-deals
        const topServicesResponse = await fetch(`${getBaseUrl()}/top-services?format=services`);
        const topServicesData = await topServicesResponse.json();
        
        if (topServicesData.success && Array.isArray(topServicesData.data)) {
          const foundService = topServicesData.data.find((s: Service) => s.id.toString() === serviceId);
          if (foundService) {
            setServices([foundService]);
            setAllServices([foundService]);
            setLoading(false);
            return;
          }
        }
        
        // If not found in top-services, try top-deals
        const topDealsResponse = await fetch(`${getBaseUrl()}/top-deals?format=services`);
        const topDealsData = await topDealsResponse.json();
        
        if (topDealsData.success && Array.isArray(topDealsData.data)) {
          const foundService = topDealsData.data.find((s: Service) => s.id.toString() === serviceId);
          if (foundService) {
            setServices([foundService]);
            setAllServices([foundService]);
            setLoading(false);
            return;
          }
        }
        
        // If still not found, set empty
        setServices([]);
        setAllServices([]);
        setLoading(false);
        return;
      } else if (searchQuery) {
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
        console.log('No categoryId, subcategoryId, showTopServices, showTopDeals, searchQuery or serviceId provided');
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
    if (categoryId || subcategoryId || searchQuery || showTopServices === 'true' || showTopDeals === 'true' || serviceId) {
      fetchServices();
    }
    if (subcategoryId) {
      fetchSubcategoryData();
    }
  }, [categoryId, subcategoryId, searchQuery, showTopServices, showTopDeals, serviceId]);

  // Initialize search input with current search query
  useEffect(() => {
    if (searchQuery) {
      setSearchInput(searchQuery);
    }
  }, [searchQuery]);

  // Ensure video plays when component mounts
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appState.current = nextState;
      setIsAppActive(nextState === 'active');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isAppActive) {
      timer = setTimeout(() => {
        videoRef.current?.playAsync().catch(() => {
          setVideoError(true);
          setVideoLoading(false);
        });
      }, 500);
    } else {
      videoRef.current?.pauseAsync().catch(() => {});
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAppActive]);

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

  const isInstantService = (value?: Service['instant_service']) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
    return value === 1;
  };

  const formatServiceForCart = (service: Service): CartService => {
    const imageUrl = service.image
      ? (service.image.startsWith('http')
        ? service.image
        : `${getBaseUrl().replace('/api', '')}${service.image}`)
      : undefined;
    return {
      id: service.id,
      name: service.name,
      price: service.deal_price || service.price || 0,
      image: imageUrl,
      subcategory_id: service.subcategory_id,
      instant_service: service.instant_service ?? 0,
    };
  };

  const handleAddService = (service: Service) => {
    addToCart(formatServiceForCart(service));
  };

  const handleIncrementService = (service: Service) => {
    incrementItem(service.id, formatServiceForCart(service));
  };

  const handleDecrementService = (serviceId: number) => {
    decrementItem(serviceId);
  };

  // Calculate cart totals
  const cartTotal = useMemo(() => {
    const itemCount = getTotalItems();
    const total = getTotalPrice(services);
    return { total, itemCount };
  }, [cart, services, getTotalItems, getTotalPrice]);

  const handleViewDetails = (service: Service) => {
    console.log('View details clicked for service:', service.name);
    setSelectedService(service);
    setExpandedFaqIndex(null); // Reset FAQ state when opening modal
    setShowDetailsModal(true);
    console.log('Modal should now be visible');
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

  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
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
        {isAppActive && videoLoading && !videoError && (
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.videoLoadingText}>Loading video...</Text>
          </View>
        )}
        
        {videoError || !isAppActive ? (
          <View style={styles.videoErrorContainer}>
            <Ionicons name="play-circle-outline" size={60} color="#8B5CF6" />
            <Text style={styles.videoErrorText}>
              {isAppActive ? 'Video not supported' : 'Video paused'}
            </Text>
            <Text style={styles.videoErrorSubtext}>
              {isAppActive ? 'Format not compatible with device' : 'Resume the app to continue'}
            </Text>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ 
              uri: subcategoryData?.video_title 
                ? `${getBaseUrl().replace('/api', '')}/uploads/subcategory_videos/${subcategoryData.video_title}`
                : `${getBaseUrl().replace('/api', '')}/uploads/subcategory_videos/electrical.mov`,
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
                      <View style={styles.serviceNameRow}>
                        <Text style={styles.serviceName} numberOfLines={2}>
                          {service.name}
                        </Text>
                        {isInstantService(service.instant_service) && (
                          <View style={styles.instantTag}>
                            <Text style={styles.instantTagText}>Instant</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Rating */}
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>
                          {(service.rating && typeof service.rating === 'number' && service.rating > 0) 
                            ? service.rating.toFixed(2) 
                            : '4.85'}
                        </Text>
                        <Text style={styles.reviewsText}>(138K reviews)</Text>
                      </View>
                      
                      {/* Price */}
                      <Text style={styles.priceText}>
                        Starts at ₹{service.price || '299'}
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
                      
                      {/* Add Button / Counter */}
                      {cart[service.id] ? (
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDecrementService(service.id);
                            }}
                          >
                            <Ionicons name="remove" size={16} color="#8B5CF6" />
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{cart[service.id]}</Text>
                          <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleIncrementService(service);
                            }}
                          >
                            <Ionicons name="add" size={16} color="#8B5CF6" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.addButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAddService(service);
                          }}
                        >
                          <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                      )}
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

      {/* Service Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDetailsModal(false);
          setExpandedFaqIndex(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDetailsModal(false);
            setExpandedFaqIndex(null);
          }}
        >
          {/* Close Button - Outside Modal */}
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => {
              setShowDetailsModal(false);
              setExpandedFaqIndex(null);
            }}
          >
            <View style={styles.modalCloseButtonCircle}>
              <Ionicons name="close" size={Math.max(20, Math.min(28, screenWidth * 0.06))} color="#000" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedService ? (
                <>
                  {/* Service Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderTop}>
                      <View style={styles.modalHeaderLeft}>
                        <View style={styles.modalServiceNameRow}>
                          <Text style={styles.modalServiceName}>{selectedService.name}</Text>
                          {isInstantService(selectedService.instant_service) && (
                            <View style={styles.modalInstantTag}>
                              <Text style={styles.modalInstantTagText}>Instant</Text>
                            </View>
                          )}
                        </View>
                        
                        {/* Rating */}
                        <View style={styles.modalRatingContainer}>
                          <Ionicons name="star" size={Math.max(14, Math.min(18, screenWidth * 0.04))} color="#FFD700" />
                          <Text style={styles.modalRatingText}>
                            {(selectedService.rating && typeof selectedService.rating === 'number' && selectedService.rating > 0) 
                              ? selectedService.rating.toFixed(2) 
                              : '4.84'}
                          </Text>
                          <Text style={styles.modalReviewsText}>(20K reviews)</Text>
                        </View>

                        {/* Price and Duration */}
                        <View style={styles.modalPriceRow}>
                          <Text style={styles.modalPriceText}>₹{selectedService.price || '239'}</Text>
                          <Text style={styles.modalDurationText}>• 30 mins</Text>
                        </View>
                      </View>

                      {/* Add Button / Counter - Top Right */}
                      {selectedService && cart[selectedService.id] ? (
                        <View style={styles.modalQuantityContainer}>
                          <TouchableOpacity 
                            style={styles.modalQuantityButton}
                            onPress={() => {
                              handleDecrementService(selectedService.id);
                            }}
                          >
                            <Ionicons name="remove" size={18} color="#8B5CF6" />
                          </TouchableOpacity>
                          <Text style={styles.modalQuantityText}>{cart[selectedService.id]}</Text>
                          <TouchableOpacity 
                            style={styles.modalQuantityButton}
                            onPress={() => {
                              handleIncrementService(selectedService);
                            }}
                          >
                            <Ionicons name="add" size={18} color="#8B5CF6" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.modalAddButton}
                          onPress={() => {
                            if (selectedService) {
                              handleAddService(selectedService);
                            }
                          }}
                        >
                          <Text style={styles.modalAddButtonText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.modalDivider} />

                  {/* Our Process Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Our process</Text>
                    
                    <View style={styles.processStepsContainer}>
                      {/* Step 1 */}
                      <View style={styles.processStep}>
                        <View style={styles.processStepNumberContainer}>
                          <Text style={styles.processStepNumber}>1</Text>
                          <View style={styles.processStepLine} />
                        </View>
                        <View style={styles.processStepContent}>
                          <Text style={styles.processStepTitle}>Inspection</Text>
                          <Text style={styles.processStepDescription}>
                            We will check the space where you want to install the switchbox
                          </Text>
                        </View>
                      </View>

                      {/* Step 2 */}
                      <View style={styles.processStep}>
                        <View style={styles.processStepNumberContainer}>
                          <Text style={styles.processStepNumber}>2</Text>
                          <View style={styles.processStepLine} />
                        </View>
                        <View style={styles.processStepContent}>
                          <Text style={styles.processStepTitle}>Installation</Text>
                          <Text style={styles.processStepDescription}>
                            We will install the switchbox with care
                          </Text>
                        </View>
                      </View>

                      {/* Step 3 */}
                      <View style={styles.processStep}>
                        <View style={styles.processStepNumberContainer}>
                          <Text style={styles.processStepNumber}>3</Text>
                          <View style={styles.processStepLine} />
                        </View>
                        <View style={styles.processStepContent}>
                          <Text style={styles.processStepTitle}>Cleanup</Text>
                          <Text style={styles.processStepDescription}>
                            We will clean the area once work is done
                          </Text>
                        </View>
                      </View>

                      {/* Step 4 */}
                      <View style={styles.processStep}>
                        <View style={styles.processStepNumberContainer}>
                          <Text style={styles.processStepNumber}>4</Text>
                          {/* No line for the last step */}
                        </View>
                        <View style={styles.processStepContent}>
                          <Text style={styles.processStepTitle}>Warranty activation</Text>
                          <Text style={styles.processStepDescription}>
                            The service is covered by a 30-day warranty for any issues after installation
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Please Note Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Please note</Text>
                    
                    <View style={styles.notesContainer}>
                      {/* Note 1 */}
                      <View style={styles.noteItem}>
                        <View style={styles.noteIconContainer}>
                          <Ionicons name="information-circle" size={Math.max(16, Math.min(20, screenWidth * 0.045))} color="#666" />
                        </View>
                        <Text style={styles.noteText}>
                          Provide a ladder, if required
                        </Text>
                      </View>

                      {/* Note 2 */}
                      <View style={styles.noteItem}>
                        <View style={styles.noteIconContainer}>
                          <Ionicons name="information-circle" size={Math.max(16, Math.min(20, screenWidth * 0.045))} color="#666" />
                        </View>
                        <Text style={styles.noteText}>
                          If spare parts are needed, the electrician will source them from the local market
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* FAQ Section */}
                  <View style={styles.faqSection}>
                    <Text style={styles.faqTitle}>Frequently asked questions</Text>
                    
                    {[
                      {
                        question: 'Does the cost include spare parts?',
                        answer: 'No, the amount you pay at booking is a visitation fee which will be adjusted in your final installation quote.'
                      },
                      {
                        question: 'What if any issue occurs during installation?',
                        answer: 'Our professionals are trained to handle any issues during installation. If something unexpected occurs, they will inform you immediately and provide solutions.'
                      },
                      {
                        question: 'What if anything gets damaged?',
                        answer: 'We take full responsibility for any damage caused during our service. All damages will be covered and repaired at no additional cost to you.'
                      },
                      {
                        question: 'Are spare parts covered under warranty?',
                        answer: 'Yes, all spare parts installed during the service are covered under our 30-day warranty for any manufacturing defects or installation issues.'
                      },
                      {
                        question: 'Will the electrician buy installation material (wire, nails, etc.)?',
                        answer: 'The electrician will assess the required materials during inspection and can purchase them from local markets. Material costs will be added to your final bill.'
                      }
                    ].map((faq, index) => (
                      <View key={index} style={styles.faqItem}>
                        <TouchableOpacity 
                          style={styles.faqQuestion}
                          onPress={() => toggleFaq(index)}
                        >
                          <Text style={styles.faqQuestionText}>{faq.question}</Text>
                          <Ionicons 
                            name={expandedFaqIndex === index ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#666" 
                          />
                        </TouchableOpacity>
                        {expandedFaqIndex === index && (
                          <Text style={styles.faqAnswer}>
                            {faq.answer}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Share Section */}
                  <View style={styles.shareSection}>
                    <Text style={styles.shareTitle}>Share this service with your loved ones</Text>
                    <TouchableOpacity style={styles.shareButton}>
                      <Text style={styles.shareButtonText}>Share</Text>
                      <Ionicons name="share-social-outline" size={18} color="#8B5CF6" style={styles.shareIcon} />
                    </TouchableOpacity>
                  </View>

                  {/* Rating Section */}
                  <View style={styles.ratingSection}>
                    <View style={styles.ratingHeader}>
                      <Ionicons name="star" size={24} color="#000" />
                      <Text style={styles.ratingScore}>4.84</Text>
                    </View>
                    <Text style={styles.ratingReviews}>20K reviews</Text>

                    {/* Rating Bars */}
                    <View style={styles.ratingBars}>
                      {/* 5 Stars */}
                      <View style={styles.ratingBar}>
                        <View style={styles.ratingBarLeft}>
                          <Ionicons name="star" size={14} color="#000" />
                          <Text style={styles.ratingBarLabel}>5</Text>
                        </View>
                        <View style={styles.ratingBarMiddle}>
                          <View style={[styles.ratingBarFill, { width: '95%' }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>19K</Text>
                      </View>

                      {/* 4 Stars */}
                      <View style={styles.ratingBar}>
                        <View style={styles.ratingBarLeft}>
                          <Ionicons name="star" size={14} color="#000" />
                          <Text style={styles.ratingBarLabel}>4</Text>
                        </View>
                        <View style={styles.ratingBarMiddle}>
                          <View style={[styles.ratingBarFill, { width: '2%' }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>440</Text>
                      </View>

                      {/* 3 Stars */}
                      <View style={styles.ratingBar}>
                        <View style={styles.ratingBarLeft}>
                          <Ionicons name="star" size={14} color="#000" />
                          <Text style={styles.ratingBarLabel}>3</Text>
                        </View>
                        <View style={styles.ratingBarMiddle}>
                          <View style={[styles.ratingBarFill, { width: '1%' }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>167</Text>
                      </View>

                      {/* 2 Stars */}
                      <View style={styles.ratingBar}>
                        <View style={styles.ratingBarLeft}>
                          <Ionicons name="star" size={14} color="#000" />
                          <Text style={styles.ratingBarLabel}>2</Text>
                        </View>
                        <View style={styles.ratingBarMiddle}>
                          <View style={[styles.ratingBarFill, { width: '1%' }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>113</Text>
                      </View>

                      {/* 1 Star */}
                      <View style={styles.ratingBar}>
                        <View style={styles.ratingBarLeft}>
                          <Ionicons name="star" size={14} color="#000" />
                          <Text style={styles.ratingBarLabel}>1</Text>
                        </View>
                        <View style={styles.ratingBarMiddle}>
                          <View style={[styles.ratingBarFill, { width: '2%' }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>392</Text>
                      </View>
                    </View>
                  </View>

                  {/* All Reviews Section */}
                  <View style={styles.allReviewsSection}>
                    <View style={styles.allReviewsHeader}>
                      <Text style={styles.allReviewsTitle}>All reviews</Text>
                      <TouchableOpacity>
                        <Text style={styles.filterButton}>Filter</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Filter Chips */}
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterChipsContainer}
                    >
                      <TouchableOpacity style={styles.filterChip}>
                        <Text style={styles.filterChipText}>Most detailed</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.filterChip}>
                        <Text style={styles.filterChipText}>In my area</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.filterChip}>
                        <Text style={styles.filterChipText}>Frequent users</Text>
                      </TouchableOpacity>
                    </ScrollView>

                    {/* Review Cards */}
                    <View style={styles.reviewsContainer}>
                      {/* Review 1 */}
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewerName}>Jitendra Dabhi</Text>
                          <View style={styles.reviewRatingBadge}>
                            <Ionicons name="star" size={12} color="#FFF" />
                            <Text style={styles.reviewRatingText}>5</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>Oct 23, 2025 • For new 15+ Amp Switch Box</Text>
                        <Text style={styles.reviewText}>
                          It was good and having good experience.{'\n'}
                          I am writing this review to commend the outstanding service provided by Aadil Mansuri, an electrician from Urban Company, who rec .... <Text style={styles.readMoreText}>read more</Text>
                        </Text>
                      </View>

                      {/* Review 2 */}
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewerName}>Suresh Thakur</Text>
                          <View style={[styles.reviewRatingBadge, styles.reviewRatingBadgeOrange]}>
                            <Ionicons name="star" size={12} color="#FFF" />
                            <Text style={styles.reviewRatingText}>2</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>Oct 23, 2025 • For new 15+ Amp Switch Box, At home consultation for major work</Text>
                        <Text style={styles.reviewText}>
                          First of all your app does not clearly explain everything, it is bit confusing, for changing a power socket of 15amp cost me Rs. 868, isn't too high, you have to provide a customer friendly service where both sa .... <Text style={styles.readMoreText}>read more</Text>
                        </Text>
                      </View>

                      {/* Review 3 */}
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewerName}>Vimal</Text>
                          <View style={styles.reviewRatingBadge}>
                            <Ionicons name="star" size={12} color="#FFF" />
                            <Text style={styles.reviewRatingText}>5</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>Oct 25, 2025 • For new 15+ Amp Switch Box, CCTV Installation(WiFi)</Text>
                        <Text style={styles.reviewText}>
                          Very good . Polite and knowledgeable. Highly recommended
                        </Text>
                      </View>

                      {/* Review 4 */}
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewerName}>Virendra Shah</Text>
                          <View style={styles.reviewRatingBadge}>
                            <Ionicons name="star" size={12} color="#FFF" />
                            <Text style={styles.reviewRatingText}>5</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>Oct 22, 2025 • For new 15+ Amp Switch Box, Internal Wiring (upto 6m), Wiring with casing (upto 5m), Door Bell Installation, One Switchboard (Install), Bulb Holder</Text>
                        <Text style={styles.reviewText} numberOfLines={3}>
                          Excellent service by the technician. Very professional and courteous. Would highly recommend.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Bottom Padding */}
                  <View style={styles.modalBottomPadding} />
                </>
              ) : (
                <View style={styles.modalHeader}>
                  <Text style={styles.modalServiceName}>Loading service details...</Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Cart Bar */}
      {cartTotal.itemCount > 0 && (
        <View style={styles.cartBottomBar}>
          <View style={styles.cartBottomLeft}>
            <Text style={styles.cartItemCount}>{cartTotal.itemCount} item{cartTotal.itemCount > 1 ? 's' : ''}</Text>
            <Text style={styles.cartTotal}>₹{cartTotal.total}</Text>
          </View>
          <TouchableOpacity style={styles.viewCartButton} onPress={() => router.push('/cart')}>
            <Text style={styles.viewCartButtonText}>View cart</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

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
    serviceNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSpacing(6, screenWidth),
      marginBottom: getResponsiveSpacing(4, screenWidth),
    },
    instantTag: {
      backgroundColor: '#FFE5B4',
      borderRadius: getResponsiveSpacing(8, screenWidth),
      paddingHorizontal: getResponsiveSpacing(8, screenWidth),
      paddingVertical: getResponsiveSpacing(2, screenWidth),
    },
    instantTagText: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      color: '#FF6B00',
      fontWeight: '600',
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
    // Modal Styles - Responsive Design
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      alignItems: 'stretch',
    },
    modalContainer: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: getResponsiveBorderRadius(
        isSmallScreen ? 16 : 
        isTabletScreen ? 24 : 
        isLargeTabletScreen ? 28 : 20, 
        screenWidth
      ),
      borderTopRightRadius: getResponsiveBorderRadius(
        isSmallScreen ? 16 : 
        isTabletScreen ? 24 : 
        isLargeTabletScreen ? 28 : 20, 
        screenWidth
      ),
      height: screenHeight * (isSmallScreen ? 0.85 : isTabletScreen ? 0.80 : 0.82),
      maxHeight: screenHeight * (isSmallScreen ? 0.85 : isTabletScreen ? 0.80 : 0.82),
      paddingTop: getResponsivePadding(
        isSmallScreen ? 12 : 
        isTabletScreen ? 16 : 
        isLargeTabletScreen ? 20 : 14, 
        screenWidth
      ),
      width: '100%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
    },
    modalCloseButton: {
      position: 'absolute',
      top: getResponsiveSpacing(
        isSmallScreen ? 40 : 
        isTabletScreen ? 50 : 
        isLargeTabletScreen ? 60 : 45, 
        screenWidth
      ),
      right: getResponsiveSpacing(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      zIndex: 1000,
    },
    modalCloseButtonCircle: {
      width: getResponsiveWidth(
        isSmallScreen ? 36 : 
        isTabletScreen ? 44 : 
        isLargeTabletScreen ? 52 : 40, 
        screenWidth
      ),
      height: getResponsiveWidth(
        isSmallScreen ? 36 : 
        isTabletScreen ? 44 : 
        isLargeTabletScreen ? 52 : 40, 
        screenWidth
      ),
      borderRadius: getResponsiveBorderRadius(
        isSmallScreen ? 18 : 
        isTabletScreen ? 22 : 
        isLargeTabletScreen ? 26 : 20, 
        screenWidth
      ),
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalScrollView: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    modalScrollContent: {
      flexGrow: 1,
      paddingBottom: getResponsiveSpacing(
        isSmallScreen ? 12 : 
        isTabletScreen ? 16 : 
        isLargeTabletScreen ? 20 : 14, 
        screenWidth
      ),
    },
    modalHeader: {
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      paddingTop: getResponsivePadding(
        isSmallScreen ? 6 : 
        isTabletScreen ? 8 : 
        isLargeTabletScreen ? 10 : 8, 
        screenWidth
      ),
      paddingBottom: getResponsivePadding(
        isSmallScreen ? 2 : 
        isTabletScreen ? 4 : 
        isLargeTabletScreen ? 6 : 2, 
        screenWidth
      ),
    },
    modalHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    modalHeaderLeft: {
      flex: 1,
      paddingRight: getResponsiveSpacing(12, screenWidth),
    },
    modalServiceName: {
      fontSize: getResponsiveFontSize(20, screenWidth),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveSpacing(4, screenWidth),
      lineHeight: getResponsiveFontSize(26, screenWidth),
    },
    modalServiceNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSpacing(8, screenWidth),
      marginBottom: getResponsiveSpacing(4, screenWidth),
    },
    modalInstantTag: {
      backgroundColor: '#FFE5B4',
      borderRadius: getResponsiveSpacing(10, screenWidth),
      paddingHorizontal: getResponsiveSpacing(10, screenWidth),
      paddingVertical: getResponsiveSpacing(2, screenWidth),
    },
    modalInstantTagText: {
      fontSize: getResponsiveFontSize(13, screenWidth),
      color: '#FF6B00',
      fontWeight: '600',
    },
    modalRatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(4, screenWidth),
    },
    modalRatingText: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      fontWeight: '500',
      color: '#000',
      marginLeft: getResponsiveSpacing(3, screenWidth),
    },
    modalReviewsText: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      color: '#666',
      marginLeft: getResponsiveSpacing(3, screenWidth),
    },
    modalPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSpacing(4, screenWidth),
    },
    modalPriceText: {
      fontSize: getResponsiveFontSize(15, screenWidth),
      fontWeight: '700',
      color: '#000',
    },
    modalDurationText: {
      fontSize: getResponsiveFontSize(15, screenWidth),
      color: '#666',
    },
    modalAddButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveBorderRadius(6, screenWidth),
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 24 : 
        isLargeTabletScreen ? 28 : 20, 
        screenWidth
      ),
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 5 : 
        isTabletScreen ? 7 : 
        isLargeTabletScreen ? 9 : 6, 
        screenWidth
      ),
      alignSelf: 'flex-start',
    },
    modalAddButtonText: {
      fontSize: getResponsiveFontSize(13, screenWidth),
      color: '#8B5CF6',
      fontWeight: '600',
    },
    modalDivider: {
      height: 1,
      backgroundColor: '#E0E0E0',
      marginVertical: getResponsiveSpacing(
        isSmallScreen ? 12 : 
        isTabletScreen ? 14 : 
        isLargeTabletScreen ? 16 : 12, 
        screenWidth
      ),
    },
    modalSection: {
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      marginBottom: getResponsiveMargin(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
    },
    modalSectionTitle: {
      fontSize: getResponsiveFontSize(22, screenWidth),
      fontWeight: '700',
      color: '#000',
      marginBottom: getResponsiveSpacing(
        isSmallScreen ? 12 : 
        isTabletScreen ? 14 : 
        isLargeTabletScreen ? 16 : 12, 
        screenWidth
      ),
    },
    processStepsContainer: {
      // No gap needed - we'll handle spacing with paddingBottom
    },
    processStep: {
      flexDirection: 'row',
    },
    processStepNumberContainer: {
      alignItems: 'flex-start',
      marginRight: getResponsiveSpacing(
        isSmallScreen ? 20 : 
        isTabletScreen ? 28 : 
        isLargeTabletScreen ? 32 : 24, 
        screenWidth
      ),
      position: 'relative',
    },
    processStepLine: {
      position: 'absolute',
      left: getResponsiveWidth(
        isSmallScreen ? 13 : 
        isTabletScreen ? 16 : 
        isLargeTabletScreen ? 18 : 15, 
        screenWidth
      ),
      top: getResponsiveSpacing(
        isSmallScreen ? 28 : 
        isTabletScreen ? 34 : 
        isLargeTabletScreen ? 38 : 32, 
        screenWidth
      ),
      bottom: 0,
      width: 2,
      backgroundColor: '#ece7e7ff',
    },
    processStepNumber: {
      fontSize: getResponsiveFontSize(16, screenWidth),
      fontWeight: '500',
      color: '#000',
      backgroundColor: '#ece7e7ff',
      width: getResponsiveWidth(
        isSmallScreen ? 28 : 
        isTabletScreen ? 34 : 
        isLargeTabletScreen ? 38 : 32, 
        screenWidth
      ),
      height: getResponsiveWidth(
        isSmallScreen ? 28 : 
        isTabletScreen ? 34 : 
        isLargeTabletScreen ? 38 : 32, 
        screenWidth
      ),
      borderRadius: getResponsiveBorderRadius(
        isSmallScreen ? 14 : 
        isTabletScreen ? 17 : 
        isLargeTabletScreen ? 19 : 16, 
        screenWidth
      ),
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: getResponsiveWidth(
        isSmallScreen ? 28 : 
        isTabletScreen ? 34 : 
        isLargeTabletScreen ? 38 : 32, 
        screenWidth
      ),
    },
    processStepContent: {
      flex: 1,
    },
    processStepTitle: {
      fontSize: getResponsiveFontSize(17, screenWidth),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(22, screenWidth),
      marginBottom: getResponsiveSpacing(2, screenWidth),
    },
    processStepDescription: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#666',
      lineHeight: getResponsiveFontSize(19, screenWidth),
      marginBottom: getResponsiveSpacing(0, screenWidth),
    },
    notesContainer: {
      gap: getResponsiveSpacing(
        isSmallScreen ? 12 : 
        isTabletScreen ? 14 : 
        isLargeTabletScreen ? 16 : 12, 
        screenWidth
      ),
    },
    noteItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    noteIconContainer: {
      width: getResponsiveWidth(
        isSmallScreen ? 24 : 
        isTabletScreen ? 28 : 
        isLargeTabletScreen ? 32 : 26, 
        screenWidth
      ),
      height: getResponsiveWidth(
        isSmallScreen ? 24 : 
        isTabletScreen ? 28 : 
        isLargeTabletScreen ? 32 : 26, 
        screenWidth
      ),
      borderRadius: getResponsiveBorderRadius(
        isSmallScreen ? 12 : 
        isTabletScreen ? 14 : 
        isLargeTabletScreen ? 16 : 13, 
        screenWidth
      ),
      backgroundColor: '#E8E8E8',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getResponsiveSpacing(10, screenWidth),
      marginTop: getResponsiveSpacing(0, screenWidth),
    },
    noteText: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#333',
      lineHeight: getResponsiveFontSize(20, screenWidth),
      flex: 1,
    },
    modalBottomPadding: {
      height: getResponsiveSpacing(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
    },
    // FAQ Section Styles
    faqSection: {
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      marginBottom: getResponsiveMargin(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
    },
    faqTitle: {
      fontSize: getResponsiveFontSize(18, screenWidth),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveSpacing(16, screenWidth),
    },
    faqItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 12 : 
        isTabletScreen ? 14 : 
        isLargeTabletScreen ? 16 : 12, 
        screenWidth
      ),
    },
    faqQuestion: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faqQuestionText: {
      fontSize: getResponsiveFontSize(15, screenWidth),
      fontWeight: '500',
      color: '#000',
      flex: 1,
      paddingRight: getResponsiveSpacing(12, screenWidth),
      lineHeight: getResponsiveFontSize(20, screenWidth),
    },
    faqAnswer: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#666',
      lineHeight: getResponsiveFontSize(20, screenWidth),
      marginTop: getResponsiveSpacing(8, screenWidth),
    },
    // Share Section Styles
    shareSection: {
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      marginBottom: getResponsiveMargin(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      alignItems: 'center',
    },
    shareTitle: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#666',
      textAlign: 'center',
      marginBottom: getResponsiveSpacing(12, screenWidth),
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 10 : 
        isTabletScreen ? 12 : 
        isLargeTabletScreen ? 14 : 10, 
        screenWidth
      ),
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 20 : 
        isTabletScreen ? 28 : 
        isLargeTabletScreen ? 32 : 24, 
        screenWidth
      ),
      borderWidth: 1.5,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveBorderRadius(8, screenWidth),
      backgroundColor: '#FFFFFF',
      minWidth: getResponsiveWidth(
        isSmallScreen ? 120 : 
        isTabletScreen ? 140 : 
        isLargeTabletScreen ? 160 : 130, 
        screenWidth
      ),
    },
    shareButtonText: {
      fontSize: getResponsiveFontSize(15, screenWidth),
      color: '#8B5CF6',
      fontWeight: '600',
      marginRight: getResponsiveSpacing(8, screenWidth),
    },
    shareIcon: {
      marginTop: getResponsiveSpacing(2, screenWidth),
    },
    // Rating Section Styles
    ratingSection: {
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      marginBottom: getResponsiveMargin(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
    },
    ratingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(4, screenWidth),
    },
    ratingScore: {
      fontSize: getResponsiveFontSize(32, screenWidth),
      fontWeight: '700',
      color: '#000',
      marginLeft: getResponsiveSpacing(8, screenWidth),
    },
    ratingReviews: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#666',
      marginBottom: getResponsiveSpacing(16, screenWidth),
    },
    ratingBars: {
      gap: getResponsiveSpacing(8, screenWidth),
    },
    ratingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSpacing(8, screenWidth),
    },
    ratingBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      width: getResponsiveWidth(
        isSmallScreen ? 32 : 
        isTabletScreen ? 38 : 
        isLargeTabletScreen ? 42 : 36, 
        screenWidth
      ),
    },
    ratingBarLabel: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#000',
      marginLeft: getResponsiveSpacing(4, screenWidth),
      fontWeight: '500',
    },
    ratingBarMiddle: {
      flex: 1,
      height: getResponsiveSpacing(6, screenWidth),
      backgroundColor: '#E0E0E0',
      borderRadius: getResponsiveBorderRadius(3, screenWidth),
      overflow: 'hidden',
    },
    ratingBarFill: {
      height: '100%',
      backgroundColor: '#000',
      borderRadius: getResponsiveBorderRadius(3, screenWidth),
    },
    ratingBarCount: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#666',
      width: getResponsiveWidth(
        isSmallScreen ? 40 : 
        isTabletScreen ? 48 : 
        isLargeTabletScreen ? 52 : 44, 
        screenWidth
      ),
      textAlign: 'right',
    },
    // All Reviews Section Styles
    allReviewsSection: {
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      marginBottom: getResponsiveMargin(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
    },
    allReviewsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(16, screenWidth),
    },
    allReviewsTitle: {
      fontSize: getResponsiveFontSize(20, screenWidth),
      fontWeight: '700',
      color: '#000',
    },
    filterButton: {
      fontSize: getResponsiveFontSize(15, screenWidth),
      color: '#8B5CF6',
      fontWeight: '600',
    },
    filterChipsContainer: {
      marginBottom: getResponsiveSpacing(16, screenWidth),
    },
    filterChip: {
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 14 : 
        isTabletScreen ? 18 : 
        isLargeTabletScreen ? 20 : 16, 
        screenWidth
      ),
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 8 : 
        isTabletScreen ? 10 : 
        isLargeTabletScreen ? 12 : 9, 
        screenWidth
      ),
      borderWidth: 1,
      borderColor: '#D0D0D0',
      borderRadius: getResponsiveBorderRadius(8, screenWidth),
      marginRight: getResponsiveSpacing(10, screenWidth),
      backgroundColor: '#FFFFFF',
    },
    filterChipText: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      color: '#666',
      fontWeight: '500',
    },
    reviewsContainer: {
      gap: getResponsiveSpacing(16, screenWidth),
    },
    reviewCard: {
      paddingBottom: getResponsivePadding(16, screenWidth),
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(6, screenWidth),
    },
    reviewerName: {
      fontSize: getResponsiveFontSize(16, screenWidth),
      fontWeight: '600',
      color: '#000',
      flex: 1,
    },
    reviewRatingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0A9F50',
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 6 : 
        isTabletScreen ? 8 : 
        isLargeTabletScreen ? 10 : 7, 
        screenWidth
      ),
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 3 : 
        isTabletScreen ? 4 : 
        isLargeTabletScreen ? 5 : 4, 
        screenWidth
      ),
      borderRadius: getResponsiveBorderRadius(4, screenWidth),
      gap: getResponsiveSpacing(3, screenWidth),
    },
    reviewRatingBadgeOrange: {
      backgroundColor: '#FF6B35',
    },
    reviewRatingText: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      color: '#FFFFFF',
      fontWeight: '600',
    },
    reviewDate: {
      fontSize: getResponsiveFontSize(13, screenWidth),
      color: '#666',
      marginBottom: getResponsiveSpacing(8, screenWidth),
      lineHeight: getResponsiveFontSize(18, screenWidth),
    },
    reviewText: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#333',
      lineHeight: getResponsiveFontSize(20, screenWidth),
    },
    readMoreText: {
      color: '#8B5CF6',
      fontWeight: '600',
    },
    // Quantity Controls Styles
    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveBorderRadius(6, screenWidth),
      marginBottom: getResponsiveMargin(4, screenWidth),
      marginTop: -30,
    },
    quantityButton: {
      padding: getResponsivePadding(
        isSmallScreen ? 3 : 
        isTabletScreen ? 6 : 
        isLargeTabletScreen ? 8 : 4, 
        screenWidth
      ),
    },
    quantityText: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      color: '#8B5CF6',
      fontWeight: '600',
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 6 : 
        isTabletScreen ? 12 : 
        isLargeTabletScreen ? 16 : 8, 
        screenWidth
      ),
    },
    // Modal Quantity Controls Styles
    modalQuantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveBorderRadius(6, screenWidth),
    },
    modalQuantityButton: {
      padding: getResponsivePadding(
        isSmallScreen ? 5 : 
        isTabletScreen ? 7 : 
        isLargeTabletScreen ? 9 : 6, 
        screenWidth
      ),
    },
    modalQuantityText: {
      fontSize: getResponsiveFontSize(13, screenWidth),
      color: '#8B5CF6',
      fontWeight: '600',
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 24 : 
        isLargeTabletScreen ? 28 : 20, 
        screenWidth
      ),
    },
    // Cart Bottom Bar Styles
    cartBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 12 : 
        isTabletScreen ? 16 : 
        isLargeTabletScreen ? 20 : 14, 
        screenWidth
      ),
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 10 : 
        isTabletScreen ? 12 : 
        isLargeTabletScreen ? 14 : 11, 
        screenWidth
      ),
      borderTopWidth: 1,
      borderTopColor: '#E0E0E0',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
    },
    cartBottomLeft: {
      flex: 1,
    },
    cartItemCount: {
      fontSize: getResponsiveFontSize(11, screenWidth),
      color: '#666',
      fontWeight: '500',
      marginBottom: getResponsiveSpacing(2, screenWidth),
    },
    cartTotal: {
      fontSize: getResponsiveFontSize(16, screenWidth),
      color: '#000',
      fontWeight: '700',
    },
    viewCartButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#8B5CF6',
      paddingHorizontal: getResponsivePadding(
        isSmallScreen ? 16 : 
        isTabletScreen ? 20 : 
        isLargeTabletScreen ? 24 : 18, 
        screenWidth
      ),
      paddingVertical: getResponsivePadding(
        isSmallScreen ? 9 : 
        isTabletScreen ? 11 : 
        isLargeTabletScreen ? 13 : 10, 
        screenWidth
      ),
      borderRadius: getResponsiveBorderRadius(8, screenWidth),
      gap: getResponsiveSpacing(6, screenWidth),
    },
    viewCartButtonText: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
};
