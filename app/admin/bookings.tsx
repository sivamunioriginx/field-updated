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

interface Booking {
  id: number;
  booking_id: string;
  worker_id: number;
  user_id: number;
  contact_number: string;
  work_location: string;
  booking_time: string;
  status: number;
  payment_status: number;
  created_at: string;
  description: string;
  worker_name: string;
  worker_mobile: string;
  customer_name: string;
  customer_mobile: string;
}

interface BookingsProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Bookings({ searchQuery: externalSearchQuery, onSearchChange }: BookingsProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(API_ENDPOINTS.ADMIN_BOOKINGS);
      
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings);
        setCurrentPage(1); // Reset to first page when data loads
      } else {
        console.error('❌ Failed to fetch bookings:', data.message);
        setBookings([]);
      }
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

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

  // Get status label
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1: return 'InProgress';
      case 2: return 'Completed';
      case 3: return 'Reject';
      default: return 'Unknown';
    }
  };

  // Get status color
  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' }; // Blue for InProgress
      case 2: return { bg: '#f3e8ff', border: '#c084fc', text: '#9333ea' }; // Purple for Completed
      case 3: return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }; // Red for Reject
      default: return { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' };
    }
  };

  // Filter and sort bookings
  const getFilteredAndSortedBookings = () => {
    let filtered = [...bookings];

    // Apply status filter
    if (statusFilter === 'reject') {
      // Reject: Only include booking_ids where ALL records have status = 3
      const bookingsByBookingId = new Map<string, Booking[]>();
      
      // Group bookings by booking_id
      filtered.forEach(booking => {
        if (!bookingsByBookingId.has(booking.booking_id)) {
          bookingsByBookingId.set(booking.booking_id, []);
        }
        bookingsByBookingId.get(booking.booking_id)!.push(booking);
      });
      
      // Filter: Only keep booking_ids where ALL records have status = 3
      const rejectedBookingIds = new Set<string>();
      bookingsByBookingId.forEach((bookingGroup, bookingId) => {
        const allRejected = bookingGroup.every(booking => booking.status === 3);
        if (allRejected) {
          rejectedBookingIds.add(bookingId);
        }
      });
      
      // Keep only bookings with rejected booking_ids
      filtered = filtered.filter(booking => rejectedBookingIds.has(booking.booking_id));
    } else {
      // For all other filters, require payment_status = 1
      filtered = filtered.filter(booking => booking.payment_status === 1);
      
      if (statusFilter === 'inprogress') {
        // InProgress: status = 1 AND payment_status = 1
        filtered = filtered.filter(booking => booking.status === 1);
      } else if (statusFilter === 'completed') {
        // Completed: status = 2 AND payment_status = 1
        filtered = filtered.filter(booking => booking.status === 2);
      }
      // For 'all', we only filter by payment_status = 1 (already applied above)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.booking_id.toLowerCase().includes(query) ||
        (booking.worker_name && booking.worker_name.toLowerCase().includes(query)) ||
        (booking.customer_name && booking.customer_name.toLowerCase().includes(query)) ||
        (booking.contact_number && booking.contact_number.includes(query)) ||
        (booking.work_location && booking.work_location.toLowerCase().includes(query)) ||
        (booking.description && booking.description.toLowerCase().includes(query))
      );
    }

    // Deduplicate by booking_id - keep only the latest record for each booking_id
    const bookingsMap = new Map<string, Booking>();
    filtered.forEach(booking => {
      const existing = bookingsMap.get(booking.booking_id);
      if (!existing) {
        bookingsMap.set(booking.booking_id, booking);
      } else {
        // Compare by created_at to get the latest one
        const existingTime = new Date(existing.created_at).getTime();
        const currentTime = new Date(booking.created_at).getTime();
        if (currentTime > existingTime) {
          bookingsMap.set(booking.booking_id, booking);
        }
      }
    });
    filtered = Array.from(bookingsMap.values());

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'desc':
          return new Date(b.booking_time).getTime() - new Date(a.booking_time).getTime();
        case 'asc':
          return new Date(a.booking_time).getTime() - new Date(b.booking_time).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Pagination logic
  const getPaginatedBookings = () => {
    const filtered = getFilteredAndSortedBookings();
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
    : Math.ceil(getFilteredAndSortedBookings().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'inprogress', label: 'InProgress' },
    { value: 'completed', label: 'Completed' },
    { value: 'reject', label: 'Reject' },
  ];

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
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Active Bookings</Text>
        <Text style={styles.emptyText}>There are no bookings with active status at the moment.</Text>
      </View>
    );
  }

  const filteredBookings = getFilteredAndSortedBookings();
  const paginatedBookings = getPaginatedBookings();

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      scrollEnabled={true}
      bounces={true}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f59e0b']} />
      }
    >
      <View style={styles.bookingsContainer}>
        <View style={styles.bookingsHeader}>
          <View style={styles.controlsRow}>
            {/* Left side - Title */}
            <Text style={styles.bookingsTitle}>
              Bookings
            </Text>
            
            {/* Right side - Status, Sort and Records */}
            <View style={styles.controlsRight}>
              {/* Status Filter */}
              <View style={styles.statusFilterContainer}>
                <Text style={styles.filterLabel}>Status:</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.statusOptionsScroll}
                >
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        statusFilter === option.value && styles.statusOptionActive
                      ]}
                      onPress={() => {
                        setStatusFilter(option.value);
                        setCurrentPage(1);
                      }}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        statusFilter === option.value && styles.statusOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

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
                  <Ionicons name="swap-vertical" size={16} color="#64748b" />
                  <Text style={styles.dropdownButtonText}>
                    {sortOptions.find(opt => opt.value === sortBy)?.label}
                  </Text>
                  <Ionicons 
                    name={showSortDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
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
                          <Ionicons name="checkmark" size={16} color="#6366f1" />
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
                  <Ionicons name="list" size={14} color="#64748b" />
                  <Text style={styles.dropdownButtonTextShow}>
                    {recordsPerPage === 'ALL' ? 'ALL' : recordsPerPage}
                  </Text>
                  <Ionicons 
                    name={showRecordsDropdown ? "chevron-up" : "chevron-down"} 
                    size={14} 
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
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 140 : isTablet ? 120 : 100 }]}>
                <Ionicons name="bookmark" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Booking ID</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 120 : isTablet ? 100 : 90 }]}>
                <Ionicons name="information-circle" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Status</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 130 }]}>
                <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Worker Name</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 130 }]}>
                <Ionicons name="people" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Customer Name</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 130 : 120 }]}>
                <Ionicons name="call" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Contact Number</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 250 : isTablet ? 200 : 180 }]}>
                <Ionicons name="location" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Work Location</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                <Ionicons name="calendar" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Booking Date</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 300 : isTablet ? 250 : 200 }]}>
                <Ionicons name="document-text" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Description</Text>
              </View>
            </View>

            {/* Table Body */}
            {paginatedBookings.map((booking, index) => {
              const statusColors = getStatusColor(booking.status);
              const serialNumber = recordsPerPage === 'ALL' 
                ? index + 1 
                : (currentPage - 1) * recordsPerPage + index + 1;
              return (
                <View 
                  key={booking.id} 
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                  ]}
                >
                  <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                    <Text style={styles.tableCellText}>{serialNumber}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 140 : isTablet ? 120 : 100 }]}>
                    <Text style={styles.tableCellText}>#{booking.booking_id}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 120 : isTablet ? 100 : 90 }]}>
                    <View style={[styles.tableStatusBadge, { 
                      backgroundColor: statusColors.bg,
                      borderColor: statusColors.border
                    }]}>
                      <Text style={[styles.tableStatusText, { color: statusColors.text }]}>
                        {getStatusLabel(booking.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 130 }]}>
                    <Text style={styles.tableCellText}>{booking.worker_name || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 130 }]}>
                    <Text style={styles.tableCellText}>{booking.customer_name || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 130 : 120 }]}>
                    <Text style={styles.tableCellText}>{booking.contact_number || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 250 : isTablet ? 200 : 180 }]}>
                    <Text style={styles.tableCellText}>{booking.work_location || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Text style={styles.tableCellText}>{formatDate(booking.booking_time)}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 250 : 200 }]}>
                    <Text style={styles.tableCellText}>{booking.description || 'N/A'}</Text>
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
              ? `Showing all ${filteredBookings.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredBookings.length);
                  return `Showing ${start} to ${end} of ${filteredBookings.length} entries`;
                })()
            }
          </Text>
          
          <View style={styles.paginationButtons}>
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="play-back" size={16} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>

            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages || 1}
            </Text>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="play-forward" size={16} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
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
      paddingBottom: isDesktop ? 40 : isTablet ? 32 : 24,
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
    bookingsContainer: {
      width: '100%',
    },
    bookingsHeader: {
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    bookingsTitle: {
      fontSize: isDesktop ? 24 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      paddingBottom: 2,
      flexShrink: 1,
    },
    statusFilterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: isMobile ? 36 : 38,
      paddingTop: isMobile ? 0 : 22,
      width: isMobile ? '100%' : 'auto',
    },
    filterLabel: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '600',
      color: '#64748b',
      marginRight: 8,
      marginBottom: isMobile ? 4 : 0,
    },
    statusOptionsScroll: {
      flexGrow: 0,
    },
    statusOption: {
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 8 : 6,
      marginRight: 6,
      borderRadius: 8,
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      height: isMobile ? 36 : 38,
      justifyContent: 'center',
    },
    statusOptionActive: {
      backgroundColor: '#f59e0b',
      borderColor: '#f59e0b',
    },
    statusOptionText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '600',
      color: '#64748b',
    },
    statusOptionTextActive: {
      color: '#ffffff',
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
      color: '#6366f1',
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
      paddingVertical: 16,
      paddingHorizontal: 12,
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
    tableStatusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    tableStatusText: {
      fontSize: isDesktop ? 11 : isTablet ? 10 : 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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

