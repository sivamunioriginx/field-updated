import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  price?: number;
  rating?: number;
  created_at: string;
  type: 'service' | 'subcategory';
}

export default function SearchScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const { cart, addToCart, incrementItem, decrementItem, getTotalItems, getTotalPrice } = useCart();
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<SearchResult | null>(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  
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
    // Only navigate for subcategories, do nothing for services
    if (result.type === 'subcategory') {
      // Navigate to services screen with subcategory ID
      router.push({
        pathname: '/services-screen',
        params: {
          subcategoryId: result.id.toString(),
          subcategoryName: result.name
        }
      });
    }
    // If it's a service, do nothing
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleViewDetails = (service: SearchResult) => {
    console.log('View details clicked for service:', service.name);
    setSelectedService(service);
    setExpandedFaqIndex(null); // Reset FAQ state when opening modal
    setShowDetailsModal(true);
    console.log('Modal should now be visible');
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  const handleAddService = (service: SearchResult) => {
    addToCart(service.id);
  };

  const handleIncrementService = (serviceId: number) => {
    incrementItem(serviceId);
  };

  const handleDecrementService = (serviceId: number) => {
    decrementItem(serviceId);
  };

  // Calculate cart totals
  const cartTotal = useMemo(() => {
    const itemCount = getTotalItems();
    const services = searchResults
      .filter(r => r.type === 'service')
      .map(r => ({ 
        id: r.id, 
        name: r.name, 
        price: r.price, 
        image: r.image || undefined 
      }));
    const total = getTotalPrice(services as any);
    return { total, itemCount };
  }, [cart, searchResults, getTotalItems, getTotalPrice]);

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
                {searchResults.map((result, index) => (
                  <View key={`${result.type}-${result.id}`}>
                    {result.type === 'service' ? (
                      /* Service Card Design - New Design */
                      <>
                        <View style={styles.searchResultCard}>
                          <View style={styles.searchResultCardContent}>
                            {/* Left Section - Service Details */}
                            <View style={styles.searchResultDetails}>
                              <Text style={styles.searchResultName} numberOfLines={2}>
                                {result.name}
                              </Text>
                              
                              {/* Rating */}
                              <View style={styles.searchRatingContainer}>
                                <Ionicons name="star" size={14} color="#FFD700" />
                                <Text style={styles.searchRatingText}>
                                  {(result.rating && typeof result.rating === 'number' && result.rating > 0) 
                                    ? result.rating.toFixed(2) 
                                    : '4.85'}
                                </Text>
                                <Text style={styles.searchReviewsText}>(138K reviews)</Text>
                              </View>
                              
                              {/* Price */}
                              <Text style={styles.searchPriceText}>
                                Starts at ₹{result.price || '299'}
                              </Text>
                              
                              {/* Description */}
                              <View style={styles.searchDescriptionContainer}>
                                <Text style={styles.searchDescriptionText}>
                                  Professional service with quality materials
                                </Text>
                              </View>
                              
                              {/* View Details Link */}
                              <TouchableOpacity 
                                style={styles.searchViewDetailsButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(result);
                                }}
                              >
                                <Text style={styles.searchViewDetailsText}>View details</Text>
                              </TouchableOpacity>
                            </View>
                            
                            {/* Right Section - Image and Actions */}
                            <View style={styles.searchResultActions}>
                              {/* Service Image */}
                              <View style={styles.searchResultImageContainer}>
                                {result.image ? (
                                  <Image 
                                    source={{ uri: `${getBaseUrl().replace('/api', '')}${result.image}` }} 
                                    style={styles.searchResultImage}
                                    contentFit="cover"
                                  />
                                ) : (
                                  <View style={styles.searchResultPlaceholder}>
                                    <Ionicons name="construct-outline" size={30} color="#8B5CF6" />
                                  </View>
                                )}
                              </View>
                              
                              {/* Add Button / Counter */}
                              {cart[result.id] ? (
                                <View style={styles.searchQuantityContainer}>
                                  <TouchableOpacity 
                                    style={styles.searchQuantityButton}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleDecrementService(result.id);
                                    }}
                                  >
                                    <Ionicons name="remove" size={16} color="#8B5CF6" />
                                  </TouchableOpacity>
                                  <Text style={styles.searchQuantityText}>{cart[result.id]}</Text>
                                  <TouchableOpacity 
                                    style={styles.searchQuantityButton}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleIncrementService(result.id);
                                    }}
                                  >
                                    <Ionicons name="add" size={16} color="#8B5CF6" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  style={styles.searchAddButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleAddService(result);
                                  }}
                                >
                                  <Text style={styles.searchAddButtonText}>Add</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                        
                        {/* Separator Line */}
                        {index < searchResults.length - 1 && <View style={styles.searchSeparator} />}
                      </>
                    ) : (
                      /* Subcategory Simple List Design - Old Design */
                      <TouchableOpacity
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultPress(result)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.searchResultItemImageContainer}>
                          {result.image ? (
                            <Image 
                              source={{ uri: `${getBaseUrl().replace('/api', '')}${result.image}` }} 
                              style={styles.searchResultImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.searchResultPlaceholder}>
                              <Ionicons name="construct" size={24} color="#999" />
                            </View>
                          )}
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultTitle}>
                            {result.name.split(new RegExp(`(${searchInput})`, 'gi')).map((part, idx) => 
                              part.toLowerCase() === searchInput.toLowerCase() ? (
                                <Text key={idx} style={styles.searchResultHighlight}>{part}</Text>
                              ) : (
                                part
                              )
                            )}
                          </Text>
                          <Text style={styles.searchResultSubtitle}>Category</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
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
                        <Text style={styles.modalServiceName}>{selectedService.name}</Text>
                        
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
                              handleIncrementService(selectedService.id);
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
          <TouchableOpacity style={styles.viewCartButton}>
            <Text style={styles.viewCartButtonText}>View cart</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

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
    // Old Simple List Design for Subcategories
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getResponsiveValue(12),
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    searchResultItemImageContainer: {
      width: getResponsiveValue(60),
      height: getResponsiveValue(60),
      borderRadius: getResponsiveValue(8),
      marginRight: getResponsiveValue(12),
      overflow: 'hidden',
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
    // New Card Design for Services
    searchResultImageContainer: {
      width: getResponsiveValue(60),
      height: getResponsiveValue(60),
      borderRadius: getResponsiveValue(8),
      overflow: 'hidden',
      marginBottom: getResponsiveValue(8),
    },
    searchResultImage: {
      width: '100%',
      height: '100%',
    },
    searchResultPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
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
    // New Card-based Search Result Styles
    searchResultCard: {
      backgroundColor: '#FFFFFF',
      paddingVertical: getResponsiveValue(16),
      paddingHorizontal: getResponsiveValue(16),
    },
    searchResultCardContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    searchResultDetails: {
      flex: 1,
      marginRight: getResponsiveValue(16),
    },
    searchResultName: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(20),
      marginBottom: getResponsiveValue(6),
    },
    searchRatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveValue(4),
    },
    searchRatingText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '500',
      color: '#000',
      marginLeft: getResponsiveValue(4),
    },
    searchReviewsText: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginLeft: getResponsiveValue(4),
    },
    searchPriceText: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveValue(8),
    },
    searchDescriptionContainer: {
      marginBottom: getResponsiveValue(8),
    },
    searchDescriptionText: {
      fontSize: getResponsiveFontSize(13),
      color: '#666',
      lineHeight: getResponsiveFontSize(18),
    },
    searchViewDetailsButton: {
      alignSelf: 'flex-start',
    },
    searchViewDetailsText: {
      fontSize: getResponsiveFontSize(14),
      color: '#8B5CF6',
      fontWeight: '500',
    },
    searchResultActions: {
      alignItems: 'center',
      width: getResponsiveValue(80),
    },
    searchAddButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveValue(6),
      paddingHorizontal: getResponsiveValue(8),
      paddingVertical: getResponsiveValue(4),
      marginBottom: getResponsiveValue(4),
      marginTop: getResponsiveValue(-20),
    },
    searchAddButtonText: {
      fontSize: getResponsiveFontSize(12),
      color: '#8B5CF6',
      fontWeight: '600',
    },
    // Quantity Controls Styles
    searchQuantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveValue(6),
      marginBottom: getResponsiveValue(4),
      marginTop: getResponsiveValue(-30),
    },
    searchQuantityButton: {
      padding: getResponsiveValue(4),
    },
    searchQuantityText: {
      fontSize: getResponsiveFontSize(12),
      color: '#8B5CF6',
      fontWeight: '600',
      paddingHorizontal: getResponsiveValue(8),
    },
    // Modal Quantity Controls Styles
    modalQuantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveValue(6),
    },
    modalQuantityButton: {
      padding: getResponsiveValue(6),
    },
    modalQuantityText: {
      fontSize: getResponsiveFontSize(13),
      color: '#8B5CF6',
      fontWeight: '600',
      paddingHorizontal: getResponsiveValue(20),
    },
    searchSeparator: {
      height: 1,
      backgroundColor: '#e6ddddff',
      marginHorizontal: getResponsiveValue(16),
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      alignItems: 'stretch',
    },
    modalContainer: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: getResponsiveValue(20),
      borderTopRightRadius: getResponsiveValue(20),
      height: screenHeight * (isSmallScreen ? 0.85 : isTabletScreen ? 0.80 : 0.82),
      maxHeight: screenHeight * (isSmallScreen ? 0.85 : isTabletScreen ? 0.80 : 0.82),
      paddingTop: getResponsiveValue(14),
      width: '100%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
    },
    modalCloseButton: {
      position: 'absolute',
      top: getResponsiveValue(45),
      right: getResponsiveValue(18),
      zIndex: 1000,
    },
    modalCloseButtonCircle: {
      width: getResponsiveValue(40),
      height: getResponsiveValue(40),
      borderRadius: getResponsiveValue(20),
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
      paddingBottom: getResponsiveValue(14),
    },
    modalHeader: {
      paddingHorizontal: getResponsiveValue(18),
      paddingTop: getResponsiveValue(8),
      paddingBottom: getResponsiveValue(2),
    },
    modalHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    modalHeaderLeft: {
      flex: 1,
      paddingRight: getResponsiveValue(12),
    },
    modalServiceName: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveValue(4),
      lineHeight: getResponsiveFontSize(26),
    },
    modalRatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveValue(4),
    },
    modalRatingText: {
      fontSize: getResponsiveFontSize(12),
      fontWeight: '500',
      color: '#000',
      marginLeft: getResponsiveValue(3),
    },
    modalReviewsText: {
      fontSize: getResponsiveFontSize(12),
      color: '#666',
      marginLeft: getResponsiveValue(3),
    },
    modalPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveValue(4),
    },
    modalPriceText: {
      fontSize: getResponsiveFontSize(15),
      fontWeight: '700',
      color: '#000',
    },
    modalDurationText: {
      fontSize: getResponsiveFontSize(15),
      color: '#666',
    },
    modalAddButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveValue(6),
      paddingHorizontal: getResponsiveValue(20),
      paddingVertical: getResponsiveValue(6),
      alignSelf: 'flex-start',
    },
    modalAddButtonText: {
      fontSize: getResponsiveFontSize(13),
      color: '#8B5CF6',
      fontWeight: '600',
    },
    modalDivider: {
      height: 1,
      backgroundColor: '#E0E0E0',
      marginVertical: getResponsiveValue(12),
    },
    modalSection: {
      paddingHorizontal: getResponsiveValue(18),
      marginBottom: getResponsiveValue(18),
    },
    modalSectionTitle: {
      fontSize: getResponsiveFontSize(22),
      fontWeight: '700',
      color: '#000',
      marginBottom: getResponsiveValue(12),
    },
    processStepsContainer: {
      // No gap needed - we'll handle spacing with paddingBottom
    },
    processStep: {
      flexDirection: 'row',
    },
    processStepNumberContainer: {
      alignItems: 'flex-start',
      marginRight: getResponsiveValue(24),
      position: 'relative',
    },
    processStepLine: {
      position: 'absolute',
      left: getResponsiveValue(15),
      top: getResponsiveValue(32),
      bottom: 0,
      width: 2,
      backgroundColor: '#ece7e7ff',
    },
    processStepNumber: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '500',
      color: '#000',
      backgroundColor: '#ece7e7ff',
      width: getResponsiveValue(32),
      height: getResponsiveValue(32),
      borderRadius: getResponsiveValue(16),
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: getResponsiveValue(32),
    },
    processStepContent: {
      flex: 1,
    },
    processStepTitle: {
      fontSize: getResponsiveFontSize(17),
      fontWeight: '600',
      color: '#000',
      lineHeight: getResponsiveFontSize(22),
      marginBottom: getResponsiveValue(2),
    },
    processStepDescription: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      lineHeight: getResponsiveFontSize(19),
      marginBottom: getResponsiveValue(0),
    },
    notesContainer: {
      gap: getResponsiveValue(12),
    },
    noteItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    noteIconContainer: {
      width: getResponsiveValue(26),
      height: getResponsiveValue(26),
      borderRadius: getResponsiveValue(13),
      backgroundColor: '#E8E8E8',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getResponsiveValue(10),
      marginTop: getResponsiveValue(0),
    },
    noteText: {
      fontSize: getResponsiveFontSize(14),
      color: '#333',
      lineHeight: getResponsiveFontSize(20),
      flex: 1,
    },
    modalBottomPadding: {
      height: getResponsiveValue(18),
    },
    // FAQ Section Styles
    faqSection: {
      paddingHorizontal: getResponsiveValue(18),
      marginBottom: getResponsiveValue(18),
    },
    faqTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveValue(16),
    },
    faqItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
      paddingVertical: getResponsiveValue(12),
    },
    faqQuestion: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faqQuestionText: {
      fontSize: getResponsiveFontSize(15),
      fontWeight: '500',
      color: '#000',
      flex: 1,
      paddingRight: getResponsiveValue(12),
      lineHeight: getResponsiveFontSize(20),
    },
    faqAnswer: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      lineHeight: getResponsiveFontSize(20),
      marginTop: getResponsiveValue(8),
    },
    // Share Section Styles
    shareSection: {
      paddingHorizontal: getResponsiveValue(18),
      marginBottom: getResponsiveValue(18),
      alignItems: 'center',
    },
    shareTitle: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      textAlign: 'center',
      marginBottom: getResponsiveValue(12),
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getResponsiveValue(10),
      paddingHorizontal: getResponsiveValue(24),
      borderWidth: 1.5,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveValue(8),
      backgroundColor: '#FFFFFF',
      minWidth: getResponsiveValue(130),
    },
    shareButtonText: {
      fontSize: getResponsiveFontSize(15),
      color: '#8B5CF6',
      fontWeight: '600',
      marginRight: getResponsiveValue(8),
    },
    shareIcon: {
      marginTop: getResponsiveValue(2),
    },
    // Rating Section Styles
    ratingSection: {
      paddingHorizontal: getResponsiveValue(18),
      marginBottom: getResponsiveValue(18),
    },
    ratingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveValue(4),
    },
    ratingScore: {
      fontSize: getResponsiveFontSize(32),
      fontWeight: '700',
      color: '#000',
      marginLeft: getResponsiveValue(8),
    },
    ratingReviews: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginBottom: getResponsiveValue(16),
    },
    ratingBars: {
      gap: getResponsiveValue(8),
    },
    ratingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveValue(8),
    },
    ratingBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      width: getResponsiveValue(36),
    },
    ratingBarLabel: {
      fontSize: getResponsiveFontSize(14),
      color: '#000',
      marginLeft: getResponsiveValue(4),
      fontWeight: '500',
    },
    ratingBarMiddle: {
      flex: 1,
      height: getResponsiveValue(6),
      backgroundColor: '#E0E0E0',
      borderRadius: getResponsiveValue(3),
      overflow: 'hidden',
    },
    ratingBarFill: {
      height: '100%',
      backgroundColor: '#000',
      borderRadius: getResponsiveValue(3),
    },
    ratingBarCount: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      width: getResponsiveValue(44),
      textAlign: 'right',
    },
    // All Reviews Section Styles
    allReviewsSection: {
      paddingHorizontal: getResponsiveValue(18),
      marginBottom: getResponsiveValue(18),
    },
    allReviewsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveValue(16),
    },
    allReviewsTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700',
      color: '#000',
    },
    filterButton: {
      fontSize: getResponsiveFontSize(15),
      color: '#8B5CF6',
      fontWeight: '600',
    },
    filterChipsContainer: {
      marginBottom: getResponsiveValue(16),
    },
    filterChip: {
      paddingHorizontal: getResponsiveValue(16),
      paddingVertical: getResponsiveValue(9),
      borderWidth: 1,
      borderColor: '#D0D0D0',
      borderRadius: getResponsiveValue(8),
      marginRight: getResponsiveValue(10),
      backgroundColor: '#FFFFFF',
    },
    filterChipText: {
      fontSize: getResponsiveFontSize(12),
      color: '#666',
      fontWeight: '500',
    },
    reviewsContainer: {
      gap: getResponsiveValue(16),
    },
    reviewCard: {
      paddingBottom: getResponsiveValue(16),
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveValue(6),
    },
    reviewerName: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#000',
      flex: 1,
    },
    reviewRatingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0A9F50',
      paddingHorizontal: getResponsiveValue(7),
      paddingVertical: getResponsiveValue(4),
      borderRadius: getResponsiveValue(4),
      gap: getResponsiveValue(3),
    },
    reviewRatingBadgeOrange: {
      backgroundColor: '#FF6B35',
    },
    reviewRatingText: {
      fontSize: getResponsiveFontSize(12),
      color: '#FFFFFF',
      fontWeight: '600',
    },
    reviewDate: {
      fontSize: getResponsiveFontSize(13),
      color: '#666',
      marginBottom: getResponsiveValue(8),
      lineHeight: getResponsiveFontSize(18),
    },
    reviewText: {
      fontSize: getResponsiveFontSize(14),
      color: '#333',
      lineHeight: getResponsiveFontSize(20),
    },
    readMoreText: {
      color: '#8B5CF6',
      fontWeight: '600',
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
      paddingHorizontal: getResponsiveValue(14),
      paddingVertical: getResponsiveValue(11),
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
      fontSize: getResponsiveFontSize(11),
      color: '#666',
      fontWeight: '500',
      marginBottom: getResponsiveValue(2),
    },
    cartTotal: {
      fontSize: getResponsiveFontSize(16),
      color: '#000',
      fontWeight: '700',
    },
    viewCartButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#8B5CF6',
      paddingHorizontal: getResponsiveValue(18),
      paddingVertical: getResponsiveValue(10),
      borderRadius: getResponsiveValue(8),
      gap: getResponsiveValue(6),
    },
    viewCartButtonText: {
      fontSize: getResponsiveFontSize(14),
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
};

