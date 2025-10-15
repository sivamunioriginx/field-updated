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
  const [currentPlaceholder, setCurrentPlaceholder] = useState("Search for services");
  
  // State for categories with subcategories
  const [categoriesWithSubcategories, setCategoriesWithSubcategories] = useState<CategoryWithSubcategories[]>([]);
  const [categoryImageErrors, setCategoryImageErrors] = useState<Set<number>>(new Set());
  
  // Refs for auto-scrolling subcategories
  const subcategoryScrollRefs = useRef<{ [key: number]: ScrollView | null }>({});
  const currentScrollPositions = useRef<{ [key: number]: number }>({});

  // Auto-scroll subcategories every 3 seconds
  useEffect(() => {
    if (categoriesWithSubcategories.length === 0) return;

    const intervals: ReturnType<typeof setInterval>[] = [];

    categoriesWithSubcategories.forEach((category) => {
      if (category.subcategories && category.subcategories.length > 1) {
        // Initialize scroll position for this category
        if (currentScrollPositions.current[category.id] === undefined) {
          currentScrollPositions.current[category.id] = 0;
        }

        const interval = setInterval(() => {
          const scrollRef = subcategoryScrollRefs.current[category.id];
          if (scrollRef) {
            const cardWidth = 160 + 12; // card width + margin
            const maxScrollX = (category.subcategories.length - 1) * cardWidth;
            
            // Move to next position
            let nextScrollX = currentScrollPositions.current[category.id] + cardWidth;
            if (nextScrollX > maxScrollX) {
              nextScrollX = 0; // Reset to beginning
            }
            
            currentScrollPositions.current[category.id] = nextScrollX;
            
            scrollRef.scrollTo({
              x: nextScrollX,
              animated: true,
            });
          }
        }, 3000); // 3 seconds

        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [categoriesWithSubcategories]);

  // Fetch categories with subcategories using the new API
  useEffect(() => {
    const fetchCategoriesWithSubcategories = async () => {
      try {
        console.log('Fetching categories with subcategories from:', API_ENDPOINTS.CATEGORIES_WITH_SUBCATEGORIES);
        const response = await fetch(API_ENDPOINTS.CATEGORIES_WITH_SUBCATEGORIES);
        const data = await response.json();
        console.log('Categories with subcategories response:', data);
        if (data.success && Array.isArray(data.data)) {
          console.log('Setting categories with subcategories:', data.data);
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

  // Auto-scroll subcategories every 3 seconds
  useEffect(() => {
    if (categoriesWithSubcategories.length === 0) return;

    const intervals: ReturnType<typeof setInterval>[] = [];

    categoriesWithSubcategories.forEach((category) => {
      if (category.subcategories && category.subcategories.length > 1) {
    const interval = setInterval(() => {
          const scrollRef = subcategoryScrollRefs.current[category.id];
          if (scrollRef) {
            const cardWidth = 160 + 12; // card width + margin
            const maxScrollX = (category.subcategories.length - 1) * cardWidth;
            
            // Simple auto-scroll logic - scroll to next position
            scrollRef.scrollTo({
              x: Math.random() * maxScrollX, // Random position for demo
            animated: true,
          });
        }
        }, 3000); // 3 seconds

        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
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
          {/* Categories with Subcategories */}
          {categoriesWithSubcategories
            .filter(category => category.subcategories && category.subcategories.length > 0)
            .map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            <ScrollView 
                ref={(ref) => {
                  subcategoryScrollRefs.current[category.id] = ref;
                }}
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
                      <Text style={styles.subcategoryTitle} numberOfLines={2}>
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
      marginBottom: getResponsiveSpacing(12, screenWidth),
      paddingHorizontal: getResponsiveSpacing(16, screenWidth),
    },
    subcategoriesScroll: {
      paddingLeft: getResponsiveSpacing(16, screenWidth),
    },
    subcategoriesScrollContent: {
      paddingRight: getResponsiveSpacing(16, screenWidth),
    },
    subcategoryCard: {
      width: getResponsiveWidth(160, screenWidth, 140, 180),
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(12, screenWidth),
      marginRight: getResponsiveSpacing(12, screenWidth),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#e7e3e3ff',
      shadowColor: 'transparent',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    subcategoryImageContainer: {
      height: getResponsiveValue(120, screenHeight, 100, 140),
      backgroundColor: '#F8F9FA',
    },
    subcategoryImage: {
      width: '100%',
      height: '100%',
    },
    subcategoryImagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#E8F4F8',
    },
    subcategoryPlaceholderText: {
      fontSize: 40,
      color: '#00BFFF',
      fontWeight: '600',
    },
    subcategoryDetails: {
      padding: getResponsiveSpacing(12, screenWidth),
    },
    subcategoryTitle: {
      fontSize: getResponsiveFontSize(14, screenWidth),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(18, screenWidth),
      textAlign: 'center',
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
