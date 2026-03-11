import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useCallback, useEffect, useState } from 'react';
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyItem {
  year: number;
  month: number;
  totalAmount: number;
  paymentCount: number;
}

interface DailyItem {
  date: string;
  day: number;
  totalAmount: number;
  paymentCount: number;
}

export default function PaymentsAnalysis() {
  const [monthlyData, setMonthlyData] = useState<MonthlyItem[]>([]);
  const [dailyData, setDailyData] = useState<DailyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const buildMonthlyUrl = useCallback(() => {
    const y = selectedYear;
    const fromDate = `${y}-01-01`;
    const toDate = `${y}-12-31`;
    return `${API_ENDPOINTS.ADMIN_ANALYSIS_PAYMENT_MONTHLY}?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
  }, [selectedYear]);

  const fetchMonthly = useCallback(async () => {
    try {
      const res = await fetch(buildMonthlyUrl());
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMonthlyData(json.data);
      } else {
        setMonthlyData([]);
      }
    } catch {
      setMonthlyData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildMonthlyUrl]);

  const fetchDaily = useCallback(async (year: number, month: number) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.ADMIN_ANALYSIS_PAYMENT_DAILY}?year=${year}&month=${month}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDailyData(json.data);
      } else {
        setDailyData([]);
      }
    } catch {
      setDailyData([]);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchMonthly();
    } else if (selectedMonth) {
      setLoading(true);
      fetchDaily(selectedMonth.year, selectedMonth.month).finally(() => setLoading(false));
    }
  }, [viewMode, selectedMonth, fetchMonthly, fetchDaily, selectedYear]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (viewMode === 'monthly') {
      await fetchMonthly();
    } else if (selectedMonth) {
      await fetchDaily(selectedMonth.year, selectedMonth.month);
    }
    setRefreshing(false);
  }, [viewMode, selectedMonth, fetchMonthly, fetchDaily]);

  const handleMonthClick = (year: number, month: number) => {
    setSelectedMonth({ year, month });
    setViewMode('daily');
  };

  const handleBackToMonthly = () => {
    setViewMode('monthly');
    setSelectedMonth(null);
    setDailyData([]);
  };

  const filteredMonthlyData = monthlyData.filter((d) => d.month >= 1 && d.month <= 12);
  const totalMonthlyAmount = filteredMonthlyData.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
  const totalDailyAmount = dailyData.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
  const maxMonthlyAmount = filteredMonthlyData.length ? Math.max(...filteredMonthlyData.map((d) => Number(d.totalAmount) || 0), 1) : 1;
  const maxDailyAmount = dailyData.length ? Math.max(...dailyData.map((d) => Number(d.totalAmount) || 0), 1) : 1;

  const formatAmount = (amount: number | string) => {
    const n = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0;
    return n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
  };

  if (loading && viewMode === 'monthly') {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading analysis…</Text>
          <Text style={styles.loadingSubtext}>Fetching payment insights</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} tintColor="#8b5cf6" />
      }
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#7c3aed', '#8b5cf6', '#a78bfa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="wallet" size={24} color="#fff" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Payments Analysis</Text>
              <Text style={styles.heroSubtitle}>
                {viewMode === 'daily' && selectedMonth
                  ? `Daily breakdown for ${MONTH_NAMES[selectedMonth.month - 1]} ${selectedMonth.year}`
                  : 'Monthly payment trends'}
              </Text>
            </View>
          </View>
          <View style={styles.heroRight}>
            {viewMode === 'monthly' && (
              <View style={styles.dateFilterRow}>
                {Platform.OS === 'web' ? (
                  <View style={styles.yearSelectWrap}>
                    {createElement(
                      'select',
                      {
                        value: selectedYear,
                        onChange: (e: any) => setSelectedYear(Number(e.target.value)),
                        style: {
                          minWidth: 100,
                          height: 38,
                          paddingLeft: 12,
                          paddingRight: 36,
                          borderRadius: 19,
                          border: '1px solid rgba(255,255,255,0.25)',
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                        } as React.CSSProperties,
                      },
                      ...Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).reverse().map((y) =>
                        createElement('option', { key: y, value: y, style: { color: '#1e293b', backgroundColor: '#fff' } }, String(y))
                      )
                    )}
                    <View style={styles.yearSelectIcon} pointerEvents="none">
                      <Ionicons name="calendar-outline" size={18} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.datePill} onPress={() => setShowYearPicker(true)} activeOpacity={0.8}>
                    <Ionicons name="calendar-outline" size={16} color="#fff" />
                    <Text style={styles.datePillText}>{selectedYear}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {viewMode === 'daily' && (
              <TouchableOpacity style={styles.backButton} onPress={handleBackToMonthly} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={18} color="#fff" />
                <Text style={styles.backButtonText}>Back to monthly</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {viewMode === 'monthly' ? (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard1]}>
              <View style={styles.statIconWrap}>
                <Ionicons name="cash" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.statValue}>₹{formatAmount(totalMonthlyAmount)}</Text>
              <Text style={styles.statLabel}>Total Amount</Text>
            </View>
            <View style={[styles.statCard, styles.statCard2]}>
              <View style={[styles.statIconWrap, styles.statIcon2]}>
                <Ionicons name="calendar" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{filteredMonthlyData.length}</Text>
              <Text style={styles.statLabel}>Months</Text>
            </View>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="bar-chart" size={22} color="#8b5cf6" />
              <Text style={styles.chartTitle}>Monthly Payment</Text>
            </View>
            {filteredMonthlyData.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="analytics-outline" size={48} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No data yet</Text>
                <Text style={styles.emptyText}>Payment data will appear here once available.</Text>
              </View>
            ) : (
              <View style={styles.verticalChartWrap}>
                {filteredMonthlyData.map((item, index) => {
                  const amt = Number(item.totalAmount) || 0;
                  const pct = maxMonthlyAmount > 0 ? (amt / maxMonthlyAmount) * 100 : 0;
                  const label = `${MONTH_NAMES[item.month - 1] || ''} ${item.year}`;
                  return (
                    <TouchableOpacity
                      key={`${item.year}-${item.month}`}
                      onPress={() => handleMonthClick(item.year, item.month)}
                      activeOpacity={0.7}
                      style={styles.verticalBarCol}
                    >
                      <Text style={styles.verticalBarValue} numberOfLines={1}>₹{formatAmount(amt)}</Text>
                      <View style={styles.verticalBarTrack}>
                        <LinearGradient
                          colors={['#8b5cf6', '#7c3aed']}
                          start={{ x: 0.5, y: 1 }}
                          end={{ x: 0.5, y: 0 }}
                          style={[styles.verticalBarFill, { height: `${Math.max(pct, 4)}%` }]}
                        />
                      </View>
                      <Text style={styles.verticalBarLabel} numberOfLines={1}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statCard1]}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="cash" size={24} color="#8b5cf6" />
                  </View>
                  <Text style={styles.statValue}>₹{formatAmount(totalDailyAmount)}</Text>
                  <Text style={styles.statLabel}>Total (this month)</Text>
                </View>
                <View style={[styles.statCard, styles.statCard2]}>
                  <View style={[styles.statIconWrap, styles.statIcon2]}>
                    <Ionicons name="calendar" size={24} color="#f59e0b" />
                  </View>
                  <Text style={styles.statValue}>{dailyData.length}</Text>
                  <Text style={styles.statLabel}>Days</Text>
                </View>
              </View>
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="bar-chart" size={22} color="#8b5cf6" />
                  <Text style={styles.chartTitle}>Daily Payment</Text>
                </View>
                {dailyData.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>No data for this month</Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dailyChartScroll}>
                    <View style={styles.verticalChartWrap}>
                      {dailyData.map((item, index) => {
                        const amt = Number(item.totalAmount) || 0;
                        const pct = maxDailyAmount > 0 ? (amt / maxDailyAmount) * 100 : 0;
                        const label = `Day ${item.day}`;
                        return (
                          <View key={item.date} style={styles.verticalBarCol}>
                            <Text style={styles.verticalBarValue} numberOfLines={1}>₹{formatAmount(amt)}</Text>
                            <View style={styles.verticalBarTrack}>
                              <LinearGradient
                                colors={['#8b5cf6', '#7c3aed']}
                                start={{ x: 0.5, y: 1 }}
                                end={{ x: 0.5, y: 0 }}
                                style={[styles.verticalBarFill, { height: `${Math.max(pct, 4)}%` }]}
                              />
                            </View>
                            <Text style={styles.verticalBarLabel} numberOfLines={1}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </>
      )}

      {Platform.OS !== 'web' && showYearPicker && (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setShowYearPicker(false)}>
            <View style={styles.calendarModal} onStartShouldSetResponder={() => true}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select year</Text>
                <TouchableOpacity onPress={() => setShowYearPicker(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).reverse().map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearOption, selectedYear === y && styles.yearOptionSelected]}
                    onPress={() => { setSelectedYear(y); setShowYearPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.yearOptionText, selectedYear === y && styles.yearOptionTextSelected]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.calendarDone} onPress={() => setShowYearPicker(false)}>
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.calendarDoneGradient}>
                  <Text style={styles.calendarDoneText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    shadowColor: '#8b5cf6',
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  yearSelectWrap: {
    position: 'relative',
    ...(Platform.OS === 'web' && { display: 'flex', alignItems: 'center' } as any),
  },
  yearSelectIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
  },
  statCard1: { borderLeftWidth: 4, borderLeftColor: '#8b5cf6' },
  statCard2: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon2: { backgroundColor: '#fffbeb' },
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
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
  verticalChartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 6,
    minHeight: 220,
    paddingHorizontal: 8,
  },
  dailyChartScroll: {
    paddingBottom: 8,
  },
  verticalBarCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 28,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
  },
  verticalBarValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  verticalBarTrack: {
    width: '100%',
    height: 160,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
  },
  verticalBarFill: {
    width: '100%',
    borderRadius: 8,
    minHeight: 8,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
  },
  verticalBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  barLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
  },
  barFill: {
    height: '100%',
    borderRadius: 16,
    minWidth: 8,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
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
  yearOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  yearOptionSelected: {
    backgroundColor: '#f5f3ff',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#334155',
  },
  yearOptionTextSelected: {
    color: '#7c3aed',
    fontWeight: '600',
  },
});
