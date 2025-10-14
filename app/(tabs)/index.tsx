import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from 'react-native';

interface CategoryItem {
  id: number;
  name: string;
  image?: string;
}

interface Banner {
  id: number;
  title: string;
  sub_title?: string;
  image: string;
}

export default function HomeScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  
  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);
  
  // State for search input
  const [serviceInput, setServiceInput] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState("Search for 'Facial'");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  // State and ref for banner auto-scroll
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const [banners, setBanners] = useState<Banner[]>([]);

  // State for most booked services
  const [mostBookedServices, setMostBookedServices] = useState<any[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // State for top offers
  const [topOffers, setTopOffers] = useState<any[]>([]);
  const [offerImageErrors, setOfferImageErrors] = useState<Set<number>>(new Set());

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.CATEGORIES);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const categoryNames = data.data.map((cat: any) => cat.title);
          const items: CategoryItem[] = data.data.map((cat: any) => ({
            id: cat.id,
            name: cat.title,
            image: cat.image
          }));
          setCategories(categoryNames);
          setCategoryItems(items.slice(0, 9)); // Get first 9 categories
          if (categoryNames.length > 0) {
            setCurrentPlaceholder(`Search for '${categoryNames[0]}'`);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.BANNERS);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setBanners(data.data);
        }
      } catch (error) {
        console.error('Error fetching banners:', error);
      }
    };
    fetchBanners();
  }, []);

  // Fetch subcategories for most booked services
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.SUBCATEGORIES);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Create most booked services from subcategories data
          const mostBookedData = data.data.slice(0, 6).map((subcat: any, index: number) => {
            const imageUrl = `${getBaseUrl().replace('/api', '')}/uploads/subcategorys/${subcat.image}`;
            return {
              id: subcat.id,
              title: subcat.name,
              rating: (4.5 + Math.random() * 0.5).toFixed(2), // Random rating between 4.5-5.0
              price: Math.floor(200 + Math.random() * 800), // Random price between 200-1000
              originalPrice: Math.random() > 0.5 ? Math.floor(300 + Math.random() * 500) : null,
              image: subcat.image,
              imageUrl: imageUrl,
              isInstant: Math.random() > 0.5, // Random instant availability
            };
          });
          setMostBookedServices(mostBookedData);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    };
    fetchSubcategories();
  }, []);

  // Set static top offers data
  useEffect(() => {
    const staticTopOffers = [
      {
        id: 1001,
        title: 'Deep Tissue Massage',
        rating: '4.8',
        price: 499,
        originalPrice: 999,
        discount: 50,
        image: null,
        imageUrl: 'https://source.unsplash.com/featured/800x600?massage,therapy',
        isLimitedTime: true,
      },
      {
        id: 1002,
        title: 'Hair Spa & Treatment',
        rating: '4.7',
        price: 699,
        originalPrice: 1199,
        discount: 42,
        image: null,
        imageUrl: 'https://source.unsplash.com/featured/800x600?hair,salon',
        isLimitedTime: true,
      },
      {
        id: 1003,
        title: 'Full Body Waxing',
        rating: '4.9',
        price: 799,
        originalPrice: 1299,
        discount: 38,
        image: null,
        imageUrl: 'https://source.unsplash.com/featured/800x600?waxing,spa',
        isLimitedTime: false,
      },
      {
        id: 1004,
        title: 'Bridal Makeup Package',
        rating: '4.6',
        price: 2499,
        originalPrice: 4999,
        discount: 50,
        image: null,
        imageUrl: 'https://source.unsplash.com/featured/800x600?bridal,makeup',
        isLimitedTime: true,
      },
      {
        id: 1005,
        title: 'AC Repair & Service',
        rating: '4.5',
        price: 399,
        originalPrice: 799,
        discount: 50,
        image: null,
        imageUrl: 'https://source.unsplash.com/featured/800x600?airconditioner,repair',
        isLimitedTime: false,
      },
      {
        id: 1006,
        title: 'Home Cleaning (3BHK)',
        rating: '4.7',
        price: 899,
        originalPrice: 1499,
        discount: 40,
        image: null,
        imageUrl: 'https://source.unsplash.com/featured/800x600?home,cleaning',
        isLimitedTime: true,
      },
    ];
    setTopOffers(staticTopOffers);
  }, []);

  // Rotate placeholder every 5 seconds
  useEffect(() => {
    if (categories.length === 0) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % categories.length;
        setCurrentPlaceholder(`Search for '${categories[nextIndex]}'`);
        return nextIndex;
      });
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [categories]);

  // Auto-scroll banners every 2 seconds
  useEffect(() => {
    if (banners.length === 0) return;
    
    const bannerWidth = screenWidth - 32; // Banner width
    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        
        // Scroll to the next banner
        if (bannerScrollRef.current) {
          bannerScrollRef.current.scrollTo({
            x: nextIndex * (bannerWidth + 16), // banner width + marginRight
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, 2000); // 2 seconds

    return () => clearInterval(interval);
  }, [screenWidth, banners.length]);

  const handleOutsideTouch = () => {
    // Handle any modal dismissals if needed
  };

  const handleServiceInputChange = (text: string) => {
    setServiceInput(text);
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
        {/* Header */}
        <View style={styles.headerContainer}>
          <Image
            source={require('@/assets/images/OriginX.png')}
            style={styles.mainlogo}
            contentFit="contain"
          />
          <TouchableOpacity style={styles.cartIconContainer}>
            <Ionicons name="cart-outline" size={30} color="#000" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Fixed Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={currentPlaceholder}
            placeholderTextColor="#999"
            value={serviceInput}
            onChangeText={handleServiceInputChange}
          />
        </View>

        <ScrollView 
          style={styles.mainScrollView} 
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="normal"
          bounces={true}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Service Filter Buttons */}
          <View style={styles.filterButtonsContainer}>
            <TouchableOpacity style={styles.filterButtonActive}>
              <Text style={styles.filterButtonTextActive}>All services</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButtonInactive}>
              <Ionicons name="flash" size={16} color="#666" />
              <Text style={styles.filterButtonTextInactive}>Instant</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Service Categories Grid */}
          <View style={styles.servicesGrid}>
            {categoryItems.length > 0 ? (
              <>
                {/* Row 1 */}
                <View style={styles.serviceRow}>
                  {categoryItems.slice(0, 3).map((item, index) => (
                    <TouchableOpacity key={item.id} style={styles.serviceCard}>
                      <View style={styles.serviceIconContainer}>
                        {item.image ? (
                          <Image
                            source={{ uri: `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}` }}
                            style={styles.serviceImage}
                            contentFit="contain"
                            onError={(error) => {
                              console.log('Image load error for:', `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}`);
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}`);
                            }}
                          />
                        ) : (
                          <Text style={styles.serviceEmoji}>📦</Text>
                        )}
                      </View>
                      <Text style={styles.serviceLabel}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {categoryItems.length < 3 && Array.from({ length: 3 - categoryItems.slice(0, 3).length }).map((_, i) => (
                    <View key={`empty-0-${i}`} style={styles.serviceCard} />
                  ))}
                </View>

                {/* Row 2 */}
                <View style={styles.serviceRow}>
                  {categoryItems.slice(3, 6).map((item, index) => (
                    <TouchableOpacity key={item.id} style={styles.serviceCard}>
                      <View style={styles.serviceIconContainer}>
                        {item.image ? (
                          <Image
                            source={{ uri: `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}` }}
                            style={styles.serviceImage}
                            contentFit="contain"
                            onError={(error) => {
                              console.log('Image load error for:', `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}`);
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}`);
                            }}
                          />
                        ) : (
                          <Text style={styles.serviceEmoji}>📦</Text>
                        )}
                      </View>
                      <Text style={styles.serviceLabel}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {categoryItems.length < 6 && Array.from({ length: 6 - categoryItems.slice(3, 6).length }).map((_, i) => (
                    <View key={`empty-1-${i}`} style={styles.serviceCard} />
                  ))}
                </View>

                {/* Row 3 */}
                <View style={styles.serviceRow}>
                  {categoryItems.slice(6, 9).map((item, index) => (
                    <TouchableOpacity key={item.id} style={styles.serviceCard}>
                      <View style={styles.serviceIconContainer}>
                        {item.image ? (
                          <Image
                            source={{ uri: `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}` }}
                            style={styles.serviceImage}
                            contentFit="contain"
                            onError={(error) => {
                              console.log('Image load error for:', `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}`);
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', `${getBaseUrl().replace('/api', '')}/uploads/categorys/${item.image}`);
                            }}
                          />
                        ) : (
                          <Text style={styles.serviceEmoji}>📦</Text>
                        )}
                      </View>
                      <Text style={styles.serviceLabel}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {categoryItems.length < 9 && Array.from({ length: 9 - categoryItems.slice(6, 9).length }).map((_, i) => (
                    <View key={`empty-2-${i}`} style={styles.serviceCard} />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <Text>Loading services...</Text>
              </View>
            )}
          </View>

          {/* Promotional Banners */}
          <View style={styles.bannersContainer}>
            <ScrollView 
              ref={bannerScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false} 
              pagingEnabled
              snapToInterval={screenWidth - 32}
              decelerationRate="fast"
              scrollEventThrottle={16}
              removeClippedSubviews={true}
              style={styles.bannersScroll}
            >
              {banners.length > 0 ? (
                banners.map((banner, index) => (
                  <View key={banner.id} style={[styles.bannerCard, { width: screenWidth - 32 }]}>
                    <View style={styles.bannerContent}>
                      <Text style={styles.bannerTitle}>{banner.title}</Text>
                      {banner.sub_title && (
                        <Text style={styles.bannerSubtitle}>{banner.sub_title}</Text>
                      )}
                      <TouchableOpacity style={styles.bannerButton}>
                        <Text style={styles.bannerButtonText}>Book now</Text>
                      </TouchableOpacity>
                    </View>
                    {banner.image && (
                      <Image
                        source={{ uri: `${getBaseUrl().replace('/api', '')}/uploads/banners/${banner.image}` }}
                        style={styles.bannerImage}
                        contentFit="cover"
                        onError={(error) => {
                          console.log('Banner image load error:', banner.title, error);
                        }}
                        onLoad={() => {
                          console.log('Banner image loaded:', banner.title);
                        }}
                      />
                    )}
                  </View>
                ))
              ) : (
                <View style={[styles.bannerCard, { width: screenWidth - 32 }]}>
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>Loading banners...</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Most Booked Services */}
          <View style={styles.mostBookedContainer}>
            <Text style={styles.sectionTitle}>Most booked services</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
              decelerationRate="normal"
              style={styles.servicesScroll}
              contentContainerStyle={styles.servicesScrollContent}
            >
              {mostBookedServices.map((service, index) => (
                <TouchableOpacity key={service.id} style={styles.mostBookedServiceCard}>
                  <View style={styles.serviceImageContainer}>
                    {service.image && !imageErrors.has(service.id) ? (
                      <Image
                        source={{ uri: service.imageUrl }}
                        style={styles.mostBookedServiceImage}
                        contentFit="cover"
                        onError={(error) => {
                          console.log('Image load error for:', service.title, error);
                          setImageErrors(prev => new Set(prev).add(service.id));
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully for:', service.title);
                        }}
                      />
                    ) : (
                      <View style={styles.serviceImagePlaceholder}>
                        <Text style={styles.mostBookedEmoji}>
                          {service.title.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>
                      {service.title}
                    </Text>
                    <View style={styles.serviceRating}>
                      <Text style={styles.ratingText}>★ {service.rating}</Text>
                    </View>
                    {service.isInstant && (
                      <View style={styles.instantBadge}>
                        <Text style={styles.instantText}>⚡ Instant</Text>
                      </View>
                    )}
                    <View style={styles.priceContainer}>
                      <Text style={styles.currentPrice}>₹{service.price}</Text>
                      {service.originalPrice && (
                        <Text style={styles.originalPrice}>₹{service.originalPrice}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Top Offers */}
          <View style={styles.topOffersContainer}>
            <Text style={styles.sectionTitle}>Top Offers</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
              decelerationRate="normal"
              style={styles.servicesScroll}
              contentContainerStyle={styles.servicesScrollContent}
            >
              {topOffers.map((offer, index) => (
                <TouchableOpacity key={offer.id} style={styles.topOfferCard}>
                  <View style={styles.serviceImageContainer}>
                    {offer.discount && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{offer.discount}% OFF</Text>
                      </View>
                    )}
                    {offer.imageUrl && !offerImageErrors.has(offer.id) ? (
                      <Image
                        source={{ uri: offer.imageUrl }}
                        style={styles.mostBookedServiceImage}
                        contentFit="cover"
                        onError={(error) => {
                          console.log('Image load error for offer:', offer.title, error);
                          setOfferImageErrors(prev => new Set(prev).add(offer.id));
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully for offer:', offer.title);
                        }}
                      />
                    ) : (
                      <View style={styles.serviceImagePlaceholder}>
                        <Text style={styles.mostBookedEmoji}>
                          {offer.title.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>
                      {offer.title}
                    </Text>
                    <View style={styles.serviceRating}>
                      <Text style={styles.ratingText}>★ {offer.rating}</Text>
                    </View>
                    {offer.isLimitedTime && (
                      <View style={styles.limitedTimeBadge}>
                        <Text style={styles.limitedTimeText}>⏰ Limited Time</Text>
                      </View>
                    )}
                    <View style={styles.priceContainer}>
                      <Text style={styles.currentPrice}>₹{offer.price}</Text>
                      {offer.originalPrice && (
                        <Text style={styles.originalPrice}>₹{offer.originalPrice}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="home" size={26} color="#00BFFF" />
            <Text style={styles.navLabelActive}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="navigate-outline" size={26} color="#999" />
            <Text style={styles.navLabel}>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="list-outline" size={26} color="#999" />
            <Text style={styles.navLabel}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="call-outline" size={26} color="#999" />
            <Text style={styles.navLabel}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="person-outline" size={26} color="#999" />
            <Text style={styles.navLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (screenHeight: number, screenWidth: number) => {
  // Helper function to get responsive values based on screen height with min/max constraints
  const getResponsiveValue = (baseValue: number, screenHeight: number, minValue?: number, maxValue?: number) => {
    const baseHeight = 800;
    const scaledValue = (baseValue * screenHeight) / baseHeight;
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  // Helper function to get responsive values based on screen width with min/max constraints
  const getResponsiveWidth = (baseValue: number, screenWidth: number, minValue?: number, maxValue?: number) => {
    const baseWidth = 400;
    const scaledValue = (baseValue * screenWidth) / baseWidth;
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  // Helper function to get responsive font sizes
  const getResponsiveFontSize = (baseSize: number, screenWidth: number) => {
    const baseWidth = 400;
    return Math.max(12, Math.min(24, (baseSize * screenWidth) / baseWidth));
  };

  // Helper function to get responsive padding/margins
  const getResponsiveSpacing = (baseSpacing: number, screenWidth: number) => {
    const baseWidth = 400;
    return Math.max(4, (baseSpacing * screenWidth) / baseWidth);
  };

  // Device type detection
  const isSmallScreen = screenWidth < 350;
  const isMediumScreen = screenWidth >= 350 && screenWidth < 400;
  const isLargeScreen = screenWidth >= 400;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveWidth(16, screenWidth),
      paddingTop: getResponsiveValue(30, screenHeight),
      paddingBottom: getResponsiveValue(3, screenHeight),
      backgroundColor: '#A1CEDC',
    },
    mainlogo: {
      height: getResponsiveValue(50, screenHeight, 40, 60),
      width: getResponsiveWidth(180, screenWidth, 150, 220),
    },
    cartIconContainer: {
      position: 'relative',
      padding: 4,
    },
    cartBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: '#FF3B30',
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    cartBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    mainScrollView: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(12, screenWidth),
      marginHorizontal: getResponsiveSpacing(16, screenWidth),
      marginTop: getResponsiveSpacing(8, screenWidth),
      marginBottom: getResponsiveSpacing(12, screenWidth),
      paddingHorizontal: getResponsiveSpacing(12, screenWidth),
      height: getResponsiveValue(48, screenHeight, 40, 56),
      borderWidth: 1,
      borderColor: '#E0E0E0',
      zIndex: 10,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#000',
    },
    filterButtonsContainer: {
      flexDirection: 'row',
      paddingHorizontal: getResponsiveSpacing(16, screenWidth),
      marginBottom: getResponsiveSpacing(16, screenWidth),
      gap: getResponsiveSpacing(12, screenWidth),
    },
    filterButtonActive: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#000',
      borderWidth: 1,
      borderColor: '#000',
    },
    filterButtonTextActive: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    filterButtonInactive: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      gap: 6,
    },
    filterButtonTextInactive: {
      color: '#666',
      fontSize: 14,
      fontWeight: '500',
    },
    newBadge: {
      backgroundColor: '#D91656',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 4,
    },
    newBadgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
    },
    servicesGrid: {
      paddingHorizontal: 6,
      paddingBottom: 6,
    },
    serviceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    serviceCard: {
      flex: 1,
      marginHorizontal: getResponsiveSpacing(-3, screenWidth),
      marginVertical: getResponsiveSpacing(-3, screenWidth),
      alignItems: 'center',
      padding: 0,
    },
    serviceIconContainer: {
      width: '100%',
      aspectRatio: 1.5,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 0,
      position: 'relative',
    },
    serviceIconWithBadge: {
      position: 'relative',
    },
    serviceEmoji: {
      fontSize: 32,
    },
    serviceImage: {
      width: '95%',
      height: '95%',
      borderRadius: 10,
    },
    serviceLabel: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      textAlign: 'center',
      fontWeight: '500',
      lineHeight: getResponsiveFontSize(14, screenWidth),
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saleBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: '#22C55E',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    saleBadgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
    },
    bannersContainer: {
      marginTop: 8,
      marginBottom: 16,
    },
    bannersScroll: {
      paddingLeft: 16,
    },
    bannerCard: {
      height: getResponsiveValue(180, screenHeight, 150, 220),
      backgroundColor: '#E8D5D5',
      borderRadius: getResponsiveSpacing(16, screenWidth),
      marginRight: getResponsiveSpacing(16, screenWidth),
      overflow: 'hidden',
      flexDirection: 'row',
    },
    bannerCardTeal: {
      backgroundColor: '#006666',
    },
    bannerCardBlue: {
      backgroundColor: '#1E40AF',
    },
    bannerCardOrange: {
      backgroundColor: '#FED7AA',
    },
    bannerCardPurple: {
      backgroundColor: '#7C3AED',
    },
    bannerContent: {
      flex: 1,
      padding: 20,
      justifyContent: 'space-between',
    },
    bannerTitle: {
      fontSize: getResponsiveFontSize(20, screenWidth),
      fontWeight: '700',
      color: '#000',
      lineHeight: getResponsiveFontSize(26, screenWidth),
    },
    bannerTitleWhite: {
      color: '#FFF',
    },
    bannerSubtitle: {
      fontSize: 12,
      color: '#666',
      marginTop: 8,
    },
    bannerSubtitleWhite: {
      color: '#E5E5E5',
    },
    bannerButton: {
      backgroundColor: '#000',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    bannerButtonWhite: {
      backgroundColor: '#FFF',
    },
    bannerButtonText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },
    bannerButtonTextDark: {
      color: '#000',
    },
    bannerImage: {
      width: 140,
      height: '100%',
      backgroundColor: '#C99A9A',
    },
    bannerImagePlaceholder: {
      width: 140,
      backgroundColor: '#C99A9A',
    },
    bannerImageBlue: {
      backgroundColor: '#1E3A8A',
    },
    bannerImageOrange: {
      backgroundColor: '#FB923C',
    },
    bannerImagePurple: {
      backgroundColor: '#5B21B6',
    },
    mostBookedContainer: {
      marginTop: 8,
      marginBottom: 0,
    },
    sectionTitle: {
      fontSize: getResponsiveFontSize(18, screenWidth),
      fontWeight: '700',
      color: '#000',
      marginBottom: getResponsiveSpacing(12, screenWidth),
      paddingHorizontal: getResponsiveSpacing(16, screenWidth),
    },
    servicesScroll: {
      paddingLeft: 16,
    },
    servicesScrollContent: {
      paddingRight: 16,
    },
    mostBookedServiceCard: {
      width: getResponsiveWidth(160, screenWidth, 140, 180),
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(12, screenWidth),
      marginRight: getResponsiveSpacing(12, screenWidth),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#F0F0F0',
      // Remove shadows/elevation to avoid visual separator line between sections
      shadowColor: 'transparent',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    serviceImageContainer: {
      height: getResponsiveValue(120, screenHeight, 100, 140),
      backgroundColor: '#F8F9FA',
    },
    mostBookedServiceImage: {
      width: '100%',
      height: '100%',
    },
    serviceImagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F0F8FF',
    },
    mostBookedEmoji: {
      fontSize: 40,
    },
    serviceDetails: {
      padding: 12,
    },
    serviceTitle: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(18, screenWidth),
      marginBottom: getResponsiveSpacing(6, screenWidth),
    },
    serviceRating: {
      marginBottom: 6,
    },
    ratingText: {
      fontSize: 12,
      color: '#666',
      fontWeight: '500',
    },
    instantBadge: {
      backgroundColor: '#FFF3CD',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    instantText: {
      fontSize: 10,
      color: '#856404',
      fontWeight: '600',
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    currentPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: '#000',
    },
    originalPrice: {
      fontSize: 12,
      color: '#999',
      textDecorationLine: 'line-through',
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
      paddingVertical: 8,
      paddingBottom: 5,
      paddingTop: 5,
    },
    navItem: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    navLabel: {
      fontSize: 11,
      color: '#999',
      marginTop: 4,
    },
    navLabelActive: {
      fontSize: 11,
      color: '#00BFFF',
      marginTop: 4,
      fontWeight: '600',
    },
    topOffersContainer: {
      marginTop: 8,
      marginBottom: 20,
    },
    topOfferCard: {
      width: getResponsiveWidth(160, screenWidth, 140, 180),
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(12, screenWidth),
      marginRight: getResponsiveSpacing(12, screenWidth),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#FFD700',
      // Remove shadows/elevation for uniform look
      shadowColor: 'transparent',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    discountBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: '#FF3B30',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      zIndex: 10,
    },
    discountText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    limitedTimeBadge: {
      backgroundColor: '#FFE5E5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    limitedTimeText: {
      fontSize: 10,
      color: '#D91656',
      fontWeight: '600',
    },
  });
};
