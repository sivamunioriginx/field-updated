import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { API_ENDPOINTS } from '../../constants/api';
import subcategories from './subcategories';

interface Service {
  id: number;
  name: string;
  category_name: string;
  subcaregory_name: string;
  price: number;
  rating: number;
  is_top_service: number;
  instant_service: number;
  image: string;
  created_at: string;
}

interface ServicesProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Services({ searchQuery: externalSearchQuery, onSearchChange }: ServicesProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

   const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchServices = async () => {
    try {
      setLoading(true);

      console.log('📡 Fetching services from:', API_ENDPOINTS.ADMIN_SERVICES);
      const response = await fetch(API_ENDPOINTS.ADMIN_SERVICES);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setServices([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Services response:', data);
      
      if (data.success) {
        const servicesData = data.services || data.data || [];
        console.log('✅ Services fetched:', servicesData.length, 'records');
        setServices(servicesData);
        setCurrentPage(1);
      } else {
        console.error('❌ Failed to fetch services:', data.message);
        setServices([]);
      }
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Filter and sort services
  const getFilteredAndSortedServices = () => {
    let filtered = [...services];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(Service =>
        Service.name.toLowerCase().includes(query) ||
        Service.category_name.toLowerCase().includes(query) ||
        Service.subcaregory_name.toLowerCase().includes(query) ||
        Service.price.toString().toLowerCase().includes(query) ||
        Service.rating.toString().toLowerCase().includes(query) ||
        Service.is_top_service.toString().toLowerCase().includes(query) ||
        Service.instant_service.toString().toLowerCase().includes(query) ||
        (Service.image && Service.image.toLowerCase().includes(query)) ||
        (Service.created_at && Service.created_at.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'desc':
          return b.id - a.id;
        case 'asc':
          return a.id - b.id;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Pagination logic
  const getPaginatedServices = () => {
    const filtered = getFilteredAndSortedServices();
    if (recordsPerPage === 'ALL') {
      return filtered;
    }
    const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = recordsPerPage === 'ALL' 
    ? 1 
    : Math.ceil(getFilteredAndSortedServices().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

  const sortOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const recordOptions = [5, 10, 50, 100, 'ALL'];

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
    if (onSearchChange) {
      onSearchChange(text);
    }
  };

  const styles = createStyles(width, height);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Loading Services...</Text>
      </View>
    );
  }

  if (subcategories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="people-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Services Found</Text>
        <Text style={styles.emptyText}>There are no services available at the moment.</Text>
      </View>
    );
  }

  const filteredServices = getFilteredAndSortedServices();
  const paginatedServices = getPaginatedServices();

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      scrollEnabled={true}
      bounces={true}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#06b6d4']} />
      }
    >
      <View style={styles.customersContainer}>
        <View style={styles.customersHeader}>
          <View style={styles.controlsRow}>
            {/* Left side - Title */}
            <Text style={styles.customersTitle}>
              Services
            </Text>
            
            {/* Right side - Sort and Records */}
            <View style={styles.controlsRight}>
              {/* Sort Dropdown */}
              <View style={styles.dropdownWrapperSort}>
                <Text style={styles.dropdownLabel}>Sort By:</Text>
                <TouchableOpacity 
                  style={styles.dropdownButtonSort}
                  onPress={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowRecordsDropdown(false);
                  }}
                >
                  <Ionicons name="swap-vertical" size={isDesktop ? 16 : 14} color="#64748b" />
                  <Text style={styles.dropdownButtonText}>
                    {sortOptions.find(opt => opt.value === sortBy)?.label}
                  </Text>
                  <Ionicons 
                    name={showSortDropdown ? "chevron-up" : "chevron-down"} 
                    size={isDesktop ? 16 : 14} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                {showSortDropdown && (
                  <View style={styles.dropdownMenu}>
                    {sortOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.dropdownMenuItem,
                          sortBy === option.value && styles.dropdownMenuItemActive
                        ]}
                        onPress={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownMenuItemText,
                          sortBy === option.value && styles.dropdownMenuItemTextActive
                        ]}>
                          {option.label}
                        </Text>
                        {sortBy === option.value && (
                          <Ionicons name="checkmark" size={16} color="#06b6d4" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Records Per Page Dropdown */}
              <View style={styles.dropdownWrapperShow}>
                <Text style={styles.dropdownLabel}>Show:</Text>
                <TouchableOpacity 
                  style={styles.dropdownButtonShow}
                  onPress={() => {
                    setShowRecordsDropdown(!showRecordsDropdown);
                    setShowSortDropdown(false);
                  }}
                >
                  <Ionicons name="list" size={isDesktop ? 14 : 12} color="#64748b" />
                  <Text style={styles.dropdownButtonTextShow}>
                    {recordsPerPage === 'ALL' ? 'ALL' : recordsPerPage}
                  </Text>
                  <Ionicons 
                    name={showRecordsDropdown ? "chevron-up" : "chevron-down"} 
                    size={isDesktop ? 14 : 12} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                {showRecordsDropdown && (
                  <View style={styles.dropdownMenuShow}>
                    {recordOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownMenuItem,
                          recordsPerPage === option && styles.dropdownMenuItemActive
                        ]}
                        onPress={() => {
                          setRecordsPerPage(option as number | 'ALL');
                          setCurrentPage(1);
                          setShowRecordsDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownMenuItemText,
                          recordsPerPage === option && styles.dropdownMenuItemTextActive
                        ]}>
                          {option === 'ALL' ? 'ALL' : option}
                        </Text>
                        {recordsPerPage === option && (
                          <Ionicons name="checkmark" size={16} color="#10b981" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tableWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true} 
            style={styles.tableScrollView}
            persistentScrollbar={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                  <Ionicons name="list" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>S NO</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 120 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 310 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Category Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 340 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>SubCategory Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 75 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Price</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 190 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>rating</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 75 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Top Service</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 190 : isTablet ? 75 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Instant Service</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 210 : isTablet ? 70 : 35 }]}>
                  <Ionicons name="location" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Created On</Text>
                </View>
              </View>

              {/* Table Body */}
              {paginatedServices.map((services, index) => {
                const serialNumber = recordsPerPage === 'ALL' 
                  ? index + 1 
                  : (currentPage - 1) * recordsPerPage + index + 1;
                return (
                  <View 
                    key={services.id} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                    ]}
                  >
                    <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                      <Text style={styles.tableCellText}>{serialNumber}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 220 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.category_name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.subcaregory_name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.price || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.rating || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 75 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.is_top_service === 1 ? 'ON' : 'OFF'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{services.instant_service === 1 ? 'ON' : 'OFF'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 250 : isTablet ? 70 : 35  }]}>
                      <Text style={styles.tableCellText}>{formatDate(services.created_at) || 'N/A'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            {recordsPerPage === 'ALL' 
              ? `Showing all ${filteredServices.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredServices.length);
                  return `Showing ${start} to ${end} of ${filteredServices.length} entries`;
                })()
            }
          </Text>
          
          <View style={styles.paginationButtons}>
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="play-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="chevron-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>

            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages || 1}
            </Text>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="chevron-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="play-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (width: number, height: number) => {
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      padding: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    loadingText: {
      marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
      color: '#64748b',
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    emptyIconContainer: {
      width: isDesktop ? 120 : isTablet ? 100 : 80,
      height: isDesktop ? 120 : isTablet ? 100 : 80,
      borderRadius: isDesktop ? 60 : isTablet ? 50 : 40,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isDesktop ? 24 : isTablet ? 20 : 16,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#64748b',
      textAlign: 'center',
      maxWidth: isDesktop ? 300 : isTablet ? 280 : width - 40,
    },
    customersContainer: {
      width: '100%',
    },
    customersHeader: {
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    customersTitle: {
      fontSize: isDesktop ? 24 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      paddingBottom: 2,
      flexShrink: 1,
    },
    controlsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'flex-end',
      gap: isMobile ? 16 : 12,
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    controlsRight: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 10,
      alignItems: isMobile ? 'stretch' : 'center',
      width: isMobile ? '100%' : 'auto',
      zIndex: 500,
      overflow: 'visible',
    },
    dropdownWrapperSort: {
      position: 'relative',
      width: isDesktop ? 160 : isTablet ? 140 : '100%',
      zIndex: 1000,
    },
    dropdownWrapperShow: {
      position: 'relative',
      width: isDesktop ? 80 : isTablet ? 70 : '100%',
      zIndex: 1000,
    },
    dropdownLabel: {
      fontSize: isDesktop ? 11 : 10,
      fontWeight: '600',
      color: '#64748b',
      marginBottom: 4,
    },
    dropdownButtonSort: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      gap: isDesktop ? 8 : 6,
    },
    dropdownButtonShow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 8 : 6,
      paddingVertical: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      gap: 4,
    },
    dropdownButtonText: {
      flex: 1,
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownButtonTextShow: {
      flex: 1,
      fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenu: {
      position: 'absolute',
      top: 62,
      right: 0,
      minWidth: 120,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 10000,
      maxHeight: 180,
    },
    dropdownMenuShow: {
      position: 'absolute',
      top: 62,
      right: 0,
      minWidth: 80,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 10000,
      maxHeight: 180,
    },
    dropdownMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    dropdownMenuItemActive: {
      backgroundColor: '#f8fafc',
    },
    dropdownMenuItemText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenuItemTextActive: {
      fontWeight: '600',
      color: '#06b6d4',
    },
    // Table Styles
    tableWrapper: {
      marginBottom: 12,
    },
    tableScrollView: {
      width: '100%',
    },
    tableContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#6366f1',
      borderBottomWidth: 2,
      borderBottomColor: '#4f46e5',
    },
    tableHeaderCell: {
      paddingVertical: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tableHeaderText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    tableRowEven: {
      backgroundColor: '#ffffff',
    },
    tableRowOdd: {
      backgroundColor: '#fafafa',
    },
    tableCell: {
      paddingVertical: isDesktop ? 14 : isTablet ? 12 : 10,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      justifyContent: 'center',
    },
    tableCellText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#0f172a',
      fontWeight: '500',
    },
    // Pagination Styles
    paginationContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isDesktop ? 'center' : 'flex-start',
      marginTop: isDesktop ? 20 : isTablet ? 16 : 12,
      paddingTop: isDesktop ? 20 : isTablet ? 16 : 12,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
    },
    paginationInfo: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#64748b',
      fontWeight: '500',
    },
    paginationButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    paginationButton: {
      width: isDesktop ? 36 : isTablet ? 34 : 32,
      height: isDesktop ? 36 : isTablet ? 34 : 32,
      borderRadius: 8,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationButtonDisabled: {
      backgroundColor: '#f8fafc',
      opacity: 0.5,
    },
    paginationText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#0f172a',
      marginHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
    },
  });
};