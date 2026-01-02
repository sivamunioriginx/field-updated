import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  canceled_by?: number; // 1 = Worker, 2 = Customer
  cancel_reason?: string;
  canceled_date?: string;
  cancel_status?: number; // Status from tbl_canceledbookings
  rescheduled_by?: number; // 1 = Worker, 2 = Customer
  reschedule_reason?: string;
  reschedule_date?: string;
  reschedule_status?: number; // Status from tbl_rescheduledbookings
}

interface BookingsProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  // optional initial status to show when component mounts or when changed by parent
  initialStatus?: string;
}

export default function Bookings({ searchQuery: externalSearchQuery, onSearchChange, initialStatus }: BookingsProps) {
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Polling popup state
  const [showPollingPopup, setShowPollingPopup] = useState(false);
  const [pollingMessage, setPollingMessage] = useState('Waiting for worker to accept...');
  const [pollingStatus, setPollingStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [acceptedWorkerName, setAcceptedWorkerName] = useState('');
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentBookingIdRef = useRef<string>('');
  const currentRecordIdRef = useRef<number>(0); // Store the clicked record's id
  const currentRequestTypeRef = useRef<'cancel' | 'reschedule'>('cancel');
  const currentRescheduleDateRef = useRef<string>('');

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

  const fetchBookings = async (isCanceled: boolean = false, isRescheduled: boolean = false, isCancelReq: boolean = false, isRescheduleReq: boolean = false) => {
    try {
      setLoading(true);
      
      let url = API_ENDPOINTS.ADMIN_BOOKINGS;
      if (isCancelReq) {
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
    await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq);
    setRefreshing(false);
  };

  useEffect(() => {
    const isCanceled = statusFilter === 'cancel';
    const isRescheduled = statusFilter === 'reschedule';
    const isCancelReq = statusFilter === 'cancelreq';
    const isRescheduleReq = statusFilter === 'reschedulereq';
    fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq);
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

  // Get status label
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1: return 'Accepted';
      case 2: return 'In Progress';
      case 3: return 'Completed';
      case 4: return 'Reject';
      case 5: return 'Canceled';
      case 6: return 'Rescheduled';
      case 7: return 'Cancel Request';
      case 8: return 'Reschedule Request';
      default: return 'Unknown';
    }
  };

  // Get status color
  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' }; // Green for Accepted
      case 2: return { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' }; // Blue for In Progress
      case 3: return { bg: '#f3e8ff', border: '#c084fc', text: '#9333ea' }; // Purple for Completed
      case 4: return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }; // Red for Reject
      case 5: return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }; // Red for Canceled
      case 6: return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' }; // Yellow for Rescheduled
      case 7: return { bg: '#fed7aa', border: '#fdba74', text: '#ea580c' }; // Orange for Cancel Request
      case 8: return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' }; // Yellow for Reschedule Request
      default: return { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' };
    }
  };

  // Get canceled by label
  const getCanceledByLabel = (type?: number) => {
    if (type === 1) return 'Worker';
    if (type === 2) return 'Customer';
    return 'N/A';
  };

  // Get rescheduled by label
  const getRescheduledByLabel = (type?: number) => {
    if (type === 1) return 'Worker';
    if (type === 2) return 'Customer';
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
    { value: 'active', label: 'Accepted' },
    { value: 'inprogress', label: 'InProgress' },
    { value: 'completed', label: 'Completed' },
    { value: 'reject', label: 'Reject' },
    { value: 'cancel', label: 'Cancel' },
    { value: 'reschedule', label: 'Reschedule' },
    { value: 'cancelreq', label: 'Cancel Requests' },
    { value: 'reschedulereq', label: 'Reschedule Requests' },
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
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq);
          
          return;
        }
        
        // If all workers are busy (no pending, no accepted)
        if (allBusy && !hasPending) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Update the clicked record based on request type
          try {
            const requestBody: any = { requestType: currentRequestTypeRef.current };
            if (currentRequestTypeRef.current === 'reschedule' && currentRescheduleDateRef.current) {
              requestBody.reschedule_date = currentRescheduleDateRef.current;
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
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq);
          
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
  const startPolling = (bookingId: string, recordId: number, requestType: 'cancel' | 'reschedule' = 'cancel', rescheduleDate?: string) => {
    currentBookingIdRef.current = bookingId;
    currentRecordIdRef.current = recordId;
    currentRequestTypeRef.current = requestType;
    currentRescheduleDateRef.current = rescheduleDate || '';
    
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
        startPolling(booking.booking_id, booking.id, requestType, booking.reschedule_date);
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
        await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq);
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
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReqRefresh);
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
          await fetchBookings(isCanceled, isRescheduled, isCancelReq, isRescheduleReq);
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


  const styles = createStyles(width, height);

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
                         statusFilter === 'reschedulereq';

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
        }}
      scrollEventThrottle={16}
    >
      <TouchableWithoutFeedback onPress={() => {
        setOpenMenuId(null);
        setMenuPosition(null);
      }}>
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
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 300 : isTablet ? 250 : 200 }]}>
                    <Ionicons name="document-text" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Description</Text>
                  </View>
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
                : getStatusColor(booking.status);
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
                    <Text style={styles.tableCellText}>#{booking.booking_id}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 120 : isTablet ? 100 : 90 }]}>
                    <View style={[styles.tableStatusBadge, { 
                      backgroundColor: statusColors.bg,
                      borderColor: statusColors.border
                    }]}>
                      <Text style={[styles.tableStatusText, { color: statusColors.text }]}>
                        {statusFilter === 'cancelreq' ? 'Cancel Requested' : 
                         statusFilter === 'reschedulereq' ? 'Reschedule Requested' : 
                         getStatusLabel(booking.status)}
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
                  {statusFilter !== 'cancel' && statusFilter !== 'reschedule' && statusFilter !== 'cancelreq' && statusFilter !== 'reschedulereq' && (
                    <>
                      <View style={[styles.tableCell, { width: isDesktop ? 250 : isTablet ? 200 : 180 }]}>
                        <Text style={styles.tableCellText}>{booking.work_location || 'N/A'}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 180 : isTablet ? 150 : 140 }]}>
                        <Text style={styles.tableCellText}>{formatDate(booking.booking_time)}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 250 : 200 }]}>
                        <Text style={styles.tableCellText}>{booking.description || 'N/A'}</Text>
                      </View>
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
  });
};

