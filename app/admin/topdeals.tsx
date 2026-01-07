import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import { API_ENDPOINTS } from '../../constants/api';

interface Deal {
  id: number;
  service_id: number;
  service_name: string;
  discount: string;
  original_price: number | string;
  deal_price: number | string;
  is_active: number;
  created_at: string;
}

interface Service {
  id: number;
  name: string;
  price: number | string;
}

interface TopDealsProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function TopDeals({ searchQuery: externalSearchQuery, onSearchChange }: TopDealsProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [originalPrice, setOriginalPrice] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [services, setServices] = useState<Service[]>([]);

  // Validation function to allow only positive whole numbers (no decimals)
  const handleNumericInput = (text: string, setter: (value: string) => void) => {
    // Remove any non-numeric characters (no decimals allowed)
    const cleaned = text.replace(/[^0-9]/g, '');
    setter(cleaned);
  };
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<{ id: number; service_name: string } | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [dealToActivate, setDealToActivate] = useState<{ id: number; service_name: string } | null>(null);

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

  const fetchDeals = async () => {
    try {
      setLoading(true);
      
      console.log('📡 Fetching deals from: /api/admin/deals');
      const response = await fetch(`${API_ENDPOINTS.ADMIN_CATEGORIES.replace('/categories', '/deals')}`);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setDeals([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Deals response:', data);
      
      if (data.success) {
        const dealsData = data.deals || data.data || [];
        console.log('✅ Deals fetched:', dealsData.length, 'records');
        setDeals(dealsData);
        setCurrentPage(1);
      } else {
        console.error('❌ Failed to fetch deals:', data.message);
        setDeals([]);
      }
    } catch (error) {
      console.error('❌ Error fetching deals:', error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_SERVICES);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const servicesData = data.services || data.data || [];
          setServices(servicesData.map((service: any) => ({
            id: service.id,
            name: service.name,
            price: service.price || 0
          })));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching services:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeals();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDeals();
    fetchServices();
  }, []);

  // Filter and sort deals
  const getFilteredAndSortedDeals = () => {
    let filtered = [...deals];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal => 
        deal.service_name?.toLowerCase().includes(query) ||
        deal.discount?.toLowerCase().includes(query) ||
        deal.original_price?.toString().includes(query) ||
        deal.deal_price?.toString().includes(query)
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
  const getPaginatedDeals = () => {
    const filtered = getFilteredAndSortedDeals();
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
    : Math.ceil(getFilteredAndSortedDeals().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

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

  const handleEdit = (dealId: number) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setEditingDealId(dealId);
      setSelectedServiceId(deal.service_id);
      setOriginalPrice(deal.original_price.toString());
      setDealPrice(deal.deal_price.toString());
      setDiscount(deal.discount);
      setShowAddModal(true);
    }
  };

  const handleDelete = (dealId: number) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setDealToDelete({ id: dealId, service_name: deal.service_name });
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!dealToDelete) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_ENDPOINTS.ADMIN_CATEGORIES.replace('/categories', `/deals/${dealToDelete.id}`)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: 0 }),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Deal Deactivated Successfully',
        });
        await fetchDeals();
        setShowDeleteModal(false);
        setDealToDelete(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to deactivate deal');
      }
    } catch (error) {
      console.error('❌ Error deactivating deal:', error);
      Alert.alert('Error', 'Failed to deactivate deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDealToDelete(null);
  };

  const handleActivate = (dealId: number) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setDealToActivate({ id: dealId, service_name: deal.service_name });
      setShowActivateModal(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!dealToActivate) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_ENDPOINTS.ADMIN_CATEGORIES.replace('/categories', `/deals/${dealToActivate.id}`)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: 1 }),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Deal Activated Successfully',
        });
        await fetchDeals();
        setShowActivateModal(false);
        setDealToActivate(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to activate deal');
      }
    } catch (error) {
      console.error('❌ Error activating deal:', error);
      Alert.alert('Error', 'Failed to activate deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelActivate = () => {
    setShowActivateModal(false);
    setDealToActivate(null);
  };

  const handleAddDeal = () => {
    setEditingDealId(null);
    setSelectedServiceId(null);
    setOriginalPrice('');
    setDealPrice('');
    setDiscount('');
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingDealId(null);
    setSelectedServiceId(null);
    setOriginalPrice('');
    setDealPrice('');
    setDiscount('');
    setShowServiceDropdown(false);
  };

  const handleSubmitDeal = async () => {
    // Validation
    if (!selectedServiceId) {
      Alert.alert('Validation Error', 'Please select a service');
      return;
    }

    if (!originalPrice.trim() || isNaN(Number(originalPrice))) {
      Alert.alert('Validation Error', 'Please enter valid original price');
      return;
    }

    if (!dealPrice.trim() || isNaN(Number(dealPrice))) {
      Alert.alert('Validation Error', 'Please enter valid deal price');
      return;
    }

    if (!discount.trim()) {
      Alert.alert('Validation Error', 'Please enter discount');
      return;
    }

    const isEditMode = editingDealId !== null;

    // Check for duplicate service (both add and edit mode)
    // In edit mode, exclude the current deal being edited from the check
    const existingDeal = deals.find(deal => 
      deal.service_id === selectedServiceId && 
      (!isEditMode || deal.id !== editingDealId)
    );
    
    if (existingDeal) {
      const serviceName = services.find(s => s.id === selectedServiceId)?.name || 'this service';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `A deal already exists for ${serviceName}. Please select a different service.`,
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        service_id: selectedServiceId,
        original_price: originalPrice,
        deal_price: dealPrice,
        discount: discount,
        is_active: 1
      };

      const endpoint = isEditMode 
        ? `${API_ENDPOINTS.ADMIN_CATEGORIES.replace('/categories', `/deals/${editingDealId}`)}`
        : API_ENDPOINTS.ADMIN_CATEGORIES.replace('/categories', '/deals');
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isEditMode ? 'Deal Updated Successfully' : 'New Deal Created Successfully',
        });
        await fetchDeals();
        handleCloseModal();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || `Failed to ${isEditMode ? 'update' : 'create'} deal`,
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('❌ Error creating deal:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create deal. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(width, height);

  if (loading && deals.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading Top Deals...</Text>
      </View>
    );
  }

  if (deals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="pricetag-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Top Deals Found</Text>
        <Text style={styles.emptyText}>There are no top deals available at the moment.</Text>
      </View>
    );
  }

  const filteredDeals = getFilteredAndSortedDeals();
  const paginatedDeals = getPaginatedDeals();

  return (
    <View style={{ flex: 1 }}>
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
      <View style={styles.customersContainer}>
        <View style={styles.customersHeader}>
          <Text style={styles.customersTitle}>
            Top Deals
          </Text>
        </View>

        <View style={styles.tableWrapper}>
          <View style={styles.tableControlsRow}>
            <View style={styles.controlsRight}>
              {/* Add Deal Button */}
              <View style={styles.addButtonWrapper}>
                <View style={styles.labelSpacer} />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddDeal}
                >
                  <Ionicons name="add" size={isDesktop ? 18 : 16} color="#ffffff" />
                  <Text style={styles.addButtonText}>Add Deal</Text>
                </TouchableOpacity>
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
                          <Ionicons name="checkmark" size={16} color="#f59e0b" />
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
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 200 : isTablet ? 150 : 120 }]}>
                  <Ionicons name="construct" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Service Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 120 : 100 }]}>
                  <Ionicons name="cash" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Original Price</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 120 : 100 }]}>
                  <Ionicons name="pricetag" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Deal Price</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 100 : isTablet ? 90 : 80 }]}>
                  <Ionicons name="stats-chart" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Discount</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 150 : isTablet ? 100 : 80 }]}>
                  <Ionicons name="settings" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Action</Text>
                </View>
              </View>

              {/* Table Body */}
              {paginatedDeals.map((deal, index) => {
                const serialNumber = recordsPerPage === 'ALL' 
                  ? index + 1 
                  : (currentPage - 1) * (typeof recordsPerPage === 'number' ? recordsPerPage : 10) + index + 1;
                return (
                  <View 
                    key={deal.id} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                    ]}
                  >
                    <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                      <Text style={styles.tableCellText}>{serialNumber}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 200 : isTablet ? 150 : 120 }]}>
                      <Text style={styles.tableCellText}>{deal.service_name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 120 : 100 }]}>
                      <Text style={styles.tableCellText}>₹{Number(deal.original_price || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 120 : 100 }]}>
                      <Text style={styles.tableCellText}>₹{Number(deal.deal_price || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 100 : isTablet ? 90 : 80 }]}>
                      <Text style={styles.tableCellText}>{deal.discount || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.actionCell, { width: isDesktop ? 150 : isTablet ? 100 : 80 }]}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleEdit(deal.id)}
                      >
                        <Ionicons name="create-outline" size={isDesktop ? 18 : 16} color="#f59e0b" />
                      </TouchableOpacity>
                      {(deal.is_active === 0) ? (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleActivate(deal.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={isDesktop ? 18 : 16} color="#10b981" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleDelete(deal.id)}
                        >
                          <Ionicons name="trash-outline" size={isDesktop ? 18 : 16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
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
              ? `Showing all ${filteredDeals.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredDeals.length);
                  return `Showing ${start} to ${end} of ${filteredDeals.length} entries`;
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash" size={isDesktop ? 32 : 28} color="#ef4444" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Deactivate Deal?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Deactivate {dealToDelete?.service_name || 'This'} Deal?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Deactivate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activate Confirmation Modal */}
      <Modal
        visible={showActivateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelActivate}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={styles.activateIconCircle}>
                <Ionicons name="checkmark-circle" size={isDesktop ? 32 : 28} color="#10b981" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Activate Deal?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Activate {dealToActivate?.service_name || 'This'} Deal?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={handleCancelActivate}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activateConfirmButton}
                onPress={handleConfirmActivate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.activateConfirmButtonText}>Activate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Deal Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDealId ? 'Edit Deal' : 'Add New Deal'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Service Selection */}
              <View style={[styles.modalField, { zIndex: 10000 }]}>
                <Text style={styles.modalLabel}>Service</Text>
                <View style={styles.serviceDropdownWrapper}>
                  <TouchableOpacity
                    style={styles.serviceDropdownButton}
                    onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                  >
                    <Text style={styles.serviceDropdownText}>
                      {selectedServiceId 
                        ? services.find(s => s.id === selectedServiceId)?.name || 'Select Service'
                        : 'Select Service'}
                    </Text>
                    <Ionicons
                      name={showServiceDropdown ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                  {showServiceDropdown && (
                    <View style={styles.serviceDropdownMenu}>
                      <ScrollView 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        style={styles.serviceDropdownScrollView}
                      >
                        {services.map((service) => (
                          <TouchableOpacity
                            key={service.id}
                            style={[
                              styles.serviceDropdownItem,
                              selectedServiceId === service.id && styles.serviceDropdownItemActive
                            ]}
                            onPress={() => {
                              setSelectedServiceId(service.id);
                              // Auto-fill original price from service price
                              const servicePrice = Number(service.price || 0);
                              setOriginalPrice(servicePrice > 0 ? Math.floor(servicePrice).toString() : '');
                              setShowServiceDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.serviceDropdownItemText,
                              selectedServiceId === service.id && styles.serviceDropdownItemTextActive
                            ]}>
                              {service.name}
                            </Text>
                            {selectedServiceId === service.id && (
                              <Ionicons name="checkmark" size={20} color="#f59e0b" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Original Price */}
              <View style={[styles.modalField, { zIndex: 1 }]}>
                <Text style={styles.modalLabel}>Original Price</Text>
                <TextInput
                  style={[styles.modalInput, selectedServiceId ? styles.modalInputDisabled : null]}
                  placeholder="Select service to auto-fill"
                  placeholderTextColor="#94a3b8"
                  value={originalPrice}
                  onChangeText={(text) => handleNumericInput(text, setOriginalPrice)}
                  keyboardType="number-pad"
                  editable={!selectedServiceId}
                />
              </View>

              {/* Deal Price */}
              <View style={[styles.modalField, { zIndex: 1 }]}>
                <Text style={styles.modalLabel}>Deal Price</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter deal price"
                  placeholderTextColor="#94a3b8"
                  value={dealPrice}
                  onChangeText={(text) => handleNumericInput(text, setDealPrice)}
                  keyboardType="number-pad"
                />
              </View>

              {/* Discount */}
              <View style={[styles.modalField, { zIndex: 1 }]}>
                <Text style={styles.modalLabel}>Discount</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter discount"
                  placeholderTextColor="#94a3b8"
                  value={discount}
                  onChangeText={(text) => handleNumericInput(text, setDiscount)}
                  keyboardType="number-pad"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton, 
                  (loading || !selectedServiceId || !originalPrice.trim() || !dealPrice.trim() || !discount.trim()) && styles.modalSubmitButtonDisabled
                ]}
                onPress={handleSubmitDeal}
                disabled={loading || !selectedServiceId || !originalPrice.trim() || !dealPrice.trim() || !discount.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
      marginBottom: -20,
      zIndex: 500,
      overflow: 'visible',
    },
    customersTitle: {
      fontSize: isDesktop ? 24 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      paddingBottom: 2,
      flexShrink: 0,
    },
    tableControlsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    controlsRight: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 8,
      alignItems: 'flex-end',
      width: isMobile ? '100%' : 'auto',
      zIndex: 500,
      overflow: 'visible',
      flexShrink: 1,
      marginRight: isDesktop ? 105 : isTablet ? 30 : 20,
    },
    addButtonWrapper: {
      position: 'relative',
      zIndex: 1000,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    labelSpacer: {
      height: 20,
      marginBottom: 0,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f59e0b',
      borderRadius: 10,
      paddingHorizontal: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingVertical: isDesktop ? 10 : isTablet ? 8 : 6,
      gap: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      flexShrink: 0,
      justifyContent: 'center',
    },
    addButtonText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    dropdownWrapperSort: {
      position: 'relative',
      width: isDesktop ? 150 : isTablet ? 130 : '100%',
      zIndex: 1000,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    dropdownWrapperShow: {
      position: 'relative',
      width: isDesktop ? 75 : isTablet ? 65 : '100%',
      zIndex: 1000,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    dropdownLabel: {
      fontSize: isDesktop ? 11 : 10,
      fontWeight: '600',
      color: '#64748b',
      marginBottom: 4,
      height: 16,
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
      justifyContent: 'center',
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
      justifyContent: 'center',
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
      color: '#f59e0b',
    },
    tableWrapper: {
      marginBottom: 12,
      marginLeft: isDesktop ? 175 : isTablet ? 130 : 110,
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
    actionCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
      justifyContent: 'center',
    },
    actionButton: {
      padding: isDesktop ? 6 : isTablet ? 5 : 4,
      borderRadius: 6,
      backgroundColor: '#f8fafc',
    },
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: isDesktop ? 550 : isTablet ? 480 : width - 40,
      maxHeight: height * 0.98,
      backgroundColor: '#ffffff',
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
      backgroundColor: '#6366f1',
      borderBottomWidth: 0,
    },
    modalTitle: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#ffffff',
    },
    modalCloseButton: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    modalBody: {
      maxHeight: height * 0.85,
      padding: isDesktop ? 24 : isTablet ? 20 : 18,
      backgroundColor: '#f8fafc',
      overflow: 'visible',
    },
    modalField: {
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
      overflow: 'visible',
    },
    modalLabel: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: 8,
    },
    modalInput: {
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },
    modalInputDisabled: {
      backgroundColor: '#f1f5f9',
      color: '#64748b',
      borderColor: '#cbd5e1',
    },
    serviceDropdownWrapper: {
      position: 'relative',
      zIndex: 9999,
    },
    serviceDropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    serviceDropdownText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
      flex: 1,
    },
    serviceDropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 9999,
      zIndex: 9999,
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
      overflow: 'hidden',
    },
    serviceDropdownScrollView: {
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
    },
    serviceDropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    serviceDropdownItemActive: {
      backgroundColor: '#fef3c7',
    },
    serviceDropdownItemText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    serviceDropdownItemTextActive: {
      color: '#f59e0b',
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
      backgroundColor: '#f1f5f9',
      borderTopWidth: 2,
      borderTopColor: '#e2e8f0',
    },
    modalCancelButton: {
      paddingHorizontal: isDesktop ? 24 : isTablet ? 20 : 18,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#94a3b8',
      backgroundColor: '#cbd5e1',
    },
    modalCancelButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#475569',
    },
    modalSubmitButton: {
      paddingHorizontal: isDesktop ? 24 : isTablet ? 20 : 18,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 12,
      backgroundColor: '#f59e0b',
      shadowColor: '#f59e0b',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    modalSubmitButtonDisabled: {
      opacity: 0.6,
    },
    modalSubmitButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    deleteModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalContent: {
      width: isDesktop ? 400 : isTablet ? 360 : width - 60,
      backgroundColor: '#ffffff',
      borderRadius: 20,
      padding: isDesktop ? 32 : isTablet ? 28 : 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    deleteIconContainer: {
      marginBottom: isDesktop ? 20 : isTablet ? 18 : 16,
    },
    deleteIconCircle: {
      width: isDesktop ? 80 : isTablet ? 72 : 64,
      height: isDesktop ? 80 : isTablet ? 72 : 64,
      borderRadius: isDesktop ? 40 : isTablet ? 36 : 32,
      backgroundColor: '#fee2e2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalTitle: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
      textAlign: 'center',
    },
    deleteModalText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: isDesktop ? 28 : isTablet ? 24 : 20,
      lineHeight: isDesktop ? 22 : isTablet ? 20 : 18,
    },
    deleteModalButtons: {
      flexDirection: 'row',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
      width: '100%',
    },
    deleteCancelButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#cbd5e1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteCancelButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#475569',
    },
    deleteConfirmButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteConfirmButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    activateIconCircle: {
      width: isDesktop ? 80 : isTablet ? 72 : 64,
      height: isDesktop ? 80 : isTablet ? 72 : 64,
      borderRadius: isDesktop ? 40 : isTablet ? 36 : 32,
      backgroundColor: '#d1fae5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    activateConfirmButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#10b981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activateConfirmButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
};

