import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_ENDPOINTS } from '../../constants/api';
import Bookings from './bookings';
import Customers from './customers';
import Payments from './payments';
import Workers from './workers';

export default function AdminIndexScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const [newBookingsCount, setNewBookingsCount] = useState<number | null>(null);
  const [requestedWorkersCount, setRequestedWorkersCount] = useState<number | null>(null);
  const [quoteRequestsCount, setQuoteRequestsCount] = useState<number | null>(null);
  const [rescheduledCount, setRescheduledCount] = useState<number | null>(null);

  const quickCards = [
    { id: 'total-bookings', label: 'Total Bookings', value: '1,234', icon: 'cart-outline', bg: '#fef3c7', iconBg: '#f59e0b', change: '+3.4%', changeColor: '#10b981' },
    { id: 'active', label: 'Active Bookings', value: '12', icon: 'play-circle-outline', bg: '#fef9c3', iconBg: '#f59e0b', change: '-1.0%', changeColor: '#ef4444' },
    { id: 'inprogress', label: 'In Progress Bookings', value: '567', icon: 'sync-outline', bg: '#dbeafe', iconBg: '#06b6d4', change: '+8.2%', changeColor: '#10b981' },
    { id: 'complete', label: 'Completed Bookings', value: '1,234', icon: 'checkmark-done-outline', bg: '#ede9fe', iconBg: '#6366f1', change: '+12.5%', changeColor: '#10b981' },
    { id: 'cancele', label: 'Canceled Bookings', value: '89%', icon: 'close-circle-outline', bg: '#d1fae5', iconBg: '#10b981', change: '+5.1%', changeColor: '#10b981' },
    { id: 'reschedule', label: 'Rescheduled Bookings', value: '23', icon: 'calendar-outline', bg: '#fed7aa', iconBg: '#f59e0b', change: '-2.4%', changeColor: '#ef4444' },
    { id: 'customer', label: 'Customers', value: '324', icon: 'person-add', bg: '#fee2e2', iconBg: '#ef4444', change: '+2.1%', changeColor: '#10b981' },
    { id: 'active-workers', label: 'Active Workers', value: '89', icon: 'construct-outline', bg: '#e0f2fe', iconBg: '#0284c7', change: '+1.2%', changeColor: '#10b981' },
    { id: 'revenue', label: 'Revenue', value: '$12.3k', icon: 'cash-outline', bg: '#ecfccb', iconBg: '#84cc16', change: '+7.8%', changeColor: '#10b981' },
    { id: 'tickets', label: 'Support Tickets', value: '37', icon: 'chatbubbles-outline', bg: '#fde68a', iconBg: '#f59e0b', change: '+4.3%', changeColor: '#10b981' },
    { id: 'avg-rating', label: 'Avg. Rating', value: '4.8', icon: 'star', bg: '#ede9fe', iconBg: '#7c3aed', change: '+0.2%', changeColor: '#10b981' },
    { id: 'alerts', label: 'Alerts', value: '5', icon: 'alert-circle-outline', bg: '#fee2e2', iconBg: '#ef4444', change: '-0.5%', changeColor: '#ef4444' },
  ];

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('adminToken');
      await AsyncStorage.removeItem('adminUser');
      router.replace('/admin');
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/admin');
    }
  };

  // Fetch today's accepted bookings (status = 1)
  useEffect(() => {
    let cancelled = false;

    const isSameDay = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    };

    const fetchTodayAcceptedBookings = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.ADMIN_BOOKINGS);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.bookings)) {
          const count = data.bookings.filter((b: any) => b.status === 1 && isSameDay(b.created_at)).length;
          if (!cancelled) setNewBookingsCount(count);
        } else {
          if (!cancelled) setNewBookingsCount(0);
        }
      } catch (error) {
        console.error('Error fetching admin bookings:', error);
        if (!cancelled) setNewBookingsCount(0);
      }
    };

    fetchTodayAcceptedBookings();

    return () => { cancelled = true; };
  }, []);

 // Fetch new worker requests
useEffect(() => {

  const fetchNewWorkerRequests = async () => {
  try {
    const res = await fetch(API_ENDPOINTS.ADMIN_WORKERS);
    const data = await res.json();
    if(data && data.success && Array.isArray(data.workers)) {
      const count = data.workers.filter((w: any) => w.status === 0).length;
      setRequestedWorkersCount(count);
    } else {
      setRequestedWorkersCount(0);
    }
  } catch (error) {
    console.error('Error fetching new worker requests:', error);
    setRequestedWorkersCount(0);
  }
  };

  fetchNewWorkerRequests();
}, []);

useEffect(() => {
  let cancelled = false;

  const isSameDay = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  };

  const fetchTodayQuotes = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_QUOTES);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.quotes)) {
        const count = data.quotes.filter((q: any) => isSameDay(q.created_at)).length;
        if (!cancelled) setQuoteRequestsCount(count);
      } else {
        if (!cancelled) setQuoteRequestsCount(0);
      }
    } catch (error) {
      console.error('Error fetching new quotes requests today:', error);
      if (!cancelled) setQuoteRequestsCount(0);
    }
  };

  fetchTodayQuotes();

  return () => { cancelled = true; };
}, []);

useEffect(() => {
  let cancelled = false;

  const isSameDay = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  };

  const fetchTodayRescheduled = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.ADMIN_BOOKINGS}?rescheduled=true`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.bookings)) {
        // server returns reschedule_date in joined rescheduled bookings
        const count = data.bookings.filter((b: any) => isSameDay(b.reschedule_date)).length;
        if (!cancelled) setRescheduledCount(count);
      } else {
        if (!cancelled) setRescheduledCount(0);
      }
    } catch (error) {
      console.error('Error fetching rescheduled bookings:', error);
      if (!cancelled) setRescheduledCount(0);
    }
  };

  fetchTodayRescheduled();

  return () => { cancelled = true; };
}, []);

  const menuItems = [
    { id: 'dashboard', icon: 'grid-outline', label: 'Dashboard', color: '#6366f1' },
    { id: 'bookings', icon: 'cart-outline', label: 'Bookings', color: '#f59e0b' },
    { id: 'payments', icon: 'cash-outline', label: 'Payments', color: '#8b5cf6' },
    { id: 'customers', icon: 'people-outline', label: 'Customers', color: '#06b6d4' },
    { id: 'workers', icon: 'construct-outline', label: 'Workers', color: '#10b981' },
    { id: 'reports', icon: 'document-text-outline', label: 'Reports', color: '#ef4444' },
    { id: 'messages', icon: 'mail-outline', label: 'Messages', color: '#ec4899' },
    { id: 'settings', icon: 'settings-outline', label: 'Settings', color: '#64748b' },
    { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', color: '#f97316' },
    { id: 'help', icon: 'help-circle-outline', label: 'Help & Support', color: '#14b8a6' },
  ];


  const styles = createStyles(width, height);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainWrapper}>
        {/* Sidebar */}
        <View style={[styles.sidebar, isDesktop ? styles.sidebarDesktop : styles.sidebarMobile]}>
          <View style={styles.sidebarContent}>
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/images/OriginX.png')}
                    style={styles.sidebarLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuSectionTitle}>MAIN MENU</Text>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    activeMenu === item.id && styles.menuItemActive
                  ]}
                  onPress={() => setActiveMenu(item.id)}
                >
                  <View style={[
                    styles.iconContainer,
                    activeMenu === item.id && { backgroundColor: item.color }
                  ]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={activeMenu === item.id ? '#fff' : item.color}
                    />
                  </View>
                  <Text style={[
                    styles.menuLabel,
                    activeMenu === item.id && styles.menuLabelActive
                  ]}>
                    {item.label}
                  </Text>
                  {activeMenu === item.id && (
                    <View style={[styles.activeIndicator, { backgroundColor: item.color }]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarContent}>
              <View style={styles.topBarLeft}>
                <Text style={styles.topBarTitle}>
                  {activeMenu === 'bookings' ? 'Bookings Management' : activeMenu === 'payments' ? 'Payments Management' : activeMenu === 'customers' ? 'Customers Management' : activeMenu === 'workers' ? 'Workers Management' : 'Dashboard Overview'}
                </Text>
                <View style={styles.breadcrumb}>
                  <Text style={styles.breadcrumbText}>Home</Text>
                  <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                  <Text style={styles.breadcrumbActive}>
                    {menuItems.find(item => item.id === activeMenu)?.label || 'Dashboard'}
                  </Text>
                </View>
              </View>
              <View style={styles.topBarRight}>
                {(activeMenu === 'bookings' || activeMenu === 'payments' || activeMenu === 'customers' || activeMenu === 'workers') && (
                  <View style={styles.topBarSearchContainer}>
                    <Ionicons name="search-outline" size={isDesktop ? 18 : isTablet ? 16 : 14} color="#64748b" style={styles.topBarSearchIcon} />
                    <TextInput
                      style={[styles.topBarSearchInput, { outlineWidth: 0, outlineStyle: 'none' } as any]}
                      placeholder={activeMenu === 'bookings' ? "Search bookings..." : activeMenu === 'payments' ? "Search payments..." : activeMenu === 'customers' ? "Search customers..." : "Search workers..."}
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      underlineColorAndroid="transparent"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setSearchQuery('')} 
                        style={styles.topBarSearchClear}
                      >
                        <Ionicons name="close-circle" size={isDesktop ? 18 : isTablet ? 16 : 14} color="#94a3b8" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <TouchableOpacity style={styles.iconButton}>
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>5</Text>
                  </View>
                  <Ionicons name="notifications-outline" size={isDesktop ? 20 : isTablet ? 18 : 16} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileButton}>
                  <View style={styles.profileAvatar}>
                    <Ionicons name="person" size={isDesktop ? 18 : isTablet ? 16 : 14} color="#6366f1" />
                  </View>
                  {!isMobile && <Text style={styles.profileName}>Admin</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Content Area */}
          {activeMenu === 'bookings' ? (
            <View style={styles.content}>
              <Bookings 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </View>
          ) : activeMenu === 'payments' ? (
            <View style={styles.content}>
              <Payments 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </View>
          ) : activeMenu === 'customers' ? (
            <View style={styles.content}>
              <Customers 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </View>
          ) : activeMenu === 'workers' ? (
            <View style={styles.content}>
              <Workers 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </View>
          ) : (
            <View style={styles.content}>
              <ScrollView 
                style={styles.contentScroll} 
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.contentWrapper}>
                  {/* Welcome Section */}
                  <View style={styles.welcomeSection}>
                    <View>
                      <Text style={styles.welcomeText}>Welcome back! 👋</Text>
                      <Text style={styles.subtitleText}>Here's what's happening with your platform today.</Text>
                    </View>
                  </View>
                  
                  {/* Stats Cards */}
                  <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#06b6d4' }]}>
                        <Ionicons name="cart-outline" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>New Bookings</Text>
                        <Text style={styles.statValue}>{newBookingsCount !== null ? newBookingsCount : '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#6366f1' }]}>
                        <Ionicons name="people-outline" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>New Worker Request</Text>
                        <Text style={styles.statValue}>{requestedWorkersCount !== null ? requestedWorkersCount : '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#10b981' }]}>
                        <Ionicons name="document-text-outline" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>New Work Quote</Text>
                        <Text style={styles.statValue}>{quoteRequestsCount !== null ? quoteRequestsCount : '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#fed7aa' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b' }]}>
                        <Ionicons name="calendar-outline" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>Rescheduled Bookings</Text>
                        <Text style={styles.statValue}>{rescheduledCount !== null ? rescheduledCount : '—'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Summary Report</Text>
                    <View style={styles.quickActions}>
                      {quickCards.map(card => (
                        <TouchableOpacity
                          key={card.id}
                          style={[styles.quickAction, { backgroundColor: card.bg }]}
                        >
                          <View style={[styles.statIconContainer, { backgroundColor: card.iconBg }]}> 
                            <Ionicons name={card.icon as any} size={24} color="#fff" />
                          </View>

                          <View style={styles.statInfo}>
                            <Text style={styles.statLabel}>{card.label}</Text>
                            <Text style={[styles.statValue, { fontSize: isDesktop ? 22 : isTablet ? 20 : 18 }]}>{card.value}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View> 
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (width: number, height: number) => {
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const sidebarWidth = isDesktop ? 280 : isTablet ? 260 : isMobile ? 240 : 260;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f1f5f9',
    },
    mainWrapper: {
      flex: 1,
      flexDirection: 'row',
    },
    sidebar: {
      height: '100%',
      backgroundColor: '#ffffff',
      borderRightWidth: 1,
      borderRightColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    sidebarDesktop: {
      width: sidebarWidth,
    },
    sidebarMobile: {
      width: isMobile ? 240 : 260,
    },
    sidebarContent: {
      flex: 1,
      paddingTop: 24,
      paddingBottom: 20,
    },
    sidebarHeader: {
      paddingHorizontal: 20,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      marginBottom: 24,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 16,
    },
    logoContainer: {
      width: '100%',
      alignItems: 'center',
    },
    sidebarLogo: {
      width: isDesktop ? 140 : isTablet ? 120 : 100,
      height: isDesktop ? 45 : isTablet ? 40 : 35,
    },
    menuContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    menuSectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#94a3b8',
      letterSpacing: 1,
      marginBottom: 12,
      marginLeft: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 4,
      borderRadius: 12,
      position: 'relative',
    },
    menuItemActive: {
      backgroundColor: '#f8fafc',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#64748b',
      flex: 1,
    },
    menuLabelActive: {
      color: '#0f172a',
      fontWeight: '600',
    },
    activeIndicator: {
      width: 4,
      height: 20,
      borderRadius: 2,
      position: 'absolute',
      right: 0,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: '#fef2f2',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#fee2e2',
    },
    logoutIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ef4444',
    },
    mainContent: {
      flex: 1,
      backgroundColor: '#f1f5f9',
    },
    topBar: {
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingVertical: isDesktop ? 20 : isTablet ? 18 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 1,
    },
    topBarContent: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 12 : 0,
    },
    topBarLeft: {
      flex: 1,
    },
    topBarTitle: {
      fontSize: isDesktop ? 24 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 4,
    },
    breadcrumb: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    breadcrumbText: {
      fontSize: 13,
      color: '#94a3b8',
    },
    breadcrumbActive: {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '600',
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 10 : isTablet ? 8 : 6,
      flexWrap: isMobile ? 'wrap' : 'nowrap',
    },
    topBarSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      height: isDesktop ? 40 : isTablet ? 38 : 36,
      width: isDesktop ? 300 : isTablet ? 200 : isMobile ? '100%' : 150,
      gap: 8,
      marginBottom: isMobile ? 8 : 0,
    },
    topBarSearchIcon: {
      marginRight: 0,
    },
    topBarSearchInput: {
      flex: 1,
      fontSize: 14,
      color: '#0f172a',
      height: '100%',
    },
    topBarSearchClear: {
      padding: 2,
    },
    iconButton: {
      width: isDesktop ? 40 : isTablet ? 38 : 36,
      height: isDesktop ? 40 : isTablet ? 38 : 36,
      borderRadius: 10,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    notificationBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: '#ef4444',
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: '#fff',
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
    profileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 10 : isTablet ? 8 : 6,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 8 : isTablet ? 7 : 6,
      backgroundColor: '#f8fafc',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    profileAvatar: {
      width: isDesktop ? 32 : isTablet ? 30 : 28,
      height: isDesktop ? 32 : isTablet ? 30 : 28,
      borderRadius: isDesktop ? 16 : isTablet ? 15 : 14,
      backgroundColor: '#ede9fe',
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileName: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#0f172a',
    },
    content: {
      flex: 1,
    },
    contentScroll: {
      flex: 1,
    },
    contentWrapper: {
      padding: isDesktop ? 32 : isTablet ? 24 : 16,
    },
    welcomeSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    welcomeText: {
      fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 6,
    },
    subtitleText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#64748b',
      lineHeight: isDesktop ? 22 : isTablet ? 20 : 18,
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 32,
    },
    statCard: {
      flex: 1,
      minWidth: isDesktop ? 240 : '100%',
      padding: 20,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    statIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statInfo: {
      flex: 1,
    },
    statLabel: {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '500',
      marginBottom: 4,
    },
    statValue: {
      fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 6,
    },
    quickActionsContainer: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 16,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
    },
    quickAction: {
      width: isDesktop ? '23%' : isTablet ? '48%' : '100%',
      padding: isDesktop ? 20 : 16,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      minWidth: isDesktop ? 240 : '100%',
      paddingVertical: 20,
    },
    quickActionIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#0f172a',
    },
    quickActionValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0f172a',
      marginTop: 6,
    },
    quickActionChange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
  });
};