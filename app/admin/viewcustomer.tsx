import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { API_ENDPOINTS, BASE_URL } from '../../constants/api';

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
      onChange: (e: { target: { value: string } }) => onChange(e.target.value || ''),
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

interface CustomerDetail {
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

interface CustomerBooking {
  id: number;
  booking_id: string;
  worker_name: string;
  work_location: string;
  booking_time: string;
  status: number;
  payment_status: number;
  amount?: number;
  created_at: string;
  description: string;
  user_id: number;
  contact_number?: string;
  customer_mobile?: string;
}

interface CustomerReview {
  booking_id: string;
  user_id: number;
  worker_name: string;
  booking_for: string;
  rating: number;
  review: string;
  created_at: string;
}

export interface ViewCustomerProps {
  customer: CustomerDetail;
  onBack: () => void;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: number) {
  switch (status) {
    case 1:
      return 'Accepted';
    case 2:
      return 'In Progress';
    case 3:
      return 'Completed';
    case 4:
      return 'Reject';
    case 5:
      return 'Canceled';
    case 6:
      return 'Rescheduled';
    case 7:
      return 'Cancel Request';
    case 8:
      return 'Reschedule Request';
    default:
      return 'Unknown';
  }
}

function getStatusColor(status: number) {
  switch (status) {
    case 1:
      return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' };
    case 2:
      return { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' };
    case 3:
      return { bg: '#f3e8ff', border: '#c084fc', text: '#9333ea' };
    case 4:
      return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' };
    case 5:
      return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' };
    case 6:
      return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' };
    case 7:
      return { bg: '#fed7aa', border: '#fdba74', text: '#ea580c' };
    case 8:
      return { bg: '#fef3c7', border: '#fde047', text: '#ca8a04' };
    default:
      return { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' };
  }
}

export default function ViewCustomer({ customer: c, onBack }: ViewCustomerProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;

  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showInvolvedBookings, setShowInvolvedBookings] = useState(false);
  const [cvBookings, setCvBookings] = useState<CustomerBooking[]>([]);
  const [cvBookingsLoading, setCvBookingsLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [cvReviews, setCvReviews] = useState<CustomerReview[]>([]);
  const [cvReviewsLoading, setCvReviewsLoading] = useState(false);

  const [involvedFromDate, setInvolvedFromDate] = useState('');
  const [involvedToDate, setInvolvedToDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [involvedCurrentPage, setInvolvedCurrentPage] = useState(1);
  const [involvedRecordsPerPage, setInvolvedRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showInvolvedRecordsDropdown, setShowInvolvedRecordsDropdown] = useState(false);
  const [involvedRecordsDropdownLayout, setInvolvedRecordsDropdownLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const involvedRecordsDropdownRef = useRef<View>(null);
  const [showInvolvedFromCalendar, setShowInvolvedFromCalendar] = useState(false);
  const [showInvolvedToCalendar, setShowInvolvedToCalendar] = useState(false);
  const involvedFromDateObj = involvedFromDate ? new Date(involvedFromDate + 'T12:00:00') : new Date();
  const involvedToDateObj = involvedToDate ? new Date(involvedToDate + 'T12:00:00') : new Date();

  const involvedRecordOptions = [5, 10, 50, 100, 'ALL'] as const;

  const [reviewSortBy, setReviewSortBy] = useState<'desc' | 'asc'>('desc');
  const [reviewCurrentPage, setReviewCurrentPage] = useState(1);
  const [reviewRecordsPerPage, setReviewRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showReviewSortDropdown, setShowReviewSortDropdown] = useState(false);
  const [showReviewRecordsDropdown, setShowReviewRecordsDropdown] = useState(false);

  const reviewSortOptions = [
    { value: 'desc' as const, label: 'Descending' },
    { value: 'asc' as const, label: 'Ascending' },
  ];
  const reviewRecordOptions = [5, 10, 50, 100, 'ALL'] as const;

  useEffect(() => {
    let cancelled = false;

    const fetchBookings = async () => {
      try {
        setCvBookingsLoading(true);
        const res = await fetch(API_ENDPOINTS.ADMIN_BOOKINGS);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          const all: CustomerBooking[] = data.bookings;
          const map = new Map<string, CustomerBooking>();
          all
            .filter((b) => b.user_id === c.id && b.status !== 4 && b.payment_status === 1)
            .forEach((b) => {
              const existing = map.get(b.booking_id);
              if (!existing || new Date(b.created_at) > new Date(existing.created_at)) {
                map.set(b.booking_id, b);
              }
            });
          setCvBookings(Array.from(map.values()).sort((a, b) => b.id - a.id));
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setCvBookingsLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        setCvReviewsLoading(true);
        const res = await fetch(API_ENDPOINTS.ADMIN_REVIEWS_RATINGS);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setCvReviews((data.reviews as CustomerReview[]).filter((r) => r.user_id === c.id));
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setCvReviewsLoading(false);
      }
    };

    setCvBookings([]);
    setCvReviews([]);
    fetchBookings();
    fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [c.id]);

  useEffect(() => {
    setInvolvedFromDate('');
    setInvolvedToDate(formatDateToYYYYMMDD(new Date()));
    setInvolvedRecordsPerPage(5);
    setInvolvedCurrentPage(1);
    setReviewSortBy('desc');
    setReviewRecordsPerPage(5);
    setReviewCurrentPage(1);
    setShowReviewSortDropdown(false);
    setShowReviewRecordsDropdown(false);
  }, [c.id]);

  const filteredInvolvedBookings = useMemo(() => {
    let list = [...cvBookings];
    if (involvedFromDate.trim() || involvedToDate.trim()) {
      list = list.filter((b) => {
        const bookingDate = new Date(b.created_at || b.booking_time);
        const bookingDay = formatDateToYYYYMMDD(bookingDate);
        if (involvedFromDate.trim() && bookingDay < involvedFromDate.trim()) return false;
        if (involvedToDate.trim() && bookingDay > involvedToDate.trim()) return false;
        return true;
      });
    }
    list.sort((a, b) => b.id - a.id);
    return list;
  }, [cvBookings, involvedFromDate, involvedToDate]);

  const hasInvolvedDateFilter = involvedFromDate.trim() !== '';

  const involvedTotalPages = useMemo(() => {
    if (involvedRecordsPerPage === 'ALL' || hasInvolvedDateFilter) return 1;
    const pageSize = typeof involvedRecordsPerPage === 'number' ? involvedRecordsPerPage : 10;
    return Math.ceil(filteredInvolvedBookings.length / pageSize) || 1;
  }, [filteredInvolvedBookings.length, involvedRecordsPerPage, hasInvolvedDateFilter]);

  useEffect(() => {
    if (involvedCurrentPage > involvedTotalPages) {
      setInvolvedCurrentPage(Math.max(1, involvedTotalPages));
    }
  }, [involvedCurrentPage, involvedTotalPages]);

  const paginatedInvolvedBookings = useMemo(() => {
    if (involvedRecordsPerPage === 'ALL' || hasInvolvedDateFilter) return filteredInvolvedBookings;
    const pageSize = typeof involvedRecordsPerPage === 'number' ? involvedRecordsPerPage : 10;
    const start = (involvedCurrentPage - 1) * pageSize;
    return filteredInvolvedBookings.slice(start, start + pageSize);
  }, [filteredInvolvedBookings, involvedRecordsPerPage, hasInvolvedDateFilter, involvedCurrentPage]);

  const sortedCustomerReviews = useMemo(() => {
    const list = [...cvReviews];
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return reviewSortBy === 'asc' ? ta - tb : tb - ta;
    });
    return list;
  }, [cvReviews, reviewSortBy]);

  const reviewTotalPages = useMemo(() => {
    if (reviewRecordsPerPage === 'ALL') return 1;
    const pageSize = typeof reviewRecordsPerPage === 'number' ? reviewRecordsPerPage : 10;
    return Math.ceil(sortedCustomerReviews.length / pageSize) || 1;
  }, [sortedCustomerReviews.length, reviewRecordsPerPage]);

  useEffect(() => {
    if (reviewCurrentPage > reviewTotalPages) {
      setReviewCurrentPage(Math.max(1, reviewTotalPages));
    }
  }, [reviewCurrentPage, reviewTotalPages]);

  const paginatedCustomerReviews = useMemo(() => {
    if (reviewRecordsPerPage === 'ALL') return sortedCustomerReviews;
    const pageSize = typeof reviewRecordsPerPage === 'number' ? reviewRecordsPerPage : 10;
    const start = (reviewCurrentPage - 1) * pageSize;
    return sortedCustomerReviews.slice(start, start + pageSize);
  }, [sortedCustomerReviews, reviewRecordsPerPage, reviewCurrentPage]);

  const styles = useMemo(() => createStyles(width), [width]);

  const closeAllFloatingMenus = () => {
    setShowInvolvedRecordsDropdown(false);
    setShowReviewSortDropdown(false);
    setShowReviewRecordsDropdown(false);
    setShowInvolvedFromCalendar(false);
    setShowInvolvedToCalendar(false);
  };

  const renderReviewStars = (rating: number) => {
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={isDesktop ? 16 : isTablet ? 14 : 12}
          color={i <= rating ? '#f59e0b' : '#cbd5e1'}
        />
      );
    }
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
  };

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          {c.profile_image ? (
            <Image
              source={{ uri: `${BASE_URL}/uploads/profiles/${c.profile_image}` }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Ionicons name="person" size={isDesktop ? 44 : 38} color="#c7d2fe" />
            </View>
          )}
        </View>
        <Text style={styles.profileName}>{c.name || 'N/A'}</Text>
      </View>

      <View style={styles.cvSection}>
        <TouchableOpacity
          style={styles.cvSectionHeader}
          onPress={() => {
            if (showPersonalInfo) setShowPersonalInfo(false);
            else {
              setShowPersonalInfo(true);
              setShowInvolvedBookings(false);
              setShowReviews(false);
              closeAllFloatingMenus();
            }
          }}
          activeOpacity={0.75}
        >
          <View style={styles.cvSectionHeaderLeft}>
            <View style={styles.cvSectionIconBox}>
              <Ionicons name="person-outline" size={16} color="#6366f1" />
            </View>
            <Text style={styles.cvSectionTitle}>Personal Info</Text>
          </View>
          <Ionicons name={showPersonalInfo ? 'chevron-up' : 'chevron-down'} size={18} color="#6366f1" />
        </TouchableOpacity>
        {showPersonalInfo && (
          <View style={styles.cvSectionContent}>
            <View style={styles.cvDetailRow}>
              <View style={styles.cvDetailIconWrap}>
                <Ionicons name="call-outline" size={15} color="#6366f1" />
              </View>
              <View style={styles.cvDetailContent}>
                <Text style={styles.cvDetailLabel}>Mobile</Text>
                <Text style={styles.cvDetailValue}>{c.mobile || 'N/A'}</Text>
              </View>
            </View>
            {c.email ? (
              <View style={styles.cvDetailRow}>
                <View style={styles.cvDetailIconWrap}>
                  <Ionicons name="mail-outline" size={15} color="#6366f1" />
                </View>
                <View style={styles.cvDetailContent}>
                  <Text style={styles.cvDetailLabel}>Email</Text>
                  <Text style={styles.cvDetailValue}>{c.email}</Text>
                </View>
              </View>
            ) : null}
            {c.address ||
            c.city ||
            c.mandal ||
            c.district ||
            c.state ||
            c.country ||
            c.pincode ? (
              <View style={styles.cvDetailRow}>
                <View style={styles.cvDetailIconWrap}>
                  <Ionicons name="location-outline" size={15} color="#6366f1" />
                </View>
                <View style={styles.cvDetailContent}>
                  <Text style={styles.cvDetailLabel}>Address</Text>
                  <Text style={styles.cvDetailValue}>
                    {[c.address, c.city, c.mandal, c.district, c.state, c.country].filter(Boolean).join(', ')}
                    {c.pincode ? ` - ${c.pincode}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}
            {c.created_at ? (
              <View style={styles.cvDetailRow}>
                <View style={styles.cvDetailIconWrap}>
                  <Ionicons name="calendar-outline" size={15} color="#6366f1" />
                </View>
                <View style={styles.cvDetailContent}>
                  <Text style={styles.cvDetailLabel}>Joined On</Text>
                  <Text style={styles.cvDetailValue}>{formatDate(c.created_at)}</Text>
                </View>
              </View>
            ) : null}
            {c.document1 ? (
              (() => {
                const docs = c
                  .document1!.split(',')
                  .map((f) => f.trim())
                  .filter(Boolean);
                return docs.length > 0 ? (
                  <>
                    <View style={styles.cvDocDivider}>
                      <Ionicons name="document-text-outline" size={14} color="#6366f1" />
                      <Text style={styles.cvDocDividerText}>Documents ({docs.length})</Text>
                    </View>
                    {docs.map((doc, idx) => {
                      const docUri = `${BASE_URL}/uploads/${doc}`;
                      return (
                        <View key={`cvdoc-${idx}`} style={styles.cvDocRow}>
                          <View style={styles.cvDocIndexBadge}>
                            <Text style={styles.cvDocIndexText}>{idx + 1}</Text>
                          </View>
                          <Image source={{ uri: docUri }} style={styles.cvDocThumb} resizeMode="cover" />
                          <TouchableOpacity style={styles.cvDocViewBtn} onPress={() => Linking.openURL(docUri)}>
                            <Ionicons name="eye-outline" size={14} color="#ffffff" />
                            <Text style={styles.cvDocViewText}>View</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </>
                ) : null;
              })()
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.cvSection}>
        <TouchableOpacity
          style={styles.cvSectionHeader}
          onPress={() => {
            if (showInvolvedBookings) setShowInvolvedBookings(false);
            else {
              setShowInvolvedBookings(true);
              setShowPersonalInfo(false);
              setShowReviews(false);
              closeAllFloatingMenus();
            }
          }}
          activeOpacity={0.75}
        >
          <View style={styles.cvSectionHeaderLeft}>
            <View style={styles.cvSectionIconBox}>
              <Ionicons name="calendar-outline" size={16} color="#6366f1" />
            </View>
            <Text style={styles.cvSectionTitle}>Involved Bookings</Text>
            {filteredInvolvedBookings.length > 0 ? (
              <View style={styles.cvSectionBadge}>
                <Text style={styles.cvSectionBadgeText}>{filteredInvolvedBookings.length}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name={showInvolvedBookings ? 'chevron-up' : 'chevron-down'} size={18} color="#6366f1" />
        </TouchableOpacity>
        {showInvolvedBookings && (
          <View style={styles.cvSectionContent}>
            {cvBookingsLoading ? (
              <View style={styles.cvBookingLoadingRow}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.cvBookingLoadingText}>Loading bookings...</Text>
              </View>
            ) : cvBookings.length === 0 ? (
              <Text style={styles.cvSectionEmpty}>No bookings found.</Text>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator
                  style={styles.involvedControlsScroll}
                  contentContainerStyle={styles.involvedControlsScrollContent}
                >
                  <View style={styles.involvedControlsRow}>
                    <View style={styles.dropdownWrapperSort}>
                      <Text style={styles.dropdownLabel}>From:</Text>
                      {Platform.OS === 'web' ? (
                        <WebDateInput
                          id="viewcustomer-involved-from"
                          value={involvedFromDate}
                          onChange={(v) => {
                            setInvolvedFromDate(v);
                            setInvolvedCurrentPage(1);
                          }}
                          placeholder="Select date"
                          max={involvedToDate || formatDateToYYYYMMDD(new Date())}
                        />
                      ) : (
                        <TouchableOpacity
                          style={styles.dropdownButtonSort}
                          onPress={() => {
                            setShowInvolvedToCalendar(false);
                            closeAllFloatingMenus();
                            setShowInvolvedFromCalendar(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="calendar-outline" size={isDesktop ? 16 : 14} color="#64748b" />
                          <Text style={styles.dropdownButtonText}>
                            {involvedFromDate
                              ? new Date(involvedFromDate + 'T12:00:00').toLocaleDateString('en-IN', {
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
                    <View style={styles.dropdownWrapperSort}>
                      <Text style={styles.dropdownLabel}>To:</Text>
                      {Platform.OS === 'web' ? (
                        <WebDateInput
                          id="viewcustomer-involved-to"
                          value={involvedToDate}
                          onChange={(v) => {
                            setInvolvedToDate(v);
                            setInvolvedCurrentPage(1);
                          }}
                          placeholder="Select date"
                          min={involvedFromDate}
                          max={formatDateToYYYYMMDD(new Date())}
                        />
                      ) : (
                        <TouchableOpacity
                          style={styles.dropdownButtonSort}
                          onPress={() => {
                            setShowInvolvedFromCalendar(false);
                            closeAllFloatingMenus();
                            setShowInvolvedToCalendar(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="calendar-outline" size={isDesktop ? 16 : 14} color="#64748b" />
                          <Text style={styles.dropdownButtonText}>
                            {involvedToDate
                              ? new Date(involvedToDate + 'T12:00:00').toLocaleDateString('en-IN', {
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
                    <View ref={involvedRecordsDropdownRef} style={styles.dropdownWrapperShow} collapsable={false}>
                      <Text style={styles.dropdownLabel}>Show:</Text>
                      <TouchableOpacity
                        style={styles.dropdownButtonShow}
                        onPress={() => {
                          involvedRecordsDropdownRef.current?.measureInWindow((x, y, w, h) => {
                            setInvolvedRecordsDropdownLayout({ x, y, width: w, height: h });
                            setShowInvolvedRecordsDropdown((v) => {
                              const next = !v;
                              if (next) {
                                setShowReviewSortDropdown(false);
                                setShowReviewRecordsDropdown(false);
                              }
                              return next;
                            });
                            setShowInvolvedFromCalendar(false);
                            setShowInvolvedToCalendar(false);
                          });
                        }}
                      >
                        <Ionicons name="list" size={14} color="#64748b" />
                        <Text style={styles.dropdownButtonTextShow}>
                          {involvedRecordsPerPage === 'ALL' ? 'ALL' : involvedRecordsPerPage}
                        </Text>
                        <Ionicons
                          name={showInvolvedRecordsDropdown ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color="#64748b"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
                {filteredInvolvedBookings.length === 0 ? (
                  <Text style={styles.cvSectionEmpty}>No bookings found.</Text>
                ) : (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.bookTableScroll}>
                      <View style={styles.bookTableInner}>
                        <View style={styles.bookTableHeaderRow}>
                          <Text style={[styles.bookTableTh, styles.bookColSno]}>S.No</Text>
                          <Text style={[styles.bookTableTh, styles.bookColId]}>Booking ID</Text>
                          <Text style={[styles.bookTableTh, styles.bookColStatus]}>Status</Text>
                          <Text style={[styles.bookTableTh, styles.bookColAmt]}>Amount</Text>
                          <Text style={[styles.bookTableTh, styles.bookColCust]}>Worker name</Text>
                          <Text style={[styles.bookTableTh, styles.bookColPhone]}>Contact number</Text>
                          <Text style={[styles.bookTableTh, styles.bookColLoc]}>Work location</Text>
                          <Text style={[styles.bookTableTh, styles.bookColDate]}>Booking date</Text>
                          <Text style={[styles.bookTableTh, styles.bookColBookingFor]}>Booking for</Text>
                          <Text style={[styles.bookTableTh, styles.bookColDesc]}>Description</Text>
                        </View>
                        {paginatedInvolvedBookings.map((b, rowIdx) => {
                          const sc = getStatusColor(b.status);
                          const isLast = rowIdx === paginatedInvolvedBookings.length - 1;
                          const pageSize = typeof involvedRecordsPerPage === 'number' ? involvedRecordsPerPage : 10;
                          const serial =
                            involvedRecordsPerPage === 'ALL' || hasInvolvedDateFilter
                              ? rowIdx + 1
                              : (involvedCurrentPage - 1) * pageSize + rowIdx + 1;
                          const contact =
                            (b.contact_number && String(b.contact_number).trim()) ||
                            (b.customer_mobile && String(b.customer_mobile).trim()) ||
                            '';
                          return (
                            <View key={b.id} style={[styles.bookTableDataRow, isLast && styles.bookTableDataRowLast]}>
                              <Text style={[styles.bookTableTd, styles.bookColSno]}>{serial}</Text>
                              <Text style={[styles.bookTableTd, styles.bookColId]}>#{b.booking_id}</Text>
                              <View style={[styles.bookTableTd, styles.bookColStatus]}>
                                <View style={[styles.bookStatusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                                  <Text style={[styles.bookStatusBadgeText, { color: sc.text }]}>{getStatusLabel(b.status)}</Text>
                                </View>
                              </View>
                              <Text style={[styles.bookTableTd, styles.bookColAmt]}>{b.amount != null ? `₹${b.amount}` : 'N/A'}</Text>
                              <Text style={[styles.bookTableTd, styles.bookColCust]} numberOfLines={2}>
                                {b.worker_name || 'N/A'}
                              </Text>
                              <Text style={[styles.bookTableTd, styles.bookColPhone]} numberOfLines={2}>
                                {contact || '—'}
                              </Text>
                              <Text style={[styles.bookTableTd, styles.bookColLoc]} numberOfLines={2}>
                                {b.work_location || '—'}
                              </Text>
                              <Text style={[styles.bookTableTd, styles.bookColDate]}>
                                {b.created_at ? formatDate(b.created_at) : '—'}
                              </Text>
                              <Text style={[styles.bookTableTd, styles.bookColBookingFor]} numberOfLines={2}>
                                {b.booking_time ? formatDate(b.booking_time) : '—'}
                              </Text>
                              <Text style={[styles.bookTableTd, styles.bookColDesc]} numberOfLines={3}>
                                {b.description || '—'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <View style={styles.paginationContainer}>
                      <Text style={styles.paginationInfo}>
                        {involvedRecordsPerPage === 'ALL' || hasInvolvedDateFilter
                          ? `Showing all ${filteredInvolvedBookings.length} entries`
                          : (() => {
                              const pageSize = typeof involvedRecordsPerPage === 'number' ? involvedRecordsPerPage : 10;
                              const start = (involvedCurrentPage - 1) * pageSize + 1;
                              const end = Math.min(involvedCurrentPage * pageSize, filteredInvolvedBookings.length);
                              return `Showing ${start} to ${end} of ${filteredInvolvedBookings.length} entries`;
                            })()}
                      </Text>
                      <View style={styles.paginationButtons}>
                        <TouchableOpacity
                          style={[styles.paginationButton, involvedCurrentPage === 1 && styles.paginationButtonDisabled]}
                          onPress={() => setInvolvedCurrentPage(1)}
                          disabled={involvedCurrentPage === 1}
                        >
                          <Ionicons
                            name="play-back"
                            size={isDesktop ? 16 : 14}
                            color={involvedCurrentPage === 1 ? '#94a3b8' : '#059669'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.paginationButton, involvedCurrentPage === 1 && styles.paginationButtonDisabled]}
                          onPress={() => setInvolvedCurrentPage(involvedCurrentPage - 1)}
                          disabled={involvedCurrentPage === 1}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={isDesktop ? 16 : 14}
                            color={involvedCurrentPage === 1 ? '#94a3b8' : '#10b981'}
                          />
                        </TouchableOpacity>
                        <Text style={styles.paginationText}>
                          Page {involvedCurrentPage} of {involvedTotalPages || 1}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.paginationButton,
                            involvedCurrentPage === involvedTotalPages && styles.paginationButtonDisabled,
                          ]}
                          onPress={() => setInvolvedCurrentPage(involvedCurrentPage + 1)}
                          disabled={involvedCurrentPage === involvedTotalPages}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={isDesktop ? 16 : 14}
                            color={involvedCurrentPage === involvedTotalPages ? '#94a3b8' : '#10b981'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.paginationButton,
                            involvedCurrentPage === involvedTotalPages && styles.paginationButtonDisabled,
                          ]}
                          onPress={() => setInvolvedCurrentPage(involvedTotalPages)}
                          disabled={involvedCurrentPage === involvedTotalPages}
                        >
                          <Ionicons
                            name="play-forward"
                            size={isDesktop ? 16 : 14}
                            color={involvedCurrentPage === involvedTotalPages ? '#94a3b8' : '#059669'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.cvSection}>
        <TouchableOpacity
          style={styles.cvSectionHeader}
          onPress={() => {
            if (showReviews) setShowReviews(false);
            else {
              setShowReviews(true);
              setShowPersonalInfo(false);
              setShowInvolvedBookings(false);
              closeAllFloatingMenus();
            }
          }}
          activeOpacity={0.75}
        >
          <View style={styles.cvSectionHeaderLeft}>
            <View style={styles.cvSectionIconBox}>
              <Ionicons name="star-outline" size={16} color="#6366f1" />
            </View>
            <Text style={styles.cvSectionTitle}>Posted Reviews & Ratings</Text>
            {sortedCustomerReviews.length > 0 ? (
              <View style={styles.cvSectionBadge}>
                <Text style={styles.cvSectionBadgeText}>{sortedCustomerReviews.length}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name={showReviews ? 'chevron-up' : 'chevron-down'} size={18} color="#6366f1" />
        </TouchableOpacity>
        {showReviews && (
          <View style={styles.cvSectionContent}>
            {cvReviewsLoading ? (
              <View style={styles.cvBookingLoadingRow}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.cvBookingLoadingText}>Loading reviews...</Text>
              </View>
            ) : cvReviews.length === 0 ? (
              <Text style={styles.cvSectionEmpty}>No reviews found.</Text>
            ) : (
              <>
                <View style={styles.revTableWrapper}>
                  <View style={styles.revTableControlsRow}>
                    <View style={styles.revControlsRight}>
                      <View style={styles.dropdownWrapperSort}>
                        <Text style={styles.dropdownLabel}>Sort By:</Text>
                        <TouchableOpacity
                          style={styles.dropdownButtonSort}
                          onPress={() => {
                            setShowInvolvedRecordsDropdown(false);
                            setShowInvolvedFromCalendar(false);
                            setShowInvolvedToCalendar(false);
                            setShowReviewSortDropdown(!showReviewSortDropdown);
                            setShowReviewRecordsDropdown(false);
                          }}
                        >
                          <Ionicons name="swap-vertical" size={isDesktop ? 16 : 14} color="#64748b" />
                          <Text style={styles.dropdownButtonText}>
                            {reviewSortOptions.find((opt) => opt.value === reviewSortBy)?.label}
                          </Text>
                          <Ionicons
                            name={showReviewSortDropdown ? 'chevron-up' : 'chevron-down'}
                            size={isDesktop ? 16 : 14}
                            color="#64748b"
                          />
                        </TouchableOpacity>
                        {showReviewSortDropdown ? (
                          <View style={styles.revDropdownMenu}>
                            {reviewSortOptions.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                style={[
                                  styles.dropdownMenuItem,
                                  reviewSortBy === option.value && styles.dropdownMenuItemActive,
                                ]}
                                onPress={() => {
                                  setReviewSortBy(option.value);
                                  setReviewCurrentPage(1);
                                  setShowReviewSortDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownMenuItemText,
                                    reviewSortBy === option.value && styles.revDropdownMenuItemTextActive,
                                  ]}
                                >
                                  {option.label}
                                </Text>
                                {reviewSortBy === option.value ? (
                                  <Ionicons name="checkmark" size={16} color="#06b6d4" />
                                ) : null}
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.dropdownWrapperShow}>
                        <Text style={styles.dropdownLabel}>Show:</Text>
                        <TouchableOpacity
                          style={styles.dropdownButtonShow}
                          onPress={() => {
                            setShowInvolvedRecordsDropdown(false);
                            setShowInvolvedFromCalendar(false);
                            setShowInvolvedToCalendar(false);
                            setShowReviewRecordsDropdown(!showReviewRecordsDropdown);
                            setShowReviewSortDropdown(false);
                          }}
                        >
                          <Ionicons name="list" size={isDesktop ? 14 : 12} color="#64748b" />
                          <Text style={styles.dropdownButtonTextShow}>
                            {reviewRecordsPerPage === 'ALL' ? 'ALL' : reviewRecordsPerPage}
                          </Text>
                          <Ionicons
                            name={showReviewRecordsDropdown ? 'chevron-up' : 'chevron-down'}
                            size={isDesktop ? 14 : 12}
                            color="#64748b"
                          />
                        </TouchableOpacity>
                        {showReviewRecordsDropdown ? (
                          <View style={styles.revDropdownMenuShow}>
                            {reviewRecordOptions.map((option) => (
                              <TouchableOpacity
                                key={String(option)}
                                style={[
                                  styles.dropdownMenuItem,
                                  reviewRecordsPerPage === option && styles.dropdownMenuItemActive,
                                ]}
                                onPress={() => {
                                  setReviewRecordsPerPage(option as number | 'ALL');
                                  setReviewCurrentPage(1);
                                  setShowReviewRecordsDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownMenuItemText,
                                    reviewRecordsPerPage === option && styles.dropdownMenuItemTextActive,
                                  ]}
                                >
                                  {option === 'ALL' ? 'ALL' : option}
                                </Text>
                                {reviewRecordsPerPage === option ? (
                                  <Ionicons name="checkmark" size={16} color="#10b981" />
                                ) : null}
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator style={styles.revTableScrollView} nestedScrollEnabled>
                    <View style={styles.revTableContainer}>
                      <View style={styles.revTableHeader}>
                        <View style={[styles.revTableCell, styles.revTableHeaderCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                          <Ionicons name="list" size={isDesktop ? 16 : 14} color="#ffffff" />
                          <Text style={styles.revTableHeaderText}>S NO</Text>
                        </View>
                        <View style={[styles.revTableCell, styles.revTableHeaderCell, { width: isDesktop ? 130 : isTablet ? 100 : 80 }]}>
                          <Ionicons name="receipt-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                          <Text style={styles.revTableHeaderText}>Booking ID</Text>
                        </View>
                        <View style={[styles.revTableCell, styles.revTableHeaderCell, { width: isDesktop ? 180 : isTablet ? 140 : 100 }]}>
                          <Ionicons name="construct-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                          <Text style={styles.revTableHeaderText}>Worker name</Text>
                        </View>
                        <View style={[styles.revTableCell, styles.revTableHeaderCell, { width: isDesktop ? 280 : isTablet ? 180 : 120 }]}>
                          <Ionicons name="document-text-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                          <Text style={styles.revTableHeaderText}>Booking For</Text>
                        </View>
                        <View style={[styles.revTableCell, styles.revTableHeaderCell, { width: isDesktop ? 150 : isTablet ? 120 : 100 }]}>
                          <Ionicons name="star" size={isDesktop ? 16 : 14} color="#ffffff" />
                          <Text style={styles.revTableHeaderText}>Rating</Text>
                        </View>
                        <View style={[styles.revTableCell, styles.revTableHeaderCell, { width: isDesktop ? 300 : isTablet ? 200 : 150 }]}>
                          <Ionicons name="chatbubble-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                          <Text style={styles.revTableHeaderText}>Review</Text>
                        </View>
                        <View style={[styles.revTableCell, styles.revTableHeaderCell, { width: isDesktop ? 200 : isTablet ? 150 : 120 }]}>
                          <Ionicons name="calendar-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                          <Text style={styles.revTableHeaderText}>Created At</Text>
                        </View>
                      </View>
                      {paginatedCustomerReviews.map((r, index) => {
                        const serialNumber =
                          reviewRecordsPerPage === 'ALL'
                            ? index + 1
                            : (reviewCurrentPage - 1) *
                                (typeof reviewRecordsPerPage === 'number' ? reviewRecordsPerPage : 10) +
                              index +
                              1;
                        return (
                          <View
                            key={`${r.booking_id}-${index}`}
                            style={[styles.revTableRow, index % 2 === 0 ? styles.revTableRowEven : styles.revTableRowOdd]}
                          >
                            <View style={[styles.revTableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                              <Text style={styles.revTableCellText}>{serialNumber}</Text>
                            </View>
                            <View style={[styles.revTableCell, { width: isDesktop ? 180 : isTablet ? 100 : 80 }]}>
                              <Text style={styles.revTableCellText}>{r.booking_id || 'N/A'}</Text>
                            </View>
                            <View style={[styles.revTableCell, { width: isDesktop ? 180 : isTablet ? 140 : 100 }]}>
                              <Text style={styles.revTableCellText}>{r.worker_name || 'N/A'}</Text>
                            </View>
                            <View style={[styles.revTableCell, { width: isDesktop ? 250 : isTablet ? 180 : 120 }]}>
                              <Text style={styles.revTableCellText} numberOfLines={2}>
                                {r.booking_for || 'N/A'}
                              </Text>
                            </View>
                            <View style={[styles.revTableCell, { width: isDesktop ? 150 : isTablet ? 120 : 100 }]}>
                              {renderReviewStars(r.rating || 0)}
                            </View>
                            <View style={[styles.revTableCell, { width: isDesktop ? 300 : isTablet ? 200 : 150 }]}>
                              <Text style={styles.revTableCellText} numberOfLines={2}>
                                {r.review || 'N/A'}
                              </Text>
                            </View>
                            <View style={[styles.revTableCell, { width: isDesktop ? 200 : isTablet ? 150 : 120 }]}>
                              <Text style={styles.revTableCellText}>{formatDate(r.created_at) || 'N/A'}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
                <View style={styles.revPaginationContainer}>
                  <Text style={styles.revPaginationInfo}>
                    {reviewRecordsPerPage === 'ALL'
                      ? `Showing all ${sortedCustomerReviews.length} entries`
                      : (() => {
                          const pageSize = typeof reviewRecordsPerPage === 'number' ? reviewRecordsPerPage : 10;
                          const start = (reviewCurrentPage - 1) * pageSize + 1;
                          const end = Math.min(reviewCurrentPage * pageSize, sortedCustomerReviews.length);
                          return `Showing ${start} to ${end} of ${sortedCustomerReviews.length} entries`;
                        })()}
                  </Text>
                  <View style={styles.paginationButtons}>
                    <TouchableOpacity
                      style={[styles.revPaginationButton, reviewCurrentPage === 1 && styles.revPaginationButtonDisabled]}
                      onPress={() => setReviewCurrentPage(1)}
                      disabled={reviewCurrentPage === 1}
                    >
                      <Ionicons
                        name="play-back"
                        size={isDesktop ? 16 : 14}
                        color={reviewCurrentPage === 1 ? '#94a3b8' : '#4f46e5'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.revPaginationButton, reviewCurrentPage === 1 && styles.revPaginationButtonDisabled]}
                      onPress={() => setReviewCurrentPage(reviewCurrentPage - 1)}
                      disabled={reviewCurrentPage === 1}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={isDesktop ? 16 : 14}
                        color={reviewCurrentPage === 1 ? '#94a3b8' : '#6366f1'}
                      />
                    </TouchableOpacity>
                    <Text style={styles.revPaginationText}>
                      Page {reviewCurrentPage} of {reviewTotalPages || 1}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.revPaginationButton,
                        reviewCurrentPage === reviewTotalPages && styles.revPaginationButtonDisabled,
                      ]}
                      onPress={() => setReviewCurrentPage(reviewCurrentPage + 1)}
                      disabled={reviewCurrentPage === reviewTotalPages}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={isDesktop ? 16 : 14}
                        color={reviewCurrentPage === reviewTotalPages ? '#94a3b8' : '#6366f1'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.revPaginationButton,
                        reviewCurrentPage === reviewTotalPages && styles.revPaginationButtonDisabled,
                      ]}
                      onPress={() => setReviewCurrentPage(reviewTotalPages)}
                      disabled={reviewCurrentPage === reviewTotalPages}
                    >
                      <Ionicons
                        name="play-forward"
                        size={isDesktop ? 16 : 14}
                        color={reviewCurrentPage === reviewTotalPages ? '#94a3b8' : '#4f46e5'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>

    <Modal
      visible={showInvolvedRecordsDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowInvolvedRecordsDropdown(false)}
    >
      <View style={StyleSheet.absoluteFill}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setShowInvolvedRecordsDropdown(false)}
        />
        <View
          style={[
            styles.involvedRecordsMenuModal,
            {
              position: 'absolute',
              top: involvedRecordsDropdownLayout
                ? involvedRecordsDropdownLayout.y + involvedRecordsDropdownLayout.height + 4
                : 120,
              left: involvedRecordsDropdownLayout ? involvedRecordsDropdownLayout.x : 16,
              minWidth: involvedRecordsDropdownLayout
                ? Math.max(involvedRecordsDropdownLayout.width, 80)
                : 80,
            },
          ]}
        >
          {involvedRecordOptions.map((option) => (
            <TouchableOpacity
              key={String(option)}
              style={[
                styles.dropdownMenuItem,
                involvedRecordsPerPage === option && styles.dropdownMenuItemActive,
              ]}
              onPress={() => {
                setInvolvedRecordsPerPage(option as number | 'ALL');
                setInvolvedCurrentPage(1);
                setShowInvolvedRecordsDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownMenuItemText,
                  involvedRecordsPerPage === option && styles.dropdownMenuItemTextActive,
                ]}
              >
                {option === 'ALL' ? 'ALL' : option}
              </Text>
              {involvedRecordsPerPage === option ? (
                <Ionicons name="checkmark" size={16} color="#10b981" />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>

    {DateTimePicker &&
      showInvolvedFromCalendar &&
      (Platform.OS === 'ios' ? (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity
            style={styles.calendarOverlay}
            activeOpacity={1}
            onPress={() => setShowInvolvedFromCalendar(false)}
          >
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>From date</Text>
                <TouchableOpacity onPress={() => setShowInvolvedFromCalendar(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={involvedFromDateObj}
                mode="date"
                display="calendar"
                maximumDate={involvedToDateObj}
                onChange={(_: unknown, date?: Date) => {
                  if (date) {
                    setInvolvedFromDate(formatDateToYYYYMMDD(date));
                    setInvolvedCurrentPage(1);
                  }
                }}
                style={styles.picker}
              />
              <TouchableOpacity style={styles.calendarDone} onPress={() => setShowInvolvedFromCalendar(false)}>
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
          value={involvedFromDateObj}
          mode="date"
          display="calendar"
          maximumDate={involvedToDateObj}
          onChange={(_: unknown, date?: Date) => {
            if (date) {
              setInvolvedFromDate(formatDateToYYYYMMDD(date));
              setInvolvedCurrentPage(1);
            }
            setShowInvolvedFromCalendar(false);
          }}
        />
      ))}

    {DateTimePicker &&
      showInvolvedToCalendar &&
      (Platform.OS === 'ios' ? (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity
            style={styles.calendarOverlay}
            activeOpacity={1}
            onPress={() => setShowInvolvedToCalendar(false)}
          >
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>To date</Text>
                <TouchableOpacity onPress={() => setShowInvolvedToCalendar(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={involvedToDateObj}
                mode="date"
                display="calendar"
                minimumDate={involvedFromDateObj}
                maximumDate={new Date()}
                onChange={(_: unknown, date?: Date) => {
                  if (date) {
                    setInvolvedToDate(formatDateToYYYYMMDD(date));
                    setInvolvedCurrentPage(1);
                  }
                }}
                style={styles.picker}
              />
              <TouchableOpacity style={styles.calendarDone} onPress={() => setShowInvolvedToCalendar(false)}>
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
          value={involvedToDateObj}
          mode="date"
          display="calendar"
          minimumDate={involvedFromDateObj}
          maximumDate={new Date()}
          onChange={(_: unknown, date?: Date) => {
            if (date) {
              setInvolvedToDate(formatDateToYYYYMMDD(date));
              setInvolvedCurrentPage(1);
            }
            setShowInvolvedToCalendar(false);
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
    container: { flex: 1, backgroundColor: '#f8fafc' },
    contentContainer: {
      padding: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isDesktop ? 20 : isTablet ? 18 : 16,
    },
    backIconButton: {
      width: isDesktop ? 44 : 40,
      height: isDesktop ? 44 : 40,
      borderRadius: 12,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    headerTitle: {
      fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
      fontWeight: '700',
      color: '#0f172a',
    },
    headerSpacer: { width: isDesktop ? 44 : 40 },
    profileCard: {
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: isDesktop ? 20 : 16,
      marginBottom: isDesktop ? 16 : 14,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    avatarWrap: {
      width: isDesktop ? 96 : 80,
      height: isDesktop ? 96 : 80,
      borderRadius: isDesktop ? 48 : 40,
      borderWidth: 4,
      borderColor: '#eef2ff',
      backgroundColor: '#eef2ff',
      overflow: 'hidden',
      marginBottom: 10,
    },
    profileImage: { width: '100%', height: '100%' },
    profilePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileName: {
      fontSize: isDesktop ? 22 : 18,
      fontWeight: '800',
      color: '#0f172a',
      textAlign: 'center',
    },
    cvSection: {
      backgroundColor: '#ffffff',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      overflow: 'hidden',
      marginBottom: isDesktop ? 12 : 10,
      shadowColor: '#94a3b8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    cvSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isDesktop ? 18 : 14,
      paddingVertical: isDesktop ? 14 : 12,
      backgroundColor: '#fafbff',
    },
    cvSectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    cvSectionIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#eef2ff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cvSectionTitle: { fontSize: isDesktop ? 14 : 13, fontWeight: '700', color: '#1e293b' },
    cvSectionContent: {
      paddingHorizontal: isDesktop ? 18 : 14,
      paddingTop: isDesktop ? 4 : 2,
      paddingBottom: isDesktop ? 14 : 10,
      backgroundColor: '#ffffff',
    },
    cvSectionBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#6366f1',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    cvSectionBadgeText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
    cvSectionEmpty: {
      fontSize: isDesktop ? 13 : 12,
      color: '#94a3b8',
      textAlign: 'center',
      paddingVertical: isDesktop ? 14 : 10,
    },
    cvDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: isDesktop ? 10 : 9,
      borderBottomWidth: 1,
      borderBottomColor: '#f8fafc',
      gap: 12,
    },
    cvDetailIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#eef2ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
    },
    cvDetailContent: { flex: 1, justifyContent: 'center' },
    cvDetailLabel: {
      fontSize: isDesktop ? 10 : 9,
      fontWeight: '700',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 3,
    },
    cvDetailValue: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#1e293b',
      lineHeight: isDesktop ? 20 : 18,
    },
    cvDocDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: isDesktop ? 14 : 10,
      marginBottom: isDesktop ? 10 : 8,
      paddingTop: isDesktop ? 14 : 10,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
    },
    cvDocDividerText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '800',
      color: '#6366f1',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    cvDocRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: isDesktop ? 6 : 5,
    },
    cvDocIndexBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#6366f1',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cvDocIndexText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
    cvDocThumb: {
      flex: 1,
      height: isDesktop ? 70 : 58,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
    },
    cvDocViewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#6366f1',
      paddingHorizontal: isDesktop ? 14 : 11,
      paddingVertical: isDesktop ? 9 : 7,
      borderRadius: 10,
    },
    cvDocViewText: { color: '#ffffff', fontSize: isDesktop ? 13 : 12, fontWeight: '700' },
    cvBookingLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: isDesktop ? 14 : 10,
    },
    cvBookingLoadingText: { fontSize: isDesktop ? 13 : 12, color: '#64748b' },
    involvedControlsScroll: { marginBottom: 10 },
    involvedControlsScrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    involvedControlsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: isMobile ? 10 : 12, paddingVertical: 4 },
    dropdownWrapperSort: {
      position: 'relative',
      width: isDesktop ? 160 : isTablet ? 140 : 140,
      zIndex: 1000,
    },
    dropdownWrapperShow: {
      position: 'relative',
      width: isDesktop ? 88 : isTablet ? 80 : 88,
      zIndex: 1000,
    },
    dropdownLabel: {
      fontSize: 11,
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
    dropdownMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    dropdownMenuItemActive: { backgroundColor: '#f8fafc' },
    dropdownMenuItemText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenuItemTextActive: { fontWeight: '600', color: '#10b981' },
    involvedRecordsMenuModal: {
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
    paginationContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isDesktop ? 'center' : 'flex-start',
      marginTop: isDesktop ? 12 : 10,
      paddingTop: isDesktop ? 12 : 10,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      gap: isDesktop ? 12 : 8,
    },
    paginationInfo: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      color: '#64748b',
      fontWeight: '500',
    },
    paginationButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    paginationButton: {
      width: isDesktop ? 36 : isTablet ? 34 : 32,
      height: isDesktop ? 36 : isTablet ? 34 : 32,
      borderRadius: 8,
      backgroundColor: '#ecfdf5',
      borderWidth: 1,
      borderColor: '#6ee7b7',
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationButtonDisabled: {
      backgroundColor: '#f1f5f9',
      borderColor: '#e2e8f0',
      opacity: 0.85,
    },
    paginationText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '600',
      color: '#0f172a',
      marginHorizontal: isDesktop ? 12 : 8,
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
    calendarTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
    picker: { width: '100%' },
    calendarDone: { marginHorizontal: 20, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
    calendarDoneGradient: { paddingVertical: 16, alignItems: 'center' },
    calendarDoneText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    bookTableScroll: { marginHorizontal: -4 },
    bookTableInner: { minWidth: 1320, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
    bookTableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#10b981',
      borderBottomWidth: 2,
      borderBottomColor: '#059669',
      alignItems: 'stretch',
    },
    bookTableTh: {
      fontSize: isDesktop ? 11 : 10,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingVertical: isDesktop ? 12 : 10,
      paddingHorizontal: 8,
      borderRightWidth: 1,
      borderRightColor: 'rgba(255,255,255,0.25)',
    },
    bookTableDataRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      backgroundColor: '#ffffff',
    },
    bookTableDataRowLast: { borderBottomWidth: 0 },
    bookTableTd: {
      fontSize: isDesktop ? 12 : 11,
      color: '#1e293b',
      fontWeight: '500',
      paddingVertical: isDesktop ? 10 : 8,
      paddingHorizontal: 8,
      borderRightWidth: 1,
      borderRightColor: '#f1f5f9',
      justifyContent: 'center',
    },
    bookColSno: { width: 48 },
    bookColId: { width: 132 },
    bookColStatus: { width: 108 },
    bookColAmt: { width: 76 },
    bookColCust: { width: 128 },
    bookColPhone: { width: 118 },
    bookColLoc: { width: 220 },
    bookColDate: { width: 138 },
    bookColBookingFor: { width: 120 },
    bookColDesc: { width: 176, borderRightWidth: 0 },
    bookStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 16, borderWidth: 1 },
    bookStatusBadgeText: { fontSize: 10, fontWeight: '700' },
    revTableWrapper: { marginBottom: 8, zIndex: 400 },
    revTableControlsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    revControlsRight: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 8,
      alignItems: 'flex-end',
      zIndex: 500,
      overflow: 'visible',
    },
    revDropdownMenu: {
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
    revDropdownMenuShow: {
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
    revDropdownMenuItemTextActive: { fontWeight: '600', color: '#06b6d4' },
    revTableScrollView: { width: '100%' },
    revTableContainer: {
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
    revTableHeader: {
      flexDirection: 'row',
      backgroundColor: '#6366f1',
      borderBottomWidth: 2,
      borderBottomColor: '#4f46e5',
    },
    revTableHeaderCell: {
      paddingVertical: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    revTableHeaderText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    revTableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    revTableRowEven: { backgroundColor: '#ffffff' },
    revTableRowOdd: { backgroundColor: '#fafafa' },
    revTableCell: {
      paddingVertical: isDesktop ? 14 : isTablet ? 12 : 10,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      justifyContent: 'center',
    },
    revTableCellText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#0f172a',
      fontWeight: '500',
    },
    revPaginationContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isDesktop ? 'center' : 'flex-start',
      marginTop: isDesktop ? 12 : 10,
      paddingTop: isDesktop ? 12 : 10,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      gap: isDesktop ? 12 : 8,
    },
    revPaginationInfo: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      color: '#64748b',
      fontWeight: '500',
    },
    revPaginationButton: {
      width: isDesktop ? 36 : isTablet ? 34 : 32,
      height: isDesktop ? 36 : isTablet ? 34 : 32,
      borderRadius: 8,
      backgroundColor: '#eef2ff',
      borderWidth: 1,
      borderColor: '#a5b4fc',
      justifyContent: 'center',
      alignItems: 'center',
    },
    revPaginationButtonDisabled: {
      backgroundColor: '#f1f5f9',
      borderColor: '#e2e8f0',
      opacity: 0.85,
    },
    revPaginationText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '600',
      color: '#4338ca',
      marginHorizontal: isDesktop ? 12 : 8,
    },
  });
};
