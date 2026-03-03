import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import { API_ENDPOINTS, BASE_URL } from '../../constants/api';

interface Customer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  pincode: string;
  address: string;
  mandal: string;
  city: string;
  district: string;
  state: string;
  country: string;
  profile_image?: string;
  document1?: string;
}

interface CustomersProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Customers({ searchQuery: externalSearchQuery, onSearchChange }: CustomersProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      console.log('📡 Fetching customers from:', API_ENDPOINTS.ADMIN_CUSTOMERS);
      const response = await fetch(API_ENDPOINTS.ADMIN_CUSTOMERS);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setCustomers([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Customers response:', data);
      
      if (data.success) {
        const customersData = data.customers || data.data || [];
        console.log('✅ Customers fetched:', customersData.length, 'records');
        setCustomers(customersData);
        setCurrentPage(1);
      } else {
        console.error('❌ Failed to fetch customers:', data.message);
        setCustomers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatAddress = (customer: Customer) => {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.mandal) parts.push(customer.mandal);
    if (customer.city) parts.push(customer.city);
    if (customer.district) parts.push(customer.district);
    if (customer.state) parts.push(customer.state);
    if (customer.country) parts.push(customer.country);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Filter and sort customers
  const getFilteredAndSortedCustomers = () => {
    let filtered = [...customers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(query) ||
        customer.mobile.includes(query) ||
        (customer.email && customer.email.toLowerCase().includes(query)) ||
        (customer.pincode && customer.pincode.includes(query)) ||
        formatAddress(customer).toLowerCase().includes(query)
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
  const getPaginatedCustomers = () => {
    const filtered = getFilteredAndSortedCustomers();
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
    : Math.ceil(getFilteredAndSortedCustomers().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

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

  const handleView = (customer: Customer) => {
    setViewingCustomer(customer);
    setOpenMenuId(null);
  };

  const handleDelete = (customer: Customer) => {
    setDeleteConfirmCustomer(customer);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmCustomer) return;
    try {
      setDeleting(true);
      const response = await fetch(`${API_ENDPOINTS.ADMIN_CUSTOMERS}/${deleteConfirmCustomer.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setCustomers(prev => prev.filter(c => c.id !== deleteConfirmCustomer.id));
        setDeleteConfirmCustomer(null);
        Toast.show({ type: 'success', text1: 'Deleted', text2: 'Customer deleted successfully.' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message || 'Failed to delete customer.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete customer.' });
    } finally {
      setDeleting(false);
    }
  };

  const styles = createStyles(width, height);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  if (customers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="people-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Customers Found</Text>
        <Text style={styles.emptyText}>There are no customers available at the moment.</Text>
      </View>
    );
  }

  const filteredCustomers = getFilteredAndSortedCustomers();
  const paginatedCustomers = getPaginatedCustomers();

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
      onScroll={() => setOpenMenuId(null)}
      scrollEventThrottle={16}
    >
      <View style={styles.customersContainer}>
        <View style={styles.customersHeader}>
          <View style={styles.controlsRow}>
            {/* Left side - Title */}
            <Text style={styles.customersTitle}>
              Customers
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

        <TouchableWithoutFeedback onPress={() => setOpenMenuId(null)}>
          <View style={styles.tableWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true} 
            style={styles.tableScrollView}
            persistentScrollbar={true}
            nestedScrollEnabled={true}
            onScrollBeginDrag={() => setOpenMenuId(null)}
          >
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 40 : isTablet ? 30 : 20 }]}>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 200 : isTablet ? 190 : 170 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 130 : 120 }]}>
                  <Ionicons name="call" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Mobile</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 220 : isTablet ? 200 : 180 }]}>
                  <Ionicons name="mail" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Email</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 120 : isTablet ? 110 : 100 }]}>
                  <Ionicons name="location" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Pincode</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 400 : isTablet ? 350 : 300 }]}>
                  <Ionicons name="home" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Address</Text>
                </View>
              </View>

              {/* Table Body */}
              {paginatedCustomers.map((customer, index) => {
                const isMenuOpen = openMenuId === customer.id;
                const shouldOpenUpward = index >= paginatedCustomers.length - 2;
                const isLastRow = index === paginatedCustomers.length - 1;
                return (
                  <View 
                    key={customer.id} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                      isMenuOpen && styles.tableRowActive,
                      isLastRow && styles.tableRowLast
                    ]}
                  >
                    <View style={[styles.tableCell, styles.menuCell, { width: isDesktop ? 90 : isTablet ? 80 : 70 }]}>
                      <TouchableOpacity
                        style={styles.menuIconButton}
                        onPress={() => setOpenMenuId(isMenuOpen ? null : customer.id)}
                      >
                        <Ionicons name="menu" size={isDesktop ? 18 : isTablet ? 16 : 14} color="#64748b" />
                      </TouchableOpacity>
                      {isMenuOpen && (
                        <TouchableWithoutFeedback>
                          <View style={[
                            styles.menuDropdown,
                            shouldOpenUpward && styles.menuDropdownUp
                          ]}>
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => handleView(customer)}
                            >
                              <Ionicons name="eye-outline" size={isDesktop ? 16 : 14} color="#06b6d4" />
                              <Text style={styles.menuItemText}>View</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.menuItem, styles.menuItemLast]}
                              onPress={() => handleDelete(customer)}
                            >
                              <Ionicons name="trash-outline" size={isDesktop ? 16 : 14} color="#ef4444" />
                              <Text style={styles.menuItemText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableWithoutFeedback>
                      )}
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 170 : 150 }]}>
                      <Text style={styles.tableCellText}>{customer.name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 130 : 120 }]}>
                      <Text style={styles.tableCellText}>{customer.mobile || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 220 : isTablet ? 200 : 180 }]}>
                      <Text style={styles.tableCellText}>{customer.email || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 120 : isTablet ? 110 : 100 }]}>
                      <Text style={styles.tableCellText}>{customer.pincode || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 400 : isTablet ? 350 : 300 }]}>
                      <Text style={styles.tableCellText}>{formatAddress(customer)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            {recordsPerPage === 'ALL' 
              ? `Showing all ${filteredCustomers.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredCustomers.length);
                  return `Showing ${start} to ${end} of ${filteredCustomers.length} entries`;
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

      {/* Customer View Modal */}
      <Modal
        visible={viewingCustomer !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingCustomer(null)}
      >
        <TouchableWithoutFeedback onPress={() => setViewingCustomer(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                {/* Close Button */}
                <TouchableOpacity onPress={() => setViewingCustomer(null)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={isDesktop ? 22 : 20} color="#ffffff" />
                </TouchableOpacity>

                {/* Profile Section */}
                <View style={styles.modalProfileSection}>
                  {viewingCustomer?.profile_image ? (
                    <Image
                      source={{ uri: `${BASE_URL}/uploads/profiles/${viewingCustomer.profile_image}` }}
                      style={styles.modalAvatarImage}
                    />
                  ) : (
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>
                        {viewingCustomer?.name ? viewingCustomer.name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.modalCustomerName}>{viewingCustomer?.name || 'N/A'}</Text>
                  <Text style={styles.modalCustomerMobile}>{viewingCustomer?.mobile || ''}</Text>
                </View>

                {/* Info Rows */}
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {viewingCustomer && (() => {
                    const addrParts = [
                      viewingCustomer.address,
                      viewingCustomer.mandal,
                      viewingCustomer.city,
                      viewingCustomer.district,
                      viewingCustomer.state,
                      viewingCustomer.country,
                    ].filter(Boolean);
                    const fullAddress = addrParts.length > 0
                      ? addrParts.join(', ') + (viewingCustomer.pincode ? ` - ${viewingCustomer.pincode}` : '')
                      : 'N/A';
                    return (
                      <>
                        <View style={styles.modalRow}>
                          <View style={styles.modalRowIcon}>
                            <Ionicons name="mail-outline" size={isDesktop ? 16 : 14} color="#6366f1" />
                          </View>
                          <View style={styles.modalRowContent}>
                            <Text style={styles.modalRowLabel}>Email</Text>
                            <Text style={styles.modalRowValue}>{viewingCustomer.email || 'N/A'}</Text>
                          </View>
                        </View>
                        <View style={styles.modalRow}>
                          <View style={styles.modalRowIcon}>
                            <Ionicons name="location-outline" size={isDesktop ? 16 : 14} color="#6366f1" />
                          </View>
                          <View style={styles.modalRowContent}>
                            <Text style={styles.modalRowLabel}>Address</Text>
                            <Text style={styles.modalRowValue}>{fullAddress}</Text>
                          </View>
                        </View>
                        {viewingCustomer.document1 && (() => {
                          const firstDoc = viewingCustomer.document1!.split(',')[0].trim();
                          const docUri = `${BASE_URL}/uploads/${firstDoc}`;
                          return (
                            <View style={[styles.modalRow, { borderBottomWidth: 0 }]}>
                              <View style={styles.modalRowIcon}>
                                <Ionicons name="document-outline" size={isDesktop ? 16 : 14} color="#6366f1" />
                              </View>
                              <View style={styles.modalRowContent}>
                                <Text style={styles.modalRowLabel}>Document</Text>
                                <View style={styles.docPreviewRow}>
                                  <Image
                                    source={{ uri: docUri }}
                                    style={styles.docThumb}
                                    resizeMode="cover"
                                  />
                                  <TouchableOpacity
                                    style={styles.docViewBtn}
                                    onPress={() => setViewingDocUrl(docUri)}
                                  >
                                    <Ionicons name="eye-outline" size={isDesktop ? 14 : 13} color="#ffffff" />
                                    <Text style={styles.docViewBtnText}>View</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          );
                        })()}
                      </>
                    );
                  })()}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Document Full-Image Viewer */}
      <Modal
        visible={viewingDocUrl !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingDocUrl(null)}
      >
        <TouchableWithoutFeedback onPress={() => setViewingDocUrl(null)}>
          <View style={styles.docViewerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.docViewerContainer}>
                <TouchableOpacity onPress={() => setViewingDocUrl(null)} style={styles.docViewerClose}>
                  <Ionicons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
                {viewingDocUrl && (
                  <Image
                    source={{ uri: viewingDocUrl }}
                    style={styles.docViewerImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmCustomer !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmCustomer(null)}
      >
        <TouchableWithoutFeedback onPress={() => setDeleteConfirmCustomer(null)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmContainer}>
                <View style={styles.confirmIconWrap}>
                  <Ionicons name="trash" size={isDesktop ? 36 : 32} color="#ef4444" />
                </View>
                <Text style={styles.confirmTitle}>Confirm Customer Deletion?</Text>
                <Text style={styles.confirmMessage}>
                  Are you sure you want to delete{'\n'}<Text style={{ fontWeight: '700', color: '#0f172a' }}>{deleteConfirmCustomer?.name}</Text>?{'\n'}This action cannot be undone.
                </Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={styles.confirmCancelBtn}
                    onPress={() => setDeleteConfirmCustomer(null)}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmDeleteBtn, deleting && { opacity: 0.7 }]}
                    onPress={confirmDelete}
                    disabled={deleting}
                  >
                    {deleting
                      ? <ActivityIndicator size="small" color="#ffffff" />
                      : <Text style={styles.confirmDeleteText}>Delete</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
      overflow: 'visible',
    },
    tableScrollView: {
      width: '100%',
      overflow: 'visible',
    },
    tableContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      overflow: 'visible',
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
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
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
      overflow: 'visible',
    },
    tableRowEven: {
      backgroundColor: '#ffffff',
    },
    tableRowOdd: {
      backgroundColor: '#fafafa',
    },
    tableRowActive: {
      zIndex: 2000,
      overflow: 'visible',
    },
    tableRowLast: {
      borderBottomWidth: 0,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
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
    menuCell: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'visible',
    },
    menuIconButton: {
      padding: isDesktop ? 6 : isTablet ? 5 : 4,
      borderRadius: 6,
      backgroundColor: 'transparent',
    },
    menuDropdown: {
      position: 'absolute',
      top: isDesktop ? 40 : isTablet ? 38 : 36,
      left: 0,
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 10,
      zIndex: 9999,
      minWidth: isDesktop ? 120 : isTablet ? 110 : 100,
      overflow: 'visible',
    },
    menuDropdownUp: {
      top: 'auto' as any,
      bottom: isDesktop ? 40 : isTablet ? 38 : 36,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 10 : isTablet ? 9 : 8,
      gap: isDesktop ? 8 : isTablet ? 7 : 6,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
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
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isDesktop ? 40 : 20,
    },
    modalContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      width: isDesktop ? 420 : isTablet ? 380 : '100%',
      maxHeight: isDesktop ? 560 : 500,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 20,
      overflow: 'hidden',
    },
    modalCloseButton: {
      position: 'absolute',
      top: isDesktop ? 14 : 12,
      right: isDesktop ? 14 : 12,
      zIndex: 10,
      padding: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    modalProfileSection: {
      alignItems: 'center',
      paddingTop: isDesktop ? 22 : 18,
      paddingBottom: isDesktop ? 14 : 12,
      backgroundColor: '#6366f1',
      borderBottomWidth: 0,
    },
    modalAvatarImage: {
      width: isDesktop ? 60 : 52,
      height: isDesktop ? 60 : 52,
      borderRadius: isDesktop ? 30 : 26,
      marginBottom: isDesktop ? 8 : 6,
      borderWidth: 3,
      borderColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    modalAvatar: {
      width: isDesktop ? 60 : 52,
      height: isDesktop ? 60 : 52,
      borderRadius: isDesktop ? 30 : 26,
      backgroundColor: '#8b5cf6',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isDesktop ? 8 : 6,
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    modalAvatarText: {
      fontSize: isDesktop ? 24 : 20,
      fontWeight: '700',
      color: '#ffffff',
    },
    modalCustomerName: {
      fontSize: isDesktop ? 17 : 15,
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: 2,
    },
    modalCustomerMobile: {
      fontSize: isDesktop ? 13 : 12,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
    },
    modalBody: {
      paddingHorizontal: isDesktop ? 24 : 20,
      paddingVertical: isDesktop ? 12 : 10,
    },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: isDesktop ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      gap: 12,
    },
    modalRowIcon: {
      width: isDesktop ? 34 : 30,
      height: isDesktop ? 34 : 30,
      borderRadius: isDesktop ? 17 : 15,
      backgroundColor: '#eef2ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    modalRowContent: {
      flex: 1,
    },
    modalRowLabel: {
      fontSize: isDesktop ? 11 : 10,
      fontWeight: '600',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    modalRowValue: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
      lineHeight: isDesktop ? 20 : 18,
    },
    docPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    docThumb: {
      width: isDesktop ? 220 : 200,
      height: isDesktop ? 50 : 60,
      borderRadius: 8,
      backgroundColor: '#f1f5f9',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    docViewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#6366f1',
      paddingHorizontal: isDesktop ? 14 : 12,
      paddingVertical: isDesktop ? 7 : 6,
      borderRadius: 8,
    },
    docViewBtnText: {
      fontSize: isDesktop ? 13 : 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    docViewerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    docViewerContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    docViewerClose: {
      position: 'absolute',
      top: isDesktop ? 20 : 16,
      right: isDesktop ? 20 : 16,
      zIndex: 10,
      padding: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    docViewerImage: {
      width: '90%',
      height: '80%',
    },
    // Delete Confirmation Styles
    confirmOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    confirmContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      width: isDesktop ? 380 : isTablet ? 340 : '100%',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? 32 : 24,
      paddingVertical: isDesktop ? 32 : 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 20,
    },
    confirmIconWrap: {
      width: isDesktop ? 72 : 64,
      height: isDesktop ? 72 : 64,
      borderRadius: isDesktop ? 36 : 32,
      backgroundColor: '#fee2e2',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isDesktop ? 20 : 16,
    },
    confirmTitle: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: '700',
      color: '#0f172a',
      textAlign: 'center',
      marginBottom: isDesktop ? 10 : 8,
    },
    confirmMessage: {
      fontSize: isDesktop ? 14 : 13,
      color: '#64748b',
      textAlign: 'center',
      lineHeight: isDesktop ? 22 : 20,
      marginBottom: isDesktop ? 28 : 24,
    },
    confirmButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    confirmCancelBtn: {
      flex: 1,
      height: isDesktop ? 46 : 42,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmCancelText: {
      fontSize: isDesktop ? 15 : 14,
      fontWeight: '600',
      color: '#64748b',
    },
    confirmDeleteBtn: {
      flex: 1,
      height: isDesktop ? 46 : 42,
      borderRadius: 12,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmDeleteText: {
      fontSize: isDesktop ? 15 : 14,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
};

