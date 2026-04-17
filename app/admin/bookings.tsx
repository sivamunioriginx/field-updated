import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as XLSX from 'xlsx';
import { API_ENDPOINTS } from '../../constants/api';
import ViewCustomer, { type ViewCustomerProps } from './viewcustomer';
import ViewWorker from './viewworker';

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
  amount?: number;
  created_at: string;
  description: string;
  worker_name: string;
  worker_mobile: string;
  customer_name: string;
  customer_mobile: string;
  canceled_by?: number; // 1 = Worker, 2 = Customer
  cancel_reason?: string;
  canceled_date?: string;
  cancel_status?: number; // Status from tbl_canceledbookings
  rescheduled_by?: number; // 1 = Worker, 2 = Customer
  reschedule_reason?: string;
  reschedule_date?: string;
  reschedule_requested_at?: string; // tbl_rescheduledbookings.created_at (admin "all" query)
  reschedule_status?: number; // Status from tbl_rescheduledbookings
  start_time?: string; // tbl_track_bookings.start_time
  complete_time?: string; // tbl_track_bookings.complete_time
  hold_from?: string | null;
  worker_hold_comments?: string | null;
  customer_hold_comments?: string | null;
}

function hasTimelineTimestamp(raw?: string | null): boolean {
  if (raw == null) return false;
  const t = String(raw).trim();
  if (!t) return false;
  if (t.startsWith('0000-00-00')) return false;
  return true;
}

function buildBookingTimelineSteps(booking: Booking, formatDt: (raw: string) => string) {
  const steps: {
    label: string;
    sub: string;
    icon: 'calendar-outline' | 'checkmark-outline' | 'trash-outline' | 'time-outline' | 'briefcase-outline' | 'checkmark-circle-outline' | 'pause-circle-outline';
    filled: boolean;
    last: boolean;
    connectorLabel?: string;
  }[] = [];

  if (hasTimelineTimestamp(booking.created_at)) {
    steps.push({
      label: 'BOOKING REQUESTED ON',
      sub: formatDt(booking.created_at),
      icon: 'calendar-outline',
      filled: true,
      last: false,
    });
  }
  if (hasTimelineTimestamp(booking.created_at)) {
    steps.push({
      label: 'ACCEPTED ON',
      sub: formatDt(booking.created_at),
      icon: 'checkmark-outline',
      filled: true,
      last: false,
    });
  }
  if (hasTimelineTimestamp(booking.canceled_date)) {
    steps.push({
      label: 'CANCEL REQUESTED ON',
      sub: formatDt(booking.canceled_date!),
      icon: 'trash-outline',
      filled: true,
      last: false,
    });
  }
  const rescheduleAt = booking.reschedule_requested_at ?? booking.reschedule_date;
  if (hasTimelineTimestamp(rescheduleAt)) {
    steps.push({
      label: 'RESCHEDULE REQUESTED ON',
      sub: formatDt(rescheduleAt!),
      icon: 'time-outline',
      filled: true,
      last: false,
    });
  }
  if (hasTimelineTimestamp(booking.start_time)) {
    steps.push({
      label: 'JOB STARTED ON',
      sub: formatDt(booking.start_time!),
      icon: 'briefcase-outline',
      filled: true,
      last: false,
    });
  }
  if (booking.status === 9 && hasTimelineTimestamp(booking.start_time)) {
    const holdSub = hasTimelineTimestamp(booking.hold_from)
      ? formatDt(booking.hold_from!)
      : 'N/A';
    steps.push({
      label: 'ON HOLD FROM',
      sub: holdSub,
      icon: 'pause-circle-outline',
      filled: true,
      last: false,
    });
  }
  const hasJobCompleteTime = hasTimelineTimestamp(booking.complete_time);
  const hasJobStartTime = hasTimelineTimestamp(booking.start_time);

  if (hasJobStartTime || booking.status === 3) {
    const completedActive = booking.status === 3 && hasJobCompleteTime;
    steps.push({
      label: 'COMPLETED ON',
      sub: completedActive ? formatDt(booking.complete_time!) : '',
      icon: 'checkmark-circle-outline',
      filled: completedActive,
      last: true,
      connectorLabel:
        !completedActive && hasJobStartTime && (booking.status === 2 || booking.status === 9)
          ? booking.status === 9
            ? 'On hold'
            : 'In progress'
          : undefined,
    });
  }

  return steps;
}

/** Match createStyles: timelineStepCard width, timelineBetween width, timelineStepsRow gap, timelineScrollContent paddingHorizontal */
function getTimelineModalContentWidth(windowWidth: number, isDesktop: boolean, stepCount: number): number {
  const maxCap = isDesktop ? Math.min(1360, windowWidth * 0.98) : windowWidth * 0.97;
  const minW = isDesktop ? 320 : Math.min(300, windowWidth * 0.92);
  if (stepCount <= 0) return minW;
  const cardW = isDesktop ? 122 : 112;
  const betweenW = isDesktop ? 44 : 36;
  const rowGap = isDesktop ? 10 : 8;
  const scrollPadH = isDesktop ? 24 : 16;
  const rowContentW =
    stepCount * cardW + Math.max(0, stepCount - 1) * betweenW + Math.max(0, 2 * stepCount - 2) * rowGap;
  const innerW = rowContentW + scrollPadH * 2 + 24;
  return Math.min(maxCap, Math.max(minW, innerW));
}

function bookingToViewCustomer(b: Booking): ViewCustomerProps['customer'] {
  return {
    id: b.user_id,
    name: b.customer_name || 'N/A',
    mobile: b.customer_mobile || b.contact_number || '',
    email: '',
    pincode: '',
    address: '',
    mandal: '',
    city: '',
    district: '',
    state: '',
    country: '',
  };
}

interface BookingsProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  initialStatus?: string;
  exportTrigger?: number;
}

export default function Bookings({ searchQuery: externalSearchQuery, onSearchChange, initialStatus, exportTrigger }: BookingsProps) {
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusDropdownLayout, setStatusDropdownLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const statusDropdownButtonRef = useRef<View>(null);
  const [sortDropdownLayout, setSortDropdownLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const sortDropdownButtonRef = useRef<View>(null);
  const [recordsDropdownLayout, setRecordsDropdownLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const recordsDropdownButtonRef = useRef<View>(null);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [statusDropdownBookingId, setStatusDropdownBookingId] = useState<number | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ x: number; y: number; openUpward?: boolean } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [statusConfirmBooking, setStatusConfirmBooking] = useState<Booking | null>(null);
  const [statusConfirmNewStatus, setStatusConfirmNewStatus] = useState<number | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);
  const [timelineBooking, setTimelineBooking] = useState<Booking | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const fromDateObj = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  const toDateObj = toDate ? new Date(toDate + 'T12:00:00') : new Date();
  
  const [viewingWorkerId, setViewingWorkerId] = useState<number | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<ViewCustomerProps['customer'] | null>(null);

  // Polling popup state
  const [showPollingPopup, setShowPollingPopup] = useState(false);
  const [pollingMessage, setPollingMessage] = useState('Waiting for worker to accept...');
  const [pollingStatus, setPollingStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [acceptedWorkerName, setAcceptedWorkerName] = useState('');
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentBookingIdRef = useRef<string>('');
  const currentRecordIdRef = useRef<number>(0);
  const currentRequestTypeRef = useRef<'cancel' | 'reschedule'>('cancel');
  const currentRescheduleDateRef = useRef<string>('');
  const currentOriginalBookingTimeRef = useRef<string>('');
  const paginatedBookingsRef = useRef<Booking[]>([]);

  const openCustomerFromBooking = async (booking: Booking) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    if (!booking.user_id) return;
    try {
      const res = await fetch(API_ENDPOINTS.CUSTOMER_BY_ID(booking.user_id));
      const data = await res.json();
      if (data.success && data.customer) {
        setViewingCustomer(data.customer);
        return;
      }
    } catch {
      /* fallback below */
    }
    setViewingCustomer(bookingToViewCustomer(booking));
  };

  // Inject thin scrollbar style for status dropdown (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const styleId = 'status-dropdown-scrollbar-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #status-dropdown-scroll::-webkit-scrollbar { width: 6px; }
      #status-dropdown-scroll::-webkit-scrollbar-track { background: transparent; }
      #status-dropdown-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      #status-dropdown-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      #status-dropdown-scroll { scrollbar-width: thin; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // If parent provides an initial status, keep local filter in sync
  useEffect(() => {
    if (initialStatus !== undefined && initialStatus !== statusFilter) {
      setStatusFilter(initialStatus);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus]);

  // Export current page records to Excel when triggered from parent
  useEffect(() => {
    if (!exportTrigger || exportTrigger <= 0) return;
    const records = paginatedBookingsRef.current;
    if (records.length === 0) return;
    const rows = records.map((b, i) => {
      const base: Record<string, string | number> = {
        'S.No': i + 1,
        'Booking ID': b.booking_id,
        'Status': getStatusLabel(b.status, b),
        'Amount (₹)': b.amount != null ? b.amount : 'N/A',
        'Payment Status': b.payment_status === 1 ? 'Paid' : 'Unpaid',
        'Worker Name': b.worker_name || 'N/A',
        'Customer Name': b.customer_name || 'N/A',
        'Contact Number': b.contact_number || 'N/A',
        'Work Location': b.work_location || 'N/A',
        'Booked On': b.created_at ? formatDate(b.created_at) : 'N/A',
        'Booking For': b.booking_time ? formatDate(b.booking_time) : 'N/A',
        'Description': b.description || 'N/A',
      };
      if (b.hold_from != null || b.worker_hold_comments != null || b.customer_hold_comments != null) {
        base['Hold From'] = b.hold_from ? formatDate(b.hold_from) : 'N/A';
        base['Worker comments'] = b.worker_hold_comments || 'N/A';
        base['Customer comments'] = b.customer_hold_comments || 'N/A';
      }
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    ws['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 16 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 30 },
      { wch: 22 }, { wch: 22 },
    ];
    XLSX.writeFile(wb, `booking_records.xlsx`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportTrigger]);

  const fetchBookings = async (isCanceled: boolean = false, isRescheduled: boolean = false, isCancelReq: boolean = false, isRescheduleReq: boolean = false, isOnHold: boolean = false) => {
    try {
      setLoading(true);
      
      let url = API_ENDPOINTS.ADMIN_BOOKINGS;
      if (isOnHold) {
        url = `${API_ENDPOINTS.ADMIN_BOOKINGS}?onhold=true`;
      } else if (isCancelReq) {
        url = `${API_ENDPOINTS.ADMIN_BOOKINGS}?cancelreq=true`;
      } else if (isRescheduleReq) {
        url = `${API_ENDPOINTS.ADMIN_BOOKINGS}?reschedulereq=true`;
      } else if (isCanceled) {
        url = `${API_ENDPOINTS.ADMIN_BOOKINGS}?canceled=true`;
      } else if (isRescheduled) {
        url = `${API_ENDPOINTS.ADMIN_BOOKINGS}?rescheduled=true`;
      }
      
      const response = await fetch(url);
      
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
    const isCanceled = statusFilter === 'cancel';
    const isRescheduled = statusFilter === 'reschedule';
    const isCancelReq = statusFilter === 'cancelreq';
    const isRescheduleReq = statusFilter === 'reschedulereq';
    const isOnHold = statusFilter === 'onhold';
    await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
    setRefreshing(false);
  };

  useEffect(() => {
    const isCanceled = statusFilter === 'cancel';
    const isRescheduled = statusFilter === 'reschedule';
    const isCancelReq = statusFilter === 'cancelreq';
    const isRescheduleReq = statusFilter === 'reschedulereq';
    const isOnHold = statusFilter === 'onhold';
    fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
  }, [statusFilter]);

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

  // Get status label (when statusFilter is 'all', use cancel_status/reschedule_status for status 5/6)
  const getStatusLabel = (status: number, booking?: Booking) => {
    if (booking) {
      if (status === 5) return booking.cancel_status === 1 ? 'Cancel' : 'CANCEL REQUESTED';
      if (status === 6) return booking.reschedule_status === 1 ? 'Reschedule' : 'RESCHEDULE REQUESTED';
    }
    switch (status) {
      case 1: return 'Accepted';
      case 2: return 'In Progress';
      case 3: return 'Completed';
      case 4: return 'Reject';
      case 5: return 'Cancel';
      case 6: return 'Reschedule';
      case 7: return 'Cancel Request';
      case 8: return 'Reschedule Request';
      case 9: return 'On Hold';
      default: return 'Unknown';
    }
  };

  // Get status color (when booking provided, status 5 with cancel_status=0 / 6 with reschedule_status=0 use request colors)
  const getStatusColor = (status: number, booking?: Booking) => {
    if (booking) {
      if (status === 5 && booking.cancel_status === 0) return { bg: '#fed7aa', border: '#fdba74', text: '#ea580c' }; // Orange for Cancel Requested
      if (status === 6 && booking.reschedule_status === 0) return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' }; // Yellow for Reschedule Requested
    }
    switch (status) {
      case 1: return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' }; // Green for Accepted
      case 2: return { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' }; // Blue for In Progress
      case 3: return { bg: '#f3e8ff', border: '#c084fc', text: '#9333ea' }; // Purple for Completed
      case 4: return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }; // Red for Reject
      case 5: return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }; // Red for Canceled
      case 6: return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' }; // Yellow for Rescheduled
      case 7: return { bg: '#fed7aa', border: '#fdba74', text: '#ea580c' }; // Orange for Cancel Request
      case 8: return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' }; // Yellow for Reschedule Request
      case 9: return { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' }; // Orange for On Hold
      default: return { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' };
    }
  };

  // Get canceled by label
  const getCanceledByLabel = (type?: number) => {
    if (type === 1) return 'Worker';
    if (type === 2) return 'Customer';
    if (type === 3) return 'Admin';
    return 'N/A';
  };

  // Get rescheduled by label
  const getRescheduledByLabel = (type?: number) => {
    if (type === 1) return 'Worker';
    if (type === 2) return 'Customer';
    if (type === 3) return 'Admin';
    return 'N/A';
  };

  // Filter and sort bookings
  const getFilteredAndSortedBookings = () => {
    let filtered = [...bookings];

    // Apply status filter
    if (statusFilter === 'reject') {
      // Reject: Only include booking_ids where ALL records have status = 4
      const bookingsByBookingId = new Map<string, Booking[]>();
      
      // Group bookings by booking_id
      filtered.forEach(booking => {
        if (!bookingsByBookingId.has(booking.booking_id)) {
          bookingsByBookingId.set(booking.booking_id, []);
        }
        bookingsByBookingId.get(booking.booking_id)!.push(booking);
      });
      
      // Filter: Only keep booking_ids where ALL records have status = 4
      const rejectedBookingIds = new Set<string>();
      bookingsByBookingId.forEach((bookingGroup, bookingId) => {
        const allRejected = bookingGroup.every(booking => booking.status === 4);
        if (allRejected) {
          rejectedBookingIds.add(bookingId);
        }
      });
      
      // Keep only bookings with rejected booking_ids
      filtered = filtered.filter(booking => rejectedBookingIds.has(booking.booking_id));
    } else if (statusFilter === 'cancel') {
      // Cancel: Backend already filters b.status = 5 AND b.payment_status = 1 AND c.status = 1 AND b.id = c.bookingid
      // Client-side filter by status = 5 for additional safety
      filtered = filtered.filter(booking => booking.status === 5);
    } else if (statusFilter === 'reschedule') {
      // Reschedule: Backend already filters b.status = 6 AND b.payment_status = 1 AND r.status = 1 AND b.id = r.bookingid
      // Client-side filter by status = 6 for additional safety
      filtered = filtered.filter(booking => booking.status === 6);
    } else if (statusFilter === 'cancelreq') {
      // Cancel Requests: Backend already filters b.status = 5 AND b.payment_status = 1 AND c.status = 0 AND b.id = c.bookingid
      // No additional filtering needed
      filtered = filtered;
    } else if (statusFilter === 'reschedulereq') {
      // Reschedule Requests: Backend already filters b.status = 6 AND b.payment_status = 1 AND r.status = 0 AND b.id = r.bookingid
      // No additional filtering needed
      filtered = filtered;
    } else {
      // For all other filters, require payment_status = 1
      filtered = filtered.filter(booking => booking.payment_status === 1);
      
      if (statusFilter === 'all') {
        // All: status = 1, 2, 3, 5, 6, 7, 8 AND payment_status = 1
        filtered = filtered.filter(booking => 
          booking.status === 1 || 
          booking.status === 2 || 
          booking.status === 3 || 
          booking.status === 5 || 
          booking.status === 6 || 
          booking.status === 7 || 
          booking.status === 8
        );
      } else if (statusFilter === 'active') {
        // Active: status = 1 AND payment_status = 1
        filtered = filtered.filter(booking => booking.status === 1);
      } else if (statusFilter === 'inprogress') {
        // InProgress: status = 1 AND payment_status = 1
        filtered = filtered.filter(booking => booking.status === 2);
      } else if (statusFilter === 'completed') {
        // Completed: status = 2 AND payment_status = 1
        filtered = filtered.filter(booking => booking.status === 3);
      } else if (statusFilter === 'onhold') {
        filtered = filtered.filter(booking => booking.status === 9);
      }
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

    // Apply date range filter
    if (fromDate.trim() || toDate.trim()) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at || booking.booking_time);
        const bookingDay = formatDateToYYYYMMDD(bookingDate);
        if (fromDate.trim() && bookingDay < fromDate.trim()) return false;
        if (toDate.trim() && bookingDay > toDate.trim()) return false;
        return true;
      });
    }

    // Deduplicate by booking_id - keep only the latest record for each booking_id
    const pickHold = (a?: string | null, b?: string | null) => {
      const t = (v?: string | null) => (v != null && String(v).trim() !== '' ? v : undefined);
      return t(a) ?? t(b) ?? undefined;
    };
    const bookingsMap = new Map<string, Booking>();
    filtered.forEach(booking => {
      const existing = bookingsMap.get(booking.booking_id);
      if (!existing) {
        bookingsMap.set(booking.booking_id, booking);
      } else {
        // Compare by created_at to get the latest one
        const existingTime = new Date(existing.created_at).getTime();
        const currentTime = new Date(booking.created_at).getTime();
        const newer = currentTime > existingTime ? booking : existing;
        const older = currentTime > existingTime ? existing : booking;
        const merged: Booking = {
          ...newer,
          hold_from: pickHold(newer.hold_from, older.hold_from),
          worker_hold_comments: pickHold(newer.worker_hold_comments, older.worker_hold_comments),
          customer_hold_comments: pickHold(newer.customer_hold_comments, older.customer_hold_comments),
        };
        bookingsMap.set(booking.booking_id, merged);
      }
    });
    filtered = Array.from(bookingsMap.values());

    // Apply sorting - order by id descending
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'desc':
          return b.id - a.id; // Descending order by id
        case 'asc':
          return a.id - b.id; // Ascending order by id
        default:
          return b.id - a.id; // Default to descending by id
      }
    });

    return filtered;
  };

  // Pagination logic - when From date is selected, show all records in that range; when empty, use Show dropdown
  const hasDateFilter = fromDate.trim() !== '';
  const getPaginatedBookings = () => {
    const filtered = getFilteredAndSortedBookings();
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
    : Math.ceil(getFilteredAndSortedBookings().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Accepted' },
    { value: 'inprogress', label: 'InProgress' },
    { value: 'onhold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'reject', label: 'Reject' },
    { value: 'cancel', label: 'Cancel' },
    { value: 'reschedule', label: 'Reschedule' },
    { value: 'cancelreq', label: 'Cancel Requests' },
    { value: 'reschedulereq', label: 'Reschedule Requests' },
  ];

  const statusChangeOptions = [
    { value: 1, label: 'Accept', icon: 'checkmark-circle' as const, color: '#10b981' },
    { value: 2, label: 'In Progress', icon: 'play-circle' as const, color: '#3b82f6' },
    { value: 3, label: 'Complete', icon: 'checkmark-done' as const, color: '#8b5cf6' },
    { value: 5, label: 'Cancel', icon: 'trash-outline' as const, color: '#dc2626' },
    { value: 6, label: 'Reschedule', icon: 'calendar-outline' as const, color: '#fde047' },
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

  // Polling function to check booking status
  const checkBookingStatus = async (bookingId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHECK_BOOKING_STATUS(bookingId));
      const data = await response.json();
      
      if (data.success) {
        const { hasPending, acceptedBooking, allBusy } = data.data;
        
        // If a worker accepted the booking
        if (acceptedBooking) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setPollingStatus('success');
          setAcceptedWorkerName(acceptedBooking.worker_name || 'A worker');
          setPollingMessage(`${acceptedBooking.worker_name || 'Worker'} accepted your booking request!`);
          
          // Refresh bookings
          const isCanceled = statusFilter === 'cancel';
          const isRescheduled = statusFilter === 'reschedule';
          const isCancelReq = statusFilter === 'cancelreq';
          const isRescheduleReq = statusFilter === 'reschedulereq';
          const isOnHold = statusFilter === 'onhold';
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
          
          return;
        }
        
        // If all workers are busy (no pending, no accepted)
        if (allBusy && !hasPending) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Update the clicked record based on request type (if no worker accepts: restore original booking_time)
          try {
            const requestBody: any = { requestType: currentRequestTypeRef.current };
            if (currentRequestTypeRef.current === 'reschedule') {
              requestBody.original_booking_time = currentOriginalBookingTimeRef.current;
            }
            
            const revertResponse = await fetch(API_ENDPOINTS.REVERT_TO_CANCEL_REQUEST(currentRecordIdRef.current), {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });
            
            const revertData = await revertResponse.json();
            if (revertData.success) {
              const requestTypeLabel = currentRequestTypeRef.current === 'reschedule' ? 'reschedule request' : 'cancel request';
              console.log(`✅ Booking reverted to ${requestTypeLabel} status`);
            }
          } catch (error) {
            console.error('❌ Error reverting booking:', error);
          }
          
          setPollingStatus('failed');
          setPollingMessage('All workers are busy right now. Please try again later.');
          
          // Refresh bookings
          const isCanceled = statusFilter === 'cancel';
          const isRescheduled = statusFilter === 'reschedule';
          const isCancelReq = statusFilter === 'cancelreq';
          const isRescheduleReq = statusFilter === 'reschedulereq';
          const isOnHold = statusFilter === 'onhold';
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
          
          return;
        }
        
        // Still pending, continue polling
        console.log('⏳ Still waiting for worker response...');
      }
    } catch (error) {
      console.error('❌ Error checking booking status:', error);
    }
  };

  // Start polling after assigning to other worker
  const startPolling = (bookingId: string, recordId: number, requestType: 'cancel' | 'reschedule' = 'cancel', rescheduleDate?: string, originalBookingTime?: string) => {
    currentBookingIdRef.current = bookingId;
    currentRecordIdRef.current = recordId;
    currentRequestTypeRef.current = requestType;
    currentRescheduleDateRef.current = rescheduleDate || '';
    currentOriginalBookingTimeRef.current = originalBookingTime || '';
    
    // Show popup
    setShowPollingPopup(true);
    setPollingStatus('pending');
    setPollingMessage('Waiting for worker to accept...');
    setAcceptedWorkerName('');
    
    // Initial check
    checkBookingStatus(bookingId);
    
    // Start polling every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      checkBookingStatus(bookingId);
    }, 3000);
  };

  // Stop polling when component unmounts or popup closes
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleAssignWorker = async (booking: Booking) => {
    try {
      setOpenMenuId(null);
      setMenuPosition(null);
      
      // Determine request type based on status filter
      const requestType = statusFilter === 'reschedulereq' ? 'reschedule' : 'cancel';
      
      console.log('🔄 Assigning to other worker:', booking, 'Type:', requestType);
      
      // Prepare request body
      const requestBody: any = { requestType };
      if (requestType === 'reschedule' && booking.reschedule_date) {
        requestBody.reschedule_date = booking.reschedule_date;
      }
      
      const response = await fetch(API_ENDPOINTS.ASSIGN_TO_OTHER_WORKER(booking.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Successfully assigned to other worker');
        // Start polling to check if any worker accepts
        startPolling(booking.booking_id, booking.id, requestType, booking.reschedule_date, booking.booking_time);
      } else {
        console.error('❌ Failed to assign to other worker:', data.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'Failed to assign worker',
        });
      }
    } catch (error) {
      console.error('❌ Error assigning to other worker:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred while assigning to other worker',
      });
    }
  };

  const closePollingPopup = () => {
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setShowPollingPopup(false);
    setPollingStatus('pending');
    setPollingMessage('Waiting for worker to accept...');
    setAcceptedWorkerName('');
  };

  const handleAccept = async (booking: Booking) => {
    try {
      setOpenMenuId(null);
      setMenuPosition(null);
      
      console.log('✅ Accepting cancel request:', booking);
      
      const response = await fetch(API_ENDPOINTS.ACCEPT_CANCEL_REQUEST(booking.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Cancel request accepted successfully');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Cancel Booking Request Accepted Successfully',
        });
        
        // Refresh the bookings list
        const isCanceled = statusFilter === 'cancel';
        const isRescheduled = statusFilter === 'reschedule';
        const isCancelReq = statusFilter === 'cancelreq';
        const isRescheduleReq = statusFilter === 'reschedulereq';
        const isOnHold = statusFilter === 'onhold';
        await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
      } else {
        console.error('❌ Failed to accept cancel request:', data.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'Failed to accept cancel request',
        });
      }
    } catch (error) {
      console.error('❌ Error accepting cancel request:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred while accepting cancel request',
      });
    }
  };

  const handleReject = async (booking: Booking) => {
    try {
      setOpenMenuId(null);
      setMenuPosition(null);
      
      // Check if it's a reschedule request or cancel request
      const isRescheduleReq = statusFilter === 'reschedulereq';
      
      if (isRescheduleReq) {
        console.log('❌ Rejecting reschedule request:', booking);
        
        const response = await fetch(API_ENDPOINTS.REJECT_RESCHEDULE_REQUEST(booking.id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Reschedule request rejected successfully');
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Reschedule Request Rejected Successfully',
          });
          
          // Refresh the bookings list
          const isCanceled = false;
          const isRescheduled = false;
          const isCancelReq = false;
          const isRescheduleReqRefresh = true;
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReqRefresh, false);
        } else {
          console.error('❌ Failed to reject reschedule request:', data.message);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: data.message || 'Failed to reject reschedule request',
          });
        }
      } else {
        console.log('❌ Rejecting cancel request:', booking);
        
        const response = await fetch(API_ENDPOINTS.REJECT_CANCEL_REQUEST(booking.id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Cancel request rejected successfully');
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Cancel Booking Request Rejected Successfully',
          });
          
          // Refresh the bookings list
          const isCanceled = statusFilter === 'cancel';
          const isRescheduled = statusFilter === 'reschedule';
          const isCancelReq = statusFilter === 'cancelreq';
          const isRescheduleReq = statusFilter === 'reschedulereq';
          const isOnHold = statusFilter === 'onhold';
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
        } else {
          console.error('❌ Failed to reject cancel request:', data.message);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: data.message || 'Failed to reject cancel request',
          });
        }
      }
    } catch (error) {
      console.error('❌ Error rejecting request:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred while rejecting request',
      });
    }
  };

  const handleStatusChange = async (booking: Booking, newStatus: number) => {
    try {
      setStatusDropdownBookingId(null);
      setStatusDropdownPosition(null);
      const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(booking.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        const toastMessage = newStatus === 1 ? 'Status updated to Active' : newStatus === 2 ? 'Status updated to Start' : newStatus === 3 ? 'Status updated to Complete' : newStatus === 5 ? 'Status updated to Cancel' : 'Status updated successfully';
        Toast.show({ type: 'success', text1: 'Success', text2: toastMessage });
        const isCanceled = statusFilter === 'cancel';
        const isRescheduled = statusFilter === 'reschedule';
        const isCancelReq = statusFilter === 'cancelreq';
        const isRescheduleReq = statusFilter === 'reschedulereq';
        const isOnHold = statusFilter === 'onhold';
        await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message || 'Failed to update status' });
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'An error occurred while updating status' });
    }
  };

  const handleCancelWithReason = async () => {
    if (!cancelModalBooking || !cancelReason.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter reason for cancellation' });
      return;
    }
    try {
      setShowCancelModal(false);
      const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(cancelModalBooking.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 5, cancel_reason: cancelReason.trim(), cancel_type: 3 }), // 3 = Admin -> tbl_canceledbookings.type=3, status=1
      });
      const data = await response.json();
      if (data.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Status updated to Cancel' });
        setCancelModalBooking(null);
        setCancelReason('');
        const isCanceled = statusFilter === 'cancel';
        const isRescheduled = statusFilter === 'reschedule';
        const isCancelReq = statusFilter === 'cancelreq';
        const isRescheduleReq = statusFilter === 'reschedulereq';
        const isOnHold = statusFilter === 'onhold';
        await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq, isOnHold);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message || 'Failed to update status' });
      }
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'An error occurred while cancelling' });
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModalBooking || !rescheduleReason.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter reason for reschedule' });
      return;
    }
    if (!rescheduleDate) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please select reschedule date and time' });
      return;
    }
    try {
      setShowRescheduleModal(false);
      const year = rescheduleDate.getFullYear();
      const month = String(rescheduleDate.getMonth() + 1).padStart(2, '0');
      const day = String(rescheduleDate.getDate()).padStart(2, '0');
      const hour = String(rescheduleDate.getHours()).padStart(2, '0');
      const minute = String(rescheduleDate.getMinutes()).padStart(2, '0');
      const second = String(rescheduleDate.getSeconds()).padStart(2, '0');
      const rescheduleDateTimeStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      const response = await fetch(API_ENDPOINTS.ADMIN_RESCHEDULE_BOOKING(rescheduleModalBooking.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reschedule_date: rescheduleDateTimeStr, reschedule_reason: rescheduleReason.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        const bookingId = rescheduleModalBooking.booking_id;
        const recordId = rescheduleModalBooking.id;
        const originalBookingTime = rescheduleModalBooking.booking_time;
        setRescheduleModalBooking(null);
        setRescheduleDate(null);
        setRescheduleReason('');
        startPolling(bookingId, recordId, 'reschedule', rescheduleDateTimeStr, originalBookingTime);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message || 'Failed to reschedule booking' });
      }
    } catch (error) {
      console.error('❌ Error rescheduling booking:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'An error occurred while rescheduling' });
    }
  };

  const styles = createStyles(width, height);

  if (viewingWorkerId !== null) {
    return (
      <ViewWorker
        workerId={viewingWorkerId}
        onBack={() => setViewingWorkerId(null)}
      />
    );
  }

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
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  // For Cancel, Reschedule, Cancel Requests, and Reschedule Requests, show empty table instead of message
  const showEmptyTable = statusFilter === 'cancel' || 
                         statusFilter === 'reschedule' || 
                         statusFilter === 'cancelreq' || 
                         statusFilter === 'reschedulereq' ||
                         statusFilter === 'onhold';

  if (bookings.length === 0 && !showEmptyTable) {
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
  paginatedBookingsRef.current = paginatedBookings;

  const timelineStepsForModal = timelineBooking
    ? buildBookingTimelineSteps(timelineBooking, formatDate)
    : [];
  const timelineModalDynamicWidth = getTimelineModalContentWidth(
    width,
    isDesktop,
    timelineStepsForModal.length
  );

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
        onScroll={() => {
          setOpenMenuId(null);
          setMenuPosition(null);
          setStatusDropdownBookingId(null);
          setStatusDropdownPosition(null);
        }}
      scrollEventThrottle={16}
    >
      <TouchableWithoutFeedback onPress={() => {
        setOpenMenuId(null);
        setMenuPosition(null);
        setStatusDropdownBookingId(null);
        setStatusDropdownPosition(null);
        setShowStatusDropdown(false);
        setShowSortDropdown(false);
        setShowRecordsDropdown(false);
      }}>
        <View style={styles.bookingsContainer}>
          <View style={styles.bookingsHeader}>
          <View style={styles.controlsRow}>
            {/* Left side - Title */}
            <Text style={styles.bookingsTitle}>
              Bookings
            </Text>
            
            {/* Right side - Status, Sort, Date filters and Records - horizontally scrollable */}
            <View style={styles.controlsRight}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.controlsScrollRow}
                contentContainerStyle={styles.controlsScrollContent}
              >
                {/* Status Dropdown - same style as Sort By */}
                <View ref={statusDropdownButtonRef} style={styles.dropdownWrapperSort} collapsable={false}>
                  <Text style={styles.dropdownLabel}>Status:</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButtonSort}
                    onPress={() => {
                      statusDropdownButtonRef.current?.measureInWindow((x, y, width, height) => {
                        setStatusDropdownLayout({ x, y, width, height });
                        setShowStatusDropdown(!showStatusDropdown);
                        setShowSortDropdown(false);
                        setShowRecordsDropdown(false);
                      });
                    }}
                  >
                    <Ionicons name="filter" size={16} color="#64748b" />
                    <Text style={styles.dropdownButtonText}>
                      {statusOptions.find(opt => opt.value === statusFilter)?.label}
                    </Text>
                    <Ionicons 
                      name={showStatusDropdown ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                  {/* Status dropdown options rendered in Modal to avoid ScrollView clipping */}
                </View>

                {/* Sort Dropdown */}
                <View ref={sortDropdownButtonRef} style={styles.dropdownWrapperSort} collapsable={false}>
                  <Text style={styles.dropdownLabel}>Sort By:</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButtonSort}
                    onPress={() => {
                      sortDropdownButtonRef.current?.measureInWindow((x, y, width, height) => {
                        setSortDropdownLayout({ x, y, width, height });
                        setShowSortDropdown(!showSortDropdown);
                        setShowStatusDropdown(false);
                        setShowRecordsDropdown(false);
                      });
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
                  {/* Sort dropdown options rendered in Modal to avoid ScrollView clipping */}
                </View>

                {/* From date */}
                <View style={styles.dropdownWrapperSort}>
                  <Text style={styles.dropdownLabel}>From:</Text>
                  {Platform.OS === 'web' ? (
                    <WebDateInput
                      id="book-from-date"
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
                      id="book-to-date"
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

                {/* Records Per Page Dropdown */}
              <View ref={recordsDropdownButtonRef} style={styles.dropdownWrapperShow} collapsable={false}>
                <Text style={styles.dropdownLabel}>Show:</Text>
                <TouchableOpacity 
                  style={styles.dropdownButtonShow}
                  onPress={() => {
                    recordsDropdownButtonRef.current?.measureInWindow((x, y, width, height) => {
                      setRecordsDropdownLayout({ x, y, width, height });
                      setShowRecordsDropdown(!showRecordsDropdown);
                      setShowStatusDropdown(false);
                      setShowSortDropdown(false);
                    });
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
                {/* Show dropdown options rendered in Modal to avoid ScrollView clipping */}
              </View>
              </ScrollView>
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
            onScrollBeginDrag={() => {
              setOpenMenuId(null);
              setMenuPosition(null);
            }}
            contentContainerStyle={{ overflow: 'visible' }}
          >
            <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              {(statusFilter === 'cancelreq' || statusFilter === 'reschedulereq') ? (
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 60 : isTablet ? 50 : 40 }]}>
                </View>
              ) : (
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                  <Ionicons name="list" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>S NO</Text>
                </View>
              )}
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 140 : isTablet ? 120 : 100 }]}>
                <Ionicons name="bookmark" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Booking ID</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 120 : isTablet ? 100 : 90 }]}>
                <Ionicons name="information-circle" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Status</Text>
              </View>
              <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 110 : isTablet ? 90 : 80 }]}>
                <Ionicons name="cash-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                <Text style={styles.tableHeaderText}>Amount</Text>
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
              {statusFilter !== 'cancel' && statusFilter !== 'reschedule' && statusFilter !== 'cancelreq' && statusFilter !== 'reschedulereq' && (
                <>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 250 : isTablet ? 200 : 180 }]}>
                    <Ionicons name="location" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Work Location</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="calendar" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Booking Date</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="calendar" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Booking For</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 300 : isTablet ? 250 : 200 }]}>
                    <Ionicons name="document-text" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Description</Text>
                  </View>
                  {statusFilter === 'onhold' && (
                    <>
                      <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 200 : isTablet ? 170 : 150 }]}>
                        <Ionicons name="time-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                        <Text style={styles.tableHeaderText}>Hold From</Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 260 : isTablet ? 220 : 180 }]}>
                        <Ionicons name="chatbubble-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                        <Text style={styles.tableHeaderText}>Worker comments</Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 260 : isTablet ? 220 : 180 }]}>
                        <Ionicons name="chatbubbles-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                        <Text style={styles.tableHeaderText}>Customer comments</Text>
                      </View>
                    </>
                  )}
                </>
              )}
              {(statusFilter === 'cancel' || statusFilter === 'cancelreq') && (
                <>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 140 : isTablet ? 100 : 90 }]}>
                    <Ionicons name="person-remove" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Canceled By</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 330 : isTablet ? 100 : 90 }]}>
                    <Ionicons name="person-remove" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Reason</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="calendar" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Booking Date</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="calendar" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Booking For</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="close-circle" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Canceled Date</Text>
                  </View>
                </>
              )}
              {(statusFilter === 'reschedule' || statusFilter === 'reschedulereq') && (
                <>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 100 : 90 }]}>
                    <Ionicons name="person-add" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Rescheduled By</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 330 : isTablet ? 100 : 90 }]}>
                    <Ionicons name="document-text" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Reason</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="calendar" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Booking Date</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="calendar" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Booking For</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                    <Ionicons name="calendar-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Reschedule Date</Text>
                  </View>
                </>
              )}
            </View>

            {/* Table Body */}
            {paginatedBookings.map((booking, index) => {
              const statusColors = statusFilter === 'cancelreq' 
                ? getStatusColor(7) // Orange for Cancel Request
                : statusFilter === 'reschedulereq'
                ? getStatusColor(8) // Yellow for Reschedule Request
                : getStatusColor(booking.status, booking);
              const serialNumber = recordsPerPage === 'ALL' 
                ? index + 1 
                : (currentPage - 1) * recordsPerPage + index + 1;
              const isMenuOpen = openMenuId === booking.id;
              const shouldOpenUpward = index >= paginatedBookings.length - 2;
              return (
                <View 
                  key={booking.id} 
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                    isMenuOpen && styles.tableRowActive
                  ]}
                >
                  {(statusFilter === 'cancelreq' || statusFilter === 'reschedulereq') ? (
                    <View style={[styles.tableCell, styles.menuCell, { width: isDesktop ? 60 : isTablet ? 50 : 40 }]}>
                      <TouchableOpacity
                        ref={(ref) => {
                          if (ref && isMenuOpen && !menuPosition) {
                            ref.measureInWindow((x, y, width, height) => {
                              setMenuPosition({ x: x + width + 8, y: y });
                            });
                          }
                        }}
                        style={styles.menuIconButton}
                        onPress={(e) => {
                          if (!isMenuOpen) {
                            const target = e.currentTarget as any;
                            if (target?.measureInWindow) {
                              target.measureInWindow((x: number, y: number, width: number, height: number) => {
                                setMenuPosition({ x: x + width + 8, y: y });
                                setOpenMenuId(booking.id);
                              });
                            } else {
                              setOpenMenuId(booking.id);
                            }
                          } else {
                            setOpenMenuId(null);
                            setMenuPosition(null);
                          }
                        }}
                      >
                        <Ionicons name="menu" size={isDesktop ? 18 : isTablet ? 16 : 14} color="#64748b" />
                      </TouchableOpacity>
                      <Modal
                        visible={isMenuOpen}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => {
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                      >
                        <TouchableWithoutFeedback onPress={() => {
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}>
                          <View style={styles.menuOverlay}>
                            <TouchableWithoutFeedback>
                              <View style={[
                                styles.menuDropdown,
                                menuPosition && {
                                  position: 'absolute',
                                  left: menuPosition.x,
                                  top: menuPosition.y,
                                }
                              ]}>
                                {/* Show "Assign to other worker" for reschedule requests OR when canceled by Worker */}
                                {(statusFilter === 'reschedulereq' || booking.canceled_by === 1) && (
                                  <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => handleAssignWorker(booking)}
                                  >
                                    <Ionicons name="person-add-outline" size={isDesktop ? 16 : 14} color="#06b6d4" />
                                    <Text style={styles.menuItemText}>Assign to other worker</Text>
                                  </TouchableOpacity>
                                )}
                                {/* Don't show Accept option for Reschedule Requests */}
                                {statusFilter !== 'reschedulereq' && (
                                  <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => handleAccept(booking)}
                                  >
                                    <Ionicons name="checkmark-circle-outline" size={isDesktop ? 16 : 14} color="#10b981" />
                                    <Text style={styles.menuItemText}>Accept</Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={[styles.menuItem, styles.menuItemLast]}
                                  onPress={() => handleReject(booking)}
                                >
                                  <Ionicons name="close-circle-outline" size={isDesktop ? 16 : 14} color="#dc2626" />
                                  <Text style={styles.menuItemText}>Reject</Text>
                                </TouchableOpacity>
                              </View>
                            </TouchableWithoutFeedback>
                          </View>
                        </TouchableWithoutFeedback>
                      </Modal>
                    </View>
                  ) : (
                    <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                      <Text style={styles.tableCellText}>{serialNumber}</Text>
                    </View>
                  )}
                  <View style={[styles.tableCell, { width: isDesktop ? 140 : isTablet ? 120 : 100 }]}>
                    <TouchableOpacity onPress={() => setTimelineBooking(booking)} activeOpacity={0.75}>
                      <Text style={[styles.tableCellText, styles.workerNameLink]}>#{booking.booking_id}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 120 : isTablet ? 100 : 90 }]}>
                    {(statusFilter === 'reject' || statusFilter === 'reschedule' || statusFilter === 'cancelreq' || statusFilter === 'reschedulereq') ? (
                      <View style={[styles.tableStatusBadge, { 
                        backgroundColor: statusColors.bg,
                        borderColor: statusColors.border
                      }]}>
                        <Text style={[styles.tableStatusText, { color: statusColors.text }]}>
                          {statusFilter === 'cancelreq' ? 'Cancel Requested' : 
                           statusFilter === 'reschedulereq' ? 'Reschedule Requested' : 
                           getStatusLabel(booking.status, booking)}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          ref={(ref) => {
                            if (ref && statusDropdownBookingId === booking.id && !statusDropdownPosition) {
                              ref.measureInWindow((x, y, w, h) => {
                                const DROPDOWN_HEIGHT = 340;
                                const spaceBelow = height - (y + h + 4);
                                const openUpward = spaceBelow < DROPDOWN_HEIGHT;
                                setStatusDropdownPosition({
                                  x: x,
                                  y: openUpward ? Math.max(8, y - DROPDOWN_HEIGHT) : y + h + 4,
                                  openUpward,
                                });
                              });
                            }
                          }}
                          style={[styles.tableStatusBadge, styles.statusBadgeClickable, { 
                            backgroundColor: statusColors.bg,
                            borderColor: statusColors.border
                          }]}
                          onPress={() => {
                            if (statusDropdownBookingId === booking.id) {
                              setStatusDropdownBookingId(null);
                              setStatusDropdownPosition(null);
                            } else {
                              setStatusDropdownPosition(null);
                              setStatusDropdownBookingId(booking.id);
                            }
                          }}
                        >
                          <Text style={[styles.tableStatusText, { color: statusColors.text }]}>
                            {getStatusLabel(booking.status, booking)}
                          </Text>
                          <Ionicons name="chevron-down" size={isDesktop ? 12 : 10} color={statusColors.text} style={{ opacity: 0.8, marginLeft: 4 }} />
                        </TouchableOpacity>
                        <Modal
                          visible={statusDropdownBookingId === booking.id}
                          transparent={true}
                          animationType="none"
                          onRequestClose={() => {
                            setStatusDropdownBookingId(null);
                            setStatusDropdownPosition(null);
                          }}
                        >
                          <TouchableWithoutFeedback onPress={() => {
                            setStatusDropdownBookingId(null);
                            setStatusDropdownPosition(null);
                          }}>
                            <View style={styles.statusDropdownOverlay}>
                              <TouchableWithoutFeedback>
                                <View style={[
                                  styles.statusDropdownPanel,
                                  statusDropdownPosition && {
                                    position: 'absolute',
                                    left: statusDropdownPosition.x,
                                    top: statusDropdownPosition.y,
                                  }
                                ]}>
                                  <View style={styles.statusDropdownHeader}>
                                    <Ionicons name="swap-horizontal" size={18} color="#f59e0b" />
                                    <Text style={styles.statusDropdownTitle}>Change Status</Text>
                                  </View>
                                  <View style={styles.statusDropdownDivider} />
                                  <ScrollView {...(statusDropdownBookingId === booking.id && Platform.OS === 'web' ? { nativeID: 'status-dropdown-scroll' } : {})} style={styles.statusDropdownScroll} showsVerticalScrollIndicator={true}>
                                    {statusChangeOptions.map((option) => (
                                      <TouchableOpacity
                                        key={option.value}
                                        style={[
                                          styles.statusDropdownItem,
                                          option.value === 5 && styles.statusDropdownItemLast,
                                          booking.status === option.value && styles.statusDropdownItemActive
                                        ]}
                                        onPress={() => {
                                          if (option.value === 5) {
                                            setStatusDropdownBookingId(null);
                                            setStatusDropdownPosition(null);
                                            setCancelModalBooking(booking);
                                            setCancelReason('');
                                            setShowCancelModal(true);
                                          } else if (option.value === 6) {
                                            setStatusDropdownBookingId(null);
                                            setStatusDropdownPosition(null);
                                            setRescheduleModalBooking(booking);
                                            const baseDate = booking.booking_time ? new Date(booking.booking_time) : new Date();
                                            const plusOneDay = new Date(baseDate);
                                            plusOneDay.setDate(plusOneDay.getDate() + 1);
                                            setRescheduleDate(plusOneDay);
                                            setRescheduleReason('');
                                            setShowRescheduleDatePicker(false);
                                            setShowRescheduleModal(true);
                                          } else if (option.value === 1 || option.value === 2 || option.value === 3) {
                                            setStatusDropdownBookingId(null);
                                            setStatusDropdownPosition(null);
                                            setStatusConfirmBooking(booking);
                                            setStatusConfirmNewStatus(option.value);
                                            setShowStatusConfirmModal(true);
                                          } else {
                                            handleStatusChange(booking, option.value);
                                          }
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <View style={[styles.statusDropdownIconWrap, { backgroundColor: option.color + '20' }]}>
                                          <Ionicons name={option.icon} size={isDesktop ? 18 : 16} color={option.color} />
                                        </View>
                                        <Text style={[
                                          styles.statusDropdownItemText,
                                          booking.status === option.value && { color: option.color, fontWeight: '700' }
                                        ]}>
                                          {option.label}
                                        </Text>
                                        {booking.status === option.value && (
                                          <Ionicons name="checkmark-circle" size={18} color={option.color} />
                                        )}
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              </TouchableWithoutFeedback>
                            </View>
                          </TouchableWithoutFeedback>
                        </Modal>
                      </>
                    )}
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 110 : isTablet ? 90 : 80 }]}>
                    <Text style={styles.tableCellText}>
                      {booking.amount != null ? `₹${booking.amount}` : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 130 }]}>
                    {booking.worker_id ? (
                      <TouchableOpacity
                        onPress={() => {
                          setViewingWorkerId(booking.worker_id);
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                      >
                        <Text style={[styles.tableCellText, styles.workerNameLink]}>{booking.worker_name || 'N/A'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.tableCellText}>{booking.worker_name || 'N/A'}</Text>
                    )}
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 130 }]}>
                    {booking.user_id ? (
                      <TouchableOpacity
                        onPress={() => {
                          void openCustomerFromBooking(booking);
                        }}
                      >
                        <Text style={[styles.tableCellText, styles.workerNameLink]}>{booking.customer_name || 'N/A'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.tableCellText}>{booking.customer_name || 'N/A'}</Text>
                    )}
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 150 : isTablet ? 130 : 120 }]}>
                    <Text style={styles.tableCellText}>{booking.contact_number || 'N/A'}</Text>
                  </View>
                  {statusFilter !== 'cancel' && statusFilter !== 'reschedule' && statusFilter !== 'cancelreq' && statusFilter !== 'reschedulereq' && (
                    <>
                      <View style={[styles.tableCell, { width: isDesktop ? 250 : isTablet ? 200 : 180 }]}>
                        <Text style={styles.tableCellText}>{booking.work_location || 'N/A'}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{formatDate(booking.created_at)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{formatDate(booking.booking_time)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 250 : 200 }]}>
                        <Text style={styles.tableCellText}>{booking.description || 'N/A'}</Text>
                      </View>
                      {statusFilter === 'onhold' && (
                        <>
                          <View style={[styles.tableCell, { width: isDesktop ? 200 : isTablet ? 170 : 150 }]}>
                            <Text style={styles.tableCellText}>{booking.hold_from ? formatDate(booking.hold_from) : 'N/A'}</Text>
                          </View>
                          <View style={[styles.tableCell, { width: isDesktop ? 260 : isTablet ? 220 : 180, flexWrap: 'wrap', alignItems: 'flex-start' }]}>
                            <Text style={[styles.tableCellText, { flexWrap: 'wrap', width: '100%' }]} numberOfLines={undefined}>
                              {booking.worker_hold_comments || 'N/A'}
                            </Text>
                          </View>
                          <View style={[styles.tableCell, { width: isDesktop ? 260 : isTablet ? 220 : 180, flexWrap: 'wrap', alignItems: 'flex-start' }]}>
                            <Text style={[styles.tableCellText, { flexWrap: 'wrap', width: '100%' }]} numberOfLines={undefined}>
                              {booking.customer_hold_comments || 'N/A'}
                            </Text>
                          </View>
                        </>
                      )}
                    </>
                  )}
                  {(statusFilter === 'cancel' || statusFilter === 'cancelreq') && (
                    <>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 100 : 90 }]}>
                        <Text style={styles.tableCellText}>{getCanceledByLabel(booking.canceled_by)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 100 : 90, flexWrap: 'wrap', alignItems: 'flex-start' }]}>
                        <Text style={[styles.tableCellText, { flexWrap: 'wrap', width: '100%' }]} numberOfLines={undefined}>
                          {booking.cancel_reason || 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{formatDate(booking.created_at)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{formatDate(booking.booking_time)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{booking.canceled_date ? formatDate(booking.canceled_date) : 'N/A'}</Text>
                      </View>
                    </>
                  )}
                  {(statusFilter === 'reschedule' || statusFilter === 'reschedulereq') && (
                    <>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 100 : 90 }]}>
                        <Text style={styles.tableCellText}>{getRescheduledByLabel(booking.rescheduled_by)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 330 : isTablet ? 100 : 90, flexWrap: 'wrap', alignItems: 'flex-start' }]}>
                        <Text style={[styles.tableCellText, { flexWrap: 'wrap', width: '100%' }]} numberOfLines={undefined}>
                          {booking.reschedule_reason || 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{formatDate(booking.created_at)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{formatDate(booking.booking_time)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{booking.reschedule_date ? formatDate(booking.reschedule_date) : 'N/A'}</Text>
                      </View>
                    </>
                  )}
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
      </TouchableWithoutFeedback>

      {/* Status Dropdown Modal - renders outside ScrollView to avoid clipping */}
      <Modal
        visible={showStatusDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusDropdown(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowStatusDropdown(false)}
          />
          <View
            style={[
              styles.dropdownMenuStatusModal,
              {
                position: 'absolute',
                top: statusDropdownLayout ? statusDropdownLayout.y + statusDropdownLayout.height + 4 : 150,
                left: statusDropdownLayout ? statusDropdownLayout.x : 50,
                minWidth: statusDropdownLayout ? Math.max(statusDropdownLayout.width, 160) : 160,
              },
            ]}
          >
            <ScrollView
              style={styles.dropdownMenuStatusScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              {...(Platform.OS === 'web' ? { nativeID: 'status-dropdown-scroll' } : {})}
            >
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownMenuItem,
                    statusFilter === option.value && styles.dropdownMenuItemActive
                  ]}
                  onPress={() => {
                    setStatusFilter(option.value);
                    setCurrentPage(1);
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownMenuItemText,
                    statusFilter === option.value && styles.dropdownMenuItemTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {statusFilter === option.value && (
                    <Ionicons name="checkmark" size={16} color="#6366f1" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sort By Dropdown Modal - renders outside ScrollView to avoid clipping */}
      <Modal
        visible={showSortDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortDropdown(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSortDropdown(false)}
          />
          <View
            style={[
              styles.dropdownMenuStatusModal,
              {
                position: 'absolute',
                top: sortDropdownLayout ? sortDropdownLayout.y + sortDropdownLayout.height + 4 : 150,
                left: sortDropdownLayout ? sortDropdownLayout.x : 50,
                minWidth: sortDropdownLayout ? Math.max(sortDropdownLayout.width, 120) : 120,
              },
            ]}
          >
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
        </View>
      </Modal>

      {/* Show (Records Per Page) Dropdown Modal - renders outside ScrollView to avoid clipping */}
      <Modal
        visible={showRecordsDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRecordsDropdown(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowRecordsDropdown(false)}
          />
          <View
            style={[
              styles.dropdownMenuStatusModal,
              {
                position: 'absolute',
                top: recordsDropdownLayout ? recordsDropdownLayout.y + recordsDropdownLayout.height + 4 : 150,
                left: recordsDropdownLayout ? recordsDropdownLayout.x : 50,
                minWidth: recordsDropdownLayout ? Math.max(recordsDropdownLayout.width, 80) : 80,
              },
            ]}
          >
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
        </View>
      </Modal>

      {/* Booking ID → status timeline */}
      <Modal
        visible={timelineBooking !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimelineBooking(null)}
      >
        <View style={styles.workerModalOverlay}>
          <View
            style={[
              styles.workerModalContent,
              styles.timelineModalContent,
              styles.timelineModalOffset,
              { width: timelineModalDynamicWidth, maxWidth: timelineModalDynamicWidth },
            ]}
          >
            <LinearGradient
              colors={['#6366f1', '#7c3aed', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timelineModalHeader}
            >
              <View style={styles.workerModalHeaderTitleRow}>
                <View style={styles.timelineTitleRowLeft}>
                  <View style={styles.timelineTitleIconWrap}>
                    <Ionicons name="git-branch-outline" size={isDesktop ? 18 : 17} color="#fff" />
                  </View>
                  {timelineBooking ? (
                    <Text style={styles.timelineModalTitle} numberOfLines={1}>
                      Booking status
                      <Text style={styles.timelineModalIdInline}>{`  ·  #${timelineBooking.booking_id}`}</Text>
                    </Text>
                  ) : (
                    <Text style={styles.timelineModalTitle} numberOfLines={1}>
                      Booking status
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setTimelineBooking(null)} style={styles.timelineModalClose}>
                  <Ionicons name="close" size={isDesktop ? 20 : 19} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            {timelineBooking ? (
              <View style={styles.timelineModalBody}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.timelineScrollView}
                  contentContainerStyle={styles.timelineScrollContent}
                >
                  <View style={styles.timelineStepsRow}>
                    {timelineStepsForModal.map((step, i) => {
                      const borderColor = !step.filled
                        ? '#94a3b8'
                        : step.last
                          ? '#ea580c'
                          : '#0d9488';
                      return (
                        <React.Fragment key={`${step.label}-${i}`}>
                          {i > 0 ? (
                            <View
                              style={[
                                styles.timelineBetween,
                                step.connectorLabel
                                  ? { paddingTop: isDesktop ? 64 : 60 }
                                  : null,
                              ]}
                            >
                              {step.connectorLabel ? (
                                <Text style={styles.timelineConnectorLabel}>{step.connectorLabel}</Text>
                              ) : null}
                              <View style={styles.timelineArrowRow}>
                                <View
                                  style={[
                                    styles.timelineArrowStem,
                                    timelineStepsForModal[i - 1].filled
                                      ? styles.timelineArrowStemActive
                                      : styles.timelineArrowStemIdle,
                                  ]}
                                />
                                <View
                                  style={[
                                    styles.timelineArrowHead,
                                    timelineStepsForModal[i - 1].filled
                                      ? styles.timelineArrowHeadActive
                                      : styles.timelineArrowHeadIdle,
                                  ]}
                                />
                              </View>
                            </View>
                          ) : null}
                          <View
                            style={[
                              styles.timelineStepCard,
                              step.filled && styles.timelineStepCardFilled,
                              step.last && step.filled && styles.timelineStepCardComplete,
                            ]}
                          >
                            <Text style={styles.timelineStepLabel} numberOfLines={3}>
                              {step.label}
                            </Text>
                            <View
                              style={[
                                styles.timelineNodeNew,
                                step.last ? styles.timelineNodeCircleNew : null,
                                {
                                  borderColor,
                                  backgroundColor: step.filled ? `${borderColor}14` : '#f8fafc',
                                },
                                step.filled && !step.last ? styles.timelineNodeGlow : null,
                                step.filled && step.last ? styles.timelineNodeGlowLast : null,
                              ]}
                            >
                              <Ionicons name={step.icon} size={isDesktop ? 22 : 20} color={borderColor} />
                            </View>
                            <Text style={styles.timelineStepDate} numberOfLines={2}>
                              {step.sub}
                            </Text>
                          </View>
                        </React.Fragment>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setShowCancelModal(false); setCancelModalBooking(null); setCancelReason(''); }}
      >
        <View style={styles.workerModalOverlay}>
          <View style={styles.workerModalContent}>
            <View style={styles.workerModalHeader}>
              <View style={styles.workerModalHeaderTitleRow}>
                <Text style={styles.workerModalTitle}>Cancel Booking</Text>
                <TouchableOpacity onPress={() => { setShowCancelModal(false); setCancelModalBooking(null); setCancelReason(''); }} style={styles.workerModalClose}>
                  <Ionicons name="close" size={isDesktop ? 20 : 18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={[styles.tableCellText, { marginBottom: 6 }]}>Booking ID</Text>
              <Text style={[styles.tableCellText, { fontWeight: '700', marginBottom: 16 }]}>{cancelModalBooking?.booking_id || ''}</Text>
              <Text style={[styles.tableCellText, { marginBottom: 6 }]}>Reason for cancellation</Text>
              <TextInput
                style={styles.cancelReasonInput}
                placeholder="Enter reason..."
                placeholderTextColor="#94a3b8"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
              />
              <View style={styles.cancelModalButtons}>
                <TouchableOpacity style={styles.cancelModalButtonCancel} onPress={() => { setShowCancelModal(false); setCancelModalBooking(null); setCancelReason(''); }}>
                  <Text style={styles.cancelModalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelModalButtonSubmit} onPress={handleCancelWithReason}>
                  <Text style={styles.cancelModalButtonSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Booking Modal */}
      <Modal
        visible={showRescheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setShowRescheduleModal(false); setRescheduleModalBooking(null); setRescheduleDate(null); setRescheduleReason(''); setShowRescheduleDatePicker(false); }}
      >
        <View style={styles.workerModalOverlay}>
          <View style={styles.workerModalContent}>
            <View style={styles.workerModalHeader}>
              <View style={styles.workerModalHeaderTitleRow}>
                <Text style={styles.workerModalTitle}>Reschedule booking</Text>
                <TouchableOpacity onPress={() => { setShowRescheduleModal(false); setRescheduleModalBooking(null); setRescheduleDate(null); setRescheduleReason(''); setShowRescheduleDatePicker(false); }} style={styles.workerModalClose}>
                  <Ionicons name="close" size={isDesktop ? 20 : 18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={[styles.tableCellText, { marginBottom: 6 }]}>Booking ID</Text>
              <Text style={[styles.tableCellText, { fontWeight: '700', marginBottom: 16 }]}>{rescheduleModalBooking?.booking_id || ''}</Text>
              <Text style={[styles.tableCellText, { marginBottom: 6 }]}>Booking For</Text>
              <Text style={[styles.tableCellText, { fontWeight: '700', marginBottom: 16 }]}>{rescheduleModalBooking?.booking_time ? formatDate(rescheduleModalBooking.booking_time) : 'N/A'}</Text>
              <Text style={[styles.tableCellText, { marginBottom: 6 }]}>Reschedule date time</Text>
              {Platform.OS === 'web' ? (
                <View style={{ marginBottom: 16 }}>
                  <input
                    type="datetime-local"
                    value={rescheduleDate ? `${rescheduleDate.getFullYear()}-${String(rescheduleDate.getMonth() + 1).padStart(2, '0')}-${String(rescheduleDate.getDate()).padStart(2, '0')}T${String(rescheduleDate.getHours()).padStart(2, '0')}:${String(rescheduleDate.getMinutes()).padStart(2, '0')}` : ''}
                    onChange={(e) => { const v = e.target.value; setRescheduleDate(v ? new Date(v) : null); }}
                    min={new Date().toISOString().slice(0, 16)}
                    style={{ padding: 12, fontSize: 14, borderRadius: 10, border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' } as any}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.cancelReasonInput, { marginBottom: 16, justifyContent: 'center' }]}
                    onPress={() => setShowRescheduleDatePicker(true)}
                  >
                    <Text style={[styles.tableCellText, !rescheduleDate && { color: '#94a3b8' }]}>
                      {rescheduleDate ? formatDate(rescheduleDate.toISOString()) : 'Select date and time'}
                    </Text>
                  </TouchableOpacity>
                  {showRescheduleDatePicker && (
                    Platform.OS === 'ios' ? (
                      <Modal visible={showRescheduleDatePicker} transparent animationType="slide">
                        <View style={styles.datePickerModalOverlay}>
                          <View style={styles.datePickerModalContent}>
                            <View style={styles.datePickerHeader}>
                              <Text style={styles.datePickerModalTitle}>Select Date & Time</Text>
                              <TouchableOpacity onPress={() => setShowRescheduleDatePicker(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={rescheduleDate || new Date()}
                              mode="datetime"
                              display="spinner"
                              onChange={(_, date) => date && setRescheduleDate(date)}
                              minimumDate={new Date()}
                              style={{ width: '100%' }}
                            />
                            <TouchableOpacity style={[styles.cancelModalButtonSubmit, { marginTop: 16 }]} onPress={() => setShowRescheduleDatePicker(false)}>
                              <Text style={styles.cancelModalButtonSubmitText}>Done</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Modal>
                    ) : (
                      <DateTimePicker
                        value={rescheduleDate || new Date()}
                        mode="datetime"
                        display="default"
                        onChange={(_, date) => { if (date) setRescheduleDate(date); setShowRescheduleDatePicker(false); }}
                        minimumDate={new Date()}
                      />
                    )
                  )}
                </>
              )}
              <Text style={[styles.tableCellText, { marginBottom: 6 }]}>Reason for Reschedule</Text>
              <TextInput
                style={styles.cancelReasonInput}
                placeholder="Enter reason..."
                placeholderTextColor="#94a3b8"
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                multiline
                numberOfLines={3}
              />
              <View style={styles.cancelModalButtons}>
                <TouchableOpacity style={styles.cancelModalButtonCancel} onPress={() => { setShowRescheduleModal(false); setRescheduleModalBooking(null); setRescheduleDate(null); setRescheduleReason(''); setShowRescheduleDatePicker(false); }}>
                  <Text style={styles.cancelModalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cancelModalButtonSubmit,
                    { backgroundColor: '#f59e0b' },
                    (!rescheduleDate || !rescheduleReason.trim()) && { backgroundColor: '#cbd5e1', opacity: 0.6 }
                  ]}
                  onPress={handleRescheduleSubmit}
                  disabled={!rescheduleDate || !rescheduleReason.trim()}
                  activeOpacity={(!rescheduleDate || !rescheduleReason.trim()) ? 1 : 0.7}
                >
                  <Text style={[styles.cancelModalButtonSubmitText, (!rescheduleDate || !rescheduleReason.trim()) && { color: '#94a3b8' }]}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Change Confirmation Modal (Accept / Start / Complete) */}
      <Modal
        visible={showStatusConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setShowStatusConfirmModal(false); setStatusConfirmBooking(null); setStatusConfirmNewStatus(null); }}
      >
        <View style={styles.workerModalOverlay}>
          <View style={[styles.workerModalContent, { maxWidth: 400, alignItems: 'center', padding: 24 }]}>
            <View style={[styles.statusConfirmIconWrap, { backgroundColor: statusConfirmNewStatus === 1 ? '#10b98120' : statusConfirmNewStatus === 2 ? '#3b82f620' : '#8b5cf620' }]}>
              <Ionicons
                name={statusConfirmNewStatus === 1 ? 'checkmark-circle' : statusConfirmNewStatus === 2 ? 'play-circle' : 'checkmark-done'}
                size={48}
                color={statusConfirmNewStatus === 1 ? '#10b981' : statusConfirmNewStatus === 2 ? '#3b82f6' : '#8b5cf6'}
              />
            </View>
            <Text style={[styles.statusConfirmTitle, { marginTop: 16 }]}>
              {statusConfirmNewStatus === 1 ? 'Accept Booking' : statusConfirmNewStatus === 2 ? 'Start Booking' : 'Complete Booking'}
            </Text>
            <Text style={[styles.tableCellText, { color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24 }]}>
              {statusConfirmNewStatus === 1
                ? 'Are you sure you want to accept this booking? The booking will be marked as active.'
                : statusConfirmNewStatus === 2
                ? 'Are you sure you want to start this booking? The work will be marked as in progress.'
                : 'Are you sure you want to mark this booking as complete? This action cannot be undone.'}
            </Text>
            <View style={[styles.cancelModalButtons, { width: '100%', gap: 12, justifyContent: 'center' }]}>
              <TouchableOpacity
                style={[styles.cancelModalButtonCancel, { paddingHorizontal: 18, minWidth: 100 }]}
                onPress={() => { setShowStatusConfirmModal(false); setStatusConfirmBooking(null); setStatusConfirmNewStatus(null); }}
              >
                <Text style={styles.cancelModalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalButtonSubmit, { paddingHorizontal: 18, minWidth: 100 }]}
                onPress={() => {
                  if (statusConfirmBooking && statusConfirmNewStatus != null) {
                    handleStatusChange(statusConfirmBooking, statusConfirmNewStatus);
                    setShowStatusConfirmModal(false);
                    setStatusConfirmBooking(null);
                    setStatusConfirmNewStatus(null);
                  }
                }}
              >
                <Text style={styles.cancelModalButtonSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Polling Popup Modal */}
      <Modal
        visible={showPollingPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={closePollingPopup}
      >
        <View style={styles.pollingModalOverlay}>
          <View style={styles.pollingModalContent}>
            {pollingStatus === 'pending' && (
              <>
                <ActivityIndicator size="large" color="#06b6d4" />
                <Text style={styles.pollingTitle}>{pollingMessage}</Text>
                <Text style={styles.pollingSubtext}>Please wait while we find an available worker...</Text>
              </>
            )}
            
            {pollingStatus === 'success' && (
              <>
                <View style={styles.pollingIconSuccess}>
                  <Ionicons name="checkmark-circle" size={isDesktop ? 64 : 48} color="#10b981" />
                </View>
                <Text style={styles.pollingTitleSuccess}>Booking Accepted!</Text>
                <Text style={styles.pollingMessage}>{pollingMessage}</Text>
                <TouchableOpacity 
                  style={styles.pollingButtonSuccess}
                  onPress={closePollingPopup}
                >
                  <Text style={styles.pollingButtonText}>OK</Text>
                </TouchableOpacity>
              </>
            )}
            
            {pollingStatus === 'failed' && (
              <>
                <View style={styles.pollingIconFailed}>
                  <Ionicons name="close-circle" size={isDesktop ? 64 : 48} color="#ef4444" />
                </View>
                <Text style={styles.pollingTitleFailed}>No Workers Available</Text>
                <Text style={styles.pollingMessage}>{pollingMessage}</Text>
                <TouchableOpacity 
                  style={styles.pollingButtonFailed}
                  onPress={closePollingPopup}
                >
                  <Text style={styles.pollingButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Native date pickers for From/To filter */}
      {Platform.OS !== 'web' && DateTimePicker && showFromCalendar &&
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
                    if (date) { setFromDate(formatDateToYYYYMMDD(date)); setCurrentPage(1); }
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
              if (date) { setFromDate(formatDateToYYYYMMDD(date)); setCurrentPage(1); }
              setShowFromCalendar(false);
            }}
          />
        ))}

      {Platform.OS !== 'web' && DateTimePicker && showToCalendar &&
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
                    if (date) { setToDate(formatDateToYYYYMMDD(date)); setCurrentPage(1); }
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
              if (date) { setToDate(formatDateToYYYYMMDD(date)); setCurrentPage(1); }
              setShowToCalendar(false);
            }}
          />
        ))}
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
      overflow: 'visible',
    },
    contentContainer: {
      padding: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingBottom: isDesktop ? 40 : isTablet ? 32 : 24,
      overflow: 'visible',
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
      overflow: 'visible',
    },
    bookingsHeader: {
      marginBottom: 6,
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
    controlsScrollRow: {
      flexGrow: 0,
      flexShrink: 1,
      maxWidth: isMobile ? '100%' : undefined,
    },
    controlsScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
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
    dropdownMenuStatusModal: {
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      maxHeight: 220,
      overflow: 'hidden',
    },
    dropdownMenuStatusScroll: {
      maxHeight: 220,
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
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 1,
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
      overflow: 'visible',
    },
    tableRowEven: {
      backgroundColor: '#ffffff',
    },
    tableRowOdd: {
      backgroundColor: '#fafafa',
    },
    tableRowActive: {
      zIndex: 10000,
      overflow: 'visible',
      elevation: 10000,
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
      zIndex: 10001,
      elevation: 10001,
    },
    menuIconButton: {
      padding: isDesktop ? 8 : isTablet ? 7 : 6,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    menuDropdown: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 20,
      minWidth: isDesktop ? 240 : isTablet ? 220 : 200,
      maxWidth: isDesktop ? 300 : isTablet ? 280 : 260,
    },
    menuDropdownUp: {
      // Not needed with Modal - menu is centered
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingVertical: isDesktop ? 14 : isTablet ? 12 : 10,
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      minHeight: isDesktop ? 48 : isTablet ? 44 : 40,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '500',
      color: '#0f172a',
      flex: 1,
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
    statusBadgeClickable: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.25)',
    },
    statusDropdownPanel: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(226, 232, 240, 0.9)',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 24,
      minWidth: isDesktop ? 260 : isTablet ? 240 : 220,
      maxHeight: 340,
      overflow: 'hidden',
    },
    statusDropdownHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: isDesktop ? 18 : 16,
      paddingVertical: 14,
      backgroundColor: 'rgba(245, 158, 11, 0.06)',
    },
    statusDropdownTitle: {
      fontSize: isDesktop ? 15 : 14,
      fontWeight: '700',
      color: '#0f172a',
      letterSpacing: 0.3,
    },
    statusDropdownDivider: {
      height: 1,
      backgroundColor: '#e2e8f0',
      marginHorizontal: 12,
    },
    statusDropdownScroll: {
      maxHeight: 260,
      paddingVertical: 8,
    },
    statusDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? 18 : 16,
      paddingVertical: isDesktop ? 12 : 11,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    statusDropdownItemLast: {
      borderBottomWidth: 0,
    },
    statusDropdownItemActive: {
      backgroundColor: 'rgba(245, 158, 11, 0.04)',
    },
    statusDropdownIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusDropdownItemText: {
      flex: 1,
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#334155',
    },
    statusConfirmIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusConfirmTitle: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: '700',
      color: '#0f172a',
      textAlign: 'center',
    },
    cancelReasonInput: {
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: isDesktop ? 14 : 13,
      color: '#0f172a',
      minHeight: 80,
      textAlignVertical: 'top',
    },
    cancelModalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 20,
    },
    cancelModalButtonCancel: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: '#f1f5f9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelModalButtonCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748b',
      textAlign: 'center',
    },
    cancelModalButtonSubmit: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: '#dc2626',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelModalButtonSubmitText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
      textAlign: 'center',
    },
    datePickerModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    datePickerModalContent: {
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 24,
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    datePickerModalTitle: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: '700',
      color: '#0f172a',
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
    // Polling Popup Styles
    pollingModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pollingModalContent: {
      backgroundColor: '#ffffff',
      borderRadius: isDesktop ? 16 : 12,
      padding: isDesktop ? 32 : isTablet ? 28 : 24,
      width: isDesktop ? 400 : isTablet ? 350 : '85%',
      maxWidth: 400,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    pollingTitle: {
      fontSize: isDesktop ? 18 : isTablet ? 16 : 15,
      fontWeight: '600',
      color: '#0f172a',
      marginTop: isDesktop ? 20 : 16,
      textAlign: 'center',
    },
    pollingSubtext: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#64748b',
      marginTop: 8,
      textAlign: 'center',
    },
    pollingIconSuccess: {
      marginBottom: isDesktop ? 16 : 12,
    },
    pollingIconFailed: {
      marginBottom: isDesktop ? 16 : 12,
    },
    pollingTitleSuccess: {
      fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
      fontWeight: '700',
      color: '#10b981',
      marginBottom: 12,
      textAlign: 'center',
    },
    pollingTitleFailed: {
      fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
      fontWeight: '700',
      color: '#ef4444',
      marginBottom: 12,
      textAlign: 'center',
    },
    pollingMessage: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#475569',
      textAlign: 'center',
      marginBottom: isDesktop ? 24 : 20,
      lineHeight: isDesktop ? 22 : 20,
    },
    pollingButtonSuccess: {
      backgroundColor: '#10b981',
      paddingVertical: isDesktop ? 12 : 10,
      paddingHorizontal: isDesktop ? 32 : 24,
      borderRadius: 8,
      minWidth: 120,
    },
    pollingButtonFailed: {
      backgroundColor: '#ef4444',
      paddingVertical: isDesktop ? 12 : 10,
      paddingHorizontal: isDesktop ? 32 : 24,
      borderRadius: 8,
      minWidth: 120,
    },
    pollingButtonText: {
      color: '#ffffff',
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    // Worker Name Link
    workerNameLink: {
      color: '#6366f1',
      textDecorationLine: 'underline',
    },
    // ── Worker Details Modal (modern redesign) ──
    workerModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    workerModalContent: {
      backgroundColor: '#ffffff',
      borderRadius: isDesktop ? 24 : 18,
      width: isDesktop ? 620 : isTablet ? 520 : '95%',
      maxWidth: 640,
      maxHeight: isDesktop ? '88%' : '90%',
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 20,
      overflow: 'hidden',
    },
    // Gradient-style header with decorative blobs
    workerModalHeader: {
      backgroundColor: '#6366f1',
      paddingTop: isDesktop ? 20 : 16,
      paddingHorizontal: isDesktop ? 24 : 18,
      paddingBottom: isDesktop ? 56 : 48,
      overflow: 'hidden',
    },
    workerHeaderBlob1: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(139,92,246,0.4)',
      top: -60,
      right: -40,
    },
    workerHeaderBlob2: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(99,102,241,0.3)',
      bottom: -20,
      left: 20,
    },
    workerModalHeaderTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    workerModalTitle: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 0.3,
    },
    workerModalClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Floating avatar — overlaps header via negative marginTop
    workerAvatarOuter: {
      alignSelf: 'center',
      marginTop: isDesktop ? -48 : -40,
      width: isDesktop ? 96 : 80,
      height: isDesktop ? 96 : 80,
      borderRadius: isDesktop ? 48 : 40,
      borderWidth: 4,
      borderColor: '#ffffff',
      backgroundColor: '#eef2ff',
      overflow: 'hidden',
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
    },
    workerProfileImage: {
      width: '100%',
      height: '100%',
    },
    workerProfilePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#eef2ff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Name + status below avatar
    workerProfileNameSection: {
      alignItems: 'center',
      paddingTop: isDesktop ? 12 : 10,
      paddingBottom: isDesktop ? 20 : 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      gap: 8,
    },
    workerProfileName: {
      fontSize: isDesktop ? 22 : 18,
      fontWeight: '800',
      color: '#0f172a',
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    workerStatusBadge: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    workerStatusText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    workerModalScroll: {
      maxHeight: isDesktop ? 480 : 400,
    },
    workerSectionsWrapper: {
      paddingHorizontal: isDesktop ? 20 : 14,
      paddingVertical: isDesktop ? 14 : 10,
      gap: isDesktop ? 10 : 8,
    },
    workerModalLoading: {
      paddingVertical: 40,
      alignItems: 'center',
      gap: 12,
    },
    workerModalLoadingText: {
      fontSize: isDesktop ? 14 : 13,
      color: '#64748b',
      marginTop: 8,
    },
    // Section cards
    workerSection: {
      backgroundColor: '#ffffff',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      overflow: 'hidden',
      shadowColor: '#94a3b8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    workerSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isDesktop ? 18 : 14,
      paddingVertical: isDesktop ? 14 : 12,
      backgroundColor: '#fafbff',
    },
    workerSectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    workerSectionIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#eef2ff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    workerSectionTitle: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '700',
      color: '#1e293b',
    },
    workerSectionBadge: {
      backgroundColor: '#6366f1',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginLeft: 4,
    },
    workerSectionBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },
    workerSectionContent: {
      paddingHorizontal: isDesktop ? 18 : 14,
      paddingTop: isDesktop ? 4 : 2,
      paddingBottom: isDesktop ? 14 : 10,
      backgroundColor: '#ffffff',
    },
    workerSectionEmpty: {
      fontSize: isDesktop ? 13 : 12,
      color: '#94a3b8',
      textAlign: 'center',
      paddingVertical: 14,
      fontStyle: 'italic',
    },
    // Detail rows inside sections
    workerDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: isDesktop ? 10 : 9,
      borderBottomWidth: 1,
      borderBottomColor: '#f8fafc',
      gap: 12,
    },
    workerDetailIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#eef2ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
    },
    workerDetailContent: {
      flex: 1,
      justifyContent: 'center',
    },
    workerDetailLabel: {
      fontSize: isDesktop ? 10 : 9,
      fontWeight: '700',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 3,
    },
    workerDetailValue: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#1e293b',
      lineHeight: isDesktop ? 20 : 18,
    },
    // Documents sub-section
    workerDocDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: isDesktop ? 14 : 10,
      marginBottom: isDesktop ? 10 : 8,
      paddingTop: isDesktop ? 14 : 10,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
    },
    workerDocDividerText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '800',
      color: '#6366f1',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    workerDocSection: {
      paddingVertical: isDesktop ? 8 : 6,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    workerDocSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: isDesktop ? 10 : 8,
    },
    workerDocSectionTitle: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '700',
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    workerDocRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: isDesktop ? 6 : 5,
      paddingLeft: isDesktop ? 8 : 4,
    },
    workerDocIndexBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#6366f1',
      justifyContent: 'center',
      alignItems: 'center',
    },
    workerDocIndexText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#ffffff',
    },
    workerDocThumb: {
      flex: 1,
      height: isDesktop ? 70 : 58,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
    },
    workerDocViewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#6366f1',
      paddingHorizontal: isDesktop ? 14 : 11,
      paddingVertical: isDesktop ? 9 : 7,
      borderRadius: 10,
    },
    workerDocViewText: {
      color: '#ffffff',
      fontSize: isDesktop ? 13 : 12,
      fontWeight: '700',
    },
    // Booking cards
    workerBookingLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      justifyContent: 'center',
    },
    workerBookingLoadingText: {
      fontSize: isDesktop ? 13 : 12,
      color: '#64748b',
    },
    workerBookingItem: {
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: isDesktop ? 14 : 11,
      marginBottom: isDesktop ? 8 : 6,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      gap: 8,
    },
    workerBookingRow1: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    workerBookingRow2: {
      flexDirection: 'row',
      gap: 16,
      flexWrap: 'wrap',
    },
    workerBookingLeft: {
      flex: 1,
    },
    workerBookingId: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '800',
      color: '#6366f1',
    },
    workerBookingDate: {
      fontSize: isDesktop ? 11 : 10,
      color: '#94a3b8',
    },
    workerBookingField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    workerBookingFieldText: {
      fontSize: isDesktop ? 13 : 12,
      color: '#475569',
      fontWeight: '500',
    },
    workerBookingBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
    },
    workerBookingBadgeText: {
      fontSize: isDesktop ? 11 : 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    timelineModalContent: {
      maxWidth: 1360,
      width: isDesktop ? Math.min(1260, width * 0.98) : '97%',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.65)',
      shadowColor: '#312e81',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.22,
      shadowRadius: 40,
      elevation: 24,
    },
    timelineModalOffset: {
      marginLeft: isDesktop ? 255 : 206,
    },
    timelineModalHeader: {
      paddingTop: isDesktop ? 10 : 8,
      paddingHorizontal: isDesktop ? 20 : 14,
      paddingBottom: isDesktop ? 10 : 8,
    },
    timelineTitleRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 12 : 10,
      flex: 1,
      minWidth: 0,
      paddingRight: 8,
    },
    timelineTitleIconWrap: {
      width: isDesktop ? 36 : 34,
      height: isDesktop ? 36 : 34,
      borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    timelineModalTitle: {
      fontSize: isDesktop ? 17 : 15,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 0.25,
      flex: 1,
      minWidth: 0,
    },
    timelineModalIdInline: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.82)',
    },
    timelineModalClose: {
      width: isDesktop ? 36 : 34,
      height: isDesktop ? 36 : 34,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    timelineModalBody: {
      backgroundColor: '#f1f5f9',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.28)',
    },
    timelineScrollView: {
      maxHeight: isDesktop ? 340 : 310,
    },
    timelineScrollContent: {
      paddingHorizontal: isDesktop ? 24 : 16,
      paddingVertical: isDesktop ? 24 : 20,
      paddingBottom: isDesktop ? 28 : 24,
    },
    timelineStepsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: isDesktop ? 10 : 8,
    },
    timelineBetween: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: isDesktop ? 78 : 74,
      width: isDesktop ? 44 : 36,
    },
    timelineConnectorLabel: {
      fontSize: isDesktop ? 10 : 9,
      fontWeight: '700',
      color: '#0d9488',
      marginBottom: isDesktop ? 5 : 4,
      textAlign: 'center',
    },
    timelineArrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineArrowStem: {
      height: 4,
      borderRadius: 2,
      width: isDesktop ? 24 : 20,
    },
    timelineArrowStemActive: {
      backgroundColor: '#14b8a6',
      shadowColor: '#0d9488',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 6,
      elevation: 4,
    },
    timelineArrowStemIdle: {
      backgroundColor: '#cbd5e1',
    },
    timelineArrowHead: {
      width: 0,
      height: 0,
      marginLeft: -0.5,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    timelineArrowHeadActive: {
      borderTopWidth: isDesktop ? 8 : 7,
      borderBottomWidth: isDesktop ? 8 : 7,
      borderLeftWidth: isDesktop ? 12 : 10,
      borderLeftColor: '#14b8a6',
    },
    timelineArrowHeadIdle: {
      borderTopWidth: isDesktop ? 8 : 7,
      borderBottomWidth: isDesktop ? 8 : 7,
      borderLeftWidth: isDesktop ? 12 : 10,
      borderLeftColor: '#cbd5e1',
    },
    timelineStepCard: {
      width: isDesktop ? 122 : 112,
      backgroundColor: '#ffffff',
      borderRadius: 18,
      paddingTop: isDesktop ? 15 : 13,
      paddingBottom: isDesktop ? 17 : 15,
      paddingHorizontal: 9,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#334155',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.09,
      shadowRadius: 16,
      elevation: 5,
    },
    timelineStepCardFilled: {
      borderColor: '#5eead4',
      backgroundColor: '#f0fdfa',
    },
    timelineStepCardComplete: {
      borderColor: '#fdba74',
      backgroundColor: '#fffbeb',
    },
    timelineStepLabel: {
      fontSize: isDesktop ? 9 : 8,
      fontWeight: '800',
      color: '#0f172a',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.35,
      lineHeight: isDesktop ? 12 : 11,
      marginBottom: isDesktop ? 14 : 12,
      minHeight: isDesktop ? 34 : 32,
    },
    timelineNodeNew: {
      width: isDesktop ? 50 : 46,
      height: isDesktop ? 50 : 46,
      borderRadius: 14,
      borderWidth: 2.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timelineNodeCircleNew: {
      borderRadius: 25,
      width: isDesktop ? 52 : 48,
      height: isDesktop ? 52 : 48,
    },
    timelineNodeGlow: {
      shadowColor: '#0d9488',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 6,
    },
    timelineNodeGlowLast: {
      shadowColor: '#ea580c',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 8,
    },
    timelineStepDate: {
      marginTop: isDesktop ? 12 : 10,
      fontSize: isDesktop ? 10 : 9,
      color: '#475569',
      textAlign: 'center',
      fontWeight: '600',
      lineHeight: isDesktop ? 14 : 13,
    },
  });
};

