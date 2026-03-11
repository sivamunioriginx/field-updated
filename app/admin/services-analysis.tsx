import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_ENDPOINTS } from '../../constants/api';

let DateTimePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

function WebDateInput({
  id,
  value,
  onChange,
  placeholder,
  max,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
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
    borderRadius: 19,
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(12px)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: value ? '#fff' : 'rgba(255,255,255,0.8)',
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
      max: max || undefined,
      onChange: (e: any) => onChange(e.target.value || ''),
      'aria-label': placeholder,
      style: { position: 'absolute', opacity: 0, pointerEvents: 'none', width: '100%', height: '100%' },
    })
  );
}

function formatDateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ServiceBookingItem {
  serviceId: number;
  serviceName: string;
  bookingCount: number;
}

interface ServicesAnalysisProps {
  subcategoryId?: number | null;
  subcategoryTitle?: string | null;
  onClearSubcategoryFilter?: () => void;
}

const BAR_COLORS = [
  ['#14b8a6', '#0d9488'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#d97706'],
  ['#06b6d4', '#0891b2'],
  ['#8b5cf6', '#7c3aed'],
  ['#10b981', '#059669'],
  ['#6366f1', '#4f46e5'],
  ['#64748b', '#475569'],
];

export default function ServicesAnalysis({ subcategoryId, subcategoryTitle, onClearSubcategoryFilter }: ServicesAnalysisProps) {
  const [data, setData] = useState<ServiceBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const fromDateObj = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  const toDateObj = toDate ? new Date(toDate + 'T12:00:00') : new Date();

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (fromDate.trim()) params.set('fromDate', fromDate.trim());
    if (toDate.trim()) params.set('toDate', toDate.trim());
    if (subcategoryId != null) params.set('subcategoryId', String(subcategoryId));
    const qs = params.toString();
    return qs
      ? `${API_ENDPOINTS.ADMIN_ANALYSIS_SERVICE_BOOKINGS}?${qs}`
      : API_ENDPOINTS.ADMIN_ANALYSIS_SERVICE_BOOKINGS;
  }, [fromDate, toDate, subcategoryId]);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl();
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const totalBookings = data.reduce((sum, d) => sum + d.bookingCount, 0);
  const topService = data.length
    ? data.reduce((a, b) => (a.bookingCount >= b.bookingCount ? a : b), data[0])
    : null;
  const maxCount = data.length ? Math.max(...data.map((d) => d.bookingCount), 1) : 1;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading analysis…</Text>
          <Text style={styles.loadingSubtext}>Fetching service insights</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#14b8a6']} tintColor="#14b8a6" />
      }
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#0d9488', '#14b8a6', '#2dd4bf']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="construct" size={24} color="#fff" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Services Analysis</Text>
              <Text style={styles.heroSubtitle}>
                {subcategoryTitle ? `Services under "${subcategoryTitle}"` : 'Booking performance by service'}
              </Text>
            </View>
          </View>
          {subcategoryTitle && onClearSubcategoryFilter && (
            <TouchableOpacity style={styles.filterChip} onPress={onClearSubcategoryFilter} activeOpacity={0.8}>
              <Text style={styles.filterChipText}>Viewing: {subcategoryTitle}</Text>
              <Ionicons name="close-circle" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={styles.dateFilterRow}>
            {Platform.OS === 'web' ? (
              <>
                <WebDateInput
                  id="svc-from-date"
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="From date"
                  max={formatDateToYYYYMMDD(new Date())}
                />
                <WebDateInput
                  id="svc-to-date"
                  value={toDate}
                  onChange={setToDate}
                  placeholder="To date"
                  max={formatDateToYYYYMMDD(new Date())}
                />
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.datePill}
                  onPress={() => setShowFromCalendar(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <Text style={styles.datePillText}>
                    {fromDate
                      ? new Date(fromDate + 'T12:00:00').toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'From'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePill}
                  onPress={() => setShowToCalendar(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <Text style={styles.datePillText}>
                    {toDate
                      ? new Date(toDate + 'T12:00:00').toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'To'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCard1]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="stats-chart" size={24} color="#14b8a6" />
          </View>
          <Text style={styles.statValue}>{totalBookings.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={[styles.statCard, styles.statCard2]}>
          <View style={[styles.statIconWrap, styles.statIcon2]}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.statValue} numberOfLines={1}>
            {topService?.serviceName || '—'}
          </Text>
          <Text style={styles.statLabel}>Top Service</Text>
        </View>
        <View style={[styles.statCard, styles.statCard3]}>
          <View style={[styles.statIconWrap, styles.statIcon3]}>
            <Ionicons name="construct-outline" size={24} color="#0d9488" />
          </View>
          <Text style={styles.statValue}>{data.length}</Text>
          <Text style={styles.statLabel}>Services</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="bar-chart" size={22} color="#14b8a6" />
          <Text style={styles.chartTitle}>Booking Distribution</Text>
        </View>

        {data.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="analytics-outline" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>Service or booking data will appear here once available.</Text>
          </View>
        ) : (
          <View style={styles.chartWrap}>
            {data.map((item, index) => {
              const pct = maxCount > 0 ? (item.bookingCount / maxCount) * 100 : 0;
              const colors = BAR_COLORS[index % BAR_COLORS.length];
              return (
                <View key={item.serviceId} style={styles.barRow}>
                  <View style={styles.barLabelWrap}>
                    <View style={[styles.barDot, { backgroundColor: colors[0] }]} />
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {item.serviceName}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={colors as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.barFill, { width: `${Math.max(pct, 3)}%` }]}
                    />
                  </View>
                  <Text style={styles.barValue}>{item.bookingCount.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

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
                  maximumDate={new Date()}
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
                    colors={['#14b8a6', '#0d9488']}
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
            maximumDate={new Date()}
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
                    colors={['#14b8a6', '#0d9488']}
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
            maximumDate={new Date()}
            onChange={(_: unknown, date?: Date) => {
              if (date) setToDate(formatDateToYYYYMMDD(date));
              setShowToCalendar(false);
            }}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  hero: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 180,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  filterChipText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  dateFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 110,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    gap: 6,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statCard1: { borderLeftWidth: 4, borderLeftColor: '#14b8a6' },
  statCard2: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  statCard3: { borderLeftWidth: 4, borderLeftColor: '#0d9488' },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon2: { backgroundColor: '#fffbeb' },
  statIcon3: { backgroundColor: '#ccfbf1' },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  chartWrap: {
    gap: 20,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  barLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
    gap: 8,
  },
  barDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  barTrack: {
    flex: 1,
    height: 32,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: {
    height: '100%',
    borderRadius: 16,
    minWidth: 8,
  },
  barValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    width: 48,
    textAlign: 'right',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
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
});
