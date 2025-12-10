import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function AdminIndexScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('adminUser');
      router.replace('/admin');
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/admin');
    }
  };

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
    if (activeMenu === 'bookings') {
      fetchBookings();
    }
  }, [activeMenu]);

  const menuItems = [
    { id: 'dashboard', icon: 'grid-outline', label: 'Dashboard', color: '#6366f1' },
    { id: 'bookings', icon: 'cart-outline', label: 'Bookings', color: '#f59e0b' },
    { id: 'users', icon: 'people-outline', label: 'Users', color: '#8b5cf6' },
    { id: 'analytics', icon: 'analytics-outline', label: 'Analytics', color: '#06b6d4' },
    { id: 'products', icon: 'cube-outline', label: 'Products', color: '#10b981' },
    { id: 'reports', icon: 'document-text-outline', label: 'Reports', color: '#ef4444' },
    { id: 'messages', icon: 'mail-outline', label: 'Messages', color: '#ec4899' },
    { id: 'settings', icon: 'settings-outline', label: 'Settings', color: '#64748b' },
    { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', color: '#f97316' },
    { id: 'help', icon: 'help-circle-outline', label: 'Help & Support', color: '#14b8a6' },
  ];

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

  const renderBookingsContent = () => {
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
      <View style={styles.bookingsContainer}>
        <View style={styles.bookingsHeader}>
          <View style={styles.controlsRow}>
            {/* Left side - Title */}
            <Text style={styles.bookingsTitle}>
              Bookings ({filteredBookings.length}{bookings.length !== filteredBookings.length ? ` of ${bookings.length}` : ''})
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

        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => {
            setShowSortDropdown(false);
            setShowRecordsDropdown(false);
          }}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true} 
            style={styles.tableScrollView}
            persistentScrollbar={true}
          >
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 80 }]}>
                <Ionicons name="list" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>S NO</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 140 }]}>
                <Ionicons name="bookmark" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Booking ID</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 120 }]}>
                <Ionicons name="information-circle" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Status</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 180 }]}>
                <Ionicons name="person" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Worker Name</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 180 }]}>
                <Ionicons name="people" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Customer Name</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 150 }]}>
                <Ionicons name="call" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Contact Number</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 250 }]}>
                <Ionicons name="location" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Work Location</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 180 }]}>
                <Ionicons name="calendar" size={16} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Booking Date</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: 300 }]}>
                <Ionicons name="document-text" size={16} color="#ffffff" />
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
                  <View style={[styles.tableCell, { width: 80 }]}>
                    <Text style={styles.tableCellText}>{serialNumber}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 140 }]}>
                    <Text style={styles.tableCellText}>#{booking.booking_id}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 120 }]}>
                    <View style={[styles.tableStatusBadge, { 
                      backgroundColor: statusColors.bg,
                      borderColor: statusColors.border
                    }]}>
                      <Text style={[styles.tableStatusText, { color: statusColors.text }]}>
                        {getStatusLabel(booking.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { width: 180 }]}>
                    <Text style={styles.tableCellText}>{booking.worker_name || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 180 }]}>
                    <Text style={styles.tableCellText}>{booking.customer_name || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 150 }]}>
                    <Text style={styles.tableCellText}>{booking.contact_number || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 250 }]}>
                    <Text style={styles.tableCellText}>{booking.work_location || 'N/A'}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 180 }]}>
                    <Text style={styles.tableCellText}>{formatDate(booking.booking_time)}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 300 }]}>
                    <Text style={styles.tableCellText}>{booking.description || 'N/A'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
        </TouchableOpacity>

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
    );
  };

  const styles = createStyles(width, height);
  const isDesktop = width > 768;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainWrapper}>
        {/* Sidebar */}
        <View style={[styles.sidebar, isDesktop ? styles.sidebarDesktop : styles.sidebarMobile]}>
          <View style={styles.sidebarContent}>
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/images/OriginX.png')}
                    style={styles.sidebarLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuSectionTitle}>MAIN MENU</Text>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    activeMenu === item.id && styles.menuItemActive
                  ]}
                  onPress={() => setActiveMenu(item.id)}
                >
                  <View style={[
                    styles.iconContainer,
                    activeMenu === item.id && { backgroundColor: item.color }
                  ]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={activeMenu === item.id ? '#fff' : item.color}
                    />
                  </View>
                  <Text style={[
                    styles.menuLabel,
                    activeMenu === item.id && styles.menuLabelActive
                  ]}>
                    {item.label}
                  </Text>
                  {activeMenu === item.id && (
                    <View style={[styles.activeIndicator, { backgroundColor: item.color }]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarContent}>
              <View style={styles.topBarLeft}>
                <Text style={styles.topBarTitle}>
                  {activeMenu === 'bookings' ? 'Bookings Management' : 'Dashboard Overview'}
                </Text>
                <View style={styles.breadcrumb}>
                  <Text style={styles.breadcrumbText}>Home</Text>
                  <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                  <Text style={styles.breadcrumbActive}>
                    {menuItems.find(item => item.id === activeMenu)?.label || 'Dashboard'}
                  </Text>
                </View>
              </View>
              <View style={styles.topBarRight}>
                <View style={styles.topBarSearchContainer}>
                  <Ionicons name="search-outline" size={18} color="#64748b" style={styles.topBarSearchIcon} />
                  <TextInput
                    style={[styles.topBarSearchInput, { outlineWidth: 0, outlineStyle: 'none' } as any]}
                    placeholder="Search bookings..."
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      setCurrentPage(1);
                    }}
                    underlineColorAndroid="transparent"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setSearchQuery('')} 
                      style={styles.topBarSearchClear}
                    >
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={styles.iconButton}>
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>5</Text>
                  </View>
                  <Ionicons name="notifications-outline" size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileButton}>
                  <View style={styles.profileAvatar}>
                    <Ionicons name="person" size={18} color="#6366f1" />
                  </View>
                  <Text style={styles.profileName}>Admin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Content Area */}
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              activeMenu === 'bookings' ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f59e0b']} />
              ) : undefined
            }
          >
            <View style={styles.contentWrapper}>
              {activeMenu === 'bookings' ? (
                renderBookingsContent()
              ) : (
                <>
                  {/* Welcome Section */}
                  <View style={styles.welcomeSection}>
                    <View>
                      <Text style={styles.welcomeText}>Welcome back! 👋</Text>
                      <Text style={styles.subtitleText}>Here's what's happening with your platform today.</Text>
                    </View>
                    <TouchableOpacity style={styles.exportButton}>
                      <Ionicons name="download-outline" size={18} color="#6366f1" />
                      <Text style={styles.exportText}>Export</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Stats Cards */}
                  <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#6366f1' }]}>
                        <Ionicons name="people" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>Total Users</Text>
                        <Text style={styles.statValue}>1,234</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-up" size={14} color="#10b981" />
                          <Text style={styles.statChangeText}>+12.5%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#06b6d4' }]}>
                        <Ionicons name="bar-chart" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>Active Today</Text>
                        <Text style={styles.statValue}>567</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-up" size={14} color="#10b981" />
                          <Text style={styles.statChangeText}>+8.2%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#10b981' }]}>
                        <Ionicons name="trending-up" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>Growth Rate</Text>
                        <Text style={styles.statValue}>89%</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-up" size={14} color="#10b981" />
                          <Text style={styles.statChangeText}>+5.1%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#fed7aa' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b' }]}>
                        <Ionicons name="notifications" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>New Alerts</Text>
                        <Text style={styles.statValue}>23</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-down" size={14} color="#ef4444" />
                          <Text style={[styles.statChangeText, { color: '#ef4444' }]}>-2.4%</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#ede9fe' }]}>
                          <Ionicons name="person-add" size={20} color="#6366f1" />
                        </View>
                        <Text style={styles.quickActionText}>Add User</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#dbeafe' }]}>
                          <Ionicons name="create" size={20} color="#06b6d4" />
                        </View>
                        <Text style={styles.quickActionText}>New Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#d1fae5' }]}>
                          <Ionicons name="mail" size={20} color="#10b981" />
                        </View>
                        <Text style={styles.quickActionText}>Send Email</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#fecaca' }]}>
                          <Ionicons name="settings" size={20} color="#ef4444" />
                        </View>
                        <Text style={styles.quickActionText}>Settings</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (width: number, height: number) => {
  const isDesktop = width > 768;
  const sidebarWidth = isDesktop ? 280 : 260;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f1f5f9',
    },
    mainWrapper: {
      flex: 1,
      flexDirection: 'row',
    },
    sidebar: {
      height: '100%',
      backgroundColor: '#ffffff',
      borderRightWidth: 1,
      borderRightColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    sidebarDesktop: {
      width: sidebarWidth,
    },
    sidebarMobile: {
      width: 260,
    },
    sidebarContent: {
      flex: 1,
      paddingTop: 24,
      paddingBottom: 20,
    },
    sidebarHeader: {
      paddingHorizontal: 20,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      marginBottom: 24,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 16,
    },
    logoContainer: {
      width: '100%',
      alignItems: 'center',
    },
    sidebarLogo: {
      width: isDesktop ? 140 : 120,
      height: 45,
    },
    menuContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    menuSectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#94a3b8',
      letterSpacing: 1,
      marginBottom: 12,
      marginLeft: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 4,
      borderRadius: 12,
      position: 'relative',
    },
    menuItemActive: {
      backgroundColor: '#f8fafc',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#64748b',
      flex: 1,
    },
    menuLabelActive: {
      color: '#0f172a',
      fontWeight: '600',
    },
    activeIndicator: {
      width: 4,
      height: 20,
      borderRadius: 2,
      position: 'absolute',
      right: 0,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: '#fef2f2',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#fee2e2',
    },
    logoutIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ef4444',
    },
    mainContent: {
      flex: 1,
      backgroundColor: '#f1f5f9',
    },
    topBar: {
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 32 : 20,
      paddingVertical: isDesktop ? 20 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 1,
    },
    topBarContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    topBarLeft: {
      flex: 1,
    },
    topBarTitle: {
      fontSize: isDesktop ? 24 : 20,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 4,
    },
    breadcrumb: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    breadcrumbText: {
      fontSize: 13,
      color: '#94a3b8',
    },
    breadcrumbActive: {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '600',
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    topBarSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: 12,
      height: 40,
      width: isDesktop ? 300 : 200,
      gap: 8,
    },
    topBarSearchIcon: {
      marginRight: 0,
    },
    topBarSearchInput: {
      flex: 1,
      fontSize: 14,
      color: '#0f172a',
      height: '100%',
    },
    topBarSearchClear: {
      padding: 2,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    notificationBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: '#ef4444',
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: '#fff',
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
    profileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#f8fafc',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    profileAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#ede9fe',
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0f172a',
    },
    content: {
      flex: 1,
    },
    contentWrapper: {
      padding: isDesktop ? 32 : 20,
    },
    welcomeSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    welcomeText: {
      fontSize: isDesktop ? 28 : 24,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 6,
    },
    subtitleText: {
      fontSize: isDesktop ? 15 : 14,
      color: '#64748b',
      lineHeight: 22,
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    exportText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#6366f1',
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 32,
    },
    statCard: {
      flex: 1,
      minWidth: isDesktop ? 240 : '100%',
      padding: 20,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    statIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statInfo: {
      flex: 1,
    },
    statLabel: {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '500',
      marginBottom: 4,
    },
    statValue: {
      fontSize: isDesktop ? 28 : 24,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 6,
    },
    statChange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statChangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10b981',
    },
    quickActionsContainer: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 16,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickAction: {
      flex: 1,
      minWidth: isDesktop ? 140 : 150,
      backgroundColor: '#ffffff',
      padding: 20,
      borderRadius: 14,
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#0f172a',
    },
    // Bookings Styles
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
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
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 15,
      color: '#64748b',
      textAlign: 'center',
      maxWidth: 300,
    },
    bookingsContainer: {
      flex: 1,
    },
    bookingsHeader: {
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    bookingsTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#0f172a',
      paddingBottom: 2,
    },
    statusFilterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 38,
      paddingTop: 22,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748b',
      marginRight: 8,
    },
    statusOptionsScroll: {
      flexGrow: 0,
    },
    statusOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 6,
      borderRadius: 8,
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      height: 38,
      justifyContent: 'center',
    },
    statusOptionActive: {
      backgroundColor: '#f59e0b',
      borderColor: '#f59e0b',
    },
    statusOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748b',
    },
    statusOptionTextActive: {
      color: '#ffffff',
    },
    controlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    controlsRight: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      zIndex: 500,
      overflow: 'visible',
    },
    dropdownWrapper: {
      position: 'relative',
      width: isDesktop ? 110 : 100,
      zIndex: 1000,
    },
    dropdownWrapperSort: {
      position: 'relative',
      width: isDesktop ? 160 : 140,
      zIndex: 1000,
    },
    dropdownWrapperShow: {
      position: 'relative',
      width: isDesktop ? 80 : 70,
      zIndex: 1000,
    },
    dropdownLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: '#64748b',
      marginBottom: 4,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: 10,
      paddingVertical: 8,
      height: 38,
      gap: 6,
    },
    dropdownButtonSort: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: 12,
      paddingVertical: 8,
      height: 38,
      gap: 8,
    },
    dropdownButtonShow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: 8,
      paddingVertical: 8,
      height: 38,
      gap: 4,
    },
    dropdownButtonText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownButtonTextShow: {
      flex: 1,
      fontSize: 12,
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
      fontSize: 12,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenuItemTextActive: {
      fontWeight: '600',
      color: '#6366f1',
    },
    // Table Styles
    tableScrollView: {
      flex: 1,
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
      fontSize: 13,
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
      paddingVertical: 14,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    tableCellText: {
      fontSize: 14,
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
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Pagination Styles
    paginationContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isDesktop ? 'center' : 'flex-start',
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      gap: 12,
    },
    paginationInfo: {
      fontSize: 14,
      color: '#64748b',
      fontWeight: '500',
    },
    paginationButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    paginationButton: {
      width: 36,
      height: 36,
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
      fontSize: 14,
      fontWeight: '600',
      color: '#0f172a',
      marginHorizontal: 12,
    },
  });
};