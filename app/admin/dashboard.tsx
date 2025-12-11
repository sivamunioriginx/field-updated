import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import Bookings from './bookings';

export default function AdminIndexScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

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

  const menuItems = [
    { id: 'dashboard', icon: 'grid-outline', label: 'Dashboard', color: '#6366f1' },
    { id: 'bookings', icon: 'cart-outline', label: 'Bookings', color: '#f59e0b' },
    { id: 'users', icon: 'people-outline', label: 'Users', color: '#8b5cf6' },
    { id: 'analytics', icon: 'analytics-outline', label: 'Analytics', color: '#06b6d4' },
    { id: 'products', icon: 'cube-outline', label: 'Products', color: '#10b981' },
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
                  {activeMenu === 'bookings' ? 'Bookings Management' : 'Dashboard Overview'}
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
                {activeMenu === 'bookings' && (
                  <View style={styles.topBarSearchContainer}>
                    <Ionicons name="search-outline" size={isDesktop ? 18 : isTablet ? 16 : 14} color="#64748b" style={styles.topBarSearchIcon} />
                    <TextInput
                      style={[styles.topBarSearchInput, { outlineWidth: 0, outlineStyle: 'none' } as any]}
                      placeholder="Search bookings..."
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
                    <TouchableOpacity style={styles.exportButton}>
                      <Ionicons name="download-outline" size={18} color="#6366f1" />
                      <Text style={styles.exportText}>Export</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Stats Cards */}
                  <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#6366f1' }]}>
                        <Ionicons name="people" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>Total Users</Text>
                        <Text style={styles.statValue}>1,234</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-up" size={14} color="#10b981" />
                          <Text style={styles.statChangeText}>+12.5%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#06b6d4' }]}>
                        <Ionicons name="bar-chart" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>Active Today</Text>
                        <Text style={styles.statValue}>567</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-up" size={14} color="#10b981" />
                          <Text style={styles.statChangeText}>+8.2%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#10b981' }]}>
                        <Ionicons name="trending-up" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>Growth Rate</Text>
                        <Text style={styles.statValue}>89%</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-up" size={14} color="#10b981" />
                          <Text style={styles.statChangeText}>+5.1%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: '#fed7aa' }]}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b' }]}>
                        <Ionicons name="notifications" size={24} color="#fff" />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statLabel}>New Alerts</Text>
                        <Text style={styles.statValue}>23</Text>
                        <View style={styles.statChange}>
                          <Ionicons name="trending-down" size={14} color="#ef4444" />
                          <Text style={[styles.statChangeText, { color: '#ef4444' }]}>-2.4%</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#ede9fe' }]}>
                          <Ionicons name="person-add" size={20} color="#6366f1" />
                        </View>
                        <Text style={styles.quickActionText}>Add User</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#dbeafe' }]}>
                          <Ionicons name="create" size={20} color="#06b6d4" />
                        </View>
                        <Text style={styles.quickActionText}>New Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#d1fae5' }]}>
                          <Ionicons name="mail" size={20} color="#10b981" />
                        </View>
                        <Text style={styles.quickActionText}>Send Email</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickAction}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#fecaca' }]}>
                          <Ionicons name="settings" size={20} color="#ef4444" />
                        </View>
                        <Text style={styles.quickActionText}>Settings</Text>
                      </TouchableOpacity>
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
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    exportText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#6366f1',
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
    statChange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statChangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10b981',
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
    },
    quickAction: {
      flex: 1,
      minWidth: isDesktop ? 140 : 150,
      backgroundColor: '#ffffff',
      padding: 20,
      borderRadius: 14,
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#0f172a',
    },
  });
};