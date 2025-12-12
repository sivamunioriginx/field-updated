import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CartService } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

export default function CartScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getCartItems, incrementItem, decrementItem, addToCart } = useCart();
  const { isAuthenticated, user, updateUser } = useAuth();
  const [suggestedServices, setSuggestedServices] = useState<CartService[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [savedLocation, setSavedLocation] = useState<any | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deleteMenuAddressId, setDeleteMenuAddressId] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Initialize contact info from logged-in user (only if not already set)
  useEffect(() => {
    if (isAuthenticated && user && !contactName && !contactPhone) {
      setContactName(user.name || '');
      setContactPhone(user.mobile || '');
    }
  }, [isAuthenticated, user]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentFailedModal, setShowPaymentFailedModal] = useState(false);
  const [paymentFailedMessage, setPaymentFailedMessage] = useState('');
  const [paymentFailedBookingId, setPaymentFailedBookingId] = useState<string | null>(null);
  const [showNoWorkersModal, setShowNoWorkersModal] = useState(false);
  const pollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Animation values for circular progress ring with orbiting particles
  const ringRotateAnim = React.useRef(new Animated.Value(0)).current;
  const particle1Anim = React.useRef(new Animated.Value(0)).current;
  const particle2Anim = React.useRef(new Animated.Value(0)).current;
  const particle3Anim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const timerRotateAnim = React.useRef(new Animated.Value(0)).current;

  // Get subcategoryId / instant filter from params if provided
  const subcategoryId = params.subcategoryId as string | undefined;
  const instantOnlyParam = params.instantOnly === 'true';
  const instantFilter = params.filterInstant as 'instant' | 'regular' | undefined;
  
  // Filter cart items by subcategory / instant flag if provided
  const isInstantService = (value: CartService['instant_service']) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === '1' || value.toLowerCase?.() === 'true';
    return value === 1;
  };

  const allCartItems = getCartItems();
  const cartItems = allCartItems.filter(item => {
    if (subcategoryId && item.service.subcategory_id !== subcategoryId) {
      return false;
    }
    if (instantOnlyParam || instantFilter === 'instant') {
      return isInstantService(item.service.instant_service);
    }
    if (instantFilter === 'regular') {
      return !isInstantService(item.service.instant_service);
    }
    return true;
  });

  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);

  // Generate date options (today + next 30 days)
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Initialize selected date to tomorrow if not set
  useEffect(() => {
    if (!selectedDate && dateOptions.length > 0) {
      setSelectedDate(dateOptions[1] || dateOptions[0]);
    }
  }, [dateOptions, selectedDate]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        slots.push({
          value: timeString,
          display: `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`,
        });
      }
    }
    return slots;
  }, []);

  const isSameDay = (dateA: Date, dateB: Date) => {
    return (
      dateA.getDate() === dateB.getDate() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getFullYear() === dateB.getFullYear()
    );
  };

  // Format date and time for booking display
  const hasInstantFilter = instantOnlyParam || instantFilter === 'instant';

  const getAvailableSlotsForDate = useCallback(
    (date: Date | null, minTime?: Date) => {
      if (!date) return timeSlots;
      
      // For future dates, show all slots
      if (!isSameDay(date, new Date())) {
        return timeSlots;
      }

      // For today, filter based on minimum time
      const cutoffTime = minTime || new Date();

      return timeSlots.filter((slot) => {
        const [hour, minute] = slot.value.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hour, minute, 0, 0);
        return slotTime > cutoffTime;
      });
    },
    [timeSlots]
  );

  const availableSlotSet = useMemo(() => {
    // For instant services, calculate minimum time (current + 1 hour)
    let minTime: Date | undefined = undefined;
    if (hasInstantFilter && selectedDate && isSameDay(selectedDate, new Date())) {
      minTime = new Date(Date.now() + 60 * 60 * 1000);
      minTime.setSeconds(0, 0);
    }
    
    const slots = getAvailableSlotsForDate(selectedDate || null, minTime);
    return new Set(slots.map((slot) => slot.value));
  }, [getAvailableSlotsForDate, selectedDate, hasInstantFilter]);

  // Format date for display
  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate().toString()
    };
  };

  // Track if we've initialized the date/time for instant services
  const instantInitializedRef = React.useRef(false);

  useEffect(() => {
    if (!hasInstantFilter) {
      instantInitializedRef.current = false;
      return;
    }

    // Only auto-set once when instant filter is first detected
    if (!instantInitializedRef.current) {
      const autoDate = new Date(Date.now() + 60 * 60 * 1000);
      autoDate.setSeconds(0, 0);
      const autoTime = `${autoDate.getHours().toString().padStart(2, '0')}:${autoDate
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;

      setSelectedDate(autoDate);
      setSelectedTime(autoTime);
      instantInitializedRef.current = true;
    }
  }, [hasInstantFilter]);

  const formatBookingDateTime = () => {
    const dateToUse = selectedDate;
    const timeToUse = selectedTime;

    if (!dateToUse) {
      if (hasInstantFilter) {
        const date = new Date(Date.now() + 60 * 60 * 1000);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = days[date.getDay()];
        const monthName = months[date.getMonth()];
        const dateNum = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const formattedTime = `${displayHour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')} ${period}`;
        return `${dayName}, ${monthName} ${dateNum} - ${formattedTime}`;
      }
      return '';
    }

    if (!timeToUse) {
      return '';
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[dateToUse.getDay()];
    const monthName = months[dateToUse.getMonth()];
    const dateNum = dateToUse.getDate();
    
    const [hour, minute] = timeToUse.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const formattedTime = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
    
    return `${dayName}, ${monthName} ${dateNum} - ${formattedTime}`;
  };

  // Responsive icon size helper
  const getIconSize = (baseSize: number) => {
    const baseWidth = 375;
    const scaledSize = (baseSize * screenWidth) / baseWidth;
    return Math.max(baseSize * 0.8, Math.min(baseSize * 1.2, scaledSize));
  };

  const { itemTotal, taxes, totalAmount } = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.service.price || 0) * item.quantity;
    }, 0);
    const taxValue = 0;
    return {
      itemTotal: subtotal,
      taxes: taxValue,
      totalAmount: subtotal + taxValue,
    };
  }, [cartItems]);

  const footerPaddingBottom = useMemo(() => {
    const basePadding = screenHeight * 0.17;
    if (!isAuthenticated) {
      return basePadding;
    }
    if (selectedDate && selectedTime) {
      return basePadding + screenHeight * 0.05;
    }
    return basePadding;
  }, [screenHeight, isAuthenticated, selectedDate, selectedTime]);

  const handleAddSuggested = (service: CartService) => {
    addToCart(service);
  };

  const handleSaveContactDetails = async () => {
    const trimmedName = contactName.trim();
    const trimmedPhone = contactPhone.trim();
    if (!trimmedName || !trimmedPhone || isSavingContact) {
      return;
    }

    try {
      setIsSavingContact(true);
      // Only update locally for this booking, don't update user profile
      setContactName(trimmedName);
      setContactPhone(trimmedPhone);
      setShowContactModal(false);
    } catch (error) {
      console.error('Error saving contact info:', error);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleBookNow = async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Login Required', 'Please login to book services');
      router.push('/login');
      return;
    }

    // Check if date and time are selected
    if (!selectedDate || !selectedTime) {
      setShowSlotModal(true);
      return;
    }

    // Check if location is selected
    if (!savedLocation) {
      Alert.alert('Location Required', 'Please select a work location');
      loadSavedAddresses();
      setShowAddressModal(true);
      return;
    }

    // Get subcategory_id from cart items (all items should have the same subcategory_id)
    if (cartItems.length === 0) {
      Alert.alert('Error', 'No items in cart');
      return;
    }

    // Get the subcategory_id from the first cart item
    const subcategoryId = cartItems[0]?.service?.subcategory_id;
    if (!subcategoryId) {
      Alert.alert('Error', 'Unable to determine service category. Please try again.');
      return;
    }

    // Validate that selected date and time is not in the past
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const bookingDateTime = new Date(selectedDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    
    if (bookingDateTime <= new Date()) {
      Alert.alert('Invalid Time', 'Please select a future date and time for your booking');
      return;
    }

    setIsBooking(true);

    try {
      // Format booking time as local datetime string (YYYY-MM-DD HH:MM:SS)
      const year = bookingDateTime.getFullYear();
      const month = String(bookingDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(bookingDateTime.getDate()).padStart(2, '0');
      const hour = String(bookingDateTime.getHours()).padStart(2, '0');
      const minute = String(bookingDateTime.getMinutes()).padStart(2, '0');
      const second = String(bookingDateTime.getSeconds()).padStart(2, '0');
      
      const localDateTimeString = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

      // Generate unique booking ID (same for all workers)
      const bookingId = `bk${Math.floor(Date.now() / 1000)}`;

      // Format work location from saved location
      const workLocationParts = [
        savedLocation.flatNo,
        savedLocation.landmark,
        savedLocation.address
      ].filter(Boolean);
      const workLocation = workLocationParts.join(', ') || 'Location not specified';

      // Fetch all workers
      console.log('Fetching all workers...');
      const workersResponse = await fetch(API_ENDPOINTS.WORKERS);
      if (!workersResponse.ok) {
        throw new Error('Failed to fetch workers');
      }
      const workersData = await workersResponse.json();
      
      if (!workersData.success || !Array.isArray(workersData.data)) {
        throw new Error('Invalid workers data');
      }

      // Filter workers who have this subcategory_id in their skill_id
      // skill_id is stored as comma-separated values like "1,2,3" or "1, 2, 3"
      const matchingWorkers = workersData.data.filter((worker: any) => {
        if (!worker.skill_id) return false;
        // Remove spaces and split by comma, then check if subcategory_id is in the array
        const skillIds = worker.skill_id.replace(/\s/g, '').split(',').filter(Boolean);
        return skillIds.includes(subcategoryId.toString());
      });

      if (matchingWorkers.length === 0) {
        Alert.alert('No Workers Found', `No workers found for this service category. Please try again later.`);
        setIsBooking(false);
        return;
      }

      console.log(`Found ${matchingWorkers.length} worker(s) for subcategory_id ${subcategoryId}`);

      // Prepare a descriptive summary of selected services for the booking
      const uniqueServiceNames = Array.from(
        new Set(
          cartItems
            .map((item) => item?.service?.name?.trim())
            .filter((name): name is string => Boolean(name))
        )
      );
      const bookingDescription =
        uniqueServiceNames.length > 0
          ? `Booking for ${uniqueServiceNames.join(', ')}`
          : `Booking for ${cartItems.length} service(s)`;

      const trimmedContactName = contactName.trim();
      const trimmedContactPhone = contactPhone.trim();
      const bookingContactName = trimmedContactName || user?.name || 'Guest user';
      const bookingContactNumber = trimmedContactPhone || user?.mobile || null;

      // Create booking for each worker with the same booking_id
      const bookingPromises = matchingWorkers.map(async (worker: any) => {
        const bookingData = {
          booking_id: bookingId,  // Same booking_id for all workers
          worker_id: worker.id,   // Different worker_id for each booking
          user_id: user.id,
          contact_number: bookingContactNumber,
          contact_name: bookingContactName,
          work_location: workLocation,
          work_location_lat: savedLocation?.latitude || null,
          work_location_lng: savedLocation?.longitude || null,
          booking_time: localDateTimeString,
          status: 0,
          description: bookingDescription,
          work_documents: null
        };

        const response = await fetch(API_ENDPOINTS.BOOKINGS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to book worker ${worker.name}: ${errorData.message || 'Unknown error'}`);
        }

        return await response.json();
      });

      // Wait for all bookings to be created
      const results = await Promise.all(bookingPromises);
      
      console.log(`Successfully created ${results.length} booking(s) with booking_id: ${bookingId}`);

      // Show waiting modal with animation
      setIsBooking(false);
      setCurrentBookingId(bookingId);
      setShowWaitingModal(true);
      
      // Start loading animations
      startLoadingAnimations();
      
      // Start polling for booking status
      startBookingStatusPolling(bookingId);

    } catch (error) {
      console.error('Booking error:', error);
      setIsBooking(false);
      setShowWaitingModal(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      Alert.alert(
        'Booking Failed',
        error instanceof Error ? error.message : 'Failed to create booking. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Start circular progress ring with orbiting particles animation
  const startLoadingAnimations = () => {
    // Continuous ring rotation
    ringRotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(ringRotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Progress fill animation (0 to 100%)
    progressAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false, // Need false for strokeDashoffset
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Orbiting particles (3 particles orbiting around the ring)
    particle1Anim.setValue(0);
    Animated.loop(
      Animated.timing(particle1Anim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    particle2Anim.setValue(0);
    Animated.loop(
      Animated.timing(particle2Anim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();

    particle3Anim.setValue(0);
    Animated.loop(
      Animated.timing(particle3Anim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing center icon
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Timer rotation (clockwise - left to right)
    timerRotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(timerRotateAnim, {
        toValue: 1,
        duration: 2000, // 2 seconds per full rotation
        useNativeDriver: true,
      })
    ).start();
  };

  // Poll booking status until status != 0
  const startBookingStatusPolling = (bookingId: string) => {
    if (!user?.id) return;

    const pollBookingStatus = async () => {
      try {
        // Fetch all records for the booking_id to check all statuses
        const response = await fetch(`${API_ENDPOINTS.TOTAL_BOOKINGS_BY_USER(user.id.toString())}?skip_payment_check=true`);
        if (!response.ok) {
          console.error('Failed to fetch booking status');
          return;
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          // Get all bookings with the same booking_id
          const allBookingsWithSameId = result.data.filter((b: any) => b.booking_id === bookingId);
          
          if (allBookingsWithSameId.length > 0) {
            // Check if ANY booking has status = 1
            const confirmedBooking = allBookingsWithSameId.find((b: any) => {
              const status = parseInt(b.status);
              return status === 1;
            });
            // Check if ALL bookings with same booking_id have status = 3 (No workers available)
            const allStatus4 = allBookingsWithSameId.every((b: any) => {
              const status = parseInt(b.status);
              return status === 4;
            });
            // Only show popup if ALL records with same booking_id have status = 3
            if (allStatus4) {
              console.log(`❌ Booking ${bookingId} - All records have status 3 (No workers available)`);
              
              // Stop polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              
              // Stop animations
              ringRotateAnim.stopAnimation();
              particle1Anim.stopAnimation();
              particle2Anim.stopAnimation();
              particle3Anim.stopAnimation();
              progressAnim.stopAnimation();
              pulseAnim.stopAnimation();
              timerRotateAnim.stopAnimation();
              // Close waiting modal
              setShowWaitingModal(false);
              setCurrentBookingId(null);
              // Show no workers modal
              setShowNoWorkersModal(true);
            } else if (confirmedBooking) {
             
              // Stop polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              
              // Stop animations
              ringRotateAnim.stopAnimation();
              particle1Anim.stopAnimation();
              particle2Anim.stopAnimation();
              particle3Anim.stopAnimation();
              progressAnim.stopAnimation();
              pulseAnim.stopAnimation();
              timerRotateAnim.stopAnimation();
              
              // Close modal
              setShowWaitingModal(false);
              setCurrentBookingId(null);
              
              // Initiate Razorpay payment
              initiateRazorpayPayment(bookingId);
            }
          }
        }
      } catch (error) {
        console.error('Error polling booking status:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollBookingStatus, 2000);
    pollingIntervalRef.current = interval;
    
    // Initial poll
    pollBookingStatus();
  };

  // Initiate Razorpay payment
  const initiateRazorpayPayment = (bookingId: string) => {
    const options = {
      description: `Payment for booking ${bookingId}`,
      image: 'https://originxdev.in/originxdev/images/OriginX.png', // Replace with your logo URL
      currency: 'INR',
      key: 'rzp_test_w4JrW6r3ftMyxp',
      amount: totalAmount * 100, // Razorpay accepts amount in paise (multiply by 100)
      name: 'OriginX',
      order_id: '', // Can be generated from backend if needed
      prefill: {
        email: user?.email || '',
        contact: user?.mobile || '',
        name: user?.name || '',
      },
      theme: { color: '#8B5CF6' },
    };

    RazorpayCheckout.open(options)
      .then(async (data: any) => {
        // Payment success - update booking payment status and amount
        try {
          // Extract payment_id from Razorpay response
          const razorpayPaymentId = data.razorpay_payment_id || data.payment_id || '';
          const response = await fetch(API_ENDPOINTS.UPDATE_BOOKING_PAYMENT(bookingId), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              payment_status: 1,
              amount: totalAmount,
              payment_id: razorpayPaymentId,
            }),
          });

          const result = await response.json();
          
          if (result.success) {
            console.log('✅ Payment status and amount updated successfully');
            // Show success modal
            setShowSuccessModal(true);
          } else {
            console.error('❌ Failed to update payment status:', result.message);
            Alert.alert(
              'Payment Successful',
              'Payment completed, but there was an issue updating the booking. Please contact support.\n\nBooking ID: ' + bookingId,
              [{ text: 'OK', onPress: () => setShowSuccessModal(true) }]
            );
          }
        } catch (error) {
          console.error('❌ Error updating payment status:', error);
          Alert.alert(
            'Payment Successful',
            'Payment completed, but there was an issue updating the booking. Please contact support.\n\nBooking ID: ' + bookingId,
            [{ text: 'OK', onPress: () => setShowSuccessModal(true) }]
          );
        }
      })
      .catch((error: any) => {
        // Payment failed or cancelled
        console.log('❌ Payment failed:', error);
        setPaymentFailedMessage(error.description || 'Please try again.');
        setPaymentFailedBookingId(bookingId);
        setShowPaymentFailedModal(true);
      });
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      ringRotateAnim.stopAnimation();
      particle1Anim.stopAnimation();
      particle2Anim.stopAnimation();
      particle3Anim.stopAnimation();
      progressAnim.stopAnimation();
      pulseAnim.stopAnimation();
      timerRotateAnim.stopAnimation();
    };
  }, []);

  const loadSavedLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      const stored = await AsyncStorage.getItem('defaultLocation');
      if (stored) {
        const location = JSON.parse(stored);
        setSavedLocation(location);
        setSelectedAddressId(location.id || 'default');
      } else {
        setSavedLocation(null);
        setSelectedAddressId(null);
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
      setSavedLocation(null);
      setSelectedAddressId(null);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const loadSavedAddresses = useCallback(async () => {
    try {
      const defaultLoc = await AsyncStorage.getItem('defaultLocation');
      const savedAddrs = await AsyncStorage.getItem('savedAddresses');
      
      const addresses: any[] = [];
      
      // Add default location if exists
      if (defaultLoc) {
        const defaultAddr = JSON.parse(defaultLoc);
        addresses.push({ ...defaultAddr, id: 'default', isDefault: true });
      }
      
      // Add other saved addresses
      if (savedAddrs) {
        const parsed = JSON.parse(savedAddrs);
        if (Array.isArray(parsed)) {
          addresses.push(...parsed);
        }
      }
      
      setSavedAddresses(addresses);
      if (addresses.length > 0) {
        const currentSelected = selectedAddressId || savedLocation?.id || 'default';
        const exists = addresses.some(addr => (addr.id || 'default') === currentSelected);
        if (!exists || !selectedAddressId) {
          setSelectedAddressId(addresses[0].id || 'default');
        }
      }
    } catch (error) {
      console.error('Error loading saved addresses:', error);
      setSavedAddresses([]);
    }
  }, [selectedAddressId, savedLocation]);

  useEffect(() => {
    loadSavedLocation();
  }, [loadSavedLocation]);

  useFocusEffect(
    useCallback(() => {
      loadSavedLocation();
    }, [loadSavedLocation])
  );

  const formattedLocation = useMemo(() => {
    if (locationLoading) {
      return 'Loading address...';
    }
    if (!savedLocation) {
      return 'Select where you want the professional to visit';
    }
    const parts = [savedLocation.flatNo, savedLocation.landmark, savedLocation.address]
      .filter(Boolean)
      .join(', ');
    return parts || 'Tap to choose address for this booking';
  }, [locationLoading, savedLocation]);

  const addressIconName = useMemo(() => {
    const type = savedLocation?.saveAsType?.toLowerCase() || '';
    if (type.includes('home')) {
      return 'home-outline';
    }
    if (type.includes('work') || type.includes('office')) {
      return 'briefcase-outline';
    }
    if (type.includes('shop') || type.includes('store')) {
      return 'storefront-outline';
    }
    return 'location-outline';
  }, [savedLocation?.saveAsType]);

  const displayLocationText = useMemo(() => {
    if (savedLocation) {
      const label = savedLocation.saveAsType || 'Address';
      return `${label} - ${formattedLocation}`;
    }
    return formattedLocation;
  }, [formattedLocation, savedLocation]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setSuggestionsLoading(true);
        const response = await fetch(`${getBaseUrl()}/top-services?format=services`);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const mapped: CartService[] = data.data.slice(0, 10).map((service: any) => ({
            id: service.id,
            name: service.name,
            price: service.price || service.deal_price || 0,
            image: service.image
              ? (service.image.startsWith('http')
                ? service.image
                : `${getBaseUrl().replace('/api', '')}${service.image}`)
              : undefined,
          }));
          setSuggestedServices(mapped);
        } else {
          setSuggestedServices([]);
        }
      } catch (error) {
        console.error('Error fetching suggested services:', error);
        setSuggestedServices([]);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={getIconSize(22)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout Items</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: footerPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.cartList}>
            {cartItems.map((item, index) => (
              <View 
                key={item.service.id} 
                style={[
                  styles.cartItem,
                  index === cartItems.length - 1 && styles.cartItemLast
                ]}
              >
                <View style={styles.cartItemInfo}>
                  {item.service.image ? (
                    <Image source={{ uri: item.service.image }} style={styles.cartItemImage} />
                  ) : (
                    <View style={styles.cartItemPlaceholder}>
                      <Ionicons name="image-outline" size={getIconSize(20)} color="#8B5CF6" />
                    </View>
                  )}
                  <View style={styles.cartItemDetails}>
                    <Text style={styles.cartItemName}>{item.service.name}</Text>
                    <Text style={styles.cartItemPrice}>₹{item.service.price || 0}</Text>
                  </View>
                </View>
                <View style={styles.cartItemActions}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => decrementItem(item.service.id)}
                  >
                    <Ionicons name="remove" size={getIconSize(16)} color="#8B5CF6" />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => incrementItem(item.service.id, item.service)}
                  >
                    <Ionicons name="add" size={getIconSize(16)} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* {suggestionsLoading ? null : suggestedServices.length > 0 && (
            <View style={[styles.section, styles.suggestionsSection]}>
              <Text style={styles.sectionTitle}>Frequently added services</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsRow}
              >
                {suggestedServices.map(service => {
                  const cardWidth = screenWidth * 0.35;
                  const approxCharsPerLine = 16;
                  const estimatedLines = Math.min(3, Math.ceil(service.name.length / approxCharsPerLine));
                  const baseImageHeight = 105;
                  const adjustedHeight =
                    baseImageHeight +
                    Math.max(0, 2 - estimatedLines) * 18 -
                    Math.max(0, estimatedLines - 2) * 12;
                  const imageHeight = Math.max(80, Math.min(140, adjustedHeight));

                  return (
                    <View key={service.id} style={[styles.suggestionCard, { width: cardWidth }]}>
                      {service.image ? (
                        <Image source={{ uri: service.image }} style={[styles.suggestionImage, { height: imageHeight }]} />
                      ) : (
                        <View style={[styles.suggestionPlaceholder, { height: imageHeight }]}>
                          <Ionicons name="image-outline" size={getIconSize(20)} color="#8B5CF6" />
                        </View>
                      )}
                      <Text style={styles.suggestionName} numberOfLines={2}>
                        {service.name}
                      </Text>
                      <Text style={styles.suggestionPrice}>₹{service.price}</Text>
                      <TouchableOpacity
                        style={styles.suggestionAddButton}
                        onPress={() => handleAddSuggested(service)}
                      >
                        <Text style={styles.suggestionAddText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )} */}

          <View style={[styles.section, styles.couponSection]}>
            <View style={styles.couponRow}>
              <View style={styles.couponIcon}>
                <Ionicons name="pricetag-outline" size={getIconSize(16)} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.couponTitle}>Coupons and offers</Text>
                <Text style={styles.couponSubtitle}>Login/Sign up to view offers</Text>
              </View>
            </View>
          </View>

          {isAuthenticated && (
            <View style={[styles.section, styles.infoSection]}>
              <Text style={styles.sectionTitle}>Contact Info</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person-outline" size={getIconSize(18)} color="#FFFFFF" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{contactName || user?.name || 'Guest user'}</Text>
                  <Text style={styles.infoSubtitle}>{contactPhone || user?.mobile || 'Phone number unavailable'}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setContactName(contactName || user?.name || '');
                    setContactPhone(contactPhone || user?.mobile || '');
                    setShowContactModal(true);
                  }}
                >
                  <Text style={styles.infoActionText}>Change</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Item total</Text>
              <Text style={styles.summaryValue}>₹{itemTotal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Taxes and Fee</Text>
                <Text style={styles.summarySubLabel}>As per government guidelines</Text>
              </View>
              <Text style={styles.summaryValue}>₹{taxes}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Amount to pay</Text>
              <Text style={styles.summaryTotalValue}>₹{totalAmount}</Text>
            </View>
          </View>
        </ScrollView>

      <View style={styles.footer}>
        {isAuthenticated ? (
          <>
            {cartItems.length > 0 && (
              <TouchableOpacity
                style={styles.footerLocationCard}
                onPress={() => {
                  loadSavedAddresses();
                  setShowAddressModal(true);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.footerLocationIcon}>
                  <Ionicons name={addressIconName} size={getIconSize(18)} color="#FFFFFF" />
                </View>
                <View style={styles.footerLocationContent}>
                  <Text style={styles.footerLocationValue} numberOfLines={1}>
                    {displayLocationText}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    loadSavedAddresses();
                    setShowAddressModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={getIconSize(18)} color="#8B5CF6" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            
            {/* Booking Date/Time Card */}
            {cartItems.length > 0 && (hasInstantFilter || (selectedDate && selectedTime)) && (
              <TouchableOpacity
                style={styles.footerBookingCard}
                onPress={() => setShowSlotModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.footerBookingIcon}>
                  <Ionicons name="time-outline" size={getIconSize(18)} color="#FFFFFF" />
                </View>
                <View style={styles.footerBookingContent}>
                  <Text style={styles.footerBookingValue} numberOfLines={1}>
                    {formatBookingDateTime()}
                  </Text>
                </View>
                 <TouchableOpacity
                    onPress={() => setShowSlotModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={getIconSize(18)} color="#4CAF50" />
                  </TouchableOpacity>
              </TouchableOpacity>
            )}
            
            {cartItems.length > 0 && (
              <TouchableOpacity 
                style={[styles.primaryButton, styles.primaryButtonFull, isBooking && styles.primaryButtonDisabled]}
                onPress={handleBookNow}
                disabled={isBooking}
              >
                <Text style={styles.primaryButtonText}>
                  {isBooking ? 'Booking...' : (hasInstantFilter || (selectedDate && selectedTime) ? 'Book Now' : 'Select slot')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
            <Text style={styles.primaryButtonText}>Login/Sign up to proceed</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Saved Address Modal */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddressModal(false);
          setDeleteMenuAddressId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved address</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddressModal(false);
                  setDeleteMenuAddressId(null);
                }}
                style={styles.modalCloseButton}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={getIconSize(24)} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Add another address */}
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => {
                setShowAddressModal(false);
                router.push('/location-picker');
              }}
            >
              <Ionicons name="add" size={getIconSize(20)} color="#8B5CF6" />
              <Text style={styles.addAddressText}>Add another address</Text>
            </TouchableOpacity>

            {/* Address List */}
            <ScrollView style={styles.addressList} showsVerticalScrollIndicator={false}>
              {savedAddresses.map((address, index) => {
                const addressKey = `${address.id || 'default'}-${index}`;
                const isSelected = selectedAddressId === (address.id || 'default');
                const addressIcon = address.saveAsType?.toLowerCase().includes('home')
                  ? 'home-outline'
                  : address.saveAsType?.toLowerCase().includes('work')
                  ? 'briefcase-outline'
                  : address.saveAsType?.toLowerCase().includes('shop')
                  ? 'storefront-outline'
                  : 'location-outline';

                return (
                  <TouchableOpacity
                    key={addressKey}
                    style={styles.addressItem}
                    onPress={() => {
                      setSelectedAddressId(address.id || 'default');
                      setDeleteMenuAddressId(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressItemLeft}>
                      <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                      </View>
                      <View style={styles.addressItemContent}>
                        <View style={styles.addressItemHeader}>
                          <Text style={styles.addressItemLabel}>
                            {address.saveAsType || 'Home'}
                          </Text>
                          <TouchableOpacity
                            style={styles.addressMenuButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              setDeleteMenuAddressId(
                                deleteMenuAddressId === (address.id || 'default')
                                  ? null
                                  : (address.id || 'default')
                              );
                            }}
                          >
                            <Ionicons name="ellipsis-vertical" size={getIconSize(18)} color="#666" />
                          </TouchableOpacity>
                        </View>
                        {deleteMenuAddressId === (address.id || 'default') && (
                          <View style={styles.deleteMenuContainer}>
                            <TouchableOpacity
                              style={styles.deleteOption}
                              onPress={async () => {
                                const addressToDelete = address.id || 'default';
                                if (addressToDelete === 'default') {
                                  // Delete default location
                                  await AsyncStorage.removeItem('defaultLocation');
                                  setSavedLocation(null);
                                  setSelectedAddressId(null);
                                } else {
                                  // Delete from saved addresses
                                  const savedAddrs = await AsyncStorage.getItem('savedAddresses');
                                  if (savedAddrs) {
                                    const parsed = JSON.parse(savedAddrs);
                                    const filtered = parsed.filter(
                                      (addr: any) => addr.id !== addressToDelete
                                    );
                                    await AsyncStorage.setItem('savedAddresses', JSON.stringify(filtered));
                                  }
                                }
                                setDeleteMenuAddressId(null);
                                loadSavedAddresses();
                                loadSavedLocation();
                              }}
                            >
                              <Ionicons name="trash-outline" size={getIconSize(16)} color="#FF3B30" />
                              <Text style={styles.deleteOptionText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <Text style={styles.addressItemAddress}>
                          {[address.flatNo, address.landmark, address.address]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                        <Text style={styles.addressItemPhone}>
                          {user?.name || 'User'}, {user?.mobile || ''}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Proceed Button */}
            <TouchableOpacity
              style={styles.modalProceedButton}
              onPress={() => {
                const selected = savedAddresses.find(
                  (addr) => (addr.id || 'default') === selectedAddressId
                );
                if (selected) {
                  setSavedLocation(selected);
                  AsyncStorage.setItem('defaultLocation', JSON.stringify(selected));
                }
                setShowAddressModal(false);
                loadSavedLocation();
              }}
            >
              <Text style={styles.modalProceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isAuthenticated && (
        <Modal
          visible={showContactModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowContactModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.contactModalContent}>
              <View style={styles.contactModalHeader}>
                <Text style={styles.contactModalTitle}>Contact for booking updates</Text>
                <TouchableOpacity
                  onPress={() => setShowContactModal(false)}
                  style={styles.modalCloseButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={getIconSize(20)} color="#000" />
                </TouchableOpacity>
              </View>
              <Text style={styles.contactModalSubtitle}>
                Professional will contact at this number, and a tracking link will be shared
              </Text>
              <View style={styles.contactPhoneRow}>
                <View style={styles.contactPhoneInputWrapper}>
                  <Text style={styles.contactCountryCode}>+91</Text>
                  <TextInput
                    style={styles.contactPhoneInput}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={12}
                  />
                  <TouchableOpacity style={styles.contactBookButton}>
                    <Ionicons name="book-outline" size={getIconSize(18)} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.contactInputGroup}>
                <TextInput
                  style={styles.contactNameInput}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Name"
                  placeholderTextColor="#999"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.contactSaveButton,
                  (isSavingContact || !contactName.trim() || !contactPhone.trim()) && styles.contactSaveButtonDisabled,
                ]}
                onPress={handleSaveContactDetails}
                disabled={isSavingContact || !contactName.trim() || !contactPhone.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.contactSaveButtonText}>
                  {isSavingContact ? 'Saving...' : 'Save details'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Slot Selection Modal */}
      <Modal
        visible={showSlotModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSlotModal(false)}
      >
        <View style={styles.slotModalOverlay}>
          {/* Close button outside modal */}
          <TouchableOpacity
            onPress={() => setShowSlotModal(false)}
            style={styles.slotModalCloseOutside}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={getIconSize(24)} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.slotModalContent}>
            <ScrollView
              style={styles.slotModalScroll}
              contentContainerStyle={styles.slotModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Main Question */}
              <Text style={styles.slotQuestion}>When should the professional arrive?</Text>
              {/* Date Selection */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateSelectionContainer}
                style={styles.dateSelectionScroll}
              >
                {dateOptions.map((date, index) => {
                  const isSelected = selectedDate && 
                    date.getDate() === selectedDate.getDate() &&
                    date.getMonth() === selectedDate.getMonth() &&
                    date.getFullYear() === selectedDate.getFullYear();
                  const dateFormatted = formatDate(date);
                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[
                        styles.dateButton,
                        isSelected && styles.dateButtonSelected,
                      ]}
                      onPress={() => setSelectedDate(date)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.dateButtonDayText,
                        isSelected && styles.dateButtonDayTextSelected,
                      ]}>
                        {dateFormatted.day}
                      </Text>
                      <Text style={[
                        styles.dateButtonDateText,
                        isSelected && styles.dateButtonDateTextSelected,
                      ]}>
                        {dateFormatted.date}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time Selection */}
              <Text style={styles.timeSelectionTitle}>Select start time of service</Text>
              <View style={styles.timeSlotsGrid}>
                {timeSlots.map((slot) => {
                  const isSelected = selectedTime === slot.value;
                  const isToday = selectedDate ? isSameDay(selectedDate, new Date()) : false;
                  const isPastForToday =
                    isToday &&
                    !availableSlotSet.has(slot.value);
                  const slotDisabled = isPastForToday;
                  return (
                    <TouchableOpacity
                      key={slot.value}
                      style={[
                        styles.timeSlotButton,
                        isSelected && styles.timeSlotButtonSelected,
                        slotDisabled && styles.timeSlotButtonDisabled
                      ]}
                      onPress={() => !slotDisabled && setSelectedTime(slot.value)}
                      activeOpacity={slotDisabled ? 1 : 0.7}
                      disabled={slotDisabled}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotTextSelected,
                        slotDisabled && styles.timeSlotTextDisabled
                      ]}>
                        {slot.display}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Proceed Button */}
            <TouchableOpacity
              style={[
                styles.slotProceedButton,
                (!selectedDate || !selectedTime) && styles.slotProceedButtonDisabled
              ]}
              onPress={() => {
                if (selectedDate && selectedTime) {
                  setShowSlotModal(false);
                }
              }}
              activeOpacity={0.85}
              disabled={!selectedDate || !selectedTime}
            >
              <Text style={styles.slotProceedButtonText}>
                Proceed to checkout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Waiting for Confirmation Modal */}
      <Modal
        visible={showWaitingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // Prevent closing
      >
        <View style={styles.waitingModalOverlay}>
          <View style={styles.waitingModalContent}>
            {/* Circular progress ring with orbiting particles */}
            <View style={styles.ringLoaderContainer}>
              {/* Outer rotating ring */}
              <Animated.View
                style={[
                  styles.progressRing,
                  {
                    transform: [
                      {
                        rotate: ringRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Progress segments */}
                <View style={[styles.ringSegment, styles.ringSegment1]} />
                <View style={[styles.ringSegment, styles.ringSegment2]} />
                <View style={[styles.ringSegment, styles.ringSegment3]} />
                <View style={[styles.ringSegment, styles.ringSegment4]} />
              </Animated.View>

              {/* Orbiting particles */}
              <Animated.View
                style={[
                  styles.orbitingParticle,
                  styles.particle1,
                  {
                    transform: [
                      {
                        rotate: particle1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                      {
                        translateX: 45,
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.orbitingParticle,
                  styles.particle2,
                  {
                    transform: [
                      {
                        rotate: particle2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['120deg', '480deg'],
                        }),
                      },
                      {
                        translateX: 45,
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.orbitingParticle,
                  styles.particle3,
                  {
                    transform: [
                      {
                        rotate: particle3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['240deg', '600deg'],
                        }),
                      },
                      {
                        translateX: 45,
                      },
                    ],
                  },
                ]}
              />

              {/* Rotating hourglass icon in center */}
              <Animated.View
                style={[
                  styles.centerIconRing,
                  {
                    transform: [
                      { scale: pulseAnim },
                      {
                        rotate: timerRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'], // Clockwise rotation (left to right)
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="hourglass-outline" size={40} color="#8B5CF6" />
              </Animated.View>
            </View>
            
            {/* Waiting text */}
            <Text style={styles.waitingText}>Hang On a Moment...</Text>
            
            {/* Booking ID */}
            {currentBookingId && (
              <Text style={styles.bookingIdText}>Booking ID: {currentBookingId}</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            
            {/* Success Text */}
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successMessage}>
              Your payment has been completed successfully
            </Text>
            
            {/* OK Button */}
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/(tabs)');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Failed Modal */}
      <Modal
        visible={showPaymentFailedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentFailedModal(false)}
      >
        <View style={styles.failedModalOverlay}>
          <View style={styles.failedModalContent}>
            {/* Failed Icon */}
            <View style={styles.failedIconContainer}>
              <Ionicons name="close-circle" size={80} color="#FF3B30" />
            </View>
            
            {/* Failed Text */}
            <Text style={styles.failedTitle}>Payment Failed</Text>
            {paymentFailedBookingId && (
              <Text style={styles.failedBookingId}>Booking ID: {paymentFailedBookingId}</Text>
            )}
            
            {/* Action Buttons */}
            <View style={styles.failedButtonContainer}>
              <TouchableOpacity
                style={styles.failedRetryButton}
                onPress={() => {
                  setShowPaymentFailedModal(false);
                  if (paymentFailedBookingId) {
                    initiateRazorpayPayment(paymentFailedBookingId);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={getIconSize(20)} color="#FFFFFF" style={styles.failedButtonIcon} />
                <Text style={styles.failedRetryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.failedCancelButton}
                onPress={() => {
                  setShowPaymentFailedModal(false);
                  router.back();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={getIconSize(20)} color="#666" style={styles.failedButtonIcon} />
                <Text style={styles.failedCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* No Workers Available Modal */}
      <Modal
        visible={showNoWorkersModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNoWorkersModal(false)}
      >
        <View style={styles.noWorkersModalOverlay}>
          <View style={styles.noWorkersModalContent}>
            {/* Icon Container with Background */}
            <View style={styles.noWorkersIconWrapper}>
              <View style={styles.noWorkersIconBackground}>
                <Ionicons name="people-outline" size={getIconSize(70)} color="#FF9500" />
              </View>
            </View>
            
            {/* Message */}
            <Text style={styles.noWorkersTitle}>No Workers Available</Text>
            <Text style={styles.noWorkersSubtitle}>Try again later please</Text>
            
            {/* Decorative Line */}
            <View style={styles.noWorkersDivider} />
            
            {/* Action Button */}
            <TouchableOpacity
              style={styles.noWorkersButton}
              onPress={() => {
                setShowNoWorkersModal(false);
                router.back();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={getIconSize(18)} color="#FFFFFF" style={styles.noWorkersButtonIcon} />
              <Text style={styles.noWorkersButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F7FA',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getResponsiveWidth(20),
      paddingTop: getResponsiveValue(35, 25, 45),
      paddingBottom: getResponsiveValue(10, 8, 12),
      backgroundColor: '#8B5CF6',
    },
    backButton: {
      marginRight: getResponsiveSpacing(12),
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700',
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: getResponsiveWidth(12),
    },
    cartList: {
      backgroundColor: '#ebe6f3ff',
      borderRadius: getResponsiveSpacing(16),
      paddingVertical: getResponsiveSpacing(10),
      paddingHorizontal: getResponsiveSpacing(8),
      marginTop: getResponsiveValue(8, 6, 10),
      marginBottom: getResponsiveValue(14, 12, 16),
      marginHorizontal: getResponsiveWidth(6),
      borderWidth: 1,
      borderColor: '#E8D5FF',
      // shadowColor: '#8B5CF6',
      // shadowOffset: { width: 0, height: 2 },
      // shadowOpacity: 0.1,
      // shadowRadius: 8,
      // elevation: 3,
    },
    cartItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: getResponsiveValue(12, 8, 16),
      paddingHorizontal: getResponsiveSpacing(8),
      borderBottomWidth: 1,
      borderBottomColor: '#D4C4F0',
    },
    cartItemLast: {
      borderBottomWidth: 0,
    },
    cartItemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: getResponsiveSpacing(12),
    },
    cartItemImage: {
      width: getResponsiveWidth(56, 48, 64),
      height: getResponsiveWidth(56, 48, 64),
      borderRadius: getResponsiveSpacing(10),
      marginRight: getResponsiveSpacing(12),
    },
    cartItemPlaceholder: {
      width: getResponsiveWidth(56, 48, 64),
      height: getResponsiveWidth(56, 48, 64),
      borderRadius: getResponsiveSpacing(10),
      backgroundColor: '#E8D5FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getResponsiveSpacing(12),
    },
    cartItemDetails: {
      flex: 1,
    },
    cartItemName: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#333',
      marginBottom: getResponsiveSpacing(4),
    },
    cartItemPrice: {
      fontSize: getResponsiveFontSize(14),
      color: '#8B5CF6',
      fontWeight: '600',
    },
    cartItemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(20),
      paddingHorizontal: getResponsiveSpacing(8),
      paddingVertical: getResponsiveSpacing(4),
      backgroundColor: '#FFFFFF',
    },
    quantityButton: {
      padding: getResponsiveSpacing(4),
    },
    quantityValue: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#8B5CF6',
      marginHorizontal: getResponsiveSpacing(8),
    },
    section: {
      marginTop: getResponsiveValue(0, 0, 0),
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(16),
      padding: getResponsiveSpacing(16),
      marginHorizontal: -getResponsiveWidth(8),
    },
    sectionTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#8B5CF6',
      marginBottom: getResponsiveValue(16, 12, 20),
    },
    suggestionsRow: {
      gap: getResponsiveSpacing(16),
    },
    suggestionCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F0F0F0',
      borderRadius: getResponsiveSpacing(16),
      padding: getResponsiveSpacing(12),
    },
    suggestionImage: {
      width: '100%',
      height: getResponsiveValue(90, 80, 100),
      borderRadius: getResponsiveSpacing(12),
      marginBottom: getResponsiveValue(10, 8, 12),
    },
    suggestionPlaceholder: {
      width: '100%',
      height: getResponsiveValue(90, 80, 100),
      borderRadius: getResponsiveSpacing(12),
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: getResponsiveValue(10, 8, 12),
    },
    suggestionName: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#000',
      marginBottom: getResponsiveSpacing(6),
    },
    suggestionPrice: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginBottom: getResponsiveSpacing(8),
    },
    suggestionAddButton: {
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(20),
      paddingVertical: getResponsiveSpacing(4),
      alignItems: 'center',
    },
    suggestionAddText: {
      color: '#8B5CF6',
      fontWeight: '600',
      fontSize: getResponsiveFontSize(14),
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getResponsiveSpacing(14),
      borderRadius: getResponsiveSpacing(16),
      borderWidth: 1,
      borderColor: '#D4C4F0',
      backgroundColor: '#F0E8FF',
      marginTop: getResponsiveValue(-6, -4, -8),
      marginBottom: getResponsiveSpacing(16),
    },
    infoIcon: {
      width: getResponsiveWidth(40, 34, 46),
      height: getResponsiveWidth(40, 34, 46),
      borderRadius: getResponsiveSpacing(20),
      backgroundColor: '#8B5CF6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(12),
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      fontSize: getResponsiveFontSize(15),
      fontWeight: '700',
      color: '#000',
    },
    infoSubtitle: {
      fontSize: getResponsiveFontSize(13),
      color: '#555',
      marginTop: getResponsiveSpacing(2),
    },
    infoSection: {
      marginTop: getResponsiveValue(-18, -16, -20),
      marginBottom: getResponsiveValue(-22, -20, -24),
    },
    couponSection: {
      marginTop: getResponsiveValue(-18, -16, -20),
    },
    suggestionsSection: {
      marginTop: getResponsiveValue(0, 0, 0),
    },
    infoActionText: {
      color: '#8B5CF6',
      fontWeight: '600',
      fontSize: getResponsiveFontSize(13),
    },
    couponRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getResponsiveValue(12, 10, 14),
      paddingHorizontal: getResponsiveSpacing(12),
      borderWidth: 1,
      borderColor: '#FFE5B4',
      borderRadius: getResponsiveSpacing(16),
      backgroundColor: '#FFF8E7',
    },
    couponIcon: {
      width: getResponsiveWidth(32, 28, 36),
      height: getResponsiveWidth(32, 28, 36),
      borderRadius: getResponsiveSpacing(16),
      backgroundColor: '#FFB84D',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(12),
    },
    couponTitle: {
      fontSize: getResponsiveFontSize(15),
      fontWeight: '600',
      color: '#FF6B00',
    },
    couponSubtitle: {
      fontSize: getResponsiveFontSize(13),
      color: '#CC6600',
      marginTop: getResponsiveSpacing(2),
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveValue(12, 10, 14),
    },
    summaryLabel: {
      fontSize: getResponsiveFontSize(15),
      color: '#666',
    },
    summarySubLabel: {
      fontSize: getResponsiveFontSize(12),
      color: '#999',
    },
    summaryValue: {
      fontSize: getResponsiveFontSize(15),
      color: '#333',
      fontWeight: '600',
    },
    summaryDivider: {
      height: 2,
      backgroundColor: '#E8D5FF',
      marginVertical: getResponsiveSpacing(8),
      borderRadius: getResponsiveSpacing(1),
    },
    summaryTotalLabel: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '700',
      color: '#8B5CF6',
    },
    summaryTotalValue: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#8B5CF6',
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: getResponsiveSpacing(12),
      paddingBottom: getResponsiveSpacing(10),
      paddingTop: getResponsiveSpacing(2),
      backgroundColor: '#FFFFFF',
    
    },
    footerLocationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getResponsiveSpacing(10),
      borderWidth: 1.5,
      borderColor: '#D4C4F0',
      borderRadius: getResponsiveSpacing(16),
      marginBottom: getResponsiveSpacing(6),
      backgroundColor: '#F8F5FF',
    },
    footerLocationIcon: {
      width: getResponsiveWidth(34, 30, 40),
      height: getResponsiveWidth(34, 30, 40),
      borderRadius: getResponsiveSpacing(17),
      backgroundColor: '#8B5CF6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(10),
    },
    footerLocationContent: {
      flex: 1,
    },
    footerLocationValue: {
      fontSize: getResponsiveFontSize(13),
      color: '#5A4A7A',
      fontWeight: '500',
    },
    footerBookingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getResponsiveSpacing(10),
      borderWidth: 1.5,
      borderColor: '#B8E6B8',
      borderRadius: getResponsiveSpacing(16),
      marginBottom: getResponsiveSpacing(6),
      backgroundColor: '#F0FFF4',
    },
    footerBookingIcon: {
      width: getResponsiveWidth(34, 30, 40),
      height: getResponsiveWidth(34, 30, 40),
      borderRadius: getResponsiveSpacing(17),
      backgroundColor: '#4CAF50',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(10),
    },
    footerBookingContent: {
      flex: 1,
    },
    footerBookingValue: {
      fontSize: getResponsiveFontSize(13),
      color: '#2E7D32',
      fontWeight: '500',
    },
    primaryButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(26),
      paddingVertical: getResponsiveValue(12, 10, 14),
      alignItems: 'center',
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    primaryButtonFull: {
      marginTop: getResponsiveSpacing(2),
    },
    primaryButtonDisabled: {
      backgroundColor: '#C4B5FD',
      opacity: 0.7,
    },
    primaryButtonText: {
      color: '#FFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      position: 'relative',
    },
    modalContent: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: getResponsiveSpacing(24),
      borderTopRightRadius: getResponsiveSpacing(24),
      maxHeight: screenHeight * 0.85,
      paddingBottom: getResponsiveValue(12, 10, 14),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getResponsiveWidth(20),
      paddingTop: getResponsiveValue(12, 10, 14),
      paddingBottom: getResponsiveValue(10, 8, 12),
      borderBottomWidth: 2,
      borderBottomColor: '#E8D5FF',
      backgroundColor: '#F8F5FF',
      borderTopLeftRadius: getResponsiveSpacing(24),
      borderTopRightRadius: getResponsiveSpacing(24),
    },
    modalTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#8B5CF6',
    },
    modalCloseButton: {
      width: getResponsiveWidth(32, 28, 36),
      height: getResponsiveWidth(32, 28, 36),
      borderRadius: getResponsiveSpacing(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    addAddressButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getResponsiveWidth(20),
      paddingVertical: getResponsiveValue(12, 10, 14),
      borderBottomWidth: 1,
      borderBottomColor: '#E8D5FF',
      backgroundColor: '#FFFFFF',
    },
    addAddressText: {
      fontSize: getResponsiveFontSize(15),
      fontWeight: '600',
      color: '#8B5CF6',
      marginLeft: getResponsiveSpacing(8),
    },
    addressList: {
      maxHeight: screenHeight * 0.4,
      paddingHorizontal: getResponsiveWidth(20),
    },
    addressItem: {
      paddingVertical: getResponsiveValue(12, 10, 14),
      paddingHorizontal: getResponsiveSpacing(8),
      marginHorizontal: getResponsiveSpacing(8),
      marginVertical: getResponsiveSpacing(4),
      borderRadius: getResponsiveSpacing(12),
      borderBottomWidth: 0,
      backgroundColor: '#F8F5FF',
    },
    addressItemLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    radioButton: {
      width: getResponsiveWidth(20, 18, 22),
      height: getResponsiveWidth(20, 18, 22),
      borderRadius: getResponsiveSpacing(10),
      borderWidth: 2,
      borderColor: '#8B5CF6',
      marginRight: getResponsiveSpacing(12),
      marginTop: getResponsiveSpacing(2),
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioButtonSelected: {
      borderColor: '#8B5CF6',
    },
    radioButtonInner: {
      width: getResponsiveWidth(10, 8, 12),
      height: getResponsiveWidth(10, 8, 12),
      borderRadius: getResponsiveSpacing(5),
      backgroundColor: '#8B5CF6',
    },
    addressItemContent: {
      flex: 1,
      position: 'relative',
    },
    addressItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getResponsiveSpacing(2),
    },
    addressItemLabel: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#000',
    },
    addressMenuButton: {
      padding: getResponsiveSpacing(4),
      position: 'relative',
    },
    deleteMenuContainer: {
      position: 'absolute',
      top: getResponsiveValue(-7, -7, 4),
      left: getResponsiveSpacing(170),
      backgroundColor: '#FFF',
      borderRadius: getResponsiveSpacing(8),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 10,
      minWidth: getResponsiveWidth(100, 90, 110),
    },
    deleteOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getResponsiveValue(10, 8, 12),
      paddingHorizontal: getResponsiveSpacing(12),
    },
    deleteOptionText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#FF3B30',
      marginLeft: getResponsiveSpacing(6),
    },
    addressItemAddress: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
      marginBottom: getResponsiveSpacing(2),
      lineHeight: getResponsiveFontSize(20),
    },
    addressItemPhone: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
    },
    modalProceedButton: {
      backgroundColor: '#8B5CF6',
      marginHorizontal: getResponsiveWidth(20),
      marginTop: getResponsiveValue(10, 8, 12),
      borderRadius: getResponsiveSpacing(30),
      paddingVertical: getResponsiveValue(12, 10, 14),
      alignItems: 'center',
    },
    modalProceedButtonText: {
      color: '#FFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    contactModalContent: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: getResponsiveSpacing(20),
      borderTopRightRadius: getResponsiveSpacing(20),
      paddingHorizontal: getResponsiveWidth(18),
      paddingTop: getResponsiveValue(14, 12, 18),
      paddingBottom: getResponsiveValue(16, 14, 20),
    },
    contactModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getResponsiveSpacing(6),
      paddingBottom: getResponsiveSpacing(8),
      borderBottomWidth: 2,
      borderBottomColor: '#E8D5FF',
    },
    contactModalTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#8B5CF6',
      flex: 1,
      marginRight: getResponsiveSpacing(8),
    },
    contactModalSubtitle: {
      fontSize: getResponsiveFontSize(13),
      color: '#666',
      marginTop: getResponsiveSpacing(2),
      marginBottom: getResponsiveSpacing(10),
    },
    contactPhoneRow: {
      marginBottom: getResponsiveSpacing(8),
    },
    contactPhoneInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#D4C4F0',
      borderRadius: getResponsiveSpacing(8),
      backgroundColor: '#F8F5FF',
      paddingHorizontal: getResponsiveSpacing(10),
      paddingVertical: getResponsiveSpacing(4),
    },
    contactCountryCode: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#000',
      marginRight: getResponsiveSpacing(8),
    },
    contactPhoneInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(14),
      color: '#000',
      paddingVertical: getResponsiveSpacing(6),
    },
    contactBookButton: {
      padding: getResponsiveSpacing(6),
      borderRadius: getResponsiveSpacing(6),
      backgroundColor: '#F4F0FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: getResponsiveSpacing(6),
    },
    contactInputGroup: {
      marginBottom: getResponsiveSpacing(12),
    },
    contactNameInput: {
      borderWidth: 1.5,
      borderColor: '#D4C4F0',
      borderRadius: getResponsiveSpacing(8),
      paddingHorizontal: getResponsiveSpacing(10),
      paddingVertical: getResponsiveSpacing(8),
      fontSize: getResponsiveFontSize(14),
      color: '#000',
      backgroundColor: '#F8F5FF',
    },
    contactSaveButton: {
      backgroundColor: '#8B5CF6',
      paddingVertical: getResponsiveSpacing(10),
      borderRadius: getResponsiveSpacing(10),
      alignItems: 'center',
    },
    contactSaveButtonDisabled: {
      backgroundColor: '#C4B5FD',
    },
    contactSaveButtonText: {
      color: '#FFF',
      fontSize: getResponsiveFontSize(15),
      fontWeight: '600',
    },
    slotModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    slotModalContent: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: getResponsiveSpacing(24),
      borderTopRightRadius: getResponsiveSpacing(24),
      height: screenHeight * 0.8,
      flexDirection: 'column',
    },
    slotModalCloseOutside: {
      position: 'absolute',
      top: getResponsiveValue(70, 60, 80),
      right: getResponsiveWidth(20),
      zIndex: 1000,
      width: getResponsiveWidth(40, 36, 44),
      height: getResponsiveWidth(40, 36, 44),
      borderRadius: getResponsiveSpacing(20),
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotModalScroll: {
      flex: 1,
    },
    slotModalScrollContent: {
      paddingHorizontal: getResponsiveWidth(20),
      paddingTop: getResponsiveValue(14, 12, 18),
      paddingBottom: getResponsiveValue(14, 12, 18),
      flexGrow: 1,
    },
    slotQuestion: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700',
      color: '#8B5CF6',
      marginBottom: getResponsiveSpacing(4),
    },
    dateSelectionScroll: {
      marginBottom: getResponsiveValue(14, 12, 18),
    },
    dateSelectionContainer: {
      flexDirection: 'row',
      paddingHorizontal: getResponsiveWidth(4),
      paddingVertical: getResponsiveValue(10, 8, 12),
    },
    dateButton: {
      width: (screenWidth - getResponsiveWidth(8) - (getResponsiveSpacing(6) * 4)) / 5,
      paddingVertical: getResponsiveValue(10, 8, 12),
      paddingHorizontal: getResponsiveSpacing(8),
      borderRadius: getResponsiveSpacing(10),
      borderWidth: 1,
      borderColor: '#E0E0E0',
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(6),
      flexDirection: 'column',
    },
    dateButtonSelected: {
      backgroundColor: '#8B5CF6',
      borderColor: '#8B5CF6',
    },
    dateButtonDayText: {
      fontSize: getResponsiveFontSize(11),
      fontWeight: '500',
      color: '#666',
      marginBottom: getResponsiveSpacing(2),
    },
    dateButtonDayTextSelected: {
      color: '#FFFFFF',
    },
    dateButtonDateText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#333',
    },
    dateButtonDateTextSelected: {
      color: '#FFFFFF',
    },
    timeSelectionTitle: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#8B5CF6',
      marginBottom: getResponsiveValue(10, 8, 12),
    },
    timeSlotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: getResponsiveValue(12, 10, 14),
      justifyContent: 'flex-start',
      marginHorizontal: -getResponsiveSpacing(5),
    },
    timeSlotButton: {
      width: (screenWidth - getResponsiveWidth(60) - getResponsiveSpacing(20)) / 3,
      paddingVertical: getResponsiveValue(12, 10, 14),
      paddingHorizontal: getResponsiveSpacing(8),
      borderRadius: getResponsiveSpacing(10),
      borderWidth: 1,
      borderColor: '#E0E0E0',
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: getResponsiveSpacing(5),
      marginBottom: getResponsiveSpacing(10),
    },
    timeSlotButtonSelected: {
      backgroundColor: '#8B5CF6',
      borderColor: '#8B5CF6',
    },
    timeSlotText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '500',
      color: '#333',
    },
    timeSlotTextSelected: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    timeSlotButtonDisabled: {
      opacity: 0.5,
      backgroundColor: '#F5F5F5',
    },
    timeSlotTextDisabled: {
      opacity: 0.5,
    },
    slotProceedButton: {
      backgroundColor: '#8B5CF6',
      marginHorizontal: getResponsiveWidth(20),
      marginTop: getResponsiveValue(10, 8, 12),
      marginBottom: getResponsiveValue(2, 0, 4),
      borderRadius: getResponsiveSpacing(30),
      paddingVertical: getResponsiveValue(14, 12, 16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotProceedButtonDisabled: {
      backgroundColor: '#C4B5FD',
    },
    slotProceedButtonText: {
      color: '#FFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    waitingModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    waitingModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(24),
      padding: getResponsiveSpacing(30),
      alignItems: 'center',
      minWidth: screenWidth * 0.6,
      maxWidth: screenWidth * 0.8,
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 15,
    },
    ringLoaderContainer: {
      width: getResponsiveWidth(140, 120, 160),
      height: getResponsiveWidth(140, 120, 160),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: getResponsiveValue(35, 30, 40),
      position: 'relative',
    },
    progressRing: {
      width: getResponsiveWidth(120, 100, 140),
      height: getResponsiveWidth(120, 100, 140),
      borderRadius: getResponsiveWidth(60, 50, 70),
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
    ringSegment: {
      position: 'absolute',
      width: getResponsiveWidth(120, 100, 140),
      height: getResponsiveWidth(120, 100, 140),
      borderRadius: getResponsiveWidth(60, 50, 70),
      borderWidth: 5,
    },
    ringSegment1: {
      borderTopColor: '#8B5CF6',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    ringSegment2: {
      borderTopColor: 'transparent',
      borderRightColor: '#4CAF50',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    ringSegment3: {
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: '#FF6B6B',
      borderLeftColor: 'transparent',
    },
    ringSegment4: {
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: '#FFA726',
    },
    orbitingParticle: {
      position: 'absolute',
      width: getResponsiveWidth(14, 12, 16),
      height: getResponsiveWidth(14, 12, 16),
      borderRadius: getResponsiveWidth(7, 6, 8),
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 4,
      elevation: 6,
    },
    particle1: {
      backgroundColor: '#8B5CF6',
      top: '50%',
      left: '50%',
      marginTop: getResponsiveWidth(-7, -6, -8),
      marginLeft: getResponsiveWidth(-7, -6, -8),
    },
    particle2: {
      backgroundColor: '#4CAF50',
      top: '50%',
      left: '50%',
      marginTop: getResponsiveWidth(-7, -6, -8),
      marginLeft: getResponsiveWidth(-7, -6, -8),
    },
    particle3: {
      backgroundColor: '#FF6B6B',
      top: '50%',
      left: '50%',
      marginTop: getResponsiveWidth(-7, -6, -8),
      marginLeft: getResponsiveWidth(-7, -6, -8),
    },
    centerIconRing: {
      width: getResponsiveWidth(70, 60, 80),
      height: getResponsiveWidth(70, 60, 80),
      borderRadius: getResponsiveWidth(35, 30, 40),
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#E8D5FF',
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
    },
    waitingText: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#333',
      marginBottom: getResponsiveValue(10, 8, 12),
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    bookingIdText: {
      fontSize: getResponsiveFontSize(13),
      color: '#8B5CF6',
      textAlign: 'center',
      marginTop: getResponsiveValue(6, 5, 8),
      fontWeight: '600',
      backgroundColor: '#F8F5FF',
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(6),
      borderRadius: getResponsiveSpacing(16),
      borderWidth: 1,
      borderColor: '#E8D5FF',
    },
    successModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    successModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(24),
      padding: getResponsiveSpacing(40),
      alignItems: 'center',
      minWidth: screenWidth * 0.7,
      maxWidth: screenWidth * 0.85,
      shadowColor: '#4CAF50',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 15,
    },
    successIconContainer: {
      marginBottom: getResponsiveValue(20, 16, 24),
    },
    successTitle: {
      fontSize: getResponsiveFontSize(24),
      fontWeight: '700',
      color: '#4CAF50',
      marginBottom: getResponsiveValue(12, 10, 14),
      textAlign: 'center',
    },
    successMessage: {
      fontSize: getResponsiveFontSize(16),
      color: '#666',
      textAlign: 'center',
      marginBottom: getResponsiveValue(30, 25, 35),
      lineHeight: getResponsiveFontSize(22),
    },
    successButton: {
      backgroundColor: '#4CAF50',
      borderRadius: getResponsiveSpacing(25),
      paddingVertical: getResponsiveValue(14, 12, 16),
      paddingHorizontal: getResponsiveWidth(60, 50, 70),
      shadowColor: '#4CAF50',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    successButtonText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      textAlign: 'center',
    },
    failedModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    failedModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(24),
      padding: getResponsiveSpacing(30),
      alignItems: 'center',
      minWidth: screenWidth * 0.7,
      maxWidth: screenWidth * 0.85,
      shadowColor: '#FF3B30',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 15,
    },
    failedIconContainer: {
      marginBottom: getResponsiveValue(12, 10, 14),
    },
    failedTitle: {
      fontSize: getResponsiveFontSize(22),
      fontWeight: '700',
      color: '#FF3B30',
      marginBottom: getResponsiveValue(10, 8, 12),
      textAlign: 'center',
    },
    failedBookingId: {
      fontSize: getResponsiveFontSize(14),
      color: '#8B5CF6',
      textAlign: 'center',
      marginBottom: getResponsiveValue(20, 18, 22),
      fontWeight: '600',
      backgroundColor: '#F8F5FF',
      paddingHorizontal: getResponsiveSpacing(14),
      paddingVertical: getResponsiveSpacing(8),
      borderRadius: getResponsiveSpacing(18),
      borderWidth: 1.5,
      borderColor: '#E8D5FF',
    },
    failedButtonContainer: {
      flexDirection: 'row',
      width: '100%',
      gap: getResponsiveSpacing(12),
    },
    failedRetryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(28),
      paddingVertical: getResponsiveValue(16, 14, 18),
      paddingHorizontal: getResponsiveWidth(24, 20, 28),
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    failedRetryButtonText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(17),
      fontWeight: '700',
      textAlign: 'center',
    },
    failedCancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderRadius: getResponsiveSpacing(28),
      paddingVertical: getResponsiveValue(16, 14, 18),
      paddingHorizontal: getResponsiveWidth(24, 20, 28),
      borderWidth: 2,
      borderColor: '#E0E0E0',
    },
    failedCancelButtonText: {
      color: '#666',
      fontSize: getResponsiveFontSize(17),
      fontWeight: '600',
      textAlign: 'center',
    },
    failedButtonIcon: {
      marginRight: getResponsiveSpacing(8),
    },
    noWorkersModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    noWorkersModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: getResponsiveSpacing(28),
      padding: getResponsiveSpacing(35),
      alignItems: 'center',
      minWidth: screenWidth * 0.75,
      maxWidth: screenWidth * 0.9,
      shadowColor: '#FF9500',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 20,
      borderWidth: 2,
      borderColor: '#FFF5E6',
    },
    noWorkersIconWrapper: {
      marginBottom: getResponsiveValue(20, 18, 22),
    },
    noWorkersIconBackground: {
      width: getResponsiveWidth(120, 100, 140),
      height: getResponsiveWidth(120, 100, 140),
      borderRadius: getResponsiveWidth(60, 50, 70),
      backgroundColor: '#FFF5E6',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#FFE5B4',
    },
    noWorkersIconContainer: {
      marginBottom: getResponsiveValue(12, 10, 14),
    },
    noWorkersTitle: {
      fontSize: getResponsiveFontSize(24),
      fontWeight: '800',
      color: '#FF9500',
      marginBottom: getResponsiveValue(10, 8, 12),
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    noWorkersSubtitle: {
      fontSize: getResponsiveFontSize(17),
      color: '#8B7355',
      textAlign: 'center',
      marginBottom: getResponsiveValue(20, 18, 22),
      fontWeight: '500',
      lineHeight: getResponsiveFontSize(24),
    },
    noWorkersDivider: {
      width: '60%',
      height: 2,
      backgroundColor: '#FFE5B4',
      marginBottom: getResponsiveValue(24, 22, 26),
      borderRadius: 1,
    },
    noWorkersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FF9500',
      borderRadius: getResponsiveSpacing(22),
      paddingVertical: getResponsiveValue(10, 8, 12),
      paddingHorizontal: getResponsiveWidth(28, 22, 34),
      width: '45%',
      shadowColor: '#FF9500',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 7,
    },
    noWorkersButtonText: {
      color: '#FFFFFF',
      fontSize: getResponsiveFontSize(15),
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.4,
    },
    noWorkersButtonIcon: {
      marginRight: getResponsiveSpacing(8),
    },
  });
};


