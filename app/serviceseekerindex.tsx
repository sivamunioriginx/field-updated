import { API_ENDPOINTS, default as getBaseUrl } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ServiceSeeker {
  id: string;
  name: string;
  mobile: string;
  email: string;
  profile_image?: string;
  pincode?: string;
  district?: string;
  state?: string;
  country?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  city?: string;
  mandal?: string;
}

interface Booking {
  id: number;
  booking_id: string;
  worker_id: number;
  user_id: number;
  booking_time: string;
  status: number;
  created_at: string;
  worker_name?: string;
  worker_mobile?: string;
  reject_reason?: string;
}

// Helper functions moved inside createStyles for better responsive scaling

export default function Index() {
  const { width, height } = useWindowDimensions();
  const { logout, user, isAuthenticated } = useAuth();
  const { name: initialName, profileImage: profileImageParam, mobile } = useLocalSearchParams();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosedByOutside, setMenuClosedByOutside] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [serviceSeeker, setServiceSeeker] = useState<ServiceSeeker | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('notifications');
  // Calculate menu width responsively - will be updated in useEffect
  const menuWidth = useMemo(() => {
    const baseWidth = 375;
    const scale = (size: number, factor: number = 0.5) => {
      const scaledSize = (size * width) / baseWidth;
      return size + (scaledSize - size) * factor;
    };
    return Math.max(250, Math.min(350, scale(300, 1)));
  }, [width]);
  const slideAnim = useRef(new Animated.Value(menuWidth)).current;
  const isAnimating = useRef(false);

  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(height, width), [height, width]);

  // Cleanup animation state on unmount
  useEffect(() => {
    return () => {
      isAnimating.current = false;
    };
  }, []);

  // Prevent menu from reopening automatically after outside close
  useEffect(() => {
    if (menuClosedByOutside && !menuOpen) {
      // Menu was closed by outside click, ensure it stays closed
      slideAnim.setValue(menuWidth);
    }
  }, [menuClosedByOutside, menuOpen, slideAnim, menuWidth]);

  const handleOutsideTouch = () => {
    Keyboard.dismiss();
    if (menuOpen) {
      forceCloseMenu();
    }
  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      // Reset the outside close flag when manually opening
      setMenuClosedByOutside(false);
      openMenu();
    }
  };

  const openMenu = () => {
    if (menuOpen || isAnimating.current) return; // Prevent multiple open calls
    
    isAnimating.current = true;
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const closeMenu = () => {
    if (!menuOpen || isAnimating.current) return; // Prevent multiple close calls
    
    isAnimating.current = true;
    Animated.timing(slideAnim, {
      toValue: menuWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setMenuOpen(false);
      isAnimating.current = false;
    });
  };

  // Force close menu without animation (for outside clicks)
  const forceCloseMenu = () => {
    if (!menuOpen) return;
    
    // Stop any ongoing animation
    slideAnim.stopAnimation();
    
    // Immediately set to closed state
    setMenuOpen(false);
    setMenuClosedByOutside(true); // Mark as closed by outside click
    isAnimating.current = false;
    
    // Reset animation value to closed position
    slideAnim.setValue(menuWidth);
  };

  const handleEditProfile = () => {
    closeMenu();
    // Navigate to edit service seeker screen with user data
    if (serviceSeeker) {
      router.push({
        pathname: '/editserviceseeker',
        params: {
          id: serviceSeeker.id,
          name: serviceSeeker.name,
          mobile: serviceSeeker.mobile,
          email: serviceSeeker.email,
          profileImage: profileImage,
          pincode: serviceSeeker.pincode,
          district: serviceSeeker.district,
          state: serviceSeeker.state,
          country: serviceSeeker.country,
          address: serviceSeeker.address,
          city: serviceSeeker.city,
          latitude: serviceSeeker.latitude,
          longitude: serviceSeeker.longitude
        }
      });
    } else {
      // Fallback if no service seeker data
      router.push('/editserviceseeker');
    }
  };

  const handleLogout = async () => {
    try {
      closeMenu();
      // Use setTimeout to ensure state updates complete before navigation
      setTimeout(async () => {
        try {
          await logout();
          router.replace('/login');
        } catch (error) {
          console.error('Error during logout:', error);
          router.replace('/login');
        }
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/login');
    }
  };

  // Memoize the setProfileImageFromParam function
  const setProfileImageFromParam = useCallback(() => {
    if (profileImageParam && typeof profileImageParam === 'string') {
      
      if (profileImageParam.startsWith('/uploads/')) {
        const baseUrl = getBaseUrl().replace('/api', '');
        const fullUrl = baseUrl + profileImageParam;
        setProfileImage(fullUrl);
      } else if (profileImageParam.startsWith('http')) {
        setProfileImage(profileImageParam);
      } else {
        const baseUrl = getBaseUrl().replace('/api', '');
        const fullUrl = baseUrl + '/uploads/profiles/' + profileImageParam;
        setProfileImage(fullUrl);
      }
    }
  }, [profileImageParam]);

  // Memoize the findServiceSeekerByMobile function to prevent recreation
  const findServiceSeekerByMobile = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use authenticated user's mobile if available, otherwise use params
      const mobileToUse = user?.mobile || mobile;
      
      if (mobileToUse && typeof mobileToUse === 'string') {
        const apiUrl = API_ENDPOINTS.SERVICESEEKER_BY_MOBILE(mobileToUse);
        
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        if (result.success && result.data) {
          const seekerData = result.data;
          
          setServiceSeeker(seekerData);
          
          // Set profile image with proper URL construction
          if (seekerData.profile_image) {
            
            if (seekerData.profile_image.startsWith('http')) {
              // Already a full URL
              setProfileImage(seekerData.profile_image);
            } else {
              // Construct full URL
              const baseUrl = getBaseUrl().replace('/api', '');
              const fullUrl = baseUrl + seekerData.profile_image;
              setProfileImage(fullUrl);
            }
          } else {
            setProfileImage(null);
          }
        } else {
          console.log('❌ Service seeker not found by mobile, trying fallback...');
          // Fallback to profile image param
          setProfileImageFromParam();
          
          // Try to find by name as fallback
          if (initialName) {
            await findServiceSeekerByName(initialName);
          }
        }
      } else {
        console.log('❌ No mobile number provided, trying fallback...');
        setProfileImageFromParam();
        
        // Try to find by name as fallback
        if (initialName) {
          await findServiceSeekerByName(initialName);
        }
      }
    } catch (error) {
      console.error('❌ Error in findServiceSeekerByMobile:', error);
      setProfileImageFromParam();
      
      // Try to find by name as fallback
      if (initialName) {
        await findServiceSeekerByName(initialName);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.mobile, mobile, setProfileImageFromParam, initialName]);

  // Fallback function to find service seeker by name
  const findServiceSeekerByName = async (name: string | string[]) => {
    try {
      // Handle case where name might be an array
      const searchName = Array.isArray(name) ? name[0] : name;
      
      if (!searchName) {
        console.log('❌ No valid name to search for');
        return;
      }
      
      // Get all service seekers and find by name
      const response = await fetch(API_ENDPOINTS.ALL_SERVICESEEKERS);
      const result = await response.json();
      
      if (result.success && result.data) {
        const foundSeeker = result.data.find((seeker: ServiceSeeker) => 
          seeker.name.toLowerCase() === searchName.toLowerCase()
        );
        
        if (foundSeeker) {
          setServiceSeeker(foundSeeker);
          
          // Set profile image
          if (foundSeeker.profile_image) {
            if (foundSeeker.profile_image.startsWith('http')) {
              setProfileImage(foundSeeker.profile_image);
            } else {
              const baseUrl = getBaseUrl().replace('/api', '');
              const fullUrl = baseUrl + foundSeeker.profile_image;
              setProfileImage(fullUrl);
            }
          } else {
            setProfileImage(null);
          }
        } else {
          console.log('❌ Service seeker not found by name either');
        }
      }
    } catch (error) {
      console.error('❌ Error in findServiceSeekerByName:', error);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  // Add focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Use authenticated user's mobile if available, otherwise use params
      const mobileToUse = user?.mobile || mobile;
      if (mobileToUse) {
        findServiceSeekerByMobile();
      }
    }, [user?.mobile, mobile, findServiceSeekerByMobile])
  );

  // Fetch service seeker data from server (initial load)
  useEffect(() => {
    // Use authenticated user's mobile if available, otherwise use params
    const mobileToUse = user?.mobile || mobile;
    if (mobileToUse) {
      findServiceSeekerByMobile();
    } else if (initialName) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [user?.mobile, mobile, initialName, findServiceSeekerByMobile]);

  // Modify the fetchBookings function to get distinct bookings by booking_id
  const fetchBookings = useCallback(async () => {
    // Use authenticated user's ID if available, otherwise use serviceSeeker ID
    const userId = user?.id || serviceSeeker?.id;
    if (!userId) {
      return;
    }
    
    try {
      setBookingsLoading(true);
      const apiUrl = API_ENDPOINTS.BOOKINGS_BY_USER(userId);
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Remove duplicates by booking_id, keeping the latest status
        const distinctBookings = result.data.reduce((acc: Booking[], current: Booking) => {
          const existingIndex = acc.findIndex(booking => booking.booking_id === current.booking_id);
          
          if (existingIndex === -1) {
            // New booking_id, add it
            acc.push(current);
          } else {
            // Existing booking_id, keep the one with the latest created_at
            if (new Date(current.created_at) > new Date(acc[existingIndex].created_at)) {
              acc[existingIndex] = current;
            }
          }
          
          return acc;
        }, []);
        
        setBookings(distinctBookings);
      } else {
        setBookings([]);
        console.log('❌ No notifications data in response');
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [user?.id, serviceSeeker?.id]);

  // Add function to fetch total bookings (status != 0) with distinct booking_id
  const fetchTotalBookings = async () => {
    // Use authenticated user's ID if available, otherwise use serviceSeeker ID
    const userId = user?.id || serviceSeeker?.id;
    if (!userId) {
      return;
    }
    
    try {
      setBookingsLoading(true);
      // Get all bookings for totalBookings tab (status=0,1,2,3 without payment_status restriction)
      const apiUrl = `${API_ENDPOINTS.TOTAL_BOOKINGS_BY_USER(userId)}?status=0,1,2,3`;
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Remove duplicates by booking_id, keeping the latest status
        const distinctTotalBookings = result.data.reduce((acc: Booking[], current: Booking) => {
          const existingIndex = acc.findIndex(booking => booking.booking_id === current.booking_id);
          
          if (existingIndex === -1) {
            // New booking_id, add it
            acc.push(current);
          } else {
            // Existing booking_id, keep the one with the latest created_at
            if (new Date(current.created_at) > new Date(acc[existingIndex].created_at)) {
              acc[existingIndex] = current;
            }
          }
          
          return acc;
        }, []);
        
        setBookings(distinctTotalBookings);
      } else {
        setBookings([]);
        console.log('❌ No total bookings data in response');
      }
    } catch (error) {
      console.error('❌ Error fetching total bookings:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Add function to get status change message
  const getStatusChangeMessage = (status: number, previousStatus?: number) => {
    if (previousStatus !== undefined && previousStatus !== status) {
      // Status changed
      switch (status) {
        case 0:
          return 'Booking created - waiting for worker confirmation';
        case 1:
          return 'Worker accepted your booking!';
        case 2:
          return 'Job completed successfully!';
        case 3:
          return 'Booking was cancelled';
        default:
          return 'Status updated';
      }
    } else {
      // Initial status
      switch (status) {
        case 0:
          return 'Waiting for worker confirmation';
        case 1:
          return 'Worker is on the job';
        case 2:
          return 'Job completed successfully!';
        case 3:
          return 'Booking was cancelled';
        default:
          return 'Status updated';
      }
    }
  };

  // Add function to get status icon
  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0:
        return 'time-outline';
      case 1:
        return 'checkmark-circle-outline';
      case 2:
        return 'checkmark-done-circle';
      case 3:
        return 'close-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  // Add function to get status color
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return '#f59e0b'; // Amber
      case 1:
        return '#3b82f6'; // Blue
      case 2:
        return '#10b981'; // Green
      case 3:
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  // Fetch bookings when service seeker data is available
  useEffect(() => {
    // Use authenticated user's ID if available, otherwise use serviceSeeker ID
    const userId = user?.id || serviceSeeker?.id;
    if (userId) {
      fetchBookings();
    }
  }, [user?.id, serviceSeeker, fetchBookings]);

  // Add focus effect to refresh bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Use authenticated user's ID if available, otherwise use serviceSeeker ID
      const userId = user?.id || serviceSeeker?.id;
      if (userId) {
        fetchBookings();
      }
    }, [user?.id, serviceSeeker?.id, fetchBookings])
  );

  // Modify the handleTabChange function
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'notifications') {
      // Fetch all bookings for notifications (all statuses, distinct by booking_id)
      fetchBookings();
    } else if (tab === 'totalBookings') {
      // Fetch total bookings (status != 0, distinct by booking_id)
      fetchTotalBookings();
    }
  };

  // Get the current name (prioritize authenticated user, then serviceSeeker, then fallback to initial)
  const currentName = user?.name || serviceSeeker?.name || initialName;

  // Show loading screen while checking authentication
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingRedirectText}>Redirecting to login...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'height' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        {/* Header - Fixed outside ScrollView */}
        <TouchableWithoutFeedback onPress={menuOpen ? forceCloseMenu : undefined}>
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
              <Ionicons name="arrow-back" size={styles.iconSize} color="black" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/OriginX.png')}
                style={styles.mainlogo}
                contentFit="contain"
              />
            </View>
            <TouchableOpacity 
              style={styles.personButton} 
              onPress={toggleMenu}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="person-circle-outline" size={styles.iconSize} color="black" />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        <TouchableWithoutFeedback onPress={menuOpen ? forceCloseMenu : undefined}>
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollViewContent}
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              if (menuOpen) {
                forceCloseMenu();
              }
            }}
          >
            <View style={styles.innerContainer}>
              
              {/* Booking Notifications Section */}
              <View style={styles.bookingsSection}>
                <View style={styles.bookingsHeader}>
                  <View style={styles.bookingsTitleContainer}>
                    <Ionicons name="notifications" size={styles.titleIconSize} color="#3498db" />
                    <Text style={styles.bookingsTitle}>
                      {activeTab === 'notifications' ? 'All Notifications' : 'Total Bookings'}
                    </Text>
                  </View>
                  <View style={styles.bookingsActions}>
                    {bookings.length > 0 && (
                      <View style={styles.bookingCount}>
                        <Text style={styles.bookingCountText}>{bookings.length}</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {bookingsLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading bookings...</Text>
                  </View>
                ) : bookings.length > 0 ? (
                  <View style={styles.bookingsList}>
                    {bookings.map((booking) => (
                      <View key={`${booking.booking_id}-${booking.status}`} style={styles.bookingCard}>
                        {/* Status Icon and Badge */}
                        <View style={styles.bookingHeader}>
                          <View style={styles.bookingIdContainer}>
                            <Ionicons 
                              name={getStatusIcon(booking.status)} 
                              size={styles.statusIconSize} 
                              color={getStatusColor(booking.status)} 
                            />
                            <Text style={styles.bookingId}>#{booking.booking_id}</Text>
                          </View>
                          
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(booking.status) + '20' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: getStatusColor(booking.status) }
                            ]}>
                              {booking.status === 0 ? 'Pending' : 
                               booking.status === 1 ? 'Active' : 
                               booking.status === 2 ? 'Completed' : 
                               booking.status === 3 ? 'Rejected' : 
                               `Status ${booking.status}`}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Conditional Content Based on Status */}
                        {booking.status === 0 ? (
                          // For pending bookings (status = 0) - show minimal info
                          <View style={styles.pendingBookingContent}>
                            <View style={styles.bookingRow}>
                              <Ionicons name="calendar" size={styles.smallIconSize} color="#666" />
                              <Text style={styles.bookingLabel}>Booking For: </Text>
                              <Text style={styles.bookingValue}>
                                {new Date(booking.booking_time).toLocaleString("en-GB", {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true
                                })}
                              </Text>
                            </View>
                            
                            <View style={styles.statusInfoContainer}>
                              <Text style={styles.statusInfoText}>
                                Waiting for worker confirmation
                              </Text>
                            </View>
                          </View>
                        ) : booking.status === 3 ? (
                          // For rejected/cancelled bookings (status = 3) - show worker and reject reason only
                          <View style={styles.rejectedBookingContent}>
                            <View style={styles.bookingRow}>
                              <Ionicons name="person" size={styles.smallIconSize} color="#666" />
                              <Text style={styles.bookingLabel}>Worker: </Text>
                              <Text style={styles.bookingValue}>
                                {booking.worker_name || `Worker #${booking.worker_id}`}
                              </Text>
                            </View>
                            
                            {/* Reject Reason */}
                            {booking.reject_reason && (
                              <View style={styles.rejectReasonContainer}>
                                <View style={styles.bookingRow}>
                                  <Ionicons name="close-circle" size={styles.smallIconSize} color="#ef4444" />
                                  <Text style={styles.bookingLabel}>Reject Reason: </Text>
                                  <Text style={styles.rejectReasonText}>
                                    {booking.reject_reason}
                                  </Text>
                                </View>
                              </View>
                            )}
                            
                            <View style={styles.statusInfoContainer}>
                              <Text style={styles.statusInfoText}>
                                {getStatusChangeMessage(booking.status)}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          // For all other statuses (1, 2) - show full details
                          <View style={styles.bookingDetails}>
                            <View style={styles.bookingRow}>
                              <Ionicons name="person" size={styles.smallIconSize} color="#666" />
                              <Text style={styles.bookingLabel}>Worker: </Text>
                              <Text style={styles.bookingValue}>
                                {booking.worker_name || `Worker #${booking.worker_id}`}
                              </Text>
                            </View>
                            
                            <View style={styles.bookingRow}>
                              <Ionicons name="call" size={styles.smallIconSize} color="#666" />
                              <Text style={styles.bookingLabel}>Contact: </Text>
                              <Text style={styles.bookingValue}>
                                {booking.worker_mobile || 'N/A'}
                              </Text>
                            </View>
                            
                            <View style={styles.bookingRow}>
                              <Ionicons name="time" size={styles.smallIconSize} color="#666" />
                              <Text style={styles.bookingLabel}>Booking For: </Text>
                              <Text style={styles.bookingValue}>
                                {new Date(booking.created_at).toLocaleString("en-GB", {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true
                                })}
                              </Text>
                            </View>
                            
                            {/* Status Change Message */}
                            <View style={styles.statusInfoContainer}>
                              <Text style={styles.statusInfoText}>
                                {getStatusChangeMessage(booking.status)}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noBookings}>
                    <Ionicons name="checkmark-circle" size={styles.emptyIconSize} color="#e5e7eb" />
                    <Text style={styles.noBookingsText}>No {activeTab === 'notifications' ? 'notifications' : 'bookings'}</Text>
                    <Text style={styles.noBookingsSubtext}>
                      {serviceSeeker?.id ? 'You\'re all caught up!' : 'Service seeker data not loaded'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
        
        {/* Bottom Navigation Icons - Always at bottom */}
        <TouchableWithoutFeedback onPress={menuOpen ? forceCloseMenu : undefined}>
          <View style={styles.bottomNavigation}>
            <TouchableOpacity 
              style={styles.bottomNavItem} 
              onPress={() => handleTabChange('notifications')}
            >
              <Ionicons 
                name="notifications" 
                size={styles.bottomNavIconSize} 
                color={activeTab === 'notifications' ? '#4CAF50' : '#9CA3AF'} 
              />
              <Text style={[
                styles.bottomNavText,
                activeTab === 'notifications' && styles.bottomNavTextActive
              ]}>
                Notifications
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomNavItem} 
              onPress={() => handleTabChange('totalBookings')}
            >
              <Ionicons 
                name="list" 
                size={styles.bottomNavIconSize} 
                color={activeTab === 'totalBookings' ? '#4CAF50' : '#9CA3AF'} 
              />
              <Text style={[
                styles.bottomNavText,
                activeTab === 'totalBookings' && styles.bottomNavTextActive
              ]}>
                Total Bookings
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomNavItem} 
              onPress={() => handleTabChange('paymentHistory')}
            >
              <Ionicons 
                name="card" 
                size={styles.bottomNavIconSize} 
                color={activeTab === 'paymentHistory' ? '#4CAF50' : '#9CA3AF'} 
              />
              <Text style={[
                styles.bottomNavText,
                activeTab === 'paymentHistory' && styles.bottomNavTextActive
              ]}>
                Payment
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomNavItem} 
              onPress={() => handleTabChange('customerCare')}
            >
              <Ionicons 
                name="headset" 
                size={styles.bottomNavIconSize} 
                color={activeTab === 'customerCare' ? '#4CAF50' : '#9CA3AF'} 
              />
              <Text style={[
                styles.bottomNavText,
                activeTab === 'customerCare' && styles.bottomNavTextActive
              ]}>
                Customer Care
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
          
          {/* Menu Backdrop - Only show when menu is open */}
          {menuOpen && (
            <TouchableWithoutFeedback onPress={forceCloseMenu}>
              <View style={styles.menuBackdrop} />
            </TouchableWithoutFeedback>
          )}

          {/* Sliding Menu */}
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
            pointerEvents={menuOpen ? 'auto' : 'none'}
          >
            <View style={styles.menuContent}>
              {/* Profile Section */}
              <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={styles.profileImage}
                      contentFit="cover"
                      onLoadStart={() => {
                      }}
                      onLoad={() => {
                      }}
                      onError={(error) => {
                        setProfileImage(null);
                      }}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Text style={styles.profileInitials}>
                        {typeof currentName === 'string' ? currentName.charAt(0).toUpperCase() : 'S'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.serviceSeekerName}>{currentName}</Text>
              </View>

              {/* Menu Divider */}
              <View style={styles.menuDivider} />

              {/* Menu Items */}
              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="create-outline" size={styles.menuIconSize} color="#3498db" />
                  </View>
                  <Text style={styles.menuText}>Edit Profile</Text>
                  <Ionicons name="chevron-forward" size={styles.chevronIconSize} color="#9ca3af" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="log-out-outline" size={styles.menuIconSize} color="#ef4444" />
                  </View>
                  <Text style={styles.menuText}>Logout</Text>
                  <Ionicons name="chevron-forward" size={styles.chevronIconSize} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Bottom Section */}
              <View style={styles.bottomSection}>
                <View style={styles.versionInfo}>
                  <Text style={styles.versionText}>OriginX v1.0.0</Text>
                </View>
              </View>
            </View>
          </Animated.View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const createStyles = (screenHeight: number, screenWidth: number) => {
  // Base dimensions for better scaling (using standard mobile dimensions)
  const baseWidth = 375; // iPhone standard - better scaling base
  const baseHeight = 812; // iPhone standard - better scaling base
  
  // Moderate scale function to prevent extreme sizes
  const scale = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * factor;
  };

  const scaleHeight = (size: number, factor: number = 0.5) => {
    const scaledSize = (size * screenHeight) / baseHeight;
    return size + (scaledSize - size) * factor;
  };

  // Helper function to get responsive values based on screen height with min/max constraints
  const getResponsiveValue = (baseValue: number, minValue?: number, maxValue?: number) => {
    const scaledValue = scaleHeight(baseValue, 1);
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  // Helper function to get responsive values based on screen width with min/max constraints
  const getResponsiveWidth = (baseValue: number, minValue?: number, maxValue?: number) => {
    const scaledValue = scale(baseValue, 1);
    if (minValue !== undefined && scaledValue < minValue) return minValue;
    if (maxValue !== undefined && scaledValue > maxValue) return maxValue;
    return scaledValue;
  };

  // Helper function to get responsive font sizes with moderate scaling
  const getResponsiveFontSize = (baseSize: number) => {
    const scaledSize = scale(baseSize, 0.5);
    return Math.max(10, Math.min(28, scaledSize));
  };

  // Helper function to get responsive padding/margins with moderate scaling
  const getResponsiveSpacing = (baseSpacing: number) => {
    return Math.max(2, scale(baseSpacing, 0.5));
  };

  // Helper function to get responsive spacing that supports negative values
  const getResponsiveSpacingWithNegative = (baseSpacing: number) => {
    return scale(baseSpacing, 0.5);
  };

  // Calculate responsive icon sizes
  const moderateScale = (size: number) => {
    const scaledSize = (size * screenWidth) / baseWidth;
    return size + (scaledSize - size) * 0.5;
  };

  // Icon sizes
  const iconSize = Math.max(24, Math.min(32, moderateScale(28)));
  const titleIconSize = Math.max(20, Math.min(28, moderateScale(24)));
  const statusIconSize = Math.max(16, Math.min(24, moderateScale(20)));
  const smallIconSize = Math.max(14, Math.min(20, moderateScale(16)));
  const bottomNavIconSize = Math.max(20, Math.min(28, moderateScale(24)));
  const menuIconSize = Math.max(20, Math.min(28, moderateScale(24)));
  const chevronIconSize = Math.max(14, Math.min(20, moderateScale(16)));
  const emptyIconSize = Math.max(40, Math.min(56, moderateScale(48)));

  // Calculate menu width responsively
  const menuWidth = Math.max(250, Math.min(350, scale(300, 1)));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    loadingRedirectText: {
      fontSize: getResponsiveFontSize(18),
      color: '#666',
    },
    innerContainer: {
      padding: getResponsiveSpacing(20),
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: getResponsiveValue(100, 80, 120), // Add padding to ensure content doesn't get hidden behind bottom navigation
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveWidth(10, 8, 16),
      paddingTop: getResponsiveValue(39, 32, 46),
      paddingBottom: getResponsiveValue(4, 3, 6),
      backgroundColor: '#A1CEDC',
      marginTop: getResponsiveValue(-40, -50, -30),
      position: 'relative',
    },
    menuButton: {
      padding: getResponsiveSpacing(5),
    },
    menuicon: {
      marginRight: getResponsiveSpacing(10),
    },
    backButton: {
      padding: getResponsiveSpacing(5),
      minWidth: getResponsiveValue(44, 40, 48),
      minHeight: getResponsiveValue(44, 40, 48),
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: getResponsiveSpacingWithNegative(-85),
    },
    mainlogo: {
      height: getResponsiveValue(50, 40, 60),
      width: getResponsiveWidth(180, 150, 220),
    },
    personButton: {
      padding: getResponsiveSpacing(5),
      minWidth: getResponsiveValue(44, 40, 48),
      minHeight: getResponsiveValue(44, 40, 48),
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-end',
    },
    // Sliding Menu Styles
    menuContainer: {
      position: 'absolute',
      top: getResponsiveValue(-40, -50, -30),
      right: 0,
      height: screenHeight, // Use full screen height
      width: menuWidth,
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: getResponsiveSpacing(12),
      elevation: 8,
      borderTopLeftRadius: getResponsiveValue(20, 15, 25),
      borderBottomLeftRadius: getResponsiveValue(20, 15, 25),
      zIndex: 1001, // Higher than bottom navigation (1000)
    },
    menuContent: {
      flex: 1,
      paddingTop: getResponsiveValue(60, 50, 70),
    },
    profileSection: {
      alignItems: 'center',
      paddingVertical: getResponsiveValue(20, 15, 25),
      paddingHorizontal: getResponsiveWidth(20, 16, 24),
      backgroundColor: '#667eea',
      borderTopLeftRadius: getResponsiveValue(20, 15, 25),
      position: 'relative',
      overflow: 'hidden',
      marginTop: getResponsiveValue(-60, -70, -50),
    },
    profileImageContainer: {
      position: 'relative',
      marginBottom: getResponsiveSpacing(5),
      marginTop: getResponsiveValue(40, 35, 45),
    },
    profileImage: {
      width: getResponsiveValue(100, 80, 120),
      height: getResponsiveValue(100, 80, 120),
      borderRadius: getResponsiveValue(50, 40, 60),
      borderWidth: 4,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    profileImagePlaceholder: {
      width: getResponsiveValue(100, 80, 120),
      height: getResponsiveValue(100, 80, 120),
      borderRadius: getResponsiveValue(50, 40, 60),
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    profileInitials: {
      fontSize: getResponsiveFontSize(36),
      fontWeight: 'bold',
      color: '#ffffff',
    },
    serviceSeekerName: {
      fontSize: getResponsiveFontSize(22),
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: getResponsiveSpacing(5),
      textShadowColor: 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    menuDivider: {
      height: 1,
      backgroundColor: '#f1f5f9',
      marginHorizontal: getResponsiveWidth(20, 16, 24),
      marginVertical: getResponsiveSpacing(10),
    },
    menuItems: {
      flex: 1,
      paddingHorizontal: getResponsiveWidth(20, 16, 24),
      paddingTop: getResponsiveValue(20, 15, 25),
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getResponsiveValue(18, 15, 22),
      paddingHorizontal: getResponsiveWidth(16, 12, 20),
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      borderRadius: getResponsiveValue(12, 10, 15),
      marginBottom: getResponsiveSpacing(8),
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    menuItemIcon: {
      marginRight: getResponsiveSpacing(12),
      width: getResponsiveValue(40, 35, 45),
      height: getResponsiveValue(40, 35, 45),
      borderRadius: getResponsiveValue(20, 17, 22),
      backgroundColor: '#fef2f2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuText: {
      fontSize: getResponsiveFontSize(16),
      color: '#374151',
      flex: 1,
      fontWeight: '500',
    },
    bottomSection: {
      paddingHorizontal: getResponsiveWidth(20, 16, 24),
      paddingBottom: getResponsiveValue(30, 25, 35),
      paddingTop: getResponsiveValue(20, 15, 25),
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
      marginTop: 'auto',
    },
    versionInfo: {
      alignItems: 'center',
      paddingVertical: getResponsiveValue(15, 12, 18),
      backgroundColor: '#f8fafc',
      borderRadius: getResponsiveValue(12, 10, 15),
    },
    versionText: {
      fontSize: getResponsiveFontSize(12),
      color: '#9ca3af',
      fontWeight: '500',
    },
    // New styles for bookings and bottom navigation
    bookingsSection: {
      marginTop: getResponsiveSpacing(2),
    },
    bookingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getResponsiveSpacing(10),
      marginTop: getResponsiveSpacingWithNegative(-10),
    },
    bookingsTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: getResponsiveWidth(90, 70, 110),
    },
    bookingsTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: 'bold',
      color: '#333',
      marginLeft: getResponsiveSpacing(10),
    },
    bookingsActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bookingCount: {
      backgroundColor: '#3498db',
      borderRadius: getResponsiveValue(15, 12, 18),
      paddingHorizontal: getResponsiveWidth(10, 8, 12),
      paddingVertical: getResponsiveSpacing(5),
      marginRight: getResponsiveWidth(20, 16, 24),
    },
    bookingCountText: {
      color: '#ffffff',
      fontSize: getResponsiveFontSize(14),
      fontWeight: 'bold',
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: getResponsiveValue(30, 25, 35),
    },
    loadingText: {
      fontSize: getResponsiveFontSize(16),
      color: '#666',
    },
    bookingsList: {
      gap: getResponsiveSpacing(15),
    },
    bookingCard: {
      backgroundColor: '#ebeef1ff',
      borderRadius: getResponsiveValue(10, 8, 12),
      padding: getResponsiveSpacing(15),
      marginBottom: getResponsiveSpacingWithNegative(-5),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      marginLeft: getResponsiveSpacingWithNegative(-5),
      marginRight: getResponsiveSpacingWithNegative(-5),
    },
    bookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(12),
    },
    
    bookingIdContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSpacing(8),
    },
    
    bookingId: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: 'bold',
      color: '#333',
    },
    
    statusBadge: {
      paddingHorizontal: getResponsiveSpacing(8),
      paddingVertical: getResponsiveSpacing(4),
      borderRadius: getResponsiveValue(6, 5, 8),
    },
    
    statusText: {
      fontSize: getResponsiveFontSize(12),
      fontWeight: '600',
    },
    
    // New styles for pending booking content
    pendingBookingContent: {
      gap: getResponsiveSpacing(8),
    },
    
    bookingDetails: {
      gap: getResponsiveSpacing(8),
    },
    bookingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bookingLabel: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginLeft: getResponsiveSpacing(5),
    },
    bookingValue: {
      fontSize: getResponsiveFontSize(14),
      color: '#333',
      fontWeight: '500',
    },
    statusInfoContainer: {
      alignItems: 'center',
      paddingVertical: getResponsiveSpacing(12),
      backgroundColor: '#f8f9fa',
      borderRadius: getResponsiveValue(8, 6, 10),
      borderWidth: 1,
      borderColor: '#e9ecef',
      marginTop: getResponsiveSpacing(8),
    },
    statusInfoText: {
      fontSize: getResponsiveFontSize(14),
      color: '#6c757d',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    noBookings: {
      alignItems: 'center',
      paddingVertical: getResponsiveValue(30, 25, 35),
    },
    noBookingsText: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: 'bold',
      color: '#333',
      marginTop: getResponsiveSpacing(10),
    },
    noBookingsSubtext: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginTop: getResponsiveSpacing(5),
    },
    bottomNavigation: {
      position: 'absolute', // Make it absolutely positioned
      bottom: 0, // Always at bottom
      left: 0,
      right: 0,
      flexDirection: 'row',
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      paddingVertical: getResponsiveValue(4, 2, 6),
      paddingHorizontal: getResponsiveWidth(20, 16, 24),
      justifyContent: 'space-around',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: getResponsiveSpacingWithNegative(-2) },
      shadowOpacity: 0.05,
      shadowRadius: getResponsiveSpacing(4),
      elevation: 8,
      zIndex: 1000, // Ensure it's above other content
    },
    bottomNavItem: {
      alignItems: 'center',
      flex: 1,
    },
    bottomNavText: {
      fontSize: getResponsiveFontSize(12),
      color: '#9CA3AF',
      marginTop: getResponsiveSpacing(1),
      fontWeight: '500',
      textAlign: 'center',
    },
    bottomNavTextActive: {
      color: '#4CAF50',
      fontWeight: '600',
    },
    // New styles for rejected booking content
    rejectedBookingContent: {
      gap: getResponsiveSpacing(8),
    },
    
    rejectReasonContainer: {
      backgroundColor: '#fef2f2',
      borderRadius: getResponsiveValue(8, 6, 10),
      padding: getResponsiveSpacing(12),
      borderWidth: 1,
      borderColor: '#fecaca',
      marginTop: getResponsiveSpacing(8),
    },
    
    rejectReasonText: {
      fontSize: getResponsiveFontSize(14),
      color: '#dc2626',
      fontWeight: '500',
      flex: 1,
    },
    // Menu backdrop style
    menuBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000, // Below menu but above everything else
    },
  });

  // Return styles with icon sizes as additional properties
  return {
    ...styles,
    iconSize,
    titleIconSize,
    statusIconSize,
    smallIconSize,
    bottomNavIconSize,
    menuIconSize,
    chevronIconSize,
    emptyIconSize,
  } as typeof styles & {
    iconSize: number;
    titleIconSize: number;
    statusIconSize: number;
    smallIconSize: number;
    bottomNavIconSize: number;
    menuIconSize: number;
    chevronIconSize: number;
    emptyIconSize: number;
  };
};