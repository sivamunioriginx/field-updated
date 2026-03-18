import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as XLSX from 'xlsx';
import { API_ENDPOINTS, BASE_URL } from '../../constants/api';
import EditWorker from './editworker';

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

interface Worker {
  id: number;
  name: string;
  mobile: string;
  email: string;
  pincode: string;
  address: string;
  district?: string;
  state?: string;
  country?: string;
  profile_image?: string;
  price?: number;
  skill_id?: string;
  category_title?: string;
  mandal?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  type?: string;
  status?: number;
  document1?: string;
  document2?: string;
  created_at?: string;
}

interface WorkerPopupData {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  price?: number;
  skill_id?: string;
  pincode?: string;
  mandal?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  address?: string;
  profile_image?: string;
  document1?: string[];
  document2?: string[];
  status?: number;
  created_at?: string;
}

interface WBooking {
  id: number;
  booking_id: string;
  worker_id: number;
  user_id: number;
  work_location: string;
  booking_time: string;
  status: number;
  payment_status: number;
  amount?: number;
  created_at: string;
  description: string;
  customer_name: string;
}

interface WReview {
  booking_id: string;
  worker_id: number;
  customer_name: string;
  booking_for: string;
  rating: number;
  review: string;
  created_at: string;
}

interface WorkersProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  exportTrigger?: number;
}

export default function Workers({ searchQuery: externalSearchQuery, onSearchChange, exportTrigger }: WorkersProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [workers, setWorkers] = useState<Worker[]>([]);
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
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const paginatedWorkersRef = useRef<Worker[]>([]);
  // Dropdown modal state
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [menuWorker, setMenuWorker] = useState<Worker | null>(null);
  const menuButtonRefs = useRef<{ [key: number]: any }>({});
  // Worker popup state
  const [showWorkerPopup, setShowWorkerPopup] = useState(false);
  const [selectedWorkerData, setSelectedWorkerData] = useState<WorkerPopupData | null>(null);
  const [workerDetailsLoading, setWorkerDetailsLoading] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showInvolvedBookings, setShowInvolvedBookings] = useState(false);
  const [workerBookings, setWorkerBookings] = useState<WBooking[]>([]);
  const [workerBookingsLoading, setWorkerBookingsLoading] = useState(false);
  const [showWorkerReviews, setShowWorkerReviews] = useState(false);
  const [workerReviews, setWorkerReviews] = useState<WReview[]>([]);
  const [workerReviewsLoading, setWorkerReviewsLoading] = useState(false);

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    if (!exportTrigger || exportTrigger <= 0) return;
    const records = paginatedWorkersRef.current;
    if (records.length === 0) return;
    const rows = records.map((w, i) => ({
      'S.No': i + 1,
      'Name': w.name,
      'Mobile': w.mobile,
      'Email': w.email || 'N/A',
      'Category': w.category_title || w.skill_id || 'N/A',
      'Status': w.status === 1 ? 'Active' : 'Inactive',
      'Address': [w.address, w.city, w.mandal, w.district, w.state, w.country].filter(Boolean).join(', ') + (w.pincode ? ` - ${w.pincode}` : ''),
      'joined At': w.created_at ? new Date(w.created_at).toLocaleString() : 'N/A',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Workers');
    ws['!cols'] = [
      { wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 20 },
      { wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 22 },
    ];
    XLSX.writeFile(wb, `workers_records.xlsx`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportTrigger]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_WORKERS);
      if (!response.ok) { setWorkers([]); return; }
      const data = await response.json();
      if (data.success) {
        setWorkers(data.workers || data.data || []);
        setCurrentPage(1);
      } else {
        setWorkers([]);
      }
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const formatAddress = (worker: Worker) => {
    const parts = [];
    if (worker.address) parts.push(worker.address);
    if (worker.district) parts.push(worker.district);
    if (worker.state) parts.push(worker.state);
    if (worker.country) parts.push(worker.country);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const filteredWorkers = useMemo(() => {
    let filtered = [...workers];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.mobile.includes(query) ||
        (w.email && w.email.toLowerCase().includes(query)) ||
        (w.pincode && w.pincode.includes(query)) ||
        formatAddress(w).toLowerCase().includes(query)
      );
    }
    if (fromDate.trim() || toDate.trim()) {
      filtered = filtered.filter(w => {
        const workerDate = new Date(w.created_at || 0);
        const workerDay = formatDateToYYYYMMDD(workerDate);
        if (fromDate.trim() && workerDay < fromDate.trim()) return false;
        if (toDate.trim() && workerDay > toDate.trim()) return false;
        return true;
      });
    }
    filtered.sort((a, b) => sortBy === 'asc' ? a.id - b.id : b.id - a.id);
    return filtered;
  }, [workers, searchQuery, sortBy, fromDate, toDate]);

  const hasDateFilter = fromDate.trim() !== '';
  const paginatedWorkers = useMemo(() => {
    if (recordsPerPage === 'ALL' || hasDateFilter) return filteredWorkers;
    const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
    const start = (currentPage - 1) * pageSize;
    return filteredWorkers.slice(start, start + pageSize);
  }, [filteredWorkers, recordsPerPage, currentPage, hasDateFilter]);

  const totalPages = useMemo(() =>
    (recordsPerPage === 'ALL' || hasDateFilter) ? 1 : Math.ceil(filteredWorkers.length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10)),
    [filteredWorkers, recordsPerPage, hasDateFilter]);

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

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getStatusLabel = (s: number) => {
    switch (s) { case 1: return 'Accepted'; case 2: return 'In Progress'; case 3: return 'Completed'; case 4: return 'Reject'; case 5: return 'Canceled'; case 6: return 'Rescheduled'; case 7: return 'Cancel Request'; case 8: return 'Reschedule Request'; default: return 'Unknown'; }
  };

  const getStatusColor = (s: number) => {
    switch (s) { case 1: return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' }; case 2: return { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' }; case 3: return { bg: '#f3e8ff', border: '#c084fc', text: '#9333ea' }; case 4: return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }; case 5: return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }; case 6: return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' }; case 7: return { bg: '#fed7aa', border: '#fdba74', text: '#ea580c' }; default: return { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' }; }
  };

  const closeMenu = () => { setOpenMenuId(null); setMenuPosition(null); setMenuWorker(null); };

  const handleMenuToggle = (worker: Worker) => {
    if (openMenuId === worker.id) { closeMenu(); return; }
    const ref = menuButtonRefs.current[worker.id];
    if (ref) {
      ref.measureInWindow((x: number, y: number, _w: number, h: number) => {
        setMenuPosition({ top: y + h + 4, left: x });
        setMenuWorker(worker);
        setOpenMenuId(worker.id);
      });
    }
  };

  const fetchWorkerDetails = async (workerId: number) => {
    if (!workerId) return;
    setShowPersonalInfo(false);
    setShowInvolvedBookings(false);
    setShowWorkerReviews(false);
    setWorkerBookings([]);
    setWorkerReviews([]);
    setWorkerDetailsLoading(true);
    setShowWorkerPopup(true);
    setSelectedWorkerData(null);
    try {
      const res = await fetch(API_ENDPOINTS.WORKER_BY_ID(String(workerId)));
      const data = await res.json();
      if (data.success) {
        const w = data.data;
        const parse = (s: string | null | undefined): string[] => {
          if (!s) return [];
          return s.replace(/^\/uploads\/documents\//, '').split(',').map((f: string) => f.trim()).filter(Boolean).map((f: string) => `/uploads/${f}`);
        };
        w.document1 = parse(w.document1);
        w.document2 = parse(w.document2);
        setSelectedWorkerData(w);
      }
    } catch { /* silent */ }
    finally { setWorkerDetailsLoading(false); }
    try {
      setWorkerBookingsLoading(true);
      const bRes = await fetch(API_ENDPOINTS.ADMIN_BOOKINGS);
      const bData = await bRes.json();
      if (bData.success) {
        const all: WBooking[] = bData.bookings;
        const map = new Map<string, WBooking>();
        all.filter(b => b.worker_id === workerId && b.status !== 4 && b.payment_status === 1).forEach(b => {
          const ex = map.get(b.booking_id);
          if (!ex || new Date(b.created_at) > new Date(ex.created_at)) map.set(b.booking_id, b);
        });
        setWorkerBookings(Array.from(map.values()).sort((a, b) => b.id - a.id));
      }
    } catch { /* silent */ }
    finally { setWorkerBookingsLoading(false); }
    try {
      setWorkerReviewsLoading(true);
      const rRes = await fetch(API_ENDPOINTS.ADMIN_REVIEWS_RATINGS);
      const rData = await rRes.json();
      if (rData.success) {
        setWorkerReviews((rData.reviews as WReview[]).filter(r => r.worker_id === workerId));
      }
    } catch { /* silent */ }
    finally { setWorkerReviewsLoading(false); }
  };

  const handleView = (worker: Worker) => {
    fetchWorkerDetails(worker.id);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorkerId(worker.id);
    setOpenMenuId(null);
  };

  const handleActive = async (worker: Worker) => {
    try {
      const newStatus = Number(worker.status) === 1 ? 0 : 1;
      const response = await fetch(`${API_ENDPOINTS.ADMIN_WORKERS}/${worker.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Worker status updated successfully',
        });
        await fetchWorkers();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'Failed to update worker status',
        });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update worker status',
      });
    }
  };

  const styles = useMemo(() => createStyles(width), [width]);

  // If editing a worker, show the EditWorker component
  if (editingWorkerId !== null) {
    return (
      <EditWorker 
        workerId={editingWorkerId} 
        onBack={() => setEditingWorkerId(null)}
        onSave={() => {
          fetchWorkers(); // Refresh the workers list after save
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading workers...</Text>
      </View>
    );
  }

  if (workers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="construct-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Workers Found</Text>
        <Text style={styles.emptyText}>There are no workers available at the moment.</Text>
      </View>
    );
  }

  paginatedWorkersRef.current = paginatedWorkers;

  return (
    <>
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      scrollEnabled={true}
      bounces={true}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
      }
      onScroll={() => setOpenMenuId(null)}
      scrollEventThrottle={16}
    >
      <View style={styles.workersContainer}>
        <View style={styles.workersHeader}>
          <View style={styles.controlsRow}>
            {/* Left side - Title */}
            <Text style={styles.workersTitle}>
              Workers
            </Text>
            
            {/* Right side - Date filters, Sort and Records */}
            <View style={styles.controlsRight}>
              {/* From date */}
              <View style={styles.dropdownWrapperSort}>
                <Text style={styles.dropdownLabel}>From:</Text>
                {Platform.OS === 'web' ? (
                  <WebDateInput
                    id="worker-from-date"
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
                    id="worker-to-date"
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
                          <Ionicons name="checkmark" size={16} color="#10b981" />
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

        <Pressable onPress={closeMenu} style={styles.tableWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true} 
              style={styles.tableScrollView}
              persistentScrollbar={true}
              nestedScrollEnabled={true}
              onScrollBeginDrag={closeMenu}
            >
              <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 60 : isTablet ? 50 : 40 }]}>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 200 : isTablet ? 180 : 160 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 120 : isTablet ? 110 : 100 }]}>
                  <Ionicons name="checkmark-circle" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Status</Text>
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
              {paginatedWorkers.map((worker, index) => {
                const isMenuOpen = openMenuId === worker.id;
                const isLastRow = index === paginatedWorkers.length - 1;
                return (
                  <View 
                    key={worker.id} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                      isLastRow && styles.tableRowLast,
                    ]}
                  >
                    <View style={[styles.tableCell, styles.menuCell, { width: isDesktop ? 60 : isTablet ? 50 : 40 }]}>
                      <View ref={(ref) => { menuButtonRefs.current[worker.id] = ref; }}>
                        <TouchableOpacity
                          style={styles.menuIconButton}
                          onPress={() => handleMenuToggle(worker)}
                        >
                          <Ionicons name="menu" size={isDesktop ? 18 : isTablet ? 16 : 14} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 200 : isTablet ? 180 : 160 }]}>
                      <Text style={styles.tableCellText}>{worker.name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 120 : isTablet ? 110 : 100 }]}>
                      <View style={[styles.statusBadge, (Number(worker.status) === 1) ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                        <Text style={[styles.statusText, (Number(worker.status) === 1) ? styles.statusTextActive : styles.statusTextInactive]}>
                          {(Number(worker.status) === 1) ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 130 : 120 }]}>
                      <Text style={styles.tableCellText}>{worker.mobile || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 220 : isTablet ? 200 : 180 }]}>
                      <Text style={styles.tableCellText}>{worker.email || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 120 : isTablet ? 110 : 100 }]}>
                      <Text style={styles.tableCellText}>{worker.pincode || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 400 : isTablet ? 350 : 300 }]}>
                      <Text style={styles.tableCellText}>{formatAddress(worker)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            {(recordsPerPage === 'ALL' || hasDateFilter)
              ? `Showing all ${filteredWorkers.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredWorkers.length);
                  return `Showing ${start} to ${end} of ${filteredWorkers.length} entries`;
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

      {/* ── Dropdown Menu Modal (outside ScrollView to avoid clipping) ── */}
      <Modal visible={openMenuId !== null && menuPosition !== null} transparent animationType="none" onRequestClose={closeMenu}>
        <Pressable onPress={closeMenu} style={{ flex: 1 }}>
          {menuWorker && menuPosition && (
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.menuDropdown, { position: 'absolute', top: menuPosition.top, left: menuPosition.left, zIndex: 99999 }]}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { handleView(menuWorker); closeMenu(); }}>
                    <Ionicons name="eye-outline" size={isDesktop ? 16 : 14} color="#06b6d4" />
                    <Text style={styles.menuItemText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { handleEdit(menuWorker); closeMenu(); }}>
                    <Ionicons name="create-outline" size={isDesktop ? 16 : 14} color="#f59e0b" />
                    <Text style={styles.menuItemText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => { handleActive(menuWorker); closeMenu(); }}>
                    <Ionicons name="checkmark-circle-outline" size={isDesktop ? 16 : 14} color="#10b981" />
                    <Text style={styles.menuItemText}>{Number(menuWorker.status) === 1 ? 'Inactive' : 'Active'}</Text>
                  </TouchableOpacity>
                </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      {/* ── Worker Details Modal ── */}
      <Modal visible={showWorkerPopup} transparent animationType="slide" onRequestClose={() => setShowWorkerPopup(false)}>
        <Pressable onPress={() => setShowWorkerPopup(false)} style={styles.cvModalOverlay}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.cvModalContent}>
              {/* Header */}
              <View style={styles.cvModalHeader}>
                <View style={styles.cvHeaderBlob1} />
                <View style={styles.cvHeaderBlob2} />
                <View style={styles.cvModalHeaderTitleRow}>
                  <Text style={styles.cvModalTitle}>Worker Details</Text>
                  <TouchableOpacity onPress={() => setShowWorkerPopup(false)} style={styles.cvModalClose}>
                    <Ionicons name="close" size={isDesktop ? 20 : 18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Avatar */}
              <View style={styles.cvAvatarOuter}>
                {workerDetailsLoading ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : selectedWorkerData?.profile_image ? (
                  <Image source={{ uri: `${BASE_URL}${selectedWorkerData.profile_image}` }} style={styles.cvProfileImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cvProfilePlaceholder}><Ionicons name="person" size={isDesktop ? 44 : 38} color="#c7d2fe" /></View>
                )}
              </View>
              {/* Name + Status */}
              <View style={styles.cvProfileNameSection}>
                <Text style={styles.cvProfileName}>{selectedWorkerData?.name || 'N/A'}</Text>
                {selectedWorkerData && (
                  <View style={[styles.cvSectionBadge, { marginTop: 6, backgroundColor: selectedWorkerData.status === 1 ? '#dcfce7' : '#fee2e2', borderWidth: 1, borderColor: selectedWorkerData.status === 1 ? '#86efac' : '#fca5a5' }]}>
                    <Text style={[styles.cvSectionBadgeText, { color: selectedWorkerData.status === 1 ? '#16a34a' : '#dc2626' }]}>
                      {selectedWorkerData.status === 1 ? '● Active' : '● Inactive'}
                    </Text>
                  </View>
                )}
              </View>
              {workerDetailsLoading ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.cvBookingLoadingText}>Loading worker details...</Text>
                </View>
              ) : selectedWorkerData ? (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.cvModalScroll}>
                  <View style={styles.cvSectionsWrapper}>
                    {/* Personal Info */}
                    <View style={styles.cvSection}>
                      <TouchableOpacity style={styles.cvSectionHeader} onPress={() => setShowPersonalInfo(v => !v)} activeOpacity={0.75}>
                        <View style={styles.cvSectionHeaderLeft}>
                          <View style={styles.cvSectionIconBox}><Ionicons name="person-outline" size={16} color="#6366f1" /></View>
                          <Text style={styles.cvSectionTitle}>Personal Info</Text>
                        </View>
                        <Ionicons name={showPersonalInfo ? 'chevron-up' : 'chevron-down'} size={18} color="#6366f1" />
                      </TouchableOpacity>
                      {showPersonalInfo && (
                        <View style={styles.cvSectionContent}>
                          <View style={styles.cvDetailRow}>
                            <View style={styles.cvDetailIconWrap}><Ionicons name="call-outline" size={15} color="#6366f1" /></View>
                            <View style={styles.cvDetailContent}>
                              <Text style={styles.cvDetailLabel}>Mobile</Text>
                              <Text style={styles.cvDetailValue}>{selectedWorkerData.mobile || 'N/A'}</Text>
                            </View>
                          </View>
                          {selectedWorkerData.email ? (
                            <View style={styles.cvDetailRow}>
                              <View style={styles.cvDetailIconWrap}><Ionicons name="mail-outline" size={15} color="#6366f1" /></View>
                              <View style={styles.cvDetailContent}>
                                <Text style={styles.cvDetailLabel}>Email</Text>
                                <Text style={styles.cvDetailValue}>{selectedWorkerData.email}</Text>
                              </View>
                            </View>
                          ) : null}
                          {selectedWorkerData.price != null ? (
                            <View style={styles.cvDetailRow}>
                              <View style={styles.cvDetailIconWrap}><Ionicons name="cash-outline" size={15} color="#6366f1" /></View>
                              <View style={styles.cvDetailContent}>
                                <Text style={styles.cvDetailLabel}>Price</Text>
                                <Text style={styles.cvDetailValue}>₹{selectedWorkerData.price}</Text>
                              </View>
                            </View>
                          ) : null}
                          {(selectedWorkerData.address || selectedWorkerData.district || selectedWorkerData.state) ? (
                            <View style={styles.cvDetailRow}>
                              <View style={styles.cvDetailIconWrap}><Ionicons name="location-outline" size={15} color="#6366f1" /></View>
                              <View style={styles.cvDetailContent}>
                                <Text style={styles.cvDetailLabel}>Address</Text>
                                <Text style={styles.cvDetailValue}>
                                  {[selectedWorkerData.address, selectedWorkerData.city, selectedWorkerData.mandal, selectedWorkerData.district, selectedWorkerData.state, selectedWorkerData.country].filter(Boolean).join(', ')}
                                  {selectedWorkerData.pincode ? ` - ${selectedWorkerData.pincode}` : ''}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                          {selectedWorkerData.created_at ? (
                            <View style={styles.cvDetailRow}>
                              <View style={styles.cvDetailIconWrap}><Ionicons name="calendar-outline" size={15} color="#6366f1" /></View>
                              <View style={styles.cvDetailContent}>
                                <Text style={styles.cvDetailLabel}>Joined On</Text>
                                <Text style={styles.cvDetailValue}>{formatDate(selectedWorkerData.created_at)}</Text>
                              </View>
                            </View>
                          ) : null}
                          {selectedWorkerData.document1 && selectedWorkerData.document1.length > 0 ? (
                            <>
                              <View style={styles.cvDocDivider}>
                                <Ionicons name="document-outline" size={14} color="#6366f1" />
                                <Text style={styles.cvDocDividerText}>Personal Docs ({selectedWorkerData.document1.length})</Text>
                              </View>
                              {selectedWorkerData.document1.map((p, i) => (
                                <View key={i} style={styles.cvDocRow}>
                                  <View style={styles.cvDocIndexBadge}><Text style={styles.cvDocIndexText}>{i + 1}</Text></View>
                                  <Image source={{ uri: `${BASE_URL}${p}` }} style={styles.cvDocThumb} resizeMode="cover" />
                                  <TouchableOpacity style={styles.cvDocViewBtn} onPress={() => Linking.openURL(`${BASE_URL}${p}`)}>
                                    <Ionicons name="eye-outline" size={14} color="#ffffff" /><Text style={styles.cvDocViewText}>View</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </>
                          ) : null}
                          {selectedWorkerData.document2 && selectedWorkerData.document2.length > 0 ? (
                            <>
                              <View style={styles.cvDocDivider}>
                                <Ionicons name="document-text-outline" size={14} color="#6366f1" />
                                <Text style={styles.cvDocDividerText}>Professional Docs ({selectedWorkerData.document2.length})</Text>
                              </View>
                              {selectedWorkerData.document2.map((p, i) => (
                                <View key={i} style={styles.cvDocRow}>
                                  <View style={styles.cvDocIndexBadge}><Text style={styles.cvDocIndexText}>{i + 1}</Text></View>
                                  <Image source={{ uri: `${BASE_URL}${p}` }} style={styles.cvDocThumb} resizeMode="cover" />
                                  <TouchableOpacity style={styles.cvDocViewBtn} onPress={() => Linking.openURL(`${BASE_URL}${p}`)}>
                                    <Ionicons name="eye-outline" size={14} color="#ffffff" /><Text style={styles.cvDocViewText}>View</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </>
                          ) : null}
                          {(!selectedWorkerData.document1?.length && !selectedWorkerData.document2?.length) && (
                            <Text style={styles.cvSectionEmpty}>No documents uploaded.</Text>
                          )}
                        </View>
                      )}
                    </View>
                    {/* Involved Bookings */}
                    <View style={styles.cvSection}>
                      <TouchableOpacity style={styles.cvSectionHeader} onPress={() => setShowInvolvedBookings(v => !v)} activeOpacity={0.75}>
                        <View style={styles.cvSectionHeaderLeft}>
                          <View style={styles.cvSectionIconBox}><Ionicons name="calendar-outline" size={16} color="#6366f1" /></View>
                          <Text style={styles.cvSectionTitle}>Involved Bookings</Text>
                          {workerBookings.length > 0 && <View style={styles.cvSectionBadge}><Text style={styles.cvSectionBadgeText}>{workerBookings.length}</Text></View>}
                        </View>
                        <Ionicons name={showInvolvedBookings ? 'chevron-up' : 'chevron-down'} size={18} color="#6366f1" />
                      </TouchableOpacity>
                      {showInvolvedBookings && (
                        <View style={styles.cvSectionContent}>
                          {workerBookingsLoading ? (
                            <View style={styles.cvBookingLoadingRow}><ActivityIndicator size="small" color="#6366f1" /><Text style={styles.cvBookingLoadingText}>Loading bookings...</Text></View>
                          ) : workerBookings.length === 0 ? (
                            <Text style={styles.cvSectionEmpty}>No bookings found.</Text>
                          ) : (
                            workerBookings.map((b) => {
                              const sc = getStatusColor(b.status);
                              return (
                                <View key={b.id} style={styles.cvBookingItem}>
                                  <View style={styles.cvBookingRow1}>
                                    <Text style={styles.cvBookingId}>#{b.booking_id}</Text>
                                    <View style={[styles.cvBookingBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}><Text style={[styles.cvBookingBadgeText, { color: sc.text }]}>{getStatusLabel(b.status)}</Text></View>
                                  </View>
                                  {b.booking_time ? <View style={styles.cvBookingField}><Ionicons name="time-outline" size={12} color="#94a3b8" /><Text style={styles.cvBookingFieldText}>{formatDate(b.booking_time)}</Text></View> : null}
                                  <View style={styles.cvBookingRow2}>
                                    <View style={styles.cvBookingField}><Ionicons name="cash-outline" size={12} color="#94a3b8" /><Text style={styles.cvBookingFieldText}>{b.amount != null ? `₹${b.amount}` : 'N/A'}</Text></View>
                                    <View style={styles.cvBookingField}><Ionicons name="person-outline" size={12} color="#94a3b8" /><Text style={styles.cvBookingFieldText} numberOfLines={1}>{b.customer_name || 'N/A'}</Text></View>
                                  </View>
                                  {b.work_location ? <View style={styles.cvBookingField}><Ionicons name="location-outline" size={12} color="#94a3b8" /><Text style={[styles.cvBookingFieldText, { flex: 1 }]} numberOfLines={1}>{b.work_location}</Text></View> : null}
                                  {b.description ? <View style={styles.cvBookingField}><Ionicons name="document-text-outline" size={12} color="#94a3b8" /><Text style={[styles.cvBookingFieldText, { flex: 1 }]} numberOfLines={2}>{b.description}</Text></View> : null}
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>

                    {/* Reviews & Ratings */}
                    <View style={styles.cvSection}>
                      <TouchableOpacity style={styles.cvSectionHeader} onPress={() => setShowWorkerReviews(v => !v)} activeOpacity={0.75}>
                        <View style={styles.cvSectionHeaderLeft}>
                          <View style={styles.cvSectionIconBox}><Ionicons name="star-outline" size={16} color="#6366f1" /></View>
                          <Text style={styles.cvSectionTitle}>Reviews & Ratings</Text>
                          {workerReviews.length > 0 && <View style={styles.cvSectionBadge}><Text style={styles.cvSectionBadgeText}>{workerReviews.length}</Text></View>}
                        </View>
                        <Ionicons name={showWorkerReviews ? 'chevron-up' : 'chevron-down'} size={18} color="#6366f1" />
                      </TouchableOpacity>
                      {showWorkerReviews && (
                        <View style={styles.cvSectionContent}>
                          {workerReviewsLoading ? (
                            <View style={styles.cvBookingLoadingRow}><ActivityIndicator size="small" color="#6366f1" /><Text style={styles.cvBookingLoadingText}>Loading reviews...</Text></View>
                          ) : workerReviews.length === 0 ? (
                            <Text style={styles.cvSectionEmpty}>No reviews found.</Text>
                          ) : (
                            workerReviews.map((r, idx) => (
                              <View key={`wr-${idx}`} style={styles.cvReviewItem}>
                                <View style={styles.cvReviewRow1}>
                                  <Text style={styles.cvReviewBookingId}>#{r.booking_id}</Text>
                                  <View style={styles.cvStarsRow}>
                                    {[1,2,3,4,5].map(s => (
                                      <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={14} color={s <= r.rating ? '#f59e0b' : '#d1d5db'} />
                                    ))}
                                    <Text style={styles.cvRatingText}>{r.rating}/5</Text>
                                  </View>
                                </View>
                                {r.customer_name ? <View style={styles.cvBookingField}><Ionicons name="person-outline" size={12} color="#94a3b8" /><Text style={styles.cvBookingFieldText} numberOfLines={1}>{r.customer_name}</Text></View> : null}
                                {r.booking_for ? <View style={styles.cvBookingField}><Ionicons name="briefcase-outline" size={12} color="#94a3b8" /><Text style={[styles.cvBookingFieldText, { flex: 1 }]} numberOfLines={1}>{r.booking_for}</Text></View> : null}
                                {r.review ? <View style={styles.cvReviewTextBox}><Text style={styles.cvReviewText}>{r.review}</Text></View> : null}
                                <View style={styles.cvBookingField}><Ionicons name="time-outline" size={12} color="#94a3b8" /><Text style={styles.cvBookingFieldText}>{formatDate(r.created_at)}</Text></View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>

                  </View>
                </ScrollView>
              ) : (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={styles.cvBookingLoadingText}>Worker details not found.</Text>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
                    colors={['#059669', '#10b981']}
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
                    colors={['#059669', '#10b981']}
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
    </>
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
    workersContainer: {
      width: '100%',
    },
    workersHeader: {
      marginBottom: 6,
      zIndex: 500,
      overflow: 'visible',
    },
    workersTitle: {
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
      color: '#10b981',
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
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#10b981',
      borderBottomWidth: 2,
      borderBottomColor: '#059669',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      position: 'relative',
      zIndex: 1,
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
      position: 'relative',
      zIndex: 1,
    },
    tableRowEven: {
      backgroundColor: '#ffffff',
    },
    tableRowOdd: {
      backgroundColor: '#fafafa',
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
      alignItems: 'center',
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
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 10,
      zIndex: 99999,
      minWidth: isDesktop ? 130 : isTablet ? 115 : 105,
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
    statusBadge: {
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 6 : isTablet ? 5 : 4,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBadgeActive: {
      backgroundColor: '#d1fae5',
    },
    statusBadgeInactive: {
      backgroundColor: '#fee2e2',
    },
    statusText: {
      fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
      fontWeight: '600',
    },
    statusTextActive: {
      color: '#059669',
    },
    statusTextInactive: {
      color: '#dc2626',
    },
    // Worker Details Modal — same design as customers.tsx cv* styles
    cvModalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'center', alignItems: 'center' },
    cvModalContent: { backgroundColor: '#ffffff', borderRadius: isDesktop ? 24 : 18, width: isDesktop ? 560 : isTablet ? 480 : '95%', maxWidth: 580, maxHeight: isDesktop ? '92%' : '94%', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 20, overflow: 'hidden' },
    cvModalHeader: { backgroundColor: '#6366f1', paddingTop: isDesktop ? 20 : 16, paddingHorizontal: isDesktop ? 24 : 18, paddingBottom: isDesktop ? 56 : 48, overflow: 'hidden' },
    cvHeaderBlob1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(139,92,246,0.4)', top: -60, right: -40 },
    cvHeaderBlob2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(99,102,241,0.3)', bottom: -20, left: 20 },
    cvModalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cvModalTitle: { fontSize: isDesktop ? 18 : 16, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
    cvModalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    cvAvatarOuter: { alignSelf: 'center', marginTop: isDesktop ? -48 : -40, width: isDesktop ? 96 : 80, height: isDesktop ? 96 : 80, borderRadius: isDesktop ? 48 : 40, borderWidth: 4, borderColor: '#ffffff', backgroundColor: '#eef2ff', overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 10 },
    cvProfileImage: { width: '100%', height: '100%' },
    cvProfilePlaceholder: { width: '100%', height: '100%', backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
    cvProfileNameSection: { alignItems: 'center', paddingTop: isDesktop ? 12 : 10, paddingBottom: isDesktop ? 16 : 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    cvProfileName: { fontSize: isDesktop ? 22 : 18, fontWeight: '800', color: '#0f172a', textAlign: 'center', letterSpacing: 0.2 },
    cvModalScroll: { maxHeight: isDesktop ? 400 : 340 },
    cvSectionsWrapper: { paddingHorizontal: isDesktop ? 20 : 14, paddingVertical: isDesktop ? 14 : 10, gap: isDesktop ? 10 : 8 },
    cvSection: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
    cvSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isDesktop ? 18 : 14, paddingVertical: isDesktop ? 14 : 12, backgroundColor: '#fafbff' },
    cvSectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    cvSectionIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
    cvSectionTitle: { fontSize: isDesktop ? 14 : 13, fontWeight: '700', color: '#1e293b' },
    cvSectionContent: { paddingHorizontal: isDesktop ? 18 : 14, paddingTop: isDesktop ? 4 : 2, paddingBottom: isDesktop ? 14 : 10, backgroundColor: '#ffffff' },
    cvSectionBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    cvSectionBadgeText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
    cvSectionEmpty: { fontSize: isDesktop ? 13 : 12, color: '#94a3b8', textAlign: 'center', paddingVertical: isDesktop ? 14 : 10 },
    cvDetailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: isDesktop ? 10 : 9, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 12 },
    cvDetailIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    cvDetailContent: { flex: 1, justifyContent: 'center' },
    cvDetailLabel: { fontSize: isDesktop ? 10 : 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
    cvDetailValue: { fontSize: isDesktop ? 14 : 13, fontWeight: '600', color: '#1e293b', lineHeight: isDesktop ? 20 : 18 },
    cvDocDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: isDesktop ? 14 : 10, marginBottom: isDesktop ? 10 : 8, paddingTop: isDesktop ? 14 : 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    cvDocDividerText: { fontSize: isDesktop ? 12 : 11, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.8 },
    cvDocRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: isDesktop ? 6 : 5 },
    cvDocIndexBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
    cvDocIndexText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
    cvDocThumb: { flex: 1, height: isDesktop ? 70 : 58, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    cvDocViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6366f1', paddingHorizontal: isDesktop ? 14 : 11, paddingVertical: isDesktop ? 9 : 7, borderRadius: 10 },
    cvDocViewText: { color: '#ffffff', fontSize: isDesktop ? 13 : 12, fontWeight: '700' },
    cvBookingLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: isDesktop ? 14 : 10 },
    cvBookingLoadingText: { fontSize: isDesktop ? 13 : 12, color: '#64748b' },
    cvBookingItem: { backgroundColor: '#f8fafc', borderRadius: 12, padding: isDesktop ? 12 : 10, marginBottom: isDesktop ? 8 : 6, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
    cvBookingRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cvBookingId: { fontSize: isDesktop ? 13 : 12, fontWeight: '800', color: '#6366f1' },
    cvBookingBadge: { paddingHorizontal: isDesktop ? 10 : 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    cvBookingBadgeText: { fontSize: isDesktop ? 11 : 10, fontWeight: '700' },
    cvBookingRow2: { flexDirection: 'row', gap: isDesktop ? 12 : 10, flexWrap: 'wrap' },
    cvBookingField: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cvBookingFieldText: { fontSize: isDesktop ? 12 : 11, color: '#475569', fontWeight: '500' },
    cvReviewItem: { backgroundColor: '#f8fafc', borderRadius: 12, padding: isDesktop ? 12 : 10, marginBottom: isDesktop ? 8 : 6, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
    cvReviewRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cvReviewBookingId: { fontSize: isDesktop ? 13 : 12, fontWeight: '800', color: '#6366f1' },
    cvStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    cvRatingText: { fontSize: isDesktop ? 11 : 10, fontWeight: '700', color: '#f59e0b', marginLeft: 4 },
    cvReviewTextBox: { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: isDesktop ? 10 : 8, paddingVertical: isDesktop ? 7 : 5 },
    cvReviewText: { fontSize: isDesktop ? 12 : 11, color: '#1e293b', lineHeight: isDesktop ? 18 : 16, fontStyle: 'italic' },
  });
};
