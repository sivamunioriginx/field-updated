import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
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
            <Ionicons name="location-outline" size={20} color="#000000" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Home</Text>
              <Text style={styles.locationAddress}>Hchf, Asilmetta, Visakhapatnam, Andhr...</Text>
            </View>
            <Ionicons name="chevron-down-outline" size={16} color="#000000" style={styles.chevronIcon} />
          </TouchableOpacity>
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
                  <TouchableOpacity key={subcategory.id} style={styles.subcategoryCard}>
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

  // Calculate card width for consistent responsive behavior
  const cardWidth = (screenWidth - getResponsiveSpacing(16, screenWidth) * 2 - getResponsiveSpacing(12, screenWidth) * 2.25) / 3.25;
  // Card height proportional to width (aspect ratio: ~1.4:1)
  const cardHeight = cardWidth * 1.4;

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
      paddingTop: getResponsiveValue(38, screenHeight),
      paddingBottom: getResponsiveValue(12, screenHeight),
      backgroundColor: '#A1CEDC',
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    locationTextContainer: {
      marginLeft: getResponsiveSpacing(8, screenWidth),
      flex: 1,
    },
    locationLabel: {
      fontSize: getResponsiveFontSize(16, screenWidth),
      fontWeight: '700',
      color: '#000000',
    },
    locationAddress: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      color: '#000000',
      opacity: 0.9,
      marginTop: 2,
    },
    chevronIcon: {
      marginRight: getResponsiveSpacing(65, screenWidth),
      marginTop: getResponsiveSpacing(22, screenWidth),
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
      marginBottom: getResponsiveSpacing(2, screenWidth),
      paddingHorizontal: getResponsiveSpacing(12, screenWidth),
      height: getResponsiveValue(40, screenHeight, 35, 48),
      borderWidth: 1,
      borderColor: '#E0E0E0',
      zIndex: 10,
    },
    searchIcon: {
      marginRight: getResponsiveSpacing(8, screenWidth),
    },
    searchInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#000',
    },
    categorySection: {
      marginTop: getResponsiveSpacing(2, screenWidth),
      marginBottom: getResponsiveSpacing(5, screenWidth),
    },
    categoryTitle: {
      fontSize: getResponsiveFontSize(18, screenWidth),
      fontWeight: '700',
      color: '#000',
      marginBottom: getResponsiveSpacing(8, screenWidth),
      paddingHorizontal: getResponsiveSpacing(16, screenWidth),
    },
    subcategoriesScroll: {
      paddingLeft: getResponsiveSpacing(16, screenWidth),
    },
    subcategoriesScrollContent: {
      paddingRight: getResponsiveSpacing(16, screenWidth),
    },
    subcategoryCard: {
      // Calculate width to show 3 full cards + 25% of next card
      width: cardWidth,
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(12, screenWidth),
      marginRight: getResponsiveSpacing(12, screenWidth),
      padding: getResponsiveSpacing(7, screenWidth),
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
      borderRadius: getResponsiveSpacing(6, screenWidth),
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
      padding: getResponsiveSpacing(6, screenWidth),
      paddingTop: getResponsiveSpacing(6, screenWidth),
    },
    subcategoryTitle: {
      fontSize: getResponsiveFontSize(12, screenWidth),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(16, screenWidth),
      textAlign: 'center',
      flexWrap: 'wrap',
      marginBottom: -Math.abs(getResponsiveSpacing(8, screenWidth)),
    },
    emptySubcategoryContainer: {
      padding: getResponsiveSpacing(20, screenWidth),
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptySubcategoryText: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      color: '#999',
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
      paddingVertical: getResponsiveSpacing(8, screenWidth),
      paddingBottom: getResponsiveSpacing(5, screenWidth),
      paddingTop: getResponsiveSpacing(5, screenWidth),
    },
    navItem: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    navLabel: {
      fontSize: getResponsiveFontSize(11, screenWidth),
      color: '#999',
      marginTop: 4,
    },
    navLabelActive: {
      fontSize: getResponsiveFontSize(11, screenWidth),
      color: '#00BFFF',
      marginTop: 4,
      fontWeight: '600',
    },
  });
};
