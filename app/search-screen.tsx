import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

interface RecentSearch {
  id: number;
  service: string;
  price?: string;
  profession?: string;
  timestamp: Date;
}

interface TrendingSearch {
  id: number;
  name: string;
  icon: string;
}

interface SearchResult {
  id: number;
  name: string;
  subcategory_id: string;
  image: string | null;
  created_at: string;
}

export default function SearchScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Mock data for recent searches
  const [recentSearches] = useState<RecentSearch[]>([
    {
      id: 1,
      service: 'Double-pole MCB installation',
      price: '₹149',
      profession: 'Electrician',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: 2,
      service: 'Plumber',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      id: 3,
      service: 'Wall/door hanger installation',
      price: '₹139',
      profession: 'Carpenter',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      id: 4,
      service: 'Refrigerator Repair',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    },
  ]);

  // Mock data for trending searches
  const [trendingSearches] = useState<TrendingSearch[]>([
    { id: 1, name: 'Professional cleaning', icon: 'trending-up' },
    { id: 2, name: 'Electricians', icon: 'trending-up' },
    { id: 3, name: 'Salon', icon: 'trending-up' },
    { id: 4, name: 'Carpenters', icon: 'trending-up' },
    { id: 5, name: 'Washing machine repair', icon: 'trending-up' },
    { id: 6, name: 'Full home cleaning', icon: 'trending-up' },
    { id: 7, name: 'Geyser repair', icon: 'trending-up' },
    { id: 8, name: 'Ro repair', icon: 'trending-up' },
    { id: 9, name: 'Furniture assembly', icon: 'trending-up' },
    { id: 10, name: 'Microwave repair', icon: 'trending-up' },
  ]);

  // Debounced search function
  const searchServices = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(API_ENDPOINTS.SEARCH_SERVICES(query));
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchServices(searchInput);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchServices]);

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

  const handleRecentSearchPress = (search: RecentSearch) => {
    router.push({
      pathname: '/services-screen',
      params: {
        searchQuery: search.service,
      }
    });
  };

  const handleTrendingSearchPress = (search: TrendingSearch) => {
    router.push({
      pathname: '/services-screen',
      params: {
        searchQuery: search.name,
      }
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleSearchResultPress = (result: SearchResult) => {
    router.push({
      pathname: '/services-screen',
      params: {
        searchQuery: result.name,
      }
    });
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
  };

  const styles = createStyles(screenWidth, screenHeight);

  return (
    <View style={styles.container}>      
      {/* Header with search bar */}
      <View style={styles.header}>
        <View style={styles.searchBarContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={20} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Look for services"
            placeholderTextColor="#999"
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
            autoFocus
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {showResults ? (
          /* Search Results Section */
          <View style={styles.section}>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.searchResultsContainer}>
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSearchResultPress(result)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultImageContainer}>
                      {result.image ? (
                        <Image 
                          source={{ uri: `${getBaseUrl().replace('/api', '')}${result.image}` }} 
                          style={styles.searchResultImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.searchResultPlaceholder}>
                          <Ionicons name="construct" size={24} color="#999" />
                        </View>
                      )}
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle}>
                        {result.name.split(new RegExp(`(${searchInput})`, 'gi')).map((part, index) => 
                          part.toLowerCase() === searchInput.toLowerCase() ? (
                            <Text key={index} style={styles.searchResultHighlight}>{part}</Text>
                          ) : (
                            part
                          )
                        )}
                      </Text>
                      <Text style={styles.searchResultSubtitle}>Service</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.noResultsText}>No services found</Text>
                <Text style={styles.noResultsSubtext}>Try searching with different keywords</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Recent Searches Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recents</Text>
              <View style={styles.recentSearchesContainer}>
                {recentSearches.map((search) => (
                  <TouchableOpacity
                    key={search.id}
                    style={styles.recentSearchItem}
                    onPress={() => handleRecentSearchPress(search)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentSearchIcon}>
                      <Ionicons name="time-outline" size={20} color="#999" />
                    </View>
                    <View style={styles.recentSearchContent}>
                      <Text style={styles.recentSearchService}>{search.service}</Text>
                      {search.price && search.profession && (
                        <View style={styles.recentSearchDetails}>
                          <Text style={styles.recentSearchPrice}>{search.price}</Text>
                          <Text style={styles.recentSearchProfession}>{search.profession}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Trending Searches Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending searches</Text>
              <View style={styles.trendingSearchesContainer}>
                {trendingSearches.map((search) => (
                  <TouchableOpacity
                    key={search.id}
                    style={styles.trendingSearchItem}
                    onPress={() => handleTrendingSearchPress(search)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trending-up-outline" size={16} color="#666" />
                    <Text style={styles.trendingSearchText}>{search.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (screenWidth: number, screenHeight: number) => {
  const isSmallScreen = screenWidth < 360;
  const isTabletScreen = screenWidth >= 768;
  const isLargeTabletScreen = screenWidth >= 1024;

  const getResponsiveValue = (baseValue: number) => {
    if (isSmallScreen) return baseValue * 0.85;
    if (isTabletScreen) return baseValue * 1.3;
    if (isLargeTabletScreen) return baseValue * 1.5;
    return baseValue;
  };

  const getResponsiveFontSize = (baseSize: number) => {
    if (isSmallScreen) return Math.max(10, baseSize * 0.9);
    if (isTabletScreen) return baseSize * 1.25;
    if (isLargeTabletScreen) return baseSize * 1.4;
    return baseSize;
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    header: {
      paddingHorizontal: getResponsiveValue(16),
      paddingTop: getResponsiveValue(50),
      paddingBottom: getResponsiveValue(10),
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    backButton: {
      position: 'absolute',
      left: getResponsiveValue(12),
      top: '50%',
      transform: [{ translateY: -getResponsiveValue(10) }],
      zIndex: 1,
    },
    clearButton: {
      position: 'absolute',
      right: getResponsiveValue(12),
      top: '50%',
      transform: [{ translateY: -getResponsiveValue(10) }],
      zIndex: 1,
    },
    searchBarContainer: {
      position: 'relative',
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveValue(12),
      height: getResponsiveValue(44),
      borderWidth: 1,
      borderColor: '#b3b2b2ff',
    },
    searchInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(16),
      color: '#000',
      paddingLeft: getResponsiveValue(40),
      paddingRight: getResponsiveValue(16),
      paddingVertical: getResponsiveValue(12),
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: getResponsiveValue(20),
    },
    section: {
      marginTop: getResponsiveValue(12),
    },
    sectionTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
      marginBottom: getResponsiveValue(16),
      paddingHorizontal: getResponsiveValue(16),
    },
    recentSearchesContainer: {
      paddingHorizontal: getResponsiveValue(16),
    },
    recentSearchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getResponsiveValue(10),
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    recentSearchIcon: {
      width: getResponsiveValue(40),
      height: getResponsiveValue(40),
      borderRadius: getResponsiveValue(20),
      backgroundColor: '#F8F9FA',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getResponsiveValue(12),
      marginTop: getResponsiveValue(-10),
    },
    recentSearchContent: {
      flex: 1,
      marginTop: getResponsiveValue(-10),
    },
    recentSearchService: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '500',
      color: '#000',
      marginBottom: getResponsiveValue(2),
    },
    recentSearchDetails: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    recentSearchPrice: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginRight: getResponsiveValue(8),
    },
    recentSearchProfession: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
    },
    trendingSearchesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: getResponsiveValue(16),
      gap: getResponsiveValue(8),
    },
    trendingSearchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: getResponsiveValue(20),
      paddingHorizontal: getResponsiveValue(12),
      paddingVertical: getResponsiveValue(8),
      marginBottom: getResponsiveValue(8),
    },
    trendingSearchText: {
      fontSize: getResponsiveFontSize(14),
      color: '#000',
      marginLeft: getResponsiveValue(6),
    },
    // Search Results Styles
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getResponsiveValue(20),
    },
    loadingText: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginLeft: getResponsiveValue(8),
    },
    searchResultsContainer: {
      paddingHorizontal: getResponsiveValue(16),
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getResponsiveValue(12),
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    searchResultImageContainer: {
      width: getResponsiveValue(60),
      height: getResponsiveValue(60),
      borderRadius: getResponsiveValue(8),
      marginRight: getResponsiveValue(12),
      overflow: 'hidden',
    },
    searchResultImage: {
      width: '100%',
      height: '100%',
    },
    searchResultPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#F8F9FA',
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchResultContent: {
      flex: 1,
    },
    searchResultTitle: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '500',
      color: '#000',
      marginBottom: getResponsiveValue(4),
    },
    searchResultHighlight: {
      fontWeight: '700',
      backgroundColor: '#FFF3CD',
    },
    searchResultSubtitle: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
    },
    noResultsContainer: {
      alignItems: 'center',
      paddingVertical: getResponsiveValue(40),
    },
    noResultsText: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      color: '#666',
      marginTop: getResponsiveValue(16),
      marginBottom: getResponsiveValue(8),
    },
    noResultsSubtext: {
      fontSize: getResponsiveFontSize(14),
      color: '#999',
      textAlign: 'center',
    },
  });
};
