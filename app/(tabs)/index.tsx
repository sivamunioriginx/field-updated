import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from 'react-native';

interface Subcategory {
  id: number;
  name: string;
  image: string;
  category_id: number;
}

interface CategoryWithSubcategories {
  id: number;
  title: string;
  image: string;
  subcategories: Subcategory[];
}

export default function HomeScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const videoRef = useRef<Video>(null);
  const router = useRouter();
  
  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);
  
  // State for search input
  const [serviceInput, setServiceInput] = useState('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  
  // State for categories with subcategories
  const [categoriesWithSubcategories, setCategoriesWithSubcategories] = useState<CategoryWithSubcategories[]>([]);
  const [categoryImageErrors, setCategoryImageErrors] = useState<Set<number>>(new Set());

  // Fetch categories with subcategories using the new API
  useEffect(() => {
    const fetchCategoriesWithSubcategories = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.CATEGORIES_WITH_SUBCATEGORIES);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setCategoriesWithSubcategories(data.data);
        } else {
          console.log('No data or unsuccessful response:', data);
        }
      } catch (error) {
        console.error('Error fetching categories with subcategories:', error);
      }
    };
    fetchCategoriesWithSubcategories();
  }, []);

  // Typing animation for search placeholder
  useEffect(() => {
    // Extract all subcategory names from categories
    const subcategoryNames: string[] = [];
    categoriesWithSubcategories.forEach(category => {
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(subcategory => {
          subcategoryNames.push(subcategory.name);
        });
      }
    });

    // If no subcategories, don't animate
    if (subcategoryNames.length === 0) {
      setCurrentPlaceholder("Search for services");
      return;
    }

    let currentIndex = 0;
    let isDeleting = false;
    let charIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const typeSpeed = 100; // Speed of typing in ms
    const deleteSpeed = 50; // Speed of deleting in ms
    const pauseAfterComplete = 2000; // Pause after completing a word
    const pauseAfterDelete = 500; // Pause after deleting completely

    const animatePlaceholder = () => {
      if (!isMounted) return;

      const staticPrefix = "Search For ";
      const currentName = subcategoryNames[currentIndex];

      if (!isDeleting) {
        // Typing
        if (charIndex < currentName.length) {
          const currentText = staticPrefix + currentName.substring(0, charIndex + 1);
          setCurrentPlaceholder(currentText);
          charIndex++;
          timeoutId = setTimeout(animatePlaceholder, typeSpeed);
        } else {
          // Finished typing, wait then start deleting
          timeoutId = setTimeout(() => {
            isDeleting = true;
            animatePlaceholder();
          }, pauseAfterComplete);
        }
      } else {
        // Deleting
        if (charIndex > 0) {
          charIndex--;
          const currentText = staticPrefix + currentName.substring(0, charIndex);
          setCurrentPlaceholder(currentText);
          timeoutId = setTimeout(animatePlaceholder, deleteSpeed);
        } else {
          // Finished deleting, move to next subcategory
          isDeleting = false;
          currentIndex = (currentIndex + 1) % subcategoryNames.length;
          timeoutId = setTimeout(animatePlaceholder, pauseAfterDelete);
        }
      }
    };

    // Start the animation
    timeoutId = setTimeout(animatePlaceholder, 500);

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [categoriesWithSubcategories]);


  const handleOutsideTouch = () => {
    // Handle any modal dismissals if needed
  };

  const handleServiceInputChange = (text: string) => {
    setServiceInput(text);
  };

  const handleSearchInputPress = () => {
    // Navigate to search screen when search input is pressed
    router.push('/search-screen');
  };

  const handleSubcategoryPress = (subcategory: Subcategory) => {
    // Navigate to services screen with subcategory details
    router.push({
      pathname: '/services-screen',
      params: {
        subcategoryId: subcategory.id.toString(),
        subcategoryName: subcategory.name
      }
    });
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
          <TouchableOpacity style={styles.locationContainer}>
            <Ionicons name="location-outline" size={styles.locationIcon.fontSize} color="#000000" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Home</Text>
              <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">main, Asilmetta, Visakhapatnam, Andhr...</Text>
            </View>
            <Ionicons name="chevron-down-outline" size={styles.chevronIcon.fontSize} color="#000000" style={styles.chevronIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartIconContainer}>
            <Ionicons name="cart-outline" size={styles.cartIcon.fontSize} color="#000" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Video Section */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: `${getBaseUrl().replace('/api', '')}/uploads/animations/diwali (2).mp4` }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted
          />
          {/* Search Bar positioned at 90% of video */}
          <View style={styles.searchBarContainer}>
            <TouchableOpacity 
              style={styles.searchBarTouchable} 
              onPress={handleSearchInputPress}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={styles.searchIcon.fontSize} color="#666" style={styles.searchIcon} />
              <Text style={styles.searchPlaceholderText}>
                {currentPlaceholder}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.mainScrollView} 
          contentContainerStyle={styles.mainScrollViewContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="normal"
          bounces={true}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Categories with Subcategories */}
          {categoriesWithSubcategories
            .filter(category => category.subcategories && category.subcategories.length > 0)
            .map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
              decelerationRate="normal"
                style={styles.subcategoriesScroll}
                contentContainerStyle={styles.subcategoriesScrollContent}
              >
                {category.subcategories.map((subcategory) => (
                  <TouchableOpacity 
                    key={subcategory.id} 
                    style={styles.subcategoryCard}
                    onPress={() => handleSubcategoryPress(subcategory)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.subcategoryImageContainer}>
                      {subcategory.image && !categoryImageErrors.has(subcategory.id) ? (
                      <Image
                          source={{ uri: `${getBaseUrl().replace('/api', '')}/uploads/subcategorys/${subcategory.image}` }}
                          style={styles.subcategoryImage}
                        contentFit="cover"
                        onError={(error) => {
                            console.log('Subcategory image load error:', subcategory.name, error);
                            setCategoryImageErrors(prev => new Set(prev).add(subcategory.id));
                        }}
                        onLoad={() => {
                            console.log('Subcategory image loaded:', subcategory.name);
                        }}
                      />
                    ) : (
                        <View style={styles.subcategoryImagePlaceholder}>
                          <Text style={styles.subcategoryPlaceholderText}>
                            {subcategory.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      )}
                    </View>
                    <View style={styles.subcategoryDetails}>
                      <Text style={styles.subcategoryTitle}>
                        {subcategory.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          ))}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="home" size={styles.navIconSize} color="#00BFFF" />
            <Text style={styles.navLabelActive}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="navigate-outline" size={styles.navIconSize} color="#999" />
            <Text style={styles.navLabel}>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="list-outline" size={styles.navIconSize} color="#999" />
            <Text style={styles.navLabel}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="call-outline" size={styles.navIconSize} color="#999" />
            <Text style={styles.navLabel}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="person-outline" size={styles.navIconSize} color="#999" />
            <Text style={styles.navLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

  const createStyles = (screenHeight: number, screenWidth: number) => {
  // Base dimensions for better scaling (using standard mobile dimensions)
  const baseWidth = 375; // iPhone standard - better scaling base
  const baseHeight = 812; // iPhone standard - better scaling base
  
  // Calculate responsive icon sizes once
  const moderateScale = (size: number) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * 0.5;
  };
  
  const navIconSize = Math.max(18, Math.min(30, moderateScale(24)));
  
  // Moderate scale function to prevent extreme sizes
  const scale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * factor;
  };

  const scaleHeight = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenHeight) / baseHeight;
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

  // Device type detection with more accurate breakpoints
  const isSmallScreen = screenWidth < 360; // Small phones
  const isMediumScreen = screenWidth >= 360 && screenWidth < 414; // Regular phones  
  const isLargeScreen = screenWidth >= 414 && screenWidth < 768; // Large phones
  const isTablet = screenWidth >= 768; // Tablets
  
  // Calculate responsive video height based on device type
  const getVideoHeight = () => {
    if (isTablet) return screenHeight * 0.28;
    if (isSmallScreen) return screenHeight * 0.40;
    if (isMediumScreen) return screenHeight * 0.38;
    return screenHeight * 0.35; // Large screens
  };

  // Calculate card width for consistent responsive behavior with improved spacing
  const cardWidth = (screenWidth - getResponsiveWidth(16) * 2 - getResponsiveSpacing(12) * 2.5) / 3.5;
  // Card height proportional to width (aspect ratio: ~1.3:1 for better appearance)
  const cardHeight = cardWidth * 1.3;
  
  const videoHeight = getVideoHeight();
  const getSearchBarBottomPercentage = () => {
    if (isTablet) return 0.07; // Tablets
    if (isSmallScreen) return 0.01; // Small screens (emulator) - works at 0.01
    if (isMediumScreen) return 0.01; // Medium screens
    return 0.06; // Large screens (Oppo A78 5G and similar) - works at 0.05
  };
  const searchBarBottomPosition = videoHeight * getSearchBarBottomPercentage();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveWidth(16),
      paddingTop: getResponsiveValue(33, 25, 45),
      paddingBottom: getResponsiveValue(3, 0, 10),
      backgroundColor: '#A1CEDC',
      zIndex: 100,
      elevation: 100,
    },
    videoContainer: {
      position: 'relative',
      width: '100%',
      height: getVideoHeight(), // Responsive height based on device
      marginTop: getResponsiveValue(-50, -60, -40),
      marginBottom: getResponsiveValue(-15, -20, -10),
    },
    video: {
      width: '100%',
      height: '100%',
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      maxWidth: '70%', // Prevent overflow on small screens
    },
    locationIcon: {
      fontSize: getResponsiveFontSize(20), // Icon size
    },
    locationTextContainer: {
      marginLeft: getResponsiveSpacing(8),
      flex: 1,
    },
    locationLabel: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '700',
      color: '#000000',
    },
    locationAddress: {
      fontSize: getResponsiveFontSize(12),
      color: '#000000',
      opacity: 0.9,
      marginTop: getResponsiveSpacingWithNegative(-3),
    },
    chevronIcon: {
      fontSize: getResponsiveFontSize(16), // Icon size
      marginLeft: getResponsiveSpacing(4),
      alignSelf: 'flex-end',
      marginBottom: getResponsiveSpacingWithNegative(-2),
    },
    cartIconContainer: {
      position: 'relative',
      padding: getResponsiveSpacing(4),
    },
    cartIcon: {
      fontSize: getResponsiveFontSize(28), // Icon size
    },
    cartBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: '#FF3B30',
      borderRadius: getResponsiveSpacing(10),
      minWidth: getResponsiveFontSize(16),
      height: getResponsiveFontSize(16),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: getResponsiveSpacing(4),
    },
    cartBadgeText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(10),
      fontWeight: '700',
    },
    mainScrollView: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    mainScrollViewContent: {
      paddingBottom: getResponsiveSpacing(80),
    },
    searchBarContainer: {
      position: 'absolute',
      bottom: searchBarBottomPosition, // Positioned at 95% of video (5% from bottom) on all devices
      left: getResponsiveSpacing(16),
      right: getResponsiveSpacing(16),
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(12),
      height: getResponsiveValue(40, 35, 48),
      borderWidth: 1,
      borderColor: '#E0E0E0',
      zIndex: 10,
      elevation: 5, // Shadow for Android
      shadowColor: '#000', // Shadow for iOS
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    searchIcon: {
      fontSize: getResponsiveFontSize(20), // Icon size
      marginRight: getResponsiveSpacing(8),
    },
    searchInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(14),
      color: '#000',
    },
    searchBarTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      height: '100%',
    },
    searchPlaceholderText: {
      flex: 1,
      fontSize: getResponsiveFontSize(14),
      color: '#999',
    },
      categorySection: {
        marginTop: getResponsiveSpacing(8),
        marginBottom: getResponsiveSpacingWithNegative(-14),
      },
    categoryTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
      marginBottom: getResponsiveSpacingWithNegative(7),
      marginTop: getResponsiveSpacingWithNegative(7),
      paddingHorizontal: getResponsiveSpacing(16),
    },
    subcategoriesScroll: {
      paddingLeft: getResponsiveSpacing(16),
    },
    subcategoriesScrollContent: {
      paddingRight: getResponsiveSpacing(16),
    },
    subcategoryCard: {
      // Calculate width to show 3 full cards + 25% of next card
      width: cardWidth,
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(12),
      marginRight: getResponsiveSpacing(12),
      padding: getResponsiveSpacing(7),
      borderWidth: 1,
      borderColor: '#e8e0e0ff',
      // borderColor: '#dbd5d5ff',
      // Height proportional to width for true responsiveness
      height: cardHeight,
    },
    subcategoryImageContainer: {
      // Flex makes image take remaining space after text
      flex: 1,
      backgroundColor: '#F8F9FA',
      borderRadius: getResponsiveSpacing(6),
      overflow: 'hidden',
      // Minimum height responsive to card width (50% of card width)
      minHeight: cardWidth * 0.5,
    },
    subcategoryImage: {
      width: '100%',
      height: '100%',
    },
    subcategoryImagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    subcategoryPlaceholderText: {
      fontSize: Math.max(20, Math.min(32, cardWidth * 0.25)),
      color: '#00BFFF',
      fontWeight: '600',
    },
    subcategoryDetails: {
      padding: getResponsiveSpacing(6),
      paddingTop: getResponsiveSpacing(6),
    },
    subcategoryTitle: {
      fontSize: getResponsiveFontSize(12),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(16),
      textAlign: 'center',
      flexWrap: 'wrap',
      marginBottom: -Math.abs(getResponsiveSpacing(8)),
    },
    emptySubcategoryContainer: {
      padding: getResponsiveSpacing(20),
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptySubcategoryText: {
      fontSize: getResponsiveFontSize(14),
      color: '#999',
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
      paddingVertical: getResponsiveSpacing(8),
      paddingBottom: getResponsiveSpacing(5),
      paddingTop: getResponsiveSpacing(5),
    },
    navItem: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    navIconSize: getResponsiveFontSize(24), // Responsive icon size
    navLabel: {
      fontSize: getResponsiveFontSize(11),
      color: '#999',
      marginTop: getResponsiveSpacing(4),
    },
    navLabelActive: {
      fontSize: getResponsiveFontSize(11),
      color: '#00BFFF',
      marginTop: getResponsiveSpacing(4),
      fontWeight: '600',
    },
  });
};
