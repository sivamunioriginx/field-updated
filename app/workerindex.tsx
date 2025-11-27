import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, AppState, Keyboard, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Worker {
  id: string;
  name: string;
  mobile: string;
  email: string;
  price?: string;
  profile_image?: string;
  skill_id?: string;
  pincode?: string;
  district?: string;
  state?: string;
  country?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  city?: string;
  mandal?: string;
  document1?: string;
  document2?: string;
}

interface Booking {
  id: number;
  booking_id: string;
  worker_id: number;
  user_id: number;
  booking_time: string;
  status: number;
  created_at: string;
  user_name?: string;
  user_mobile?: string;
  contact_number?: string;
  work_location?: string;
  reject_reason?: string;
  description?: string;
  work_documents?: string;
}

export default function Index() {
  const { width, height } = useWindowDimensions();
  const { logout, user, isAuthenticated } = useAuth();
  const params = useLocalSearchParams();
  const { name: paramName, id: paramId, email: paramEmail } = params;
  
  // Use authenticated user data if available, otherwise fall back to params
  const name = user?.name || paramName;
  const id = user?.id || paramId;
  const email = user?.email || paramEmail;
  
  // Calculate responsive values based on screen size
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 768;
  const isLargeScreen = width >= 768;
  
  // Scale factor for responsive sizing
  const scale = width / 375; // Base width of 375px (iPhone X)
  const moderateScale = (size: number, factor = 0.5) => size + (scale - 1) * size * factor;
  
  // Create responsive styles early
  const styles = createStyles(width, height, scale, moderateScale, isLargeScreen);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosedByOutside, setMenuClosedByOutside] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('0');
  const [activeTab, setActiveTab] = useState<string>('notifications'); // Add this state
  const [rejectPopupVisible, setRejectPopupVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingBookingId, setRejectingBookingId] = useState<number | null>(null);
  const slideAnim = useRef(new Animated.Value(moderateScale(300))).current;
  const isAnimating = useRef(false);
  const [shouldLogout, setShouldLogout] = useState(false);
  const [showDisplayOverAppsPrompt, setShowDisplayOverAppsPrompt] = useState(false);




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
      slideAnim.setValue(moderateScale(300));
    }
  }, [menuClosedByOutside, menuOpen, slideAnim, moderateScale]);

  // Location permission function
  // Request location permission - native dialog only
  const handleLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        console.log('✅ Location permission granted');
        // Get current location and store it
        await getCurrentLocationAndStore();
      } else {
        console.log('❌ Location permission denied');
      }
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const requestLocationPermission = async () => {
    try {
      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      
      if (!isLocationEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to continue.',
          [
            { text: 'Open Settings', onPress: () => Location.enableNetworkProviderAsync() }
          ]
        );
        return false;
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to show your location to customers and find nearby jobs. Please grant location permission to continue.',
          [
            { text: 'Grant Permission', onPress: () => requestLocationPermission() }
          ]
        );
        return false;
      }

      // If permission granted, get current location and store it
      await getCurrentLocationAndStore();
      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      Alert.alert('Error', 'Failed to request location permission. Please try again.');
      return false;
    }
  };

  // Function to get current location and store it
  const getCurrentLocationAndStore = async () => {
    try {
      // Check if we have worker ID (use authenticated user's ID if available)
      const workerId = user?.id || id;
      if (!workerId) {
        return;
      }

      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        console.log('Location services are disabled, skipping location fetch');
        return;
      }

      // Check if location permission is granted first
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted, skipping location fetch');
        return;
      }

      // Enable network provider for better location accuracy
      await Location.enableNetworkProviderAsync();

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      
      // Store location in database
      await storeWorkerLocation(latitude, longitude);
      
    } catch (error) {
      // Handle different types of location errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Don't show alerts for common permission/service issues
        if (errorMessage.includes('not authorized') || 
            errorMessage.includes('permission') ||
            errorMessage.includes('location services are disabled') ||
            errorMessage.includes('location is unavailable') ||
            errorMessage.includes('timeout')) {
          console.log('Location error (handled silently):', error.message);
          return;
        }
      }
      
      console.error('Error getting current location:', error);
      // Only show alert for unexpected errors
      if (error instanceof Error && !error.message.toLowerCase().includes('location is unavailable')) {
        Alert.alert('Location Error', 'Failed to get current location. Please try again.');
      }
    }
  };

  // Function to store worker location in database
  const storeWorkerLocation = async (latitude: number, longitude: number) => {
    try {
      // Use authenticated user's ID if available, otherwise use params
      const workerId = user?.id || id;
      if (!workerId) {
        return;
      }

      const response = await fetch(API_ENDPOINTS.WORKER_LOCATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worker_id: parseInt(workerId as string),
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to store location:', data.message);
      }
    } catch (error) {
      console.error('Error storing location:', error);
    }
  };

  // Function to check if location permissions are already granted
  const checkLocationPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  };

  // Function to check if notification permissions are already granted
  const checkNotificationPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  };

  // Function to check if display over apps permission is already granted
  const checkDisplayOverAppsPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        // Always return false for Android to show the prompt
        // This ensures users can enable the permission if they disabled it
        return false;
      }
      // For iOS, this permission doesn't exist, so return true
      return true;
    } catch (error) {
      console.error('Error checking display over apps permission:', error);
      return false;
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  // Fetch worker data when component mounts
  useEffect(() => {
    if (id) {
      fetchWorkerData();
    } else {
      findWorkerDynamically();
    }
  }, [id, name, email, user?.id, user?.name, user?.email]);

  // Check location services when component mounts
  useEffect(() => {
    const checkLocationServicesOnMount = async () => {
      try {
        // Wait a bit for worker data to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        
        if (!isLocationEnabled) {
          requestLocationPermission();
        } else {
          // If location services are enabled, directly try to get location
          await getCurrentLocationAndStore();
        }
      } catch (error) {
        console.error('Error checking location services on mount:', error);
      }
    };

    checkLocationServicesOnMount();
  }, []);

  // Check location services status every time the component becomes active
  useEffect(() => {
    const checkLocationServices = async () => {
      try {
        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
          requestLocationPermission();
        } else {
          // Check permission before trying to get location
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            await getCurrentLocationAndStore();
          } else {
            console.log('Location services enabled but permission not granted');
          }
        }
      } catch (error) {
        console.error('Error checking location services:', error);
      }
    };

    // Check location services when component mounts
    checkLocationServices();

    // Set up interval to check location services periodically
    const interval = setInterval(checkLocationServices, 5000); // Check every 5 seconds

    // Listen for app state changes (when app comes to foreground)
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkLocationServices();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, []);

  // Fetch bookings when worker data is available or when user is authenticated
  useEffect(() => {
    if (worker?.id || user?.id) {
      fetchBookings();
    }
  }, [worker, user?.id]);



  // Store location when worker data is loaded
  useEffect(() => {
    if (worker?.id) {
      const checkAndStoreLocation = async () => {
        try {
          const isLocationEnabled = await Location.hasServicesEnabledAsync();
          if (isLocationEnabled) {
            // Check permission before trying to get location
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
              await getCurrentLocationAndStore();
            } else {
              console.log('Location services enabled but permission not granted');
            }
          }
        } catch (error) {
          console.error('Error checking location after worker load:', error);
        }
      };
      
      // Small delay to ensure everything is ready
      setTimeout(checkAndStoreLocation, 1000);
    }
  }, [worker]);

  // Show notification permission prompt after worker data is loaded
  useEffect(() => {
    if (worker && !loading) {
      // Check permissions before showing prompts
      const checkAndShowPrompts = async () => {
        try {
          const hasLocationPermission = await checkLocationPermissions();
          const hasNotificationPermission = await checkNotificationPermissions();
          const hasDisplayOverAppsPermission = await checkDisplayOverAppsPermission();
          
          console.log('Permission status:', {
            location: hasLocationPermission,
            notification: hasNotificationPermission,
            displayOverApps: hasDisplayOverAppsPermission
          });
          
          // Step 1: Request location permission first
          if (!hasLocationPermission) {
            setTimeout(async () => {
              const locationGranted = await handleLocationPermission();
              
              // Step 2: After location, request notification permission
              if (locationGranted && !hasNotificationPermission) {
                setTimeout(() => {
                  handleNotificationPermission();
                }, 500);
              }
            }, 2000);
          } 
          // If location already granted, request notification permission
          else if (!hasNotificationPermission) {
            setTimeout(() => {
              handleNotificationPermission();
            }, 2000);
          } 
          // If both location and notification are granted, show display over apps prompt
          else if (!hasDisplayOverAppsPermission && Platform.OS === 'android') {
            setTimeout(() => {
              setShowDisplayOverAppsPrompt(true);
            }, 2000);
          }
        } catch (error) {
          console.error('Error checking permissions:', error);
        }
      };
      
      checkAndShowPrompts();
    }
  }, [worker, loading]);

  const findWorkerDynamically = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.WORKERS);
      const result = await response.json();
      
      if (result.success && result.data) {
        let foundWorker = null;
        
        // First try to find by email (more precise)
        if (email) {
          foundWorker = result.data.find((w: Worker) => 
            w.email.toLowerCase() === (typeof email === 'string' ? email.toLowerCase() : '')
          );
          if (foundWorker) {
            console.log('Found worker by email');
          }
        }
        
        // If not found by email, try by name
        if (!foundWorker && name) {
          foundWorker = result.data.find((w: Worker) => 
            w.name.toLowerCase() === (typeof name === 'string' ? name.toLowerCase() : '')
          );
          if (foundWorker) {
            console.log('Found worker by name');
          }
        }
        
        if (foundWorker) {
          // Now fetch the complete worker data including documents
          const completeWorkerResponse = await fetch(API_ENDPOINTS.WORKER_BY_ID(foundWorker.id));
          const completeWorkerResult = await completeWorkerResponse.json();
          
          if (completeWorkerResult.success && completeWorkerResult.data) {
            const completeWorker = completeWorkerResult.data;
            
            // Handle profile image URL
            if (completeWorker.profile_image && !completeWorker.profile_image.startsWith('http')) {
              const baseUrl = getBaseUrl().replace('/api', '');
              const fullImageUrl = `${baseUrl}${completeWorker.profile_image}`;
              completeWorker.profile_image = fullImageUrl;
            }
            
            setWorker(completeWorker);
          } else {
            // Fallback to basic worker data if complete fetch fails
            if (foundWorker.profile_image && !foundWorker.profile_image.startsWith('http')) {
              const baseUrl = getBaseUrl().replace('/api', '');
              const fullImageUrl = `${baseUrl}${foundWorker.profile_image}`;
              foundWorker.profile_image = fullImageUrl;
            }
            setWorker(foundWorker);
          }
        } else {
          console.log('Worker not found in dynamic search');
        }
      }
    } catch (error) {
      console.error('Error in findWorkerDynamically:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerData = async () => {
    try {
      setLoading(true);
      // Use authenticated user's ID if available, otherwise use params
      const workerId = user?.id || id;
      if (!workerId) {
        console.log('No worker ID available');
        setLoading(false);
        return;
      }
      
      const apiUrl = API_ENDPOINTS.WORKER_BY_ID(workerId as string);
      const response = await fetch(apiUrl);
      const result = await response.json();
            
      if (result.success && result.data) {
        const workerData = result.data;

        if (workerData.profile_image && !workerData.profile_image.startsWith('http')) {
          // If profile_image is a relative path, construct the full URL
          const baseUrl = getBaseUrl().replace('/api', '');
          const fullImageUrl = `${baseUrl}${workerData.profile_image}`;
          workerData.profile_image = fullImageUrl;
        }
        setWorker(workerData);
      } else {
        console.log('Worker data not found');
      }
    } catch (error) {
      console.error('Error fetching worker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    // Use authenticated user's ID if available, otherwise use worker ID
    const workerId = user?.id || worker?.id;
    if (!workerId) return;
    
    try {
      setBookingsLoading(true);
      // Ensure workerId is converted to string for the API call
      const workerIdString = String(workerId);
      const statusParam = selectedStatus === 'all' ? '' : `?status=${selectedStatus}`;
      const response = await fetch(API_ENDPOINTS.BOOKINGS_BY_WORKER(workerIdString) + statusParam);
      const result = await response.json();
      
      if (result.success && result.data) {
        setBookings(result.data);
        setLastRefreshed(new Date());
      } else {
        setBookings([]);
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
      setLastRefreshed(new Date());
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleRefreshBookings = () => {
    fetchBookings();
  };

  const showRejectPopup = (bookingId: number) => {
    setRejectingBookingId(bookingId);
    setRejectReason('');
    setRejectPopupVisible(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectingBookingId || !rejectReason.trim()) {
      return; // Don't submit if no reason provided
    }

    try {
      // Update booking status to 3 (Rejected) with rejection reason
      const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(rejectingBookingId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 3,
          reject_reason: rejectReason.trim()
        }),
      });

      if (response.ok) {
        // Update local state immediately
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === rejectingBookingId 
              ? { ...booking, status: 3 }
              : booking
          )
        );
        
        // Close popup and reset state
        setRejectPopupVisible(false);
        setRejectReason('');
        setRejectingBookingId(null);
        
        // Refresh bookings to show updated status
        fetchBookings();
      } else {
        console.error('Failed to reject booking');
      }
    } catch (error) {
      console.error(`Error rejecting booking:`, error);
    }
  };

  const closeRejectPopup = () => {
    setRejectPopupVisible(false);
    setRejectReason('');
    setRejectingBookingId(null);
  };

  // Handle notification permission
  const handleNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Check if display over apps permission is also needed
        const hasDisplayOverAppsPermission = await checkDisplayOverAppsPermission();
        if (!hasDisplayOverAppsPermission && Platform.OS === 'android') {
          // Show display over apps prompt after notification permission
          setTimeout(() => {
            setShowDisplayOverAppsPrompt(true);
          }, 500);
        }
      } else {
        console.log('❌ Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Handle display over apps permission
  const handleDisplayOverAppsPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        // Open Android settings for display over other apps
        Linking.openSettings();
      }
      setShowDisplayOverAppsPrompt(false);
    } catch (error) {
      console.error('Error handling display over apps permission:', error);
      setShowDisplayOverAppsPrompt(false);
    }
  };

  // Function to close display over apps prompt
  const closeDisplayOverAppsPrompt = async () => {
    try {
      setShowDisplayOverAppsPrompt(false);
    } catch (error) {
      console.error('Error closing display over apps prompt:', error);
      setShowDisplayOverAppsPrompt(false);
    }
  };


  const handleBookingAction = async (bookingId: number, action: 'accept' | 'reject' | 'complete') => {
    try {
      if (action === 'accept') {
        // Update booking status to 1 (Accepted)
        const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(bookingId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 1 }),
        });

        if (response.ok) {
          // Update local state immediately
          setBookings(prevBookings => 
            prevBookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: 1 }
                : booking
            )
          );
          // Refresh bookings to show updated status
          fetchBookings();
        } else {
          console.error('Failed to accept booking');
        }
      } else if (action === 'reject') {
        // Update booking status to 3 (Rejected)
        const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(bookingId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 3 }),
        });

        if (response.ok) {
          // Update local state immediately
          setBookings(prevBookings => 
            prevBookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: 3 }
                : booking
            )
          );
          // Refresh bookings to show updated status
          fetchBookings();
        } else {
          console.error('Failed to reject booking');
        }
      } else if (action === 'complete') {
        // Update booking status to 2 (Completed)
        const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(bookingId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 2 }),
        });

        if (response.ok) {
          // Update local state immediately
          setBookings(prevBookings => 
            prevBookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: 2 }
                : booking
            )
          );
          // Refresh bookings to show updated status
          fetchBookings();
        } else {
          console.error('Failed to complete booking');
        }
      }
    } catch (error) {
      console.error(`Error updating booking status:`, error);
    }
  };

  // Function to fetch all bookings for the worker
  const fetchAllBookings = async () => {
    // Use authenticated user's ID if available, otherwise use worker ID
    const workerId = user?.id || worker?.id;
    if (!workerId) return;
    
    try {
      setBookingsLoading(true);
      const workerIdString = String(workerId);
      // Use the new API endpoint for total bookings
      const response = await fetch(API_ENDPOINTS.TOTAL_BOOKINGS_BY_WORKER(workerIdString));
      const result = await response.json();
      
      if (result.success && result.data) {
        setBookings(result.data);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Function to handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'notifications') {
      // Show pending and missed bookings (status = 0, 4)
      fetchBookings();
    } else if (tab === 'totalBookings') {
      // Show all bookings (including missed bookings)
      fetchAllBookings();
    } else if (tab === 'paymentHistory') {
      // TODO: Implement payment history
      console.log('Payment History tab clicked');
    } else if (tab === 'customerCare') {
      // TODO: Implement customer care
      console.log('Customer Care tab clicked');
    }
  };

  // Function to handle edit profile
  const handleEditProfile = async () => {
    try {
      closeMenu();
      
      if (!worker) {
        return;
      }

      // Use the worker data we already have
      const workerDataForEdit = {
        id: worker.id,
        name: worker.name,
        mobile: worker.mobile,
        email: worker.email,
        price: worker.price,
        profile_image: worker.profile_image,
        skill_id: worker.skill_id,
        pincode: worker.pincode,
        district: worker.district,
        state: worker.state,
        country: worker.country,
        address: worker.address,
        latitude: worker.latitude,
        longitude: worker.longitude,
        city: worker.city,
        mandal: worker.mandal,
        document1: worker.document1,
        document2: worker.document2
      };

      // Check data size before navigation
      const workerDataString = JSON.stringify(workerDataForEdit);
      
      // Navigate to editprofessional with worker data
      router.push({
        pathname: '/editprofessional',
        params: {
          mode: 'edit',
          workerData: workerDataString,
          workerId: worker.id
        }
      });
    } catch (error) {
    }
  };

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
      toValue: moderateScale(300),
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
    slideAnim.setValue(moderateScale(300));
  };

  const handleLogout = async () => {
    try {
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

  // Function to handle attachment download
  const handleDownloadAttachment = async (filePath: string, index: number) => {
    try {
      // Construct full URL for the file
      const baseUrl = getBaseUrl().replace('/api', '');
      const fullUrl = filePath.startsWith('http') ? filePath : `${baseUrl}${filePath}`;
      
      Alert.alert(
        'Download Attachment',
        `Download ${filePath.includes('.mp4') || filePath.includes('.mov') || filePath.includes('.avi') || filePath.includes('.mkv') ? 'Video' : 'Photo'} ${index + 1}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Download',
            onPress: () => downloadFile(fullUrl, filePath),
          },
        ]
      );
    } catch (error) {
      console.error('Error preparing download:', error);
      Alert.alert('Error', 'Failed to prepare download');
    }
  };

  // Function to download file
  const downloadFile = async (url: string, originalPath: string) => {
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permission to download files');
        return;
      }

      // Extract filename from path
      const fileName = originalPath.split('/').pop() || `attachment_${Date.now()}`;
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Create download path
      const downloadPath = `${FileSystem.documentDirectory}${fileName}`;
      
      // Show loading alert
      Alert.alert('Downloading', 'Please wait while the file is being downloaded...');
      
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(url, downloadPath);
      
      if (downloadResult.status === 200) {
        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        
        // Create album if it doesn't exist
        let album = await MediaLibrary.getAlbumAsync('OriginX Downloads');
        if (!album) {
          album = await MediaLibrary.createAlbumAsync('OriginX Downloads', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
        
        Alert.alert(
          'Download Complete',
          `File saved to gallery in "OriginX Downloads" album`,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Download Failed',
        'Unable to download the file. Please check your internet connection and try again.',
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    }
  };

  // Show loading screen while checking authentication
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: moderateScale(18), color: '#666' }}>Redirecting to login...</Text>
      </View>
    );
  }

  // Show loading screen while worker data is being fetched
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: moderateScale(18), color: '#666' }}>Loading worker data...</Text>
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        {/* Header - Fixed outside ScrollView */}
        <TouchableWithoutFeedback onPress={menuOpen ? forceCloseMenu : undefined}>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft} />
            <Image
              source={require('@/assets/images/OriginX.png')}
              style={styles.mainlogo}
              contentFit="contain"
            />
            <TouchableOpacity style={styles.personButton} onPress={toggleMenu}>
              <Ionicons style={styles.personicon} name="person-circle-outline" size={moderateScale(28)} color="black" />
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
                    <Ionicons name="notifications" size={moderateScale(24)} color="#3498db" />
                    <Text style={styles.bookingsTitle}>
                      {activeTab === 'notifications' ? 'Notifications & Missed' : 'Total Bookings'}
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
                      <View key={booking.id} style={styles.bookingCard}>
                        <View style={styles.bookingHeader}>
                          <Text style={styles.bookingId}>#{booking.booking_id}</Text>
                                                      <View style={[
                              styles.statusBadge,
                              booking.status === 0 && styles.statusBadgePending,
                              booking.status === 1 && styles.statusBadgeActive,
                              booking.status === 2 && styles.statusBadgeCompleted,
                              booking.status === 3 && styles.statusBadgeCancelled,
                              booking.status === 4 && styles.statusBadgeMissed
                            ]}>
                              <Text style={[
                                styles.statusText,
                                booking.status === 0 && styles.statusTextPending,
                                booking.status === 1 && styles.statusTextActive,
                                booking.status === 2 && styles.statusTextCompleted,
                                booking.status === 3 && styles.statusTextCancelled,
                                booking.status === 4 && styles.statusTextMissed
                              ]}>
                                                                 {booking.status === 0 ? 'Pending' : 
                                  booking.status === 1 ? 'Active' : 
                                  booking.status === 2 ? 'Completed' : 
                                  booking.status === 3 ? (booking.reject_reason ? 'Rejected' : 'Cancelled') : 
                                  booking.status === 4 ? 'Missed' : 
                                  `Status ${booking.status}`}
                              </Text>
                            </View>
                        </View>
                        
                        <View style={styles.bookingDetails}>
                          <View style={styles.bookingRow}>
                            <Ionicons name="person" size={moderateScale(16)} color="#666" />
                            <Text style={styles.bookingLabel}>Customer: </Text>
                            <Text style={styles.bookingValue}>
                              {booking.user_name || `User #${booking.user_id}`}
                            </Text>
                          </View>
                          
                          <View style={styles.bookingRow}>
                            <Ionicons name="call" size={moderateScale(16)} color="#666" />
                            <Text style={styles.bookingLabel}>Contact: </Text>
                            <Text style={styles.bookingValue}>
                              {booking.contact_number || 'N/A'}
                            </Text>
                          </View>
                          
                          <View style={styles.bookingRow}>
                            <Ionicons name="calendar" size={moderateScale(16)} color="#666" />
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
                          
                          {/* Work Location Row */}
                          {booking.work_location && (
                            <View style={styles.bookingRow}>
                              <Ionicons name="location" size={moderateScale(16)} color="#666" />
                              <Text style={styles.bookingLabel}>Work Location: </Text>
                              <Text style={styles.bookingValue}>
                                {booking.work_location}
                              </Text>
                            </View>
                          )}
                          
                          {/* Description Row */}
                          {booking.description && (
                            <View style={styles.bookingRow}>
                              <Ionicons name="document-text" size={moderateScale(18)} color="#666" />
                              <Text style={styles.bookingLabel}>Requirements: </Text>
                              <Text style={styles.bookingValue}>
                                {booking.description}
                              </Text>
                            </View>
                          )}
                          
                          {/* Work Documents Row */}
                          {booking.work_documents && (
                            <View style={styles.bookingRow}>
                              <Ionicons name="attach" size={moderateScale(24)} color="#666" />
                              <Text style={styles.bookingLabel}>Attachments: </Text>
                              <View style={styles.attachmentsContainer}>
                                {booking.work_documents.split(',').map((docPath, index) => (
                                  <TouchableOpacity 
                                    key={index} 
                                    style={styles.attachmentItem}
                                    onPress={() => handleDownloadAttachment(docPath.trim(), index)}
                                  >
                                    <Ionicons 
                                      name={docPath.includes('.mp4') || docPath.includes('.mov') || docPath.includes('.avi') || docPath.includes('.mkv') ? "videocam" : "image"} 
                                      size={moderateScale(14)} 
                                      color="#3498db" 
                                    />
                                    <Text style={styles.attachmentText}>
                                      {docPath.includes('.mp4') || docPath.includes('.mov') || docPath.includes('.avi') || docPath.includes('.mkv') ? 'Video' : 'Photo'} {index + 1}
                                    </Text>
                                    <Ionicons name="download" size={moderateScale(12)} color="#3498db" />
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          )}
                          
                          {/* Dynamic Action Buttons */}
                          <View style={styles.bookingActions}>
                            {booking.status === 0 ? (
                              // Show Accept/Reject for pending bookings
                              <>
                                <TouchableOpacity 
                                  style={[styles.actionButton, styles.acceptButton]}
                                  onPress={() => handleBookingAction(booking.id, 'accept')}
                                >
                                  <Ionicons name="checkmark" size={moderateScale(16)} color="#ffffff" />
                                  <Text style={styles.actionButtonText}>Accept</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                  style={[styles.actionButton, styles.rejectButton]}
                                  onPress={() => showRejectPopup(booking.id)}
                                >
                                  <Ionicons name="close" size={moderateScale(16)} color="#ffffff" />
                                  <Text style={styles.actionButtonText}>Reject</Text>
                                </TouchableOpacity>
                              </>
                            ) : booking.status === 1 ? (
                              // Show Complete button for active bookings
                              <TouchableOpacity 
                                style={[styles.actionButton, styles.completeButton, styles.completeButtonFull]}
                                onPress={() => handleBookingAction(booking.id, 'complete')}
                              >
                                <Ionicons name="checkmark-circle" size={moderateScale(18)} color="#ffffff" />
                                <Text style={styles.actionButtonText}>Complete Job</Text>
                              </TouchableOpacity>
                            ) : (
                              // Show status info for other statuses
                                                             <View style={styles.statusInfoContainer}>
                                 <Text style={styles.statusInfoText}>
                                   {booking.status === 2 ? 'Job completed successfully!' : 
                                    booking.status === 3 ? (booking.reject_reason ? `Rejected: ${booking.reject_reason}` : 'Booking was cancelled') : 
                                    booking.status === 4 ? 'You missed this booking - someone else accepted it' : 
                                    'Status updated'}
                                 </Text>
                               </View>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noBookings}>
                    <Ionicons name="checkmark-circle" size={moderateScale(48)} color="#e5e7eb" />
                    <Text style={styles.noBookingsText}>No notifications</Text>
                    <Text style={styles.noBookingsSubtext}>You're all caught up!</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
        
        {/* Bottom Navigation Icons */}
        <TouchableWithoutFeedback onPress={menuOpen ? forceCloseMenu : undefined}>
          <View style={styles.bottomNavigation}>
            <TouchableOpacity 
              style={styles.bottomNavItem} 
              onPress={() => handleTabChange('notifications')}
            >
              <Ionicons 
                name="notifications" 
                size={moderateScale(24)} 
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
                size={moderateScale(24)} 
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
                size={moderateScale(24)} 
                color={activeTab === 'paymentHistory' ? '#4CAF50' : '#9CA3AF'} 
              />
              <Text style={[
                styles.bottomNavText,
                activeTab === 'paymentHistory' && styles.bottomNavTextActive
              ]}>
                Payment History
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomNavItem} 
              onPress={() => handleTabChange('customerCare')}
            >
              <Ionicons 
                name="headset" 
                size={moderateScale(24)} 
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
                  {worker?.profile_image ? (
                    <>
                      <Image
                        source={{ uri: worker.profile_image }}
                        style={styles.profileImage}
                        contentFit="cover"
                        onError={(error) => {
                        }}
                        onLoad={() => console.log('✅ Image loaded successfully:', worker.profile_image)}
                        placeholder={require('@/assets/images/OriginX.png')}
                        transition={200}
                      />
                    </>
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Text style={styles.profileInitials}>
                        {typeof name === 'string' ? name.charAt(0).toUpperCase() : 'W'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.workerName}>{name}</Text>
              </View>

              {/* Menu Divider */}
              <View style={styles.menuDivider} />

              {/* Menu Items */}
              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="create-outline" size={moderateScale(24)} color="#3498db" />
                  </View>
                  <Text style={styles.menuText}>Edit Profile</Text>
                  <Ionicons name="chevron-forward" size={moderateScale(16)} color="#9ca3af" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="log-out-outline" size={moderateScale(24)} color="#ef4444" />
                  </View>
                  <Text style={styles.menuText}>Logout</Text>
                  <Ionicons name="chevron-forward" size={moderateScale(16)} color="#9ca3af" />
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

          {/* Rejection Reason Popup */}
          {rejectPopupVisible && (
            <View style={styles.popupOverlay}>
              <View style={styles.popupContainer}>
                <View style={styles.popupHeader}>
                  <Text style={styles.popupTitle}>Reason for Rejection</Text>
                  <TouchableOpacity onPress={closeRejectPopup} style={styles.closeButton}>
                    <Ionicons name="close" size={moderateScale(24)} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.popupContent}>
                  <Text style={styles.popupLabel}>Please provide a reason for rejecting this booking:</Text>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Enter rejection reason..."
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
                
                <View style={styles.popupActions}>
                  <TouchableOpacity 
                    style={[styles.popupButton, styles.cancelButton]} 
                    onPress={closeRejectPopup}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.popupButton, styles.submitButton]} 
                    onPress={handleRejectSubmit}
                    disabled={!rejectReason.trim()}
                  >
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Display Over Apps Permission Prompt */}
          {showDisplayOverAppsPrompt && (
            <View style={styles.permissionOverlay}>
              <View style={styles.permissionContainer}>
                <View style={styles.permissionHeader}>
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={closeDisplayOverAppsPrompt}
                  >
                    <Ionicons name="close" size={moderateScale(24)} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.permissionContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="phone-portrait" size={moderateScale(48)} color="#FF6B35" />
                  </View>
                  
                  <Text style={styles.permissionTitle}>Display Over Other Apps</Text>
                  
                  <Text style={styles.permissionDescription}>
                    Allow OriginX to display over other apps so you can see urgent booking notifications even when using other applications.
                  </Text>
                  
                  <View style={styles.benefitsList}>
                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#4CAF50" />
                      <Text style={styles.benefitText}>See notifications over other apps</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#4CAF50" />
                      <Text style={styles.benefitText}>Never miss important alerts</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#4CAF50" />
                      <Text style={styles.benefitText}>Quick access to booking details</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.permissionActions}>
                  <TouchableOpacity 
                    style={styles.allowButton} 
                    onPress={handleDisplayOverAppsPermission}
                  >
                    <Ionicons name="checkmark" size={moderateScale(20)} color="#ffffff" />
                    <Text style={styles.allowButtonText}>Allow</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '100%' }]} />
                </View>
              </View>
            </View>
          )}

      </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const createStyles = (width: number, height: number, scale: number, moderateScale: (size: number, factor?: number) => number, isLargeScreen: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  innerContainer: {
    padding: moderateScale(20),
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: moderateScale(100),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(12, 0.3),
    paddingTop: moderateScale(40, 0.3),
    paddingBottom: moderateScale(6),
    backgroundColor: '#A1CEDC',
    marginTop: moderateScale(-40, 0.3),
  },
  headerLeft: {
    width: moderateScale(38),
  },
  mainlogo: {
    height: moderateScale(45),
    width: isLargeScreen ? '35%' : '45%',
    maxWidth: moderateScale(180),
    marginLeft: isLargeScreen ? '-42%' : '-52%',
  },
  personButton: {
    padding: moderateScale(5),
  },
  personicon: {
    marginLeft: moderateScale(-10),
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    width: isLargeScreen ? moderateScale(350) : moderateScale(300),
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(12),
    elevation: 8,
    borderTopLeftRadius: moderateScale(20),
    borderBottomLeftRadius: moderateScale(20),
    zIndex: 1001,
  },
  menuContent: {
    flex: 1,
    paddingTop: moderateScale(20),
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: moderateScale(20),
    paddingHorizontal: moderateScale(20),
    backgroundColor: '#667eea',
    borderTopLeftRadius: moderateScale(20),
    position: 'relative',
    overflow: 'hidden',
    marginTop: moderateScale(-60, 0.3),
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: moderateScale(5),
    marginTop: moderateScale(40, 0.3),
  },
  profileImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: moderateScale(4),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileImagePlaceholder: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: moderateScale(4),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInitials: {
    fontSize: moderateScale(36),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  workerName: {
    fontSize: moderateScale(22),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: moderateScale(5),
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: moderateScale(20),
    marginVertical: moderateScale(10),
  },
  menuItems: {
    flex: 1,
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(20),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: moderateScale(18),
    paddingHorizontal: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderRadius: moderateScale(12),
    marginBottom: moderateScale(8),
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemIcon: {
    marginRight: moderateScale(12),
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: moderateScale(16),
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: moderateScale(20),
    paddingBottom: moderateScale(30),
    paddingTop: moderateScale(20),
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 'auto',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: moderateScale(15),
    backgroundColor: '#f8fafc',
    borderRadius: moderateScale(12),
  },
  versionText: {
    fontSize: moderateScale(12),
    color: '#9ca3af',
    fontWeight: '500',
  },
  bookingsSection: {
    marginTop: moderateScale(2),
  },
  bookingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(10),
    marginTop: moderateScale(-10),
  },
  bookingsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: isLargeScreen ? moderateScale(120) : moderateScale(95),
  },
  bookingsTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: moderateScale(10),
  },
  bookingsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingCount: {
    backgroundColor: '#3498db',
    borderRadius: moderateScale(15),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(5),
    marginRight: moderateScale(20),
  },
  bookingCountText: {
    color: '#ffffff',
    fontSize: moderateScale(14),
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(20),
  },
  loadingText: {
    fontSize: moderateScale(16),
    color: '#666',
  },
  bookingsList: {
    // Add styles for the list of bookings if needed
  },
  bookingCard: {
    backgroundColor: '#ebeef1ff',
    borderRadius: moderateScale(10),
    padding: moderateScale(15),
    marginBottom: moderateScale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginLeft: moderateScale(-5),
    marginRight: moderateScale(-5),
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(8),
  },
  bookingId: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    borderRadius: moderateScale(20),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    minWidth: moderateScale(80),
    alignItems: 'center',
  },
  statusBadgePending: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  statusBadgeActive: {
    backgroundColor: '#d1ecf1',
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  statusBadgeCompleted: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  statusBadgeCancelled: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  statusBadgeMissed: {
    backgroundColor: '#e2e3e5',
    borderWidth: 1,
    borderColor: '#d6d8db',
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: '#856404',
  },
  statusTextActive: {
    color: '#0c5460',
  },
  statusTextCompleted: {
    color: '#155724',
  },
  statusTextCancelled: {
    color: '#721c24',
  },
  statusTextMissed: {
    color: '#495057',
  },
  bookingDetails: {
    // Add styles for the details of the booking if needed
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(5),
  },
  bookingLabel: {
    fontSize: moderateScale(14),
    color: '#666',
    marginLeft: moderateScale(5),
  },
  bookingValue: {
    fontSize: moderateScale(14),
    color: '#333',
    fontWeight: '500',
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: moderateScale(10),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(15),
    borderRadius: moderateScale(8),
    marginHorizontal: moderateScale(5),
    alignSelf: 'stretch',
  },
  acceptButton: {
    backgroundColor: '#4CAF50', // Green
  },
  rejectButton: {
    backgroundColor: '#F44336', // Red
  },
  completeButton: {
    backgroundColor: '#2196F3', // Blue
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    marginLeft: moderateScale(5),
  },
  noBookings: {
    alignItems: 'center',
    paddingVertical: moderateScale(30),
  },
  noBookingsText: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#333',
    marginTop: moderateScale(10),
  },
  noBookingsSubtext: {
    fontSize: moderateScale(14),
    color: '#666',
    marginTop: moderateScale(5),
  },
  lastRefreshedText: {
    fontSize: moderateScale(12),
    color: '#666',
    textAlign: 'center',
    marginTop: moderateScale(5),
    fontStyle: 'italic',
  },
  completeButtonFull: {
    flex: 1,
    maxWidth: '100%',
    marginHorizontal: 0,
  },
  statusInfoContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: moderateScale(12),
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusInfoText: {
    fontSize: moderateScale(14),
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: moderateScale(15),
    paddingHorizontal: moderateScale(20),
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  bottomNavItem: {
    alignItems: 'center',
    flex: 1,
  },
  bottomNavText: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginTop: moderateScale(5),
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomNavTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  
  // Popup Styles
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContainer: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    margin: moderateScale(20),
    width: '90%',
    maxWidth: isLargeScreen ? moderateScale(450) : moderateScale(400),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(20),
  },
  popupTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: moderateScale(5),
  },
  popupContent: {
    marginBottom: moderateScale(20),
  },
  popupLabel: {
    fontSize: moderateScale(16),
    color: '#666',
    marginBottom: moderateScale(12),
    lineHeight: moderateScale(22),
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    fontSize: moderateScale(16),
    minHeight: moderateScale(100),
    textAlignVertical: 'top',
    backgroundColor: '#f9f9f9',
  },
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: moderateScale(12),
  },
  popupButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  
  // New styles for attachments
  attachmentsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: moderateScale(5),
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
    marginRight: moderateScale(8),
    marginBottom: moderateScale(4),
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  attachmentText: {
    fontSize: moderateScale(12),
    color: '#3498db',
    marginLeft: moderateScale(4),
    marginRight: moderateScale(4),
    fontWeight: '500',
  },
  // Menu backdrop style
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  
  // Permission prompt styles
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  permissionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    margin: moderateScale(20),
    width: '90%',
    maxWidth: isLargeScreen ? moderateScale(450) : moderateScale(400),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(16),
    elevation: 16,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(20),
  },
  stepIndicator: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(15),
  },
  stepText: {
    fontSize: moderateScale(12),
    fontWeight: 'bold',
    color: '#666',
  },
  permissionContent: {
    alignItems: 'center',
    marginBottom: moderateScale(24),
  },
  iconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  permissionTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: moderateScale(12),
  },
  permissionDescription: {
    fontSize: moderateScale(16),
    color: '#666',
    textAlign: 'center',
    lineHeight: moderateScale(24),
    marginBottom: moderateScale(20),
  },
  benefitsList: {
    width: '100%',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(8),
    paddingHorizontal: moderateScale(8),
  },
  benefitText: {
    fontSize: moderateScale(14),
    color: '#333',
    marginLeft: moderateScale(8),
    flex: 1,
  },
  permissionActions: {
    marginBottom: moderateScale(16),
  },
  allowButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(24),
    borderRadius: moderateScale(12),
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  allowButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    marginLeft: moderateScale(8),
  },
  progressBar: {
    height: moderateScale(4),
    backgroundColor: '#e0e0e0',
    borderRadius: moderateScale(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: moderateScale(2),
  },
});