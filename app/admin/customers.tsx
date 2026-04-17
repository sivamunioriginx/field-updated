import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
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
import * as XLSX from 'xlsx';
import { API_ENDPOINTS } from '../../constants/api';
import ViewCustomer from './viewcustomer';

let DateTimePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

function WebDateInput({
  id,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  min?: string;
  max?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : placeholder;
  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 110,
    height: 38,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  };
  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    pointerEvents: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: value ? '#0f172a' : '#64748b',
    fontWeight: value ? 600 : 500,
  };
  const handleClick = () => {
    try {
      (inputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.();
    } catch {
      inputRef.current?.click();
    }
  };
  return createElement(
    'div',
    { style: wrapperStyle, onClick: handleClick, role: 'button', tabIndex: 0 },
    createElement('span', { style: { fontSize: 14 } }, '📅'),
    createElement('span', { style: labelStyle }, displayValue),
    createElement('input', {
      ref: inputRef,
      id,
      type: 'date',
      value: value || '',
      min: min || undefined,
      max: max || undefined,
      onChange: (e: any) => onChange(e.target.value || ''),
      'aria-label': placeholder,
      style: inputStyle,
    })
  );
}

function formatDateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
  created_at?: string;
}

interface CustomersProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  exportTrigger?: number;
}

export default function Customers({ searchQuery: externalSearchQuery, exportTrigger }: CustomersProps) {
  const { width } = useWindowDimensions();
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const fromDateObj = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  const toDateObj = toDate ? new Date(toDate + 'T12:00:00') : new Date();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const paginatedCustomersRef = useRef<Customer[]>([]);

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    if (!exportTrigger || exportTrigger <= 0) return;
    const records = paginatedCustomersRef.current;
    if (records.length === 0) return;
    const rows = records.map((c, i) => ({
      'S.No': i + 1,
      'Name': c.name,
      'Mobile': c.mobile,
      'Email': c.email || 'N/A',
      'Address': [c.address, c.city, c.mandal, c.district, c.state, c.country].filter(Boolean).join(', ') + (c.pincode ? ` - ${c.pincode}` : ''),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    ws['!cols'] = [
      { wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 50 },
    ];
    XLSX.writeFile(wb, `customer_records.xlsx`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportTrigger]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_CUSTOMERS);
      if (!response.ok) {
        setCustomers([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      if (data.success) {
        const customersData = data.customers || data.data || [];
        setCustomers(customersData);
        setCurrentPage(1);
      } else {
        setCustomers([]);
      }
    } catch {
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

    // Apply date range filter
    if (fromDate.trim() || toDate.trim()) {
      filtered = filtered.filter(customer => {
        const created = customer.created_at;
        if (!created) return true;
        const customerDate = new Date(created);
        const customerDay = formatDateToYYYYMMDD(customerDate);
        if (fromDate.trim() && customerDay < fromDate.trim()) return false;
        if (toDate.trim() && customerDay > toDate.trim()) return false;
        return true;
      });
    }

    // Apply sorting (by created_at when available, else by id)
    filtered.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : a.id;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : b.id;
      switch (sortBy) {
        case 'desc':
          return bTime - aTime;
        case 'asc':
          return aTime - bTime;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Pagination logic - when From date is selected, show all records in that range; when empty, use Show dropdown
  const hasDateFilter = fromDate.trim() !== '';
  const getPaginatedCustomers = () => {
    const filtered = getFilteredAndSortedCustomers();
    if (recordsPerPage === 'ALL' || hasDateFilter) {
      return filtered;
    }
    const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = (recordsPerPage === 'ALL' || hasDateFilter)
    ? 1
    : Math.ceil(getFilteredAndSortedCustomers().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

  const sortOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const recordOptions = [5, 10, 50, 100, 'ALL'];

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
        setViewingCustomer(prev => (prev?.id === deleteConfirmCustomer.id ? null : prev));
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

  const styles = createStyles(width);

  if (viewingCustomer !== null) {
    return (
      <ViewCustomer
        customer={viewingCustomer}
        onBack={() => setViewingCustomer(null)}
      />
    );
  }

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
  paginatedCustomersRef.current = paginatedCustomers;

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

            {/* Right side - Date filters, Sort and Records */}
            <View style={styles.controlsRight}>
              {/* From date */}
              <View style={styles.dropdownWrapperSort}>
                <Text style={styles.dropdownLabel}>From:</Text>
                {Platform.OS === 'web' ? (
                  <WebDateInput
                    id="cust-from-date"
                    value={fromDate}
                    onChange={(v) => { setFromDate(v); setCurrentPage(1); }}
                    placeholder="Select date"
                    max={toDate || formatDateToYYYYMMDD(new Date())}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownButtonSort}
                    onPress={() => setShowFromCalendar(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={isDesktop ? 16 : 14} color="#64748b" />
                    <Text style={styles.dropdownButtonText}>
                      {fromDate
                        ? new Date(fromDate + 'T12:00:00').toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                        : 'Select date'}
                    </Text>
                    <Ionicons name="chevron-down" size={isDesktop ? 16 : 14} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
              {/* To date */}
              <View style={styles.dropdownWrapperSort}>
                <Text style={styles.dropdownLabel}>To:</Text>
                {Platform.OS === 'web' ? (
                  <WebDateInput
                    id="cust-to-date"
                    value={toDate}
                    onChange={(v) => { setToDate(v); setCurrentPage(1); }}
                    placeholder="Select date"
                    min={fromDate}
                    max={formatDateToYYYYMMDD(new Date())}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownButtonSort}
                    onPress={() => setShowToCalendar(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={isDesktop ? 16 : 14} color="#64748b" />
                    <Text style={styles.dropdownButtonText}>
                      {toDate
                        ? new Date(toDate + 'T12:00:00').toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                        : 'Select date'}
                    </Text>
                    <Ionicons name="chevron-down" size={isDesktop ? 16 : 14} color="#64748b" />
                  </TouchableOpacity>
                )}
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
              <Ionicons name="play-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#7c3aed'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="chevron-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#7c3aed'} />
            </TouchableOpacity>

            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages || 1}
            </Text>

            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="chevron-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#7c3aed'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <Ionicons name="play-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#7c3aed'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Native date pickers */}
      {DateTimePicker && showFromCalendar &&
        (Platform.OS === 'ios' ? (
          <Modal visible transparent animationType="slide">
            <TouchableOpacity
              style={styles.calendarOverlay}
              activeOpacity={1}
              onPress={() => setShowFromCalendar(false)}
            >
              <View style={styles.calendarModal}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>From date</Text>
                  <TouchableOpacity onPress={() => setShowFromCalendar(false)}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={fromDateObj}
                  mode="date"
                  display="calendar"
                  maximumDate={toDateObj}
                  onChange={(_: unknown, date?: Date) => {
                    if (date) setFromDate(formatDateToYYYYMMDD(date));
                  }}
                  style={styles.picker}
                />
                <TouchableOpacity
                  style={styles.calendarDone}
                  onPress={() => setShowFromCalendar(false)}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.calendarDoneGradient}
                  >
                    <Text style={styles.calendarDoneText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={fromDateObj}
            mode="date"
            display="calendar"
            maximumDate={toDateObj}
            onChange={(_: unknown, date?: Date) => {
              if (date) setFromDate(formatDateToYYYYMMDD(date));
              setShowFromCalendar(false);
            }}
          />
        ))}

      {DateTimePicker && showToCalendar &&
        (Platform.OS === 'ios' ? (
          <Modal visible transparent animationType="slide">
            <TouchableOpacity
              style={styles.calendarOverlay}
              activeOpacity={1}
              onPress={() => setShowToCalendar(false)}
            >
              <View style={styles.calendarModal}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>To date</Text>
                  <TouchableOpacity onPress={() => setShowToCalendar(false)}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={toDateObj}
                  mode="date"
                  display="calendar"
                  minimumDate={fromDateObj}
                  maximumDate={new Date()}
                  onChange={(_: unknown, date?: Date) => {
                    if (date) setToDate(formatDateToYYYYMMDD(date));
                  }}
                  style={styles.picker}
                />
                <TouchableOpacity
                  style={styles.calendarDone}
                  onPress={() => setShowToCalendar(false)}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.calendarDoneGradient}
                  >
                    <Text style={styles.calendarDoneText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={toDateObj}
            mode="date"
            display="calendar"
            minimumDate={fromDateObj}
            maximumDate={new Date()}
            onChange={(_: unknown, date?: Date) => {
              if (date) setToDate(formatDateToYYYYMMDD(date));
              setShowToCalendar(false);
            }}
          />
        ))}

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

const createStyles = (width: number) => {
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
      marginBottom: 6,
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
      marginBottom: 6,
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
    calendarOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    calendarModal: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 32,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    calendarTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0f172a',
    },
    picker: { width: '100%' },
    calendarDone: {
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 14,
      overflow: 'hidden',
    },
    calendarDoneGradient: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    calendarDoneText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
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

