import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import * as XLSX from 'xlsx-js-style';
import { API_ENDPOINTS } from '../../constants/api';

let DateTimePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

type SortKey = 'serviceName' | 'subcategoryTitle' | 'categoryTitle' | 'bookingCount' | 'totalAmount';

function WebDateInput({
  id,
  value,
  onChange,
  placeholder,
  max,
  min,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  max?: string;
  min?: string;
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
      min: min || undefined,
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

function formatINR(amount: number) {
  const absCents = Math.round(Math.abs(amount) * 100);
  const hasFraction = absCents % 100 !== 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(amount);
  } catch {
    return hasFraction ? `₹${amount.toFixed(2)}` : `₹${Math.round(amount)}`;
  }
}

interface BreakdownRow {
  serviceId: number;
  serviceName: string;
  subcategoryTitle: string;
  categoryTitle: string;
  bookingCount: number;
  totalAmount: number;
}

interface Summary {
  fromDate: string | null;
  toDate: string | null;
  totalBookings: number;
  totalAmount: number;
  totalCategories: number;
  totalSubcategories: number;
  totalServices: number;
}

const RECORD_OPTIONS = [5, 10, 50, 100, 'ALL'] as const;
const SORT_ORDER_OPTIONS = [
  { value: 'desc' as const, label: 'Descending' },
  { value: 'asc' as const, label: 'Ascending' },
];

export default function BookingAnalysis() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [toDate, setToDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('bookingCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(10);
  const [showSortOrderDropdown, setShowSortOrderDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const { width: winW } = useWindowDimensions();
  const isDesktop = winW > 768;
  const isTablet = winW > 600 && winW <= 768;
  const isMobile = winW <= 600;
  const todayStr = formatDateToYYYYMMDD(new Date());
  const fromDateObj = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  const toDateObj = toDate ? new Date(toDate + 'T12:00:00') : new Date();

  const colW = useMemo(
    () => ({
      sno: isDesktop ? 72 : isTablet ? 64 : 56,
      service: isDesktop ? 260 : isTablet ? 220 : 180,
      sub: isDesktop ? 200 : isTablet ? 172 : 150,
      cat: isDesktop ? 280 : isTablet ? 240 : 200,
      count: isDesktop ? 100 : isTablet ? 92 : 84,
      amount: isDesktop ? 120 : isTablet ? 108 : 96,
    }),
    [isDesktop, isTablet]
  );

  /** Sum of column widths only — avoids empty strip + scrollbar after Amount when columns are narrower than the window. */
  const tableContentMinWidth = useMemo(() => {
    const sum = colW.sno + colW.service + colW.sub + colW.cat + colW.count + colW.amount;
    const headerMarginExtra = 24;
    return sum + headerMarginExtra;
  }, [colW]);

  const tbl = useMemo(
    () => ({
      tableCell: {
        paddingVertical: isDesktop ? 14 : isTablet ? 12 : 10,
        paddingHorizontal: isDesktop ? 6 : isTablet ? 5 : 4,
        justifyContent: 'center' as const,
      },
      tableHeaderCell: {
        paddingVertical: isDesktop ? 16 : isTablet ? 14 : 12,
        paddingHorizontal: isDesktop ? 6 : isTablet ? 5 : 4,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 4,
      },
      tableHeaderText: {
        fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
        fontWeight: '700' as const,
        color: '#ffffff',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.2,
      },
      tableCellText: {
        fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
        color: '#0f172a',
        fontWeight: '500' as const,
      },
    }),
    [isDesktop, isTablet]
  );

  const dd = useMemo(
    () => ({
      controlsRight: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        alignItems: 'flex-end' as const,
        justifyContent: 'flex-end' as const,
        gap: 12,
        flex: 1,
        zIndex: 500,
        overflow: 'visible' as const,
      },
      exportIconButton: {
        width: isDesktop ? 40 : 38,
        height: isMobile ? 36 : 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      exportIconWrap: {
        justifyContent: 'flex-end' as const,
        alignSelf: 'flex-end' as const,
      },
      dropdownWrapperSort: {
        position: 'relative' as const,
        width: (isDesktop ? 160 : isTablet ? 140 : '100%') as number | string,
        zIndex: 1000,
      },
      dropdownWrapperShow: {
        position: 'relative' as const,
        width: (isDesktop ? 88 : isTablet ? 76 : ('100%' as const)),
        zIndex: 1000,
      },
      dropdownLabel: {
        fontSize: isDesktop ? 11 : 10,
        fontWeight: '600' as const,
        color: '#64748b',
        marginBottom: 4,
      },
      dropdownButtonSort: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
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
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
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
        fontWeight: '500' as const,
        color: '#0f172a',
      },
      dropdownButtonTextShow: {
        flex: 1,
        fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
        fontWeight: '500' as const,
        color: '#0f172a',
      },
      dropdownMenu: {
        position: 'absolute' as const,
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
        position: 'absolute' as const,
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
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
      },
      dropdownMenuItemActive: { backgroundColor: '#f8fafc' },
      dropdownMenuItemText: {
        fontSize: isDesktop ? 12 : 11,
        fontWeight: '500' as const,
        color: '#0f172a',
      },
      dropdownMenuItemTextActive: { fontWeight: '600' as const, color: '#06b6d4' },
    }),
    [isDesktop, isTablet, isMobile]
  );

  const buildUrl = useCallback(() => {
    let f = fromDate.trim();
    let t = toDate.trim();
    if (f && t && f > t) {
      const x = f;
      f = t;
      t = x;
    }
    const params = new URLSearchParams();
    if (f) params.set('fromDate', f);
    if (t) params.set('toDate', t);
    const qs = params.toString();
    return qs ? `${API_ENDPOINTS.ADMIN_ANALYSIS_BOOKING_BREAKDOWN}?${qs}` : API_ENDPOINTS.ADMIN_ANALYSIS_BOOKING_BREAKDOWN;
  }, [fromDate, toDate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(buildUrl());
      const json = await res.json();
      if (json.success && json.summary) {
        setSummary(json.summary);
        setRows(Array.isArray(json.data) ? json.data : []);
      } else {
        setSummary(null);
        setRows([]);
      }
    } catch {
      setSummary(null);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'bookingCount' || sortKey === 'totalAmount') {
        cmp = a[sortKey] - b[sortKey];
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { sensitivity: 'base' });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totalSorted = sortedRows.length;
  const pageSizeNum = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
  const totalPages =
    recordsPerPage === 'ALL' || totalSorted === 0 ? 1 : Math.max(1, Math.ceil(totalSorted / pageSizeNum));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = recordsPerPage === 'ALL' ? 0 : (safePage - 1) * pageSizeNum;
  const pageSlice =
    recordsPerPage === 'ALL'
      ? sortedRows
      : sortedRows.slice(startIdx, startIdx + pageSizeNum);
  const showingFrom = totalSorted === 0 ? 0 : startIdx + 1;
  const showingTo =
    recordsPerPage === 'ALL' ? totalSorted : Math.min(startIdx + pageSizeNum, totalSorted);

  const onSelectSortColumn = (key: SortKey) => {
    setSortKey(key);
    setPage(1);
  };

  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const exportBookingAnalysisExcel = useCallback(async () => {
    const cellFmt = (d: string) =>
      new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    const fromLabel = fromDate ? cellFmt(fromDate) : '—';
    const toLabel = toDate ? cellFmt(toDate) : '—';
    const aoa: (string | number)[][] = [
      ['Booking Analysis'],
      [`From: ${fromLabel}    To: ${toLabel}`],
      [],
      ['S.no', 'Service Name', 'Subcategory Name', 'Category Name', 'Booking Count', 'Amount'],
      ...sortedRows.map((r, i) => [
        i + 1,
        r.serviceName,
        r.subcategoryTitle,
        r.categoryTitle,
        r.bookingCount,
        r.totalAmount,
      ]),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastDataCol = 5;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastDataCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastDataCol } },
    ];
    ws['A1'].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    ws['A2'].s = {
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    ws['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Booking Analysis');
    const safe = `${fromDate.replace(/[^\d-]/g, '')}_${toDate.replace(/[^\d-]/g, '')}`;
    const fileName = `booking-analysis-${safe}.xlsx`;

    if (Platform.OS === 'web') {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const base = FileSystem.cacheDirectory;
      if (!base) return;
      const path = `${base}${fileName}`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          UTI: 'com.microsoft.excel.xlsx',
        });
      }
    }
  }, [sortedRows, fromDate, toDate]);

  const rangeLabel =
    summary?.fromDate && summary?.toDate
      ? summary.fromDate === summary.toDate
        ? fmt(summary.fromDate)
        : `${fmt(summary.fromDate)} – ${fmt(summary.toDate)}`
      : summary?.fromDate
        ? `From ${fmt(summary.fromDate)}`
        : summary?.toDate
          ? `Until ${fmt(summary.toDate)}`
          : '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading booking analysis…</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor="#6366f1" />
      }
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#a855f7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar-outline" size={24} color="#fff" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Booking Analysis</Text>
              <Text style={styles.heroSubtitle}>{rangeLabel ? `Bookings: ${rangeLabel}` : 'Select a date range'}</Text>
            </View>
          </View>
          <View style={styles.dateFilterRow}>
            {Platform.OS === 'web' ? (
              <>
                <WebDateInput
                  id="ba-from-date"
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="From date"
                  max={todayStr}
                />
                <WebDateInput
                  id="ba-to-date"
                  value={toDate}
                  onChange={setToDate}
                  placeholder="To date"
                  max={todayStr}
                  min={fromDate || undefined}
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
          <Text style={styles.statValue}>{summary?.totalBookings ?? 0}</Text>
          <Text style={styles.statLabel}>Total bookings</Text>
        </View>
        <View style={[styles.statCard, styles.statCard2]}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {formatINR(summary?.totalAmount ?? 0)}
          </Text>
          <Text style={styles.statLabel}>Total amount</Text>
        </View>
        <View style={[styles.statCard, styles.statCard3]}>
          <Text style={styles.statValue}>{summary?.totalCategories ?? 0}</Text>
          <Text style={styles.statLabel}>Total Categories</Text>
        </View>
        <View style={[styles.statCard, styles.statCard4]}>
          <Text style={styles.statValue}>{summary?.totalSubcategories ?? 0}</Text>
          <Text style={styles.statLabel}>Total Subcategories</Text>
        </View>
        <View style={[styles.statCard, styles.statCard5]}>
          <Text style={styles.statValue}>{summary?.totalServices ?? 0}</Text>
          <Text style={styles.statLabel}>Total Services</Text>
        </View>
      </View>

      <View style={styles.tableCard}>
        {rows.length === 0 ? (
          <>
            <View style={styles.tableCardTitleRow}>
              <View style={styles.tableCardTitleLeft}>
                <Ionicons name="grid-outline" size={22} color="#6366f1" />
                <Text style={styles.tableTitle}>By service</Text>
              </View>
            </View>
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No rows for this range</Text>
              <Text style={styles.emptyText}>
                Table lists services with at least one matched booking in the selected range.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.tableCardTitleRow}>
              <View style={styles.tableCardTitleLeft}>
                <Ionicons name="grid-outline" size={22} color="#6366f1" />
                <Text style={styles.tableTitle}>By service</Text>
              </View>
              <View style={dd.controlsRight}>
                <View style={dd.exportIconWrap}>
                  <TouchableOpacity
                    style={dd.exportIconButton}
                    onPress={() => {
                      void exportBookingAnalysisExcel();
                    }}
                    activeOpacity={0.85}
                    accessibilityLabel="Download Excel"
                  >
                    <Ionicons name="cloud-download-outline" size={isDesktop ? 22 : 20} color="#6366f1" />
                  </TouchableOpacity>
                </View>
                <View style={dd.dropdownWrapperSort}>
                  <Text style={dd.dropdownLabel}>Sort By:</Text>
                  <TouchableOpacity
                    style={dd.dropdownButtonSort}
                    onPress={() => {
                      setShowSortOrderDropdown(!showSortOrderDropdown);
                      setShowRecordsDropdown(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="swap-vertical" size={isDesktop ? 16 : 14} color="#64748b" />
                    <Text style={dd.dropdownButtonText}>
                      {SORT_ORDER_OPTIONS.find((o) => o.value === sortDir)?.label}
                    </Text>
                    <Ionicons
                      name={showSortOrderDropdown ? 'chevron-up' : 'chevron-down'}
                      size={isDesktop ? 16 : 14}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                  {showSortOrderDropdown ? (
                    <View style={dd.dropdownMenu}>
                      {SORT_ORDER_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            dd.dropdownMenuItem,
                            sortDir === option.value && dd.dropdownMenuItemActive,
                          ]}
                          onPress={() => {
                            setSortDir(option.value);
                            setShowSortOrderDropdown(false);
                            setPage(1);
                          }}
                        >
                          <Text
                            style={[
                              dd.dropdownMenuItemText,
                              sortDir === option.value && dd.dropdownMenuItemTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {sortDir === option.value ? (
                            <Ionicons name="checkmark" size={16} color="#06b6d4" />
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={dd.dropdownWrapperShow}>
                  <Text style={dd.dropdownLabel}>Show:</Text>
                  <TouchableOpacity
                    style={dd.dropdownButtonShow}
                    onPress={() => {
                      setShowRecordsDropdown(!showRecordsDropdown);
                      setShowSortOrderDropdown(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="list" size={isDesktop ? 14 : 12} color="#64748b" />
                    <Text style={dd.dropdownButtonTextShow}>
                      {recordsPerPage === 'ALL' ? 'ALL' : recordsPerPage}
                    </Text>
                    <Ionicons
                      name={showRecordsDropdown ? 'chevron-up' : 'chevron-down'}
                      size={isDesktop ? 14 : 12}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                  {showRecordsDropdown ? (
                    <View style={dd.dropdownMenuShow}>
                      {RECORD_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={String(option)}
                          style={[
                            dd.dropdownMenuItem,
                            recordsPerPage === option && dd.dropdownMenuItemActive,
                          ]}
                          onPress={() => {
                            setRecordsPerPage(option === 'ALL' ? 'ALL' : option);
                            setPage(1);
                            setShowRecordsDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              dd.dropdownMenuItemText,
                              recordsPerPage === option && dd.dropdownMenuItemTextActive,
                            ]}
                          >
                            {option === 'ALL' ? 'ALL' : option}
                          </Text>
                          {recordsPerPage === option ? (
                            <Ionicons name="checkmark" size={16} color="#10b981" />
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.tableSectionNudge}>
            <View style={styles.tableWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                style={styles.tableScrollView}
                nestedScrollEnabled
                persistentScrollbar
                contentContainerStyle={{ minWidth: tableContentMinWidth }}
              >
                <View style={[styles.tableContainer, { minWidth: tableContentMinWidth }]}>
                  <View style={styles.tableHeader}>
                    <View style={[tbl.tableCell, tbl.tableHeaderCell, { width: colW.sno }]}>
                      <Ionicons name="list" size={isDesktop ? 16 : 14} color="#ffffff" />
                      <Text style={tbl.tableHeaderText}>S NO</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        tbl.tableCell,
                        tbl.tableHeaderCell,
                        { width: colW.service },
                        sortKey === 'serviceName' && styles.headerCellActive,
                      ]}
                      onPress={() => onSelectSortColumn('serviceName')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="construct" size={isDesktop ? 16 : 14} color="#ffffff" />
                      <Text style={tbl.tableHeaderText}>Service</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        tbl.tableCell,
                        tbl.tableHeaderCell,
                        { width: colW.sub },
                        sortKey === 'subcategoryTitle' && styles.headerCellActive,
                      ]}
                      onPress={() => onSelectSortColumn('subcategoryTitle')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="layers" size={isDesktop ? 16 : 14} color="#ffffff" />
                      <Text style={tbl.tableHeaderText}>Subcategory</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        tbl.tableCell,
                        tbl.tableHeaderCell,
                        { width: colW.cat },
                        sortKey === 'categoryTitle' && styles.headerCellActive,
                      ]}
                      onPress={() => onSelectSortColumn('categoryTitle')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="grid" size={isDesktop ? 16 : 14} color="#ffffff" />
                      <Text style={tbl.tableHeaderText}>Category</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        tbl.tableCell,
                        tbl.tableHeaderCell,
                        styles.bookingsAmountHeaderNudge,
                        { width: colW.count, justifyContent: 'flex-end' },
                        sortKey === 'bookingCount' && styles.headerCellActive,
                      ]}
                      onPress={() => onSelectSortColumn('bookingCount')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="stats-chart" size={isDesktop ? 16 : 14} color="#ffffff" />
                      <Text style={tbl.tableHeaderText}>Bookings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        tbl.tableCell,
                        tbl.tableHeaderCell,
                        styles.bookingsAmountHeaderNudge,
                        styles.amountColEdgeSpace,
                        { width: colW.amount, justifyContent: 'flex-end' },
                        sortKey === 'totalAmount' && styles.headerCellActive,
                      ]}
                      onPress={() => onSelectSortColumn('totalAmount')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cash-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                      <Text style={tbl.tableHeaderText}>Amount</Text>
                    </TouchableOpacity>
                  </View>
                  {pageSlice.map((r, i) => (
                    <View
                      key={`${r.serviceId}-${startIdx + i}`}
                      style={[
                        styles.svcTableRow,
                        (startIdx + i) % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                      ]}
                    >
                      <View style={[tbl.tableCell, { width: colW.sno }]}>
                        <Text style={[tbl.tableCellText, styles.cellTextCenter]}>{startIdx + i + 1}</Text>
                      </View>
                      <View style={[tbl.tableCell, { width: colW.service }]}>
                        <Text style={[tbl.tableCellText, styles.cellTextLeft, styles.tableBodyServiceValueNudge]}>
                          {r.serviceName}
                        </Text>
                      </View>
                      <View style={[tbl.tableCell, { width: colW.sub }]}>
                        <Text style={[tbl.tableCellText, styles.cellTextLeft, styles.tableBodyValueNudge]}>
                          {r.subcategoryTitle}
                        </Text>
                      </View>
                      <View style={[tbl.tableCell, { width: colW.cat }]}>
                        <Text style={[tbl.tableCellText, styles.cellTextLeft, styles.tableBodyServiceValueNudge]}>
                          {r.categoryTitle}
                        </Text>
                      </View>
                      <View style={[tbl.tableCell, { width: colW.count }]}>
                        <Text
                          style={[
                            tbl.tableCellText,
                            styles.cellTextRight,
                            styles.cellTextStrong,
                            styles.tableBodyValueNudgeRight,
                          ]}
                        >
                          {r.bookingCount}
                        </Text>
                      </View>
                      <View style={[tbl.tableCell, styles.amountColEdgeSpace, { width: colW.amount }]}>
                        <Text
                          style={[
                            tbl.tableCellText,
                            styles.cellTextRight,
                            styles.cellTextMoney,
                            styles.tableBodyValueNudgeRight,
                          ]}
                        >
                          {formatINR(r.totalAmount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View
              style={[
                styles.paginationContainer,
                !isDesktop && styles.paginationContainerColumn,
              ]}
            >
              <Text style={styles.paginationInfo}>
                {recordsPerPage === 'ALL'
                  ? `Showing all ${totalSorted} entries`
                  : totalSorted === 0
                    ? 'Showing 0 entries'
                    : `Showing ${showingFrom} to ${showingTo} of ${totalSorted} entries`}
              </Text>
              {recordsPerPage !== 'ALL' && totalSorted > 0 ? (
                <View style={styles.paginationButtons}>
                  <TouchableOpacity
                    style={[styles.paginationButton, safePage <= 1 && styles.paginationButtonDisabled]}
                    onPress={() => setPage(1)}
                    disabled={safePage <= 1}
                  >
                    <Ionicons
                      name="play-back"
                      size={isDesktop ? 16 : 14}
                      color={safePage <= 1 ? '#cbd5e1' : '#64748b'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paginationButton, safePage <= 1 && styles.paginationButtonDisabled]}
                    onPress={() => setPage(safePage - 1)}
                    disabled={safePage <= 1}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={isDesktop ? 16 : 14}
                      color={safePage <= 1 ? '#cbd5e1' : '#64748b'}
                    />
                  </TouchableOpacity>
                  <Text style={styles.paginationText}>
                    Page {safePage} of {totalPages || 1}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      safePage >= totalPages && styles.paginationButtonDisabled,
                    ]}
                    onPress={() => setPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={isDesktop ? 16 : 14}
                      color={safePage >= totalPages ? '#cbd5e1' : '#64748b'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      safePage >= totalPages && styles.paginationButtonDisabled,
                    ]}
                    onPress={() => setPage(totalPages)}
                    disabled={safePage >= totalPages}
                  >
                    <Ionicons
                      name="play-forward"
                      size={isDesktop ? 16 : 14}
                      color={safePage >= totalPages ? '#cbd5e1' : '#64748b'}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            </View>
          </>
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
                <TouchableOpacity style={styles.calendarDone} onPress={() => setShowFromCalendar(false)}>
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
                  minimumDate={fromDate ? new Date(fromDate + 'T12:00:00') : undefined}
                  onChange={(_: unknown, date?: Date) => {
                    if (date) setToDate(formatDateToYYYYMMDD(date));
                  }}
                  style={styles.picker}
                />
                <TouchableOpacity style={styles.calendarDone} onPress={() => setShowToCalendar(false)}>
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
            maximumDate={new Date()}
            minimumDate={fromDate ? new Date(fromDate + 'T12:00:00') : undefined}
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  hero: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 160 },
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
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
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
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flexGrow: 1,
    minWidth: 100,
    maxWidth: '33%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  statCard1: { borderLeftWidth: 3, borderLeftColor: '#6366f1' },
  statCard2: { borderLeftWidth: 3, borderLeftColor: '#10b981' },
  statCard3: { borderLeftWidth: 3, borderLeftColor: '#ec4899' },
  statCard4: { borderLeftWidth: 3, borderLeftColor: '#64748b' },
  statCard5: { borderLeftWidth: 3, borderLeftColor: '#14b8a6' },
  statValue: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableCardTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableCardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  tableTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  headerCellActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  /** Bookings & Amount header cells only (body rows unchanged). */
  bookingsAmountHeaderNudge: {
    marginLeft: 12,
  },
  /** Nudge data-row text in service/sub/category columns. */
  tableBodyValueNudge: {
    paddingLeft: 25,
  },
  /** Service column body text only (slightly more than sub/category). */
  tableBodyServiceValueNudge: {
    paddingLeft: 50,
  },
  tableBodyValueNudgeRight: {
    transform: [{ translateX: 8 }],
  },
  /** Space after Amount, before table right border. */
  amountColEdgeSpace: {
    paddingRight: 20,
  },
  /** Shifts the data grid + pagination slightly right; title row stays full width. */
  tableSectionNudge: {
    paddingLeft: 63,
  },
  tableWrapper: {
    width: '100%',
    marginBottom: 12,
    overflow: 'visible',
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
  svcTableRow: {
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
  cellTextCenter: {
    textAlign: 'center',
    width: '100%',
  },
  cellTextLeft: {
    textAlign: 'left',
    width: '100%',
  },
  cellTextRight: {
    textAlign: 'right',
    width: '100%',
  },
  cellTextStrong: {
    fontWeight: '700',
  },
  cellTextMoney: {
    color: '#059669',
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  paginationContainerColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
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
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptyText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 16 },
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
