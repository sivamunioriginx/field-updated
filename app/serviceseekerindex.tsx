import { API_ENDPOINTS, default as getBaseUrl } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
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
  payment_status?: number;
  created_at: string;
  worker_name?: string;
  worker_mobile?: string;
  reject_reason?: string;
  cancel_status?: number;
  cancel_type?: number;
  cancel_reason?: string;
  canceled_date?: string;
  reschedule_status?: number;
  reschedule_type?: number;
  reschedule_reason?: string;
  reschedule_date?: string;
}

interface Payment {
  id: number;
  payment_id: string;
  amount: number;
  booking_id: string;
  description: string;
  payment_date: string;
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('notifications');
  
  // Reschedule and Cancel popup states
  const [reschedulePopupVisible, setReschedulePopupVisible] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  
  const [cancelPopupVisible, setCancelPopupVisible] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  
  // Animation refs for loading dots
  const rescheduleDotAnim1 = useRef(new Animated.Value(0)).current;
  const rescheduleDotAnim2 = useRef(new Animated.Value(0)).current;
  const rescheduleDotAnim3 = useRef(new Animated.Value(0)).current;
  const cancelDotAnim1 = useRef(new Animated.Value(0)).current;
  const cancelDotAnim2 = useRef(new Animated.Value(0)).current;
  const cancelDotAnim3 = useRef(new Animated.Value(0)).current;
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

  // Animate loading dots when rescheduleLoading is true
  useEffect(() => {
    const createAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: -8,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);
    };

    if (rescheduleLoading) {
      const anim1 = createAnimation(rescheduleDotAnim1, 0);
      const anim2 = createAnimation(rescheduleDotAnim2, 200);
      const anim3 = createAnimation(rescheduleDotAnim3, 400);
      
      Animated.loop(
        Animated.parallel([anim1, anim2, anim3])
      ).start();
    } else {
      rescheduleDotAnim1.setValue(0);
      rescheduleDotAnim2.setValue(0);
      rescheduleDotAnim3.setValue(0);
    }
  }, [rescheduleLoading]);

  // Animate loading dots when cancelLoading is true
  useEffect(() => {
    const createAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: -8,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);
    };

    if (cancelLoading) {
      const anim1 = createAnimation(cancelDotAnim1, 0);
      const anim2 = createAnimation(cancelDotAnim2, 200);
      const anim3 = createAnimation(cancelDotAnim3, 400);
      
      Animated.loop(
        Animated.parallel([anim1, anim2, anim3])
      ).start();
    } else {
      cancelDotAnim1.setValue(0);
      cancelDotAnim2.setValue(0);
      cancelDotAnim3.setValue(0);
    }
  }, [cancelLoading]);

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
          // Fallback to profile image param
          setProfileImageFromParam();
          // Try to find by name as fallback
          if (initialName) {
            await findServiceSeekerByName(initialName);
          }
        }
      } else {
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
      // Fetch status 1, 2, 5, 6 for Notifications tab
      const apiUrl = `${API_ENDPOINTS.BOOKINGS_BY_USER(userId).split('?')[0]}?status=1,2,5,6`;
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Filter bookings based on status and additional conditions
        const filteredBookings = result.data.filter((booking: Booking) => {
          const status = Number(booking.status);
          const paymentStatus = Number(booking.payment_status);
          
          // Status 1 (Accepted) - show with buttons
          if (status === 1) {
            return paymentStatus === 1;
          }
          
          // Status 2 (In Progress) - show as is
          if (status === 2) {
            return paymentStatus === 1;
          }
          
          // Status 5: Show if cancel_type != 2 AND cancel_status = 0 (Worker cancel requests, not customer)
          if (status === 5) {
            const cancelStatus = booking.cancel_status !== undefined ? Number(booking.cancel_status) : null;
            const cancelType = booking.cancel_type !== undefined ? Number(booking.cancel_type) : null;
            // Show worker-initiated cancel requests (type != 2) with status = 0
            if (cancelStatus === 0 && cancelType !== 2) {
              return paymentStatus === 1;
            }
            // Also show customer cancel requests (type = 2) with status = 0
            if (cancelStatus === 0 && cancelType === 2) {
              return paymentStatus === 1;
            }
            return false;
          }
          
          // Status 6: Show if reschedule_type != 2 AND reschedule_status = 0 (Worker reschedule requests, not customer)
          if (status === 6) {
            const rescheduleStatus = booking.reschedule_status !== undefined ? Number(booking.reschedule_status) : null;
            const rescheduleType = booking.reschedule_type !== undefined ? Number(booking.reschedule_type) : null;
            // Show worker-initiated reschedule requests (type != 2) with status = 0
            if (rescheduleStatus === 0 && rescheduleType !== 2) {
              return paymentStatus === 1;
            }
            // Also show customer reschedule requests (type = 2) with status = 0
            if (rescheduleStatus === 0 && rescheduleType === 2) {
              return paymentStatus === 1;
            }
            return false;
          }
          
          return false;
        });
        
        // Remove duplicates by booking_id, keeping the latest status
        const distinctBookings = filteredBookings.reduce((acc: Booking[], current: Booking) => {
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
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [user?.id, serviceSeeker?.id]);

  // Show Reschedule Popup
  const showReschedulePopup = (booking: Booking) => {
    const now = new Date();
    setReschedulingBooking(booking);
    setRescheduleDate('');
    setRescheduleReason('');
    setRescheduleError('');
    setSelectedDate(now);
    setSelectedTime(now);
    setReschedulePopupVisible(true);
  };

  // Handle Date Change
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type !== 'dismissed' && date) {
      setSelectedDate(date);
      if (Platform.OS === 'android') {
        setTimeout(() => setShowTimePicker(true), 300);
      } else {
        const combined = new Date(date);
        combined.setHours(selectedTime.getHours());
        combined.setMinutes(selectedTime.getMinutes());
        const formatted = combined.toLocaleString("en-GB", {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setRescheduleDate(formatted);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  // Handle Time Change
  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type !== 'dismissed' && date) {
      setSelectedTime(date);
      const combined = new Date(selectedDate);
      combined.setHours(date.getHours());
      combined.setMinutes(date.getMinutes());
      combined.setSeconds(0);
      
      const formatted = combined.toLocaleString("en-GB", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setRescheduleDate(formatted);
      if (rescheduleError) setRescheduleError('');
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async () => {
    if (!reschedulingBooking || !rescheduleDate.trim() || !rescheduleReason.trim()) {
      if (!rescheduleDate.trim()) {
        setRescheduleError('Please select a reschedule date');
      } else if (!rescheduleReason.trim()) {
        setRescheduleError('Please enter a reason for rescheduling');
      } else {
        setRescheduleError('Please fill all required fields');
      }
      return;
    }

    setRescheduleError('');
    setRescheduleLoading(true);
    setRescheduleSuccess(false);

    try {
      const combinedDateTime = new Date(selectedDate);
      combinedDateTime.setHours(selectedTime.getHours());
      combinedDateTime.setMinutes(selectedTime.getMinutes());
      combinedDateTime.setSeconds(0);
      
      const year = combinedDateTime.getFullYear();
      const month = String(combinedDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(combinedDateTime.getDate()).padStart(2, '0');
      const hours = String(combinedDateTime.getHours()).padStart(2, '0');
      const minutes = String(combinedDateTime.getMinutes()).padStart(2, '0');
      const seconds = String(combinedDateTime.getSeconds()).padStart(2, '0');
      
      const rescheduleDateISO = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(reschedulingBooking.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 6,
          reschedule_date: rescheduleDateISO,
          reschedule_reason: rescheduleReason.trim(),
          reschedule_type: 2 // Type 2 = Customer/Service Seeker reschedule
        }),
      });

      if (response.ok) {
        setRescheduleLoading(false);
        setRescheduleSuccess(true);
        
        setTimeout(() => {
          closeReschedulePopup();
          fetchBookings();
        }, 2000);
      } else {
        setRescheduleLoading(false);
        setRescheduleError('Failed to reschedule booking. Please try again.');
      }
    } catch (error) {
      setRescheduleLoading(false);
      setRescheduleError('An error occurred. Please try again.');
      console.error('Error rescheduling booking:', error);
    }
  };

  // Close Reschedule Popup
  const closeReschedulePopup = () => {
    setReschedulePopupVisible(false);
    setRescheduleDate('');
    setRescheduleReason('');
    setReschedulingBooking(null);
    setRescheduleError('');
    setRescheduleLoading(false);
    setRescheduleSuccess(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSelectedDate(new Date());
    setSelectedTime(new Date());
  };

  // Show Cancel Popup
  const showCancelPopup = (booking: Booking) => {
    setCancellingBooking(booking);
    setCancelReason('');
    setCancelPopupVisible(true);
  };

  // Handle Cancel Submit
  const handleCancelSubmit = async () => {
    if (!cancellingBooking || !cancelReason.trim()) {
      setCancelError('Please enter a reason for cancellation');
      return;
    }

    setCancelError('');
    setCancelLoading(true);
    setCancelSuccess(false);

    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_STATUS(cancellingBooking.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 5,
          cancel_reason: cancelReason.trim(),
          cancel_type: 2 // Type 2 = Customer/Service Seeker cancellation
        }),
      });

      if (response.ok) {
        setCancelLoading(false);
        setCancelSuccess(true);
        
        setTimeout(() => {
          closeCancelPopup();
          fetchBookings();
        }, 2000);
      } else {
        setCancelLoading(false);
        setCancelError('Failed to cancel booking. Please try again.');
      }
    } catch (error) {
      setCancelLoading(false);
      setCancelError('An error occurred. Please try again.');
      console.error('Error cancelling booking:', error);
    }
  };

  // Close Cancel Popup
  const closeCancelPopup = () => {
    setCancelPopupVisible(false);
    setCancelReason('');
    setCancellingBooking(null);
    setCancelError('');
    setCancelLoading(false);
    setCancelSuccess(false);
  };

  // Add function to fetch total bookings (status 3,4,5: Completed, Rejected, Canceled)
  const fetchTotalBookings = async () => {
    // Use authenticated user's ID if available, otherwise use serviceSeeker ID
    const userId = user?.id || serviceSeeker?.id;
    if (!userId) {
      return;
    }
    
    try {
      setBookingsLoading(true);
      // Get all bookings with status 1,2,3,4,5,6 to check for status 1,2,6 in same booking_id
      const apiUrl = `${API_ENDPOINTS.TOTAL_BOOKINGS_BY_USER(userId)}?status=1,2,3,4,5,6&skip_payment_check=true`;
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Filter to only include status 1,2,3,4,5,6
        const filteredBookings = result.data.filter((booking: Booking) => {
          const status = Number(booking.status);
          const isValid = status >= 1 && status <= 6;
          if (!isValid) {
            console.log(`❌ Filtered out booking with status ${status} (booking_id: ${booking.booking_id})`);
          }
          return isValid;
        });
        // Group bookings by booking_id
        const bookingsByBookingId = filteredBookings.reduce((acc: { [key: string]: Booking[] }, booking: Booking) => {
          const bookingId = booking.booking_id;
          if (!acc[bookingId]) {
            acc[bookingId] = [];
          }
          acc[bookingId].push(booking);
          return acc;
        }, {});
        
        // Process each booking_id group
        const distinctTotalBookings: Booking[] = [];
        
        Object.keys(bookingsByBookingId).forEach((bookingId) => {
          const bookings = bookingsByBookingId[bookingId];
          
          // Priority order: Status 1 (Accepted) > Status 2 (In Progress) > Status 6 (Rescheduled) > Status 3 (Completed) > Status 5 (Canceled) > Status 4 (Rejected - only if ALL are 4)
          let selectedBooking: Booking | null = null;
          
          // First, check if any record has status 1 (Accepted)
          const status1Bookings = bookings.filter((b: Booking) => Number(b.status) === 1);
          if (status1Bookings.length > 0) {
            selectedBooking = status1Bookings.reduce((latest: Booking, current: Booking) => 
              new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            );
          } else {
            // Check for status 2 (In Progress)
            const status2Bookings = bookings.filter((b: Booking) => Number(b.status) === 2);
            if (status2Bookings.length > 0) {
              selectedBooking = status2Bookings.reduce((latest: Booking, current: Booking) => 
                new Date(current.created_at) > new Date(latest.created_at) ? current : latest
              );
            } else {
              // Check for status 6 (Rescheduled)
              const status6Bookings = bookings.filter((b: Booking) => Number(b.status) === 6);
              if (status6Bookings.length > 0) {
                selectedBooking = status6Bookings.reduce((latest: Booking, current: Booking) => 
                  new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                );
              } else {
                // Check for status 3 (Completed)
                const status3Bookings = bookings.filter((b: Booking) => Number(b.status) === 3);
                if (status3Bookings.length > 0) {
                  selectedBooking = status3Bookings.reduce((latest: Booking, current: Booking) => 
                    new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                  );
                } else {
                  // Check if ALL records have status 4 (Rejected)
                  const allStatus4 = bookings.every((b: Booking) => Number(b.status) === 4);
                  if (allStatus4) {
                    // ALL records have status 4 - it's rejected
                    selectedBooking = bookings.reduce((latest: Booking, current: Booking) => 
                      new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                    );
                  } else {
                    // Check for status 5 (Canceled)
                    const status5Bookings = bookings.filter((b: Booking) => Number(b.status) === 5);
                    if (status5Bookings.length > 0) {
                      selectedBooking = status5Bookings.reduce((latest: Booking, current: Booking) => 
                        new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                      );
                    } else {
                      // Fallback: use latest record
                      selectedBooking = bookings.reduce((latest: Booking, current: Booking) => 
                        new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                      );
                    }
                  }
                }
              }
            }
          }
          
          if (selectedBooking) {
            distinctTotalBookings.push(selectedBooking);
          }
        });
        
        // Filter to show status 3, 4, 5 (with conditions), or 6 (with conditions) in Total Bookings tab
        const finalBookings = distinctTotalBookings.filter((booking: Booking) => {
          const status = Number(booking.status);
          const paymentStatus = Number(booking.payment_status);
          
          // Status 3 (Completed) or 4 (Rejected) - show as is
          if (status === 3 || status === 4) {
            return true;
          }
          
          // Status 5 (Canceled): payment_status = 1, cancel_status = 1
          if (status === 5) {
            const cancelStatus = booking.cancel_status !== undefined ? Number(booking.cancel_status) : null;
            return paymentStatus === 1 && cancelStatus === 1;
          }
          
          // Status 6 (Rescheduled): payment_status = 1, reschedule_status = 1
          if (status === 6) {
            const rescheduleStatus = booking.reschedule_status !== undefined ? Number(booking.reschedule_status) : null;
            return paymentStatus === 1 && rescheduleStatus === 1;
          }
          
          return false;
        });
        
        setBookings(finalBookings);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('❌ Error fetching total bookings:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Add function to get status change message
  const getStatusChangeMessage = (status: number, booking?: Booking) => {
    const statusNum = Number(status);
    
    if (!booking) {
      // Fallback if no booking data
      switch (statusNum) {
        case 1:
          return 'Worker accepted your booking!';
        case 2:
          return 'Work is in progress';
        case 3:
          return 'Work completed successfully!';
        case 4:
          return 'Booking was rejected By Worker';
        case 5:
          return 'Booking was cancelled';
        case 6:
          return 'Booking was rescheduled';
        default:
          return 'Status updated';
      }
    }
    
    // Check if it's a Cancel Request (status 5)
    if (statusNum === 5) {
      const cancelStatus = booking.cancel_status !== undefined ? Number(booking.cancel_status) : null;
      const cancelType = booking.cancel_type !== undefined ? Number(booking.cancel_type) : null;
      // Worker cancel request (type != 2) - show as Accepted
      if (cancelStatus === 0 && cancelType !== 2) {
        return 'Worker accepted your booking!';
      }
      // Customer cancel request (type = 2) - show as cancel request
      if (cancelStatus === 0 && cancelType === 2) {
        return 'Cancel request submitted - waiting for admin approval';
      }
      // Check if it's Canceled (status 5 with cancel_status = 1) - for Total Bookings tab
      if (cancelStatus === 1) {
        // Get canceled date from canceled_date or created_at
        const canceledDate = booking.canceled_date ? new Date(booking.canceled_date) : new Date(booking.created_at);
        return `Booking Was Canceled On ${canceledDate.toLocaleString("en-GB", {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })}`;
      }
    }
    
    // Check if it's a Reschedule Request (status 6)
    if (statusNum === 6) {
      const rescheduleStatus = booking.reschedule_status !== undefined ? Number(booking.reschedule_status) : null;
      const rescheduleType = booking.reschedule_type !== undefined ? Number(booking.reschedule_type) : null;
      // Worker reschedule request (type != 2) - show as Accepted
      if (rescheduleStatus === 0 && rescheduleType !== 2) {
        return 'Worker accepted your booking!';
      }
      // Customer reschedule request (type = 2) - show as reschedule request
      if (rescheduleStatus === 0 && rescheduleType === 2) {
        return 'Reschedule request submitted - waiting for admin approval';
      }
      // Check if it's Rescheduled (status 6 with reschedule_status = 1) - for Total Bookings tab
      if (rescheduleStatus === 1 && booking.reschedule_date) {
        const rescheduleDate = new Date(booking.reschedule_date);
        return `Booking Was Rescheduled For ${rescheduleDate.toLocaleString("en-GB", {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })}`;
      }
    }
    
    // Regular status messages
    switch (statusNum) {
      case 1:
        return 'Worker accepted your booking!';
      case 2:
        return 'Work is in progress';
      case 3:
        return 'Work completed successfully!';
      case 4:
        return 'Booking was rejected By Worker';
      case 5:
        return 'Booking was cancelled';
      case 6:
        return 'Booking was rescheduled';
      default:
        return 'Status updated';
    }
  };

  // Add function to get status icon
  const getStatusIcon = (status: number, booking?: Booking) => {
    const statusNum = Number(status);
    
    // Status 1 - Accepted
    if (statusNum === 1) {
      return 'checkmark-circle-outline'; // Accepted
    }
    
    // Status 5: Show as Accepted icon if cancel_type != 2 and cancel_status = 0 (Worker cancel request)
    if (statusNum === 5 && booking) {
      const cancelStatus = booking.cancel_status !== undefined ? Number(booking.cancel_status) : null;
      const cancelType = booking.cancel_type !== undefined ? Number(booking.cancel_type) : null;
      if (cancelStatus === 0 && cancelType !== 2) {
        return 'checkmark-circle-outline'; // Worker cancel request - show as Accepted
      }
      if (cancelStatus === 0 && cancelType === 2) {
        return 'time-outline'; // Customer cancel request
      }
    }
    
    // Status 6: Show as Accepted icon if reschedule_type != 2 and reschedule_status = 0 (Worker reschedule request)
    if (statusNum === 6 && booking) {
      const rescheduleStatus = booking.reschedule_status !== undefined ? Number(booking.reschedule_status) : null;
      const rescheduleType = booking.reschedule_type !== undefined ? Number(booking.reschedule_type) : null;
      if (rescheduleStatus === 0 && rescheduleType !== 2) {
        return 'checkmark-circle-outline'; // Worker reschedule request - show as Accepted
      }
      if (rescheduleStatus === 0 && rescheduleType === 2) {
        return 'time-outline'; // Customer reschedule request
      }
    }
    
    switch (statusNum) {
      case 2:
        return 'hourglass-outline'; // In Progress
      case 3:
        return 'checkmark-done-circle'; // Completed
      case 4:
        return 'close-circle-outline'; // Rejected
      case 5:
        return 'close-circle-outline'; // Canceled
      case 6:
        return 'calendar-outline'; // Rescheduled
      default:
        return 'information-circle-outline';
    }
  };

  // Add function to get status color
  const getStatusColor = (status: number, booking?: Booking) => {
    const statusNum = Number(status);
    
    // Status 1 - Accepted
    if (statusNum === 1) {
      return '#3b82f6'; // Blue (Accepted)
    }
    
    // Status 5: Show as Accepted color if cancel_type != 2 and cancel_status = 0 (Worker cancel request)
    if (statusNum === 5 && booking) {
      const cancelStatus = booking.cancel_status !== undefined ? Number(booking.cancel_status) : null;
      const cancelType = booking.cancel_type !== undefined ? Number(booking.cancel_type) : null;
      if (cancelStatus === 0 && cancelType !== 2) {
        return '#3b82f6'; // Blue (Worker cancel request - show as Accepted)
      }
      if (cancelStatus === 0 && cancelType === 2) {
        return '#f59e0b'; // Amber (Customer cancel request)
      }
    }
    
    // Status 6: Show as Accepted color if reschedule_type != 2 and reschedule_status = 0 (Worker reschedule request)
    if (statusNum === 6 && booking) {
      const rescheduleStatus = booking.reschedule_status !== undefined ? Number(booking.reschedule_status) : null;
      const rescheduleType = booking.reschedule_type !== undefined ? Number(booking.reschedule_type) : null;
      if (rescheduleStatus === 0 && rescheduleType !== 2) {
        return '#3b82f6'; // Blue (Worker reschedule request - show as Accepted)
      }
      if (rescheduleStatus === 0 && rescheduleType === 2) {
        return '#f59e0b'; // Amber (Customer reschedule request)
      }
    }
    
    switch (statusNum) {
      case 2:
        return '#f59e0b'; // Amber (In Progress)
      case 3:
        return '#10b981'; // Green (Completed)
      case 4:
        return '#ef4444'; // Red (Rejected)
      case 5:
        return '#ef4444'; // Red (Canceled)
      case 6:
        return '#8b5cf6'; // Purple (Rescheduled)
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

  // Fetch payment history
  const fetchPayments = useCallback(async () => {
    // Use authenticated user's ID if available, otherwise use serviceSeeker ID
    const userId = user?.id || serviceSeeker?.id;
    if (!userId) {
      return;
    }
    
    try {
      setPaymentsLoading(true);
      const apiUrl = API_ENDPOINTS.PAYMENTS_BY_USER(userId);
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success && result.data) {
        setPayments(result.data);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching payment history:', error);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [user?.id, serviceSeeker?.id]);

  // Modify the handleTabChange function
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Clear bookings when switching tabs to avoid showing wrong data
    setBookings([]);
    if (tab === 'notifications') {
      // Fetch bookings for notifications (status 1,2,3,4,5,6: Accepted, In Progress, Completed, Rejected, Canceled, Rescheduled)
      fetchBookings();
    } else if (tab === 'totalBookings') {
      // Fetch total bookings (ONLY status 3,4,5: Completed, Rejected, Canceled)
      fetchTotalBookings();
    } else if (tab === 'paymentHistory') {
      // Fetch payment history
      fetchPayments();
    }
  };

  // Helper function to trim "Booking for " from description
  const trimBookingDescription = (description: string | null | undefined): string => {
    if (!description) return 'Service booking';
    const trimmed = description.trim();
    if (trimmed.toLowerCase().startsWith('booking for ')) {
      return trimmed.substring(12).trim();
    }
    return trimmed;
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
              
              {/* Conditional Content Based on Active Tab */}
              {activeTab === 'paymentHistory' ? (
                // Payment History Section
                <View style={styles.bookingsSection}>
                  <View style={styles.bookingsHeader}>
                    <View style={styles.bookingsTitleContainer}>
                      <Ionicons name="card" size={styles.titleIconSize} color="#8B5CF6" />
                      <Text style={styles.bookingsTitle}>Payment History</Text>
                    </View>
                    <View style={styles.bookingsActions}>
                      {payments.length > 0 && (
                        <View style={styles.bookingCount}>
                          <Text style={styles.bookingCountText}>{payments.length}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {paymentsLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>Loading payments...</Text>
                    </View>
                  ) : payments.length > 0 ? (
                    <View style={styles.paymentsList}>
                      {payments.map((payment) => (
                        <View key={payment.id} style={styles.paymentCard}>
                          {/* Payment Card Header with Gradient */}
                          <View style={styles.paymentCardHeader}>
                            <View style={styles.paymentIconContainer}>
                              <Ionicons name="checkmark-circle" size={styles.paymentIconSize} color="#FFFFFF" />
                            </View>
                            <View style={styles.paymentHeaderContent}>
                              <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
                              <Text style={styles.paymentDate}>
                                {new Date(payment.payment_date).toLocaleDateString("en-GB", {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </Text>
                            </View>
                          </View>
                          
                          {/* Payment Details */}
                          <View style={styles.paymentDetails}>
                            <View style={styles.paymentDetailRow}>
                              <Ionicons name="receipt-outline" size={styles.smallIconSize} color="#8B5CF6" />
                              <Text style={styles.paymentDetailLabel}>Payment ID:</Text>
                              <Text style={styles.paymentDetailValue} numberOfLines={1}>{payment.payment_id}</Text>
                            </View>
                            
                            <View style={styles.paymentDetailRow}>
                              <Ionicons name="calendar-outline" size={styles.smallIconSize} color="#8B5CF6" />
                              <Text style={styles.paymentDetailLabel}>Booking ID:</Text>
                              <Text style={styles.paymentDetailValue}>#{payment.booking_id}</Text>
                            </View>
                            
                            <View style={styles.paymentDetailRow}>
                              <Ionicons name="briefcase-outline" size={styles.smallIconSize} color="#8B5CF6" />
                              <Text style={styles.paymentDetailLabel}>Booking For:</Text>
                              <Text style={styles.paymentDetailValue} numberOfLines={2}>
                                {trimBookingDescription(payment.description)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noBookings}>
                      <Ionicons name="card-outline" size={styles.emptyIconSize} color="#e5e7eb" />
                      <Text style={styles.noBookingsText}>No payment history</Text>
                      <Text style={styles.noBookingsSubtext}>
                        Your payment history will appear here
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                // Booking Notifications Section
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
                              name={getStatusIcon(booking.status, booking)} 
                              size={styles.statusIconSize} 
                              color={getStatusColor(booking.status, booking)} 
                            />
                            <Text style={styles.bookingId}>#{booking.booking_id}</Text>
                          </View>
                          
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(booking.status) + '20' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: getStatusColor(booking.status, booking) }
                            ]}>
                              {(() => {
                                const statusNum = Number(booking.status);
                                
                                // Status 1 - Accepted
                                if (statusNum === 1) {
                                  return 'Accepted';
                                }
                                
                                // Status 5: Show as "Accepted" if cancel_type != 2 and cancel_status = 0 (Worker cancel request)
                                if (statusNum === 5) {
                                  const cancelStatus = booking.cancel_status !== undefined ? Number(booking.cancel_status) : null;
                                  const cancelType = booking.cancel_type !== undefined ? Number(booking.cancel_type) : null;
                                  if (cancelStatus === 0 && cancelType !== 2) {
                                    return 'Accepted'; // Worker cancel request - show as Accepted
                                  }
                                  if (cancelStatus === 0 && cancelType === 2) {
                                    return 'Cancel Request'; // Customer cancel request
                                  }
                                  return 'Canceled';
                                }
                                
                                // Status 6: Show as "Accepted" if reschedule_type != 2 and reschedule_status = 0 (Worker reschedule request)
                                if (statusNum === 6) {
                                  const rescheduleStatus = booking.reschedule_status !== undefined ? Number(booking.reschedule_status) : null;
                                  const rescheduleType = booking.reschedule_type !== undefined ? Number(booking.reschedule_type) : null;
                                  if (rescheduleStatus === 0 && rescheduleType !== 2) {
                                    return 'Accepted'; // Worker reschedule request - show as Accepted
                                  }
                                  if (rescheduleStatus === 0 && rescheduleType === 2) {
                                    return 'Reschedule Request'; // Customer reschedule request
                                  }
                                  return 'Rescheduled';
                                }
                                
                                if (statusNum === 2) return 'In Progress';
                                if (statusNum === 3) return 'Completed';
                                if (statusNum === 4) return 'Rejected';
                                return `Status ${booking.status}`;
                              })()}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Conditional Content Based on Status */}
                        {(() => {
                          const statusNum = Number(booking.status);
                          const cancelStatus = booking.cancel_status !== undefined ? Number(booking.cancel_status) : null;
                          const cancelType = booking.cancel_type !== undefined ? Number(booking.cancel_type) : null;
                          const rescheduleStatus = booking.reschedule_status !== undefined ? Number(booking.reschedule_status) : null;
                          const rescheduleType = booking.reschedule_type !== undefined ? Number(booking.reschedule_type) : null;
                          
                          // Show as Accepted (with buttons) if:
                          // - Status 1, OR
                          // - Status 5 with cancel_type != 2 and cancel_status = 0, OR
                          // - Status 6 with reschedule_type != 2 and reschedule_status = 0
                          const showAsAccepted = statusNum === 1 || 
                            (statusNum === 5 && cancelStatus === 0 && cancelType !== 2) ||
                            (statusNum === 6 && rescheduleStatus === 0 && rescheduleType !== 2);
                          
                          if (showAsAccepted) {
                            // For Accepted bookings (status = 1) or Worker cancel/reschedule requests - show full details with Reschedule and Cancel buttons
                            return (
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
                                {getStatusChangeMessage(booking.status, booking)}
                              </Text>
                            </View>
                            
                            {/* Reschedule and Cancel Buttons */}
                            <View style={styles.actionButtonsContainer}>
                              <TouchableOpacity 
                                style={[styles.actionButton, styles.rescheduleButton]}
                                onPress={() => showReschedulePopup(booking)}
                              >
                                <Ionicons name="calendar-outline" size={styles.smallIconSize} color="#8b5cf6" />
                                <Text style={[styles.actionButtonText, { color: '#8b5cf6' }]}>Reschedule</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity 
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={() => showCancelPopup(booking)}
                              >
                                <Ionicons name="close-circle-outline" size={styles.smallIconSize} color="#ef4444" />
                                <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                            );
                          }
                          
                          // Status 2 - In Progress
                          if (statusNum === 2) {
                            return (
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
                                
                                <View style={styles.statusInfoContainer}>
                                  <Text style={styles.statusInfoText}>
                                    {getStatusChangeMessage(booking.status, booking)}
                                  </Text>
                                </View>
                              </View>
                            );
                          }
                          
                          // Status 6 - Rescheduled (but not worker-initiated requests that should show as Accepted)
                          if (statusNum === 6) {
                            // Check if it's a customer reschedule request (type = 2) - show different UI
                            if (rescheduleStatus === 0 && rescheduleType === 2) {
                              // Customer reschedule request - show as reschedule request
                              return (
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
                                  
                                  <View style={styles.statusInfoContainer}>
                                    <Text style={styles.statusInfoText}>
                                      {getStatusChangeMessage(booking.status, booking)}
                                    </Text>
                                  </View>
                                </View>
                              );
                            }
                            // Regular rescheduled booking
                            return (
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
                                
                                <View style={styles.statusInfoContainer}>
                                  <Text style={styles.statusInfoText}>
                                    {getStatusChangeMessage(booking.status, booking)}
                                  </Text>
                                </View>
                              </View>
                            );
                          }
                          
                          // Status 4 or 5 - Rejected/Canceled
                          if (statusNum === 4 || statusNum === 5) {
                            // Check if status 5 is a customer cancel request (type = 2) - show different UI
                            if (statusNum === 5 && cancelStatus === 0 && cancelType === 2) {
                              // Customer cancel request - show as cancel request
                              return (
                                <View style={styles.rejectedBookingContent}>
                                  <View style={styles.bookingRow}>
                                    <Ionicons name="person" size={styles.smallIconSize} color="#666" />
                                    <Text style={styles.bookingLabel}>Worker: </Text>
                                    <Text style={styles.bookingValue}>
                                      {booking.worker_name || `Worker #${booking.worker_id}`}
                                    </Text>
                                  </View>
                                  
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
                                      {getStatusChangeMessage(booking.status, booking)}
                                    </Text>
                                  </View>
                                </View>
                              );
                            }
                            // Regular rejected/canceled booking
                            return (
                              <View style={styles.rejectedBookingContent}>
                                <View style={styles.bookingRow}>
                                  <Ionicons name="person" size={styles.smallIconSize} color="#666" />
                                  <Text style={styles.bookingLabel}>Worker: </Text>
                                  <Text style={styles.bookingValue}>
                                    {booking.worker_name || `Worker #${booking.worker_id}`}
                                  </Text>
                                </View>
                                
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
                                    {getStatusChangeMessage(booking.status, booking)}
                                  </Text>
                                </View>
                              </View>
                            );
                          }
                          
                          // Default fallback
                          return (
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
                              
                              <View style={styles.statusInfoContainer}>
                                <Text style={styles.statusInfoText}>
                                  {getStatusChangeMessage(booking.status, booking)}
                                </Text>
                              </View>
                            </View>
                          );
                        })()}
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
              )}
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

          {/* Reschedule Booking Popup */}
          {reschedulePopupVisible && reschedulingBooking && (
            <View style={styles.popupOverlay}>
              <View style={styles.cancelPopupContainer}>
                <View style={styles.cancelPopupHeader}>
                  <Text style={styles.cancelPopupTitle}>Reschedule Booking</Text>
                  <TouchableOpacity onPress={closeReschedulePopup} style={styles.closeButton}>
                    <Ionicons name="close" size={styles.iconSize} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cancelPopupContent}>
                  <View style={styles.cancelBookingInfoContainer}>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Booking ID:</Text>
                      <Text style={styles.bookingInfoValue}>#{reschedulingBooking.booking_id}</Text>
                    </View>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Booking For:</Text>
                      <Text style={styles.bookingInfoValue}>
                        {new Date(reschedulingBooking.booking_time || reschedulingBooking.created_at).toLocaleString("en-GB", {
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
                  </View>
                  
                  <Text style={styles.popupLabel}>Reschedule Date:</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.reasonInput, styles.dateInput, rescheduleError && !rescheduleDate.trim() && styles.reasonInputError]}
                  >
                    <Text style={[styles.dateInputText, !rescheduleDate && styles.dateInputPlaceholder]}>
                      {rescheduleDate || 'Select date and time'}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Date Picker */}
                  {showDatePicker && (
                    <>
                      {Platform.OS === 'ios' && (
                        <Modal
                          visible={showDatePicker}
                          transparent={true}
                          animationType="slide"
                          onRequestClose={() => setShowDatePicker(false)}
                        >
                          <View style={styles.datePickerModalOverlay}>
                            <View style={styles.datePickerModalContent}>
                              <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerModalTitle}>Select Date & Time</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                  <Ionicons name="close" size={styles.iconSize} color="#666" />
                                </TouchableOpacity>
                              </View>
                              <DateTimePicker
                                value={selectedDate}
                                mode="datetime"
                                display="spinner"
                                onChange={(event: any, date?: Date) => {
                                  if (date) {
                                    setSelectedDate(date);
                                    setSelectedTime(date);
                                    const formatted = date.toLocaleString("en-GB", {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                    setRescheduleDate(formatted);
                                  }
                                }}
                                minimumDate={new Date()}
                                style={{ width: '100%' }}
                              />
                              <View style={styles.datePickerModalActions}>
                                <TouchableOpacity 
                                  style={[styles.datePickerModalButton, styles.datePickerCancelButton]}
                                  onPress={() => setShowDatePicker(false)}
                                >
                                  <Text style={styles.datePickerCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={[styles.datePickerModalButton, styles.datePickerDoneButton]}
                                  onPress={() => {
                                    const formatted = selectedDate.toLocaleString("en-GB", {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                    setRescheduleDate(formatted);
                                    setShowDatePicker(false);
                                    if (rescheduleError) setRescheduleError('');
                                  }}
                                >
                                  <Text style={styles.datePickerDoneButtonText}>Done</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </Modal>
                      )}
                      {Platform.OS === 'android' && (
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display="default"
                          onChange={handleDateChange}
                          minimumDate={new Date()}
                        />
                      )}
                    </>
                  )}

                  {/* Time Picker for Android */}
                  {showTimePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="default"
                      onChange={handleTimeChange}
                      is24Hour={false}
                    />
                  )}
                  
                  <Text style={[styles.popupLabel, { marginTop: 12 }]}>Reason For Reschedule:</Text>
                  <TextInput
                    style={[styles.reasonInput, rescheduleError && !rescheduleReason.trim() && styles.reasonInputError]}
                    placeholder="Enter reschedule reason..."
                    value={rescheduleReason}
                    onChangeText={(text) => {
                      setRescheduleReason(text);
                      if (rescheduleError) setRescheduleError('');
                    }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  {rescheduleError ? (
                    <Text style={styles.errorText}>{rescheduleError}</Text>
                  ) : null}
                  
                  {rescheduleSuccess ? (
                    <View style={styles.successContainer}>
                      <Ionicons name="checkmark-circle" size={styles.iconSize} color="#4CAF50" />
                      <Text style={styles.successText}>Request Submitted Successfully</Text>
                    </View>
                  ) : null}
                </View>
                
                <View style={styles.cancelPopupActions}>
                  <TouchableOpacity 
                    style={[styles.cancelPopupSubmitButton, styles.cancelSubmitButton]} 
                    onPress={handleRescheduleSubmit}
                    disabled={rescheduleLoading || rescheduleSuccess || !rescheduleDate.trim() || !rescheduleReason.trim()}
                  >
                    {rescheduleLoading ? (
                      <View style={styles.loadingDotsContainer}>
                        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: rescheduleDotAnim1 }] }]} />
                        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: rescheduleDotAnim2 }] }]} />
                        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: rescheduleDotAnim3 }] }]} />
                      </View>
                    ) : (
                      <Text style={styles.submitButtonText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Cancellation Reason Popup */}
          {cancelPopupVisible && cancellingBooking && (
            <View style={styles.popupOverlay}>
              <View style={styles.cancelPopupContainer}>
                <View style={styles.cancelPopupHeader}>
                  <Text style={styles.cancelPopupTitle}>Cancel Booking</Text>
                  <TouchableOpacity onPress={closeCancelPopup} style={styles.closeButton}>
                    <Ionicons name="close" size={styles.iconSize} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cancelPopupContent}>
                  <View style={styles.cancelBookingInfoContainer}>
                    <View style={styles.bookingInfoRow}>
                      <Text style={styles.bookingInfoLabel}>Booking ID:</Text>
                      <Text style={styles.bookingInfoValue}>#{cancellingBooking.booking_id}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.popupLabel}>Reason For Cancellation:</Text>
                  <TextInput
                    style={[styles.reasonInput, cancelError && styles.reasonInputError]}
                    placeholder="Enter cancellation reason..."
                    value={cancelReason}
                    onChangeText={(text) => {
                      setCancelReason(text);
                      if (cancelError) setCancelError('');
                    }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  {cancelError ? (
                    <Text style={styles.errorText}>{cancelError}</Text>
                  ) : null}
                  
                  {cancelSuccess ? (
                    <View style={styles.successContainer}>
                      <Ionicons name="checkmark-circle" size={styles.iconSize} color="#4CAF50" />
                      <Text style={styles.successText}>Request Submitted Successfully</Text>
                    </View>
                  ) : null}
                </View>
                
                <View style={styles.cancelPopupActions}>
                  <TouchableOpacity 
                    style={[styles.cancelPopupSubmitButton, styles.cancelSubmitButton]} 
                    onPress={handleCancelSubmit}
                    disabled={cancelLoading || cancelSuccess || !cancelReason.trim()}
                  >
                    {cancelLoading ? (
                      <View style={styles.loadingDotsContainer}>
                        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: cancelDotAnim1 }] }]} />
                        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: cancelDotAnim2 }] }]} />
                        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: cancelDotAnim3 }] }]} />
                      </View>
                    ) : (
                      <Text style={styles.submitButtonText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
  const paymentIconSize = Math.max(24, Math.min(32, moderateScale(28)));

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
    // Action Buttons Styles
    actionButtonsContainer: {
      flexDirection: 'row',
      gap: getResponsiveSpacing(10),
      marginTop: getResponsiveSpacing(12),
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(16),
      borderRadius: getResponsiveValue(8, 6, 10),
      borderWidth: 1.5,
      gap: getResponsiveSpacing(6),
    },
    rescheduleButton: {
      backgroundColor: '#f3f4f6',
      borderColor: '#8b5cf6',
    },
    cancelButton: {
      backgroundColor: '#fef2f2',
      borderColor: '#ef4444',
    },
    actionButtonText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
    },
    // Payment History Styles
    paymentsList: {
      gap: getResponsiveSpacing(15),
    },
    paymentCard: {
      backgroundColor: '#e0ddebff',
      borderRadius: getResponsiveValue(12, 10, 14),
      padding: getResponsiveSpacing(12),
      marginBottom: getResponsiveSpacingWithNegative(-5),
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      marginLeft: getResponsiveSpacingWithNegative(-5),
      marginRight: getResponsiveSpacingWithNegative(-5),
      borderWidth: 1,
      borderColor: '#E9D5FF',
    },
    paymentCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#8B5CF6',
      borderRadius: getResponsiveValue(8, 6, 10),
      padding: getResponsiveSpacing(10),
      marginBottom: getResponsiveSpacing(8),
      marginHorizontal: getResponsiveSpacingWithNegative(-12),
      marginTop: getResponsiveSpacingWithNegative(-12),
    },
    paymentIconContainer: {
      width: getResponsiveValue(36, 32, 40),
      height: getResponsiveValue(36, 32, 40),
      borderRadius: getResponsiveValue(18, 16, 20),
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getResponsiveSpacing(8),
    },
    paymentHeaderContent: {
      flex: 1,
    },
    paymentAmount: {
      fontSize: getResponsiveFontSize(22),
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: getResponsiveSpacing(2),
    },
    paymentDate: {
      fontSize: getResponsiveFontSize(11),
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '500',
    },
    paymentDetails: {
      gap: getResponsiveSpacing(6),
    },
    paymentDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: getResponsiveSpacing(4),
    },
    paymentDetailLabel: {
      fontSize: getResponsiveFontSize(14),
      color: '#6B7280',
      fontWeight: '600',
      marginLeft: getResponsiveSpacing(8),
      minWidth: getResponsiveWidth(100, 90, 110),
    },
    paymentDetailValue: {
      fontSize: getResponsiveFontSize(14),
      color: '#1F2937',
      fontWeight: '500',
      flex: 1,
      flexWrap: 'wrap',
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
    // Popup styles
    popupOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
    },
    cancelPopupContainer: {
      backgroundColor: '#ffffff',
      borderRadius: getResponsiveValue(16, 12, 20),
      padding: 0,
      margin: getResponsiveSpacing(20),
      width: '90%',
      maxWidth: getResponsiveWidth(450, 350, 500),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: getResponsiveSpacing(4) },
      shadowOpacity: 0.25,
      shadowRadius: getResponsiveSpacing(8),
      elevation: 8,
      overflow: 'hidden',
    },
    cancelPopupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#4CAF50',
      paddingHorizontal: getResponsiveSpacing(20),
      paddingVertical: getResponsiveSpacing(15),
      borderTopLeftRadius: getResponsiveValue(16, 12, 20),
      borderTopRightRadius: getResponsiveValue(16, 12, 20),
    },
    cancelPopupTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: 'bold',
      color: '#ffffff',
      flex: 1,
    },
    closeButton: {
      padding: getResponsiveSpacing(5),
    },
    cancelPopupContent: {
      padding: getResponsiveSpacing(20),
    },
    cancelBookingInfoContainer: {
      backgroundColor: '#fff5f5',
      borderRadius: getResponsiveValue(8, 6, 10),
      padding: getResponsiveSpacing(12),
      marginBottom: getResponsiveSpacing(16),
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    bookingInfoRow: {
      flexDirection: 'row',
      marginBottom: getResponsiveSpacing(8),
    },
    bookingInfoLabel: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#666',
      marginRight: getResponsiveSpacing(8),
    },
    bookingInfoValue: {
      fontSize: getResponsiveFontSize(14),
      color: '#333',
      flex: 1,
    },
    popupLabel: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#333',
      marginBottom: getResponsiveSpacing(8),
    },
    reasonInput: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: getResponsiveValue(8, 6, 10),
      padding: getResponsiveSpacing(12),
      fontSize: getResponsiveFontSize(16),
      minHeight: getResponsiveValue(100, 80, 120),
      textAlignVertical: 'top',
      backgroundColor: '#f9f9f9',
    },
    reasonInputError: {
      borderColor: '#ef4444',
    },
    dateInput: {
      minHeight: getResponsiveValue(50, 40, 60),
      textAlignVertical: 'center',
      justifyContent: 'center',
    },
    dateInputText: {
      fontSize: getResponsiveFontSize(16),
      color: '#333',
      paddingVertical: getResponsiveSpacing(12),
    },
    dateInputPlaceholder: {
      color: '#999',
    },
    errorText: {
      color: '#ef4444',
      fontSize: getResponsiveFontSize(14),
      marginTop: getResponsiveSpacing(8),
    },
    successContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0fdf4',
      padding: getResponsiveSpacing(12),
      borderRadius: getResponsiveValue(8, 6, 10),
      marginTop: getResponsiveSpacing(12),
      gap: getResponsiveSpacing(8),
    },
    successText: {
      color: '#4CAF50',
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
    },
    cancelPopupActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: getResponsiveSpacing(20),
      paddingBottom: getResponsiveSpacing(20),
    },
    cancelPopupSubmitButton: {
      flex: 1,
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(20),
      borderRadius: getResponsiveValue(8, 6, 10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelSubmitButton: {
      backgroundColor: '#4CAF50',
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    loadingDotsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSpacing(6),
    },
    loadingDot: {
      width: getResponsiveValue(8, 6, 10),
      height: getResponsiveValue(8, 6, 10),
      borderRadius: getResponsiveValue(4, 3, 5),
      backgroundColor: '#ffffff',
    },
    datePickerModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getResponsiveSpacing(20),
      paddingVertical: getResponsiveSpacing(15),
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    datePickerModalContent: {
      backgroundColor: '#ffffff',
      borderTopLeftRadius: getResponsiveValue(20, 15, 25),
      borderTopRightRadius: getResponsiveValue(20, 15, 25),
      paddingBottom: getResponsiveSpacing(20),
      maxHeight: '70%',
    },
    datePickerModalTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: 'bold',
      color: '#333',
    },
    datePickerModalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(20),
      marginTop: getResponsiveSpacing(15),
    },
    datePickerModalButton: {
      flex: 1,
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(20),
      borderRadius: getResponsiveValue(8, 6, 10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePickerCancelButton: {
      backgroundColor: '#f1f5f9',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    datePickerDoneButton: {
      backgroundColor: '#4CAF50',
    },
    datePickerCancelButtonText: {
      color: '#64748b',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    datePickerDoneButtonText: {
      color: '#ffffff',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
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
    paymentIconSize,
  } as typeof styles & {
    iconSize: number;
    titleIconSize: number;
    statusIconSize: number;
    smallIconSize: number;
    bottomNavIconSize: number;
    menuIconSize: number;
    chevronIconSize: number;
    emptyIconSize: number;
    paymentIconSize: number;
  };
};