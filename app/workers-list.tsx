import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// Using a simple range input instead of slider for now
// import Slider from '@react-native-community/slider';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

// Helper function to split name if longer than 10 characters
const splitName = (name: string) => {
  if (!name || name.length <= 10) {
    return { firstPart: name, secondPart: '' };
  }
  return {
    firstPart: name.substring(0, 10),
    secondPart: name.substring(10)
  };
};

// Custom Dual Range Slider Component
interface DualRangeSliderProps {
  min: number;
  max: number;
  value: { min: number; max: number };
  onValueChange: (value: { min: number; max: number }) => void;
  step?: number;
  unit?: string;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  value,
  onValueChange,
  step = 1,
  unit = ''
}) => {
  const sliderWidth = width * 0.7;
  const thumbSize = 20;
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  
  // Determine step size based on unit for smoother control
  const stepSize = unit.includes('km') ? 1 : 10; // Distance: 1km steps, Price: ₹10 steps
  
  const getPosition = (val: number) => {
    return ((val - min) / (max - min)) * sliderWidth;
  };
  
  const getValue = (position: number) => {
    const clampedPosition = Math.max(0, Math.min(sliderWidth, position));
    const rawValue = (clampedPosition / sliderWidth) * (max - min) + min;
    // Round to nearest step for smooth operation
    return Math.round(rawValue / stepSize) * stepSize;
  };

  // PanResponder for min thumb - SIMPLIFIED for smooth horizontal dragging
  const minThumbPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsDraggingMin(true);
    },
    onPanResponderMove: (evt) => {
      const { locationX } = evt.nativeEvent;
      
      // Calculate new value based on position
      const newMin = getValue(locationX);
      
      // Ensure min doesn't exceed max (with minimum gap)
      const minGap = unit.includes('km') ? 1 : 50;
      if (newMin >= min && newMin <= value.max - minGap) {
        onValueChange({ min: newMin, max: value.max });
      }
    },
    onPanResponderRelease: () => {
      setIsDraggingMin(false);
    },
  });

  // PanResponder for max thumb - SIMPLIFIED for smooth horizontal dragging
  const maxThumbPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsDraggingMax(true);
    },
    onPanResponderMove: (evt) => {
      const { locationX } = evt.nativeEvent;
      
      // Calculate new value based on position
      const newMax = getValue(locationX);
      
      // Ensure max doesn't go below min (with minimum gap)
      const minGap = unit.includes('km') ? 1 : 50;
      if (newMax >= value.min + minGap && newMax <= max) {
        onValueChange({ min: value.min, max: newMax });
      }
    },
    onPanResponderRelease: () => {
      setIsDraggingMax(false);
    },
  });

  return (
    <View style={styles.dualSliderContainer}>
      <View style={styles.sliderTrack}>
        <View style={styles.sliderBackground} />
        <View 
          style={[
            styles.sliderActiveRange,
            {
              left: getPosition(value.min),
              width: getPosition(value.max) - getPosition(value.min)
            }
          ]} 
        />
        
        {/* Min Thumb */}
        <View
          style={[
            styles.sliderThumb,
            { 
              left: getPosition(value.min) - thumbSize / 2,
              backgroundColor: isDraggingMin ? '#3b82f6' : 'white'
            }
          ]}
          {...minThumbPanResponder.panHandlers}
        />
        
        {/* Max Thumb */}
        <View
          style={[
            styles.sliderThumb,
            { 
              left: getPosition(value.max) - thumbSize / 2,
              backgroundColor: isDraggingMax ? '#3b82f6' : 'white'
            }
          ]}
          {...maxThumbPanResponder.panHandlers}
        />
      </View>
      
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{value.min}{unit}</Text>
        <Text style={styles.sliderLabel}>{value.max}{unit}</Text>
      </View>
    </View>
  );
};

// Define the Worker interface
interface Worker {
  id: number;
  name: string;
  mobile: string;
  email: string;
  skill_id: string;
  skill_name?: string;
  pincode?: string;
  mandal?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  profile_image?: string;
  document1?: string;
  document2?: string;
  distance?: number;
  price?: number;
  created_at?: string;
}

export default function WorkersList() {
  const { workers, location, coordinates } = useLocalSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [workerList, setWorkerList] = useState<Worker[]>([]);
  const [originalWorkerList, setOriginalWorkerList] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(height * 0.7));
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [quickBookContactNumber, setQuickBookContactNumber] = useState('');
  const [quickBookWorkLocation, setQuickBookWorkLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state variables for booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingWorker, setBookingWorker] = useState<Worker | null>(null);
  const [bookingContactNumber, setBookingContactNumber] = useState('');
  const [bookingWorkLocation, setBookingWorkLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Start with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  
  // Calendar picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Add new state variables for description and media (Quick Book)
  const [quickBookDescription, setQuickBookDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // Add new state variables for individual booking modal
  const [bookingDescription, setBookingDescription] = useState('');
  const [bookingSelectedMedia, setBookingSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // Booking status tracking state variables
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [showBookingStatusModal, setShowBookingStatusModal] = useState(false);
  const [bookingStatusData, setBookingStatusData] = useState<{
    status: 'waiting' | 'confirmed' | 'rejected';
    bookingId?: string;
    workerName?: string;
    workerContact?: string;
    message?: string;
  } | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Sort functionality state variables
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'price' | null>(null);
  
  // Range state variables
  const [distanceRange, setDistanceRange] = useState({ min: 0, max: 50 });
  const [priceRange, setPriceRange] = useState({ min: 0, max: 2000 });
  const [currentDistanceRange, setCurrentDistanceRange] = useState({ min: 0, max: 50 });
  const [currentPriceRange, setCurrentPriceRange] = useState({ min: 0, max: 2000 });

  // Auto-reset sort state when component opens
  useEffect(() => {
    // Reset sort state when component mounts
    setSortBy(null);
    setCurrentDistanceRange(distanceRange);
    setCurrentPriceRange(priceRange);
  }, []);

  useEffect(() => {
    if (workers) {
      try {
        const parsedWorkers = JSON.parse(workers as string);
        setWorkerList(parsedWorkers);
        setOriginalWorkerList(parsedWorkers); // Store original list
        
        // Calculate actual ranges from worker data
        if (parsedWorkers.length > 0) {
          const distances = parsedWorkers.map((w: Worker) => w.distance || 0).filter((d: number) => d > 0);
          const prices = parsedWorkers.map((w: Worker) => w.price || 0).filter((p: number) => p > 0);
          
          if (distances.length > 0) {
            const maxDistance = Math.ceil(Math.max(...distances));
            setDistanceRange({ min: 0, max: maxDistance });
            setCurrentDistanceRange({ min: 0, max: maxDistance });
          }
          
          if (prices.length > 0) {
            const maxPrice = Math.ceil(Math.max(...prices));
            setPriceRange({ min: 0, max: maxPrice });
            setCurrentPriceRange({ min: 0, max: maxPrice });
          }
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load workers data');
      }
    } else {
      Alert.alert('No Data', 'No workers data was received');
    }
  }, [workers]);

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Function to start polling for booking status
  const startBookingStatusPolling = (bookingId: string, userId: string) => {
    console.log(`🔄 Starting polling for booking ${bookingId}`);
    
    const pollBookingStatus = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.TOTAL_BOOKINGS_BY_USER(userId));
        if (!response.ok) {
          console.error('Failed to fetch booking status');
          return;
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          // Get all bookings with the same booking_id
          const allBookingsWithSameId = result.data.filter((b: any) => b.booking_id === bookingId);
          
          if (allBookingsWithSameId.length > 0) {
            console.log(`📊 Found ${allBookingsWithSameId.length} bookings for ${bookingId}`);
            
            // Check if ANY booking has been accepted (status = 1)
            const acceptedBooking = allBookingsWithSameId.find((b: any) => b.status === 1 || b.status === '1');
            
            if (acceptedBooking) {
              console.log(`✅ Booking ${bookingId} accepted by worker: ${acceptedBooking.worker_name}`);
              
              // Stop polling
              if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
              }
              
              // Show confirmation modal
              setBookingStatusData({
                status: 'confirmed',
                bookingId: acceptedBooking.booking_id,
                workerName: acceptedBooking.worker_name,
                workerContact: acceptedBooking.worker_mobile,
                message: `Booking confirmed! ${acceptedBooking.worker_name} has accepted your booking.`
              });
              setShowWaitingModal(false);
              setShowBookingStatusModal(true);
              return;
            }
            
            // Check if all bookings are rejected (status = 3)
            const allRejected = allBookingsWithSameId.every((b: any) => b.status === 3 || b.status === '3');
            
            if (allRejected) {
              console.log(`❌ All bookings for ${bookingId} are rejected`);
              
              // Stop polling
              if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
              }
              
              // Show rejection modal
              setBookingStatusData({
                status: 'rejected',
                bookingId: bookingId,
                message: 'Unfortunately, the booking is not completed. Please book again.'
              });
              setShowWaitingModal(false);
              setShowBookingStatusModal(true);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error polling booking status:', error);
      }
    };
    
    // Start polling immediately
    pollBookingStatus();
    
    // Set up interval for polling every 3 seconds
    const interval = setInterval(pollBookingStatus, 3000);
    setPollingInterval(interval);
    
    // Set a timeout to stop polling after 5 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setPollingInterval(null);
        console.log('⏰ Polling timeout reached');
      }
    }, 300000); // 5 minutes
  };

  // Function to stop polling
  const stopBookingStatusPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('🛑 Stopped booking status polling');
    }
  };

  // Sort and filter workers function - NOW FILTERS BY BOTH DISTANCE AND PRICE
  const sortAndFilterWorkers = (sortType: 'distance' | 'price') => {
    let filteredWorkers = [...originalWorkerList]; // Always filter from original list
    
    // Apply BOTH range filters simultaneously
    filteredWorkers = filteredWorkers.filter(worker => {
      const distance = worker.distance || 0;
      const price = worker.price || 0;
      
      // Worker must match BOTH distance range AND price range
      const matchesDistance = distance >= currentDistanceRange.min && distance <= currentDistanceRange.max;
      const matchesPrice = price >= currentPriceRange.min && price <= currentPriceRange.max;
      
      return matchesDistance && matchesPrice;
    });
    
    // Sort the filtered workers by the selected sort type
    return filteredWorkers.sort((a, b) => {
      if (sortType === 'distance') {
        const distanceA = a.distance || 0;
        const distanceB = b.distance || 0;
        return distanceA - distanceB;
      } else if (sortType === 'price') {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return priceA - priceB;
      }
      return 0;
    });
  };

  // Handle sort selection
  const handleSortSelection = (sortType: 'distance' | 'price') => {
    setSortBy(sortType);
    // Don't close modal yet, show range bar
  };

  // Handle range change
  const handleRangeChange = (sortType: 'distance' | 'price', min: number, max: number) => {
    if (sortType === 'distance') {
      setCurrentDistanceRange({ min, max });
    } else if (sortType === 'price') {
      setCurrentPriceRange({ min, max });
    }
    
    // Apply sorting and filtering with new range
    const sortedWorkers = sortAndFilterWorkers(sortType);
    setWorkerList(sortedWorkers);
  };

  // Apply sort and close modal
  const applySort = () => {
    if (sortBy === 'distance' || sortBy === 'price') {
      const sortedWorkers = sortAndFilterWorkers(sortBy);
      setWorkerList(sortedWorkers);
    }
    setShowSortModal(false);
  };


  const handleCall = async (phoneNumber: string) => {
    try {
      // Check if the device can make phone calls
      const canOpen = await Linking.canOpenURL(`tel:${phoneNumber}`);
      
      if (canOpen) {
        await Linking.openURL(`tel:${phoneNumber}`);
      } else {
        Alert.alert(
          'Cannot Make Call',
          'Your device cannot make phone calls or the phone number is invalid.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to open phone dialer. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleChat = async (phoneNumber: string) => {
    try {
      // Try to open WhatsApp first (most common messaging app)
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}`;
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to SMS if WhatsApp is not available
        const smsUrl = `sms:${phoneNumber}`;
        const canOpenSMS = await Linking.canOpenURL(smsUrl);
        
        if (canOpenSMS) {
          await Linking.openURL(smsUrl);
        } else {
          // If neither works, show options to user
          Alert.alert(
            'Messaging Options',
            'Choose how you want to message this service provider:',
            [
              {
                text: 'Copy Number',
                onPress: () => {
                  // You can implement clipboard functionality here
                  Alert.alert('Phone Number Copied', `Phone number: ${phoneNumber}`);
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to open messaging app. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleQuickBooking = () => {
    if (!isAuthenticated) {
      showAuthRequiredModal();
      return;
    }
    setShowQuickBookModal(true);
  };

  const showAuthRequiredModal = () => {
    Alert.alert(
      'Authentication Required',
      'Please login to book services. If you don\'t have an account, please register first.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Login',
          onPress: () => router.push('/login')
        }
      ]
    );
  };

  const handleQuickBookSubmit = async () => {
    // Check if user is logged in
    if (!user?.id) {
      Alert.alert('Error', 'Please login to book services');
      return;
    }

    if (!quickBookWorkLocation.trim()) {
      Alert.alert('Error', 'Please enter work location');
      return;
    }

    // Add validation for required description
    if (!quickBookDescription.trim()) {
      Alert.alert('Error', 'Please describe your service requirements');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (workerList.length === 0) {
        throw new Error('No service providers available for booking.');
      }

          // Generate ONE shared booking ID for all workers
    const sharedBookingId = `bk${Math.floor(Date.now() / 1000)}`;
    
    // Upload media files to server first
    let workDocumentsString = null;
    if (selectedMedia.length > 0) {
      try {
        Alert.alert('Uploading', 'Uploading your files, please wait...');
        workDocumentsString = await uploadMediaFiles(selectedMedia);
      } catch (error) {
        console.error('Upload failed:', error);
        
        // Show user a choice to continue without files or retry
        const shouldContinue = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Upload Failed',
            `Failed to upload media files: ${error instanceof Error ? error.message : 'Unknown error'}\n\nWould you like to continue booking without the files or cancel and try again?`,
            [
              {
                text: 'Cancel Booking',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Continue Without Files',
                onPress: () => resolve(true)
              }
            ],
            { cancelable: false }
          );
        });
        
        if (!shouldContinue) {
          throw new Error('Booking cancelled by user');
        }
        
        // Continue without uploading files
        workDocumentsString = null;
      }
    }
    
    // Create bookings for all workers with the same booking ID
    const bookingPromises: Promise<any>[] = workerList.map(async (worker: Worker) => {
      const bookingData = {
        booking_id: sharedBookingId, // Same booking ID for all workers
        worker_id: worker.id,
        user_id: user.id, // Use logged-in user's ID
        contact_number: quickBookContactNumber.trim(), // Use input contact number
        work_location: quickBookWorkLocation.trim(),
        booking_time: new Date().toISOString().split('T')[0],
        status: 0,
        description: quickBookDescription.trim(), // Add description
        work_documents: workDocumentsString // Add work_documents
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
          throw new Error(`Failed to book ${worker.name}: ${errorData.message || 'Unknown error'}`);
        }

        const result = await response.json();
        return result;
      });

      const results = await Promise.all(bookingPromises);
      
      // Create success message with media info
      const mediaInfo = selectedMedia.length > 0 
        ? `\nMedia Files: ${selectedMedia.length} file(s) attached (${selectedMedia.filter(m => getMediaType(m.uri) === 'image').length} photos, ${selectedMedia.filter(m => getMediaType(m.uri) === 'video').length} videos)`
        : '';
      
      // Show waiting modal and start polling
      setShowQuickBookModal(false);
      setShowWaitingModal(true);
      startBookingStatusPolling(sharedBookingId, user.id.toString());
      
      // Reset form data
      setQuickBookContactNumber('');
      setQuickBookWorkLocation('');
      setQuickBookDescription('');
      setSelectedMedia([]);

    } catch (error) {
      let errorMessage = 'Some bookings failed. Please try again or contact individual providers.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Booking Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // New booking modal functions
  const handleBookNow = (worker: Worker) => {
    if (!isAuthenticated) {
      showAuthRequiredModal();
      return;
    }
    setBookingWorker(worker);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async () => {
    if (!bookingWorker) {
      Alert.alert('Error', 'No worker selected for booking');
      return;
    }

    // Check if user is logged in
    if (!user?.id) {
      Alert.alert('Error', 'Please login to book services');
      return;
    }

    if (!bookingWorkLocation.trim()) {
      Alert.alert('Error', 'Please enter work location');
      return;
    }

    // Add validation for required description
    if (!bookingDescription.trim()) {
      Alert.alert('Error', 'Please describe your service requirements');
      return;
    }

    // Validate that selected date and time is not in the past
    const [hours, minutes] = selectedTime.split(':');
    const bookingDateTime = new Date(selectedDate);
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (bookingDateTime <= new Date()) {
      Alert.alert('Error', 'Please select a future date and time for your booking');
      return;
    }

    setIsBookingSubmitting(true);
    
    try {
      // Create booking time in local timezone (no UTC conversion)
      const [hours, minutes] = selectedTime.split(':');
      const bookingDateTime = new Date(selectedDate);
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Format as local datetime string (YYYY-MM-DD HH:MM:SS)
      const year = bookingDateTime.getFullYear();
      const month = String(bookingDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(bookingDateTime.getDate()).padStart(2, '0');
      const hour = String(bookingDateTime.getHours()).padStart(2, '0');
      const minute = String(bookingDateTime.getMinutes()).padStart(2, '0');
      const second = String(bookingDateTime.getSeconds()).padStart(2, '0');
      
      const localDateTimeString = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

      // Generate unique booking ID
      const bookingId = `bk${Math.floor(Date.now() / 1000)}`;

      // Upload media files to server first
      let workDocumentsString = null;
      if (bookingSelectedMedia.length > 0) {
        try {
          Alert.alert('Uploading', 'Uploading your files, please wait...');
          workDocumentsString = await uploadMediaFiles(bookingSelectedMedia);
        } catch (error) {
          console.error('Upload failed:', error);
          
          // Show user a choice to continue without files or retry
          const shouldContinue = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Upload Failed',
              `Failed to upload media files: ${error instanceof Error ? error.message : 'Unknown error'}\n\nWould you like to continue booking without the files or cancel and try again?`,
              [
                {
                  text: 'Cancel Booking',
                  style: 'cancel',
                  onPress: () => resolve(false)
                },
                {
                  text: 'Continue Without Files',
                  onPress: () => resolve(true)
                }
              ],
              { cancelable: false }
            );
          });
          
          if (!shouldContinue) {
            throw new Error('Booking cancelled by user');
          }
          
          // Continue without uploading files
          workDocumentsString = null;
        }
      }

      const bookingData = {
        booking_id: bookingId,
        worker_id: bookingWorker.id,
        user_id: user.id, // Use logged-in user's ID
        contact_number: bookingContactNumber.trim(), // Use input contact number
        work_location: bookingWorkLocation.trim(),
        booking_time: localDateTimeString, // Use local timezone string
        status: 0,
        description: bookingDescription.trim(), // Add description
        work_documents: workDocumentsString // Add work_documents
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
        throw new Error(`Failed to create booking: ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      // Show waiting modal and start polling
      setShowBookingModal(false);
      setShowWaitingModal(true);
      startBookingStatusPolling(bookingId, user.id.toString());
      
      // Reset form data
      setBookingContactNumber('');
      setBookingWorkLocation('');
      setBookingDescription('');
      setBookingSelectedMedia([]);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow);
      setSelectedTime('09:00');

    } catch (error) {
      let errorMessage = 'Failed to create booking. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Booking Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setBookingWorker(null);
    setBookingContactNumber('');
    setBookingWorkLocation('');
    setBookingDescription(''); // Reset description
    setBookingSelectedMedia([]); // Reset media
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    setSelectedTime('09:00');
  };

  const closeQuickBookModal = () => {
    setShowQuickBookModal(false);
    setQuickBookContactNumber('');
    setQuickBookWorkLocation('');
    // Add these lines to reset new fields
    setQuickBookDescription('');
    setSelectedMedia([]);
  };

    // Add function to handle media selection
  const handleMediaSelect = () => {
    Alert.alert(
      'Add Media',
      'Choose an option to add photos or videos',
      [
        {
          text: 'Camera',
          onPress: openCamera
        },
        {
          text: 'Gallery',
          onPress: openGallery
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const requestPermissions = async () => {
    // Request camera permissions
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos and videos.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Request media library permissions
    const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaLibraryStatus.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Gallery permission is required to select photos and videos.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  };

  const openCamera = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Show options for photo or video
      Alert.alert(
        'Camera Options',
        'What would you like to capture?',
        [
          {
            text: 'Photo',
            onPress: () => launchCamera('photo')
          },
          {
            text: 'Video',
            onPress: () => launchCamera('video')
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const launchCamera = async (mediaType: 'photo' | 'video') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaType === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: mediaType === 'photo' ? [4, 3] : undefined,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max for videos
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newMedia = result.assets[0];
        setSelectedMedia(prev => [...prev, newMedia]);
        
        Alert.alert(
          'Success',
          `${mediaType === 'photo' ? 'Photo' : 'Video'} captured successfully!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to capture ${mediaType}. Please try again.`);
    }
  };

  const openGallery = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max for videos
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newMedia = result.assets;
        setSelectedMedia(prev => [...prev, ...newMedia]);
        
        Alert.alert(
          'Success',
          `${newMedia.length} file(s) selected successfully!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access gallery. Please try again.');
    }
  };

  const removeMediaItem = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const getMediaType = (uri: string): 'image' | 'video' => {
    const extension = uri.split('.').pop()?.toLowerCase();
    if (extension && ['mp4', 'mov', 'avi', 'mkv', 'm4v'].includes(extension)) {
      return 'video';
    }
    return 'image';
  };

  // Media functions for individual booking modal
  const handleBookingMediaSelect = () => {
    Alert.alert(
      'Add Media',
      'Choose an option to add photos or videos',
      [
        {
          text: 'Camera',
          onPress: openBookingCamera
        },
        {
          text: 'Gallery',
          onPress: openBookingGallery
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const openBookingCamera = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      Alert.alert(
        'Camera Options',
        'What would you like to capture?',
        [
          {
            text: 'Photo',
            onPress: () => launchBookingCamera('photo')
          },
          {
            text: 'Video',
            onPress: () => launchBookingCamera('video')
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const launchBookingCamera = async (mediaType: 'photo' | 'video') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaType === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: mediaType === 'photo' ? [4, 3] : undefined,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newMedia = result.assets[0];
        setBookingSelectedMedia(prev => [...prev, newMedia]);
        
        Alert.alert(
          'Success',
          `${mediaType === 'photo' ? 'Photo' : 'Video'} captured successfully!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to capture ${mediaType}. Please try again.`);
    }
  };

  const openBookingGallery = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newMedia = result.assets;
        setBookingSelectedMedia(prev => [...prev, ...newMedia]);
        
        Alert.alert(
          'Success',
          `${newMedia.length} file(s) selected successfully!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access gallery. Please try again.');
    }
  };

  const removeBookingMediaItem = (index: number) => {
    setBookingSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };


  // Function to upload media files to server
  const uploadMediaFiles = async (mediaFiles: ImagePicker.ImagePickerAsset[]) => {
    if (mediaFiles.length === 0) return null;

    try {
      console.log('📤 Starting upload process for', mediaFiles.length, 'files');
      console.log('🌐 Upload endpoint:', API_ENDPOINTS.UPLOAD_WORK_DOCUMENTS);
      
      // Check if we have valid files
      if (!mediaFiles || mediaFiles.length === 0) {
        throw new Error('No media files selected');
      }

      // Create FormData
      const formData = new FormData();
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        
        if (!media.uri) {
          console.error('❌ Invalid file URI for file', i);
          continue;
        }
        
        const fileExtension = media.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `workdoc_${Date.now()}_${i}.${fileExtension}`;
        
        // Determine MIME type based on file extension
        let mimeType = 'image/jpeg'; // default
        if (['mp4', 'mov', 'avi', 'mkv', 'm4v', 'webm'].includes(fileExtension)) {
          mimeType = 'video/mp4';
        } else if (['jpg', 'jpeg'].includes(fileExtension)) {
          mimeType = 'image/jpeg';
        } else if (fileExtension === 'png') {
          mimeType = 'image/png';
        } else if (fileExtension === 'gif') {
          mimeType = 'image/gif';
        }
        
        // Create file object for upload
        const fileObject = {
          uri: media.uri,
          type: mimeType,
          name: fileName,
        } as any;
        
        console.log(`📁 Adding file ${i + 1}/${mediaFiles.length}:`, {
          name: fileName,
          type: mimeType,
          uri: media.uri.substring(0, 50) + '...',
        });
        
        formData.append('workDocuments', fileObject);
      }

      console.log('🚀 Sending upload request...');
      
      // Set a longer timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(API_ENDPOINTS.UPLOAD_WORK_DOCUMENTS, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Don't set Content-Type - let the browser set it with boundary
        },
      });

      clearTimeout(timeoutId);
      console.log('📊 Upload response status:', response.status);

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unknown error occurred';
        }
        console.error('❌ Upload failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Upload result:', result);
      
      if (result.success && result.files) {
        // Return the file paths for database storage
        const filePaths = result.files.map((file: any) => file.path).join(',');
        console.log('🎉 Upload successful! File paths:', filePaths);
        return filePaths;
      } else {
        throw new Error(result.message || 'Upload failed - no files returned');
      }
    } catch (error) {
      console.error('💥 Error uploading media files:', error);
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Upload timeout - please try again with smaller files or check your connection');
        }
        
        if (error.message?.includes('Network request failed') || 
            error.message?.includes('fetch')) {
          throw new Error('❌ Cannot connect to server. Please check:\n• Backend server is running (npm start in backend folder)\n• Your device is connected to the same network\n• IP address in api.ts is correct');
        }
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('❌ Server connection failed. Please verify:\n• Backend server is running on port 3000\n• Your IP address is correct in constants/api.ts\n• Both devices are on the same WiFi network');
        }
      }
      
      throw error;
    }
  };

  // Calendar picker handlers
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  };

  const BASE_IMAGE_URL = getBaseUrl().replace('/api', '');
 
  const formatCompleteAddress = (worker: Worker) => {
    const addressParts = [];
    
    if (worker.city && worker.city.trim()) {
      addressParts.push(worker.city.trim());
    }
    
    if (worker.mandal && worker.mandal.trim()) {
      addressParts.push(worker.mandal.trim());
    }
    
    if (worker.district && worker.district.trim()) {
      addressParts.push(worker.district.trim());
    }
    
    if (worker.state && worker.state.trim()) {
      addressParts.push(worker.state.trim());
    }
    
    if (worker.pincode && worker.pincode.toString().trim()) {
      addressParts.push(worker.pincode.toString().trim());
    }
    
    if (worker.country && worker.country.trim()) {
      addressParts.push(worker.country.trim());
    }
    
    if (addressParts.length === 0) {
      return 'Address not available';
    }
    
    return addressParts.join(',');
  };

  const getDocumentUrl = (docPathOrFile?: string | null) => {
    if (!docPathOrFile) return null;
    const value = String(docPathOrFile);
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/uploads/')) return `${BASE_IMAGE_URL}${value}`;
    return `${BASE_IMAGE_URL}/uploads/documents/${value}`;
  };

  const showProfileModal = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsProfileModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideProfileModal = () => {
    Animated.timing(slideAnim, {
      toValue: height * 0.7,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsProfileModalVisible(false);
      setSelectedWorker(null);
    });
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: slideAnim } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      if (translationY > 100 || velocityY > 800) {
        hideProfileModal();
      } else {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const renderProfileModal = () => {
    if (!selectedWorker) return null;

    return (
      <Modal
        visible={isProfileModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={hideProfileModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={hideProfileModal}
          />
          
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.profileModal,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.modalHandle}>
                <View style={styles.handleBar} />
              </View>

              <ScrollView 
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.profileImageContainer}>
                    {selectedWorker.profile_image && selectedWorker.profile_image.trim() !== '' ? (
                      <Image
                        source={{ uri: `${BASE_IMAGE_URL}${selectedWorker.profile_image}` }}
                        style={styles.profileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.profileImagePlaceholder}>
                        <Text style={styles.profileImageInitial}>
                          {(selectedWorker.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.profileStatusDot} />
                  </View>

                  <View style={styles.profileInfo}>
                                       <View style={styles.profileNameRow}>
                     <Text style={styles.profileName}>
                       {selectedWorker.name || 'Unknown Name'}
                     </Text>
                     <View style={styles.profileVerifiedBadge}>
                       <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                     </View>
                   </View>
                   
                   <Text style={styles.profileEmail}>
                     {selectedWorker.email || 'Email not available'}
                   </Text>
                   
                   <Text style={styles.profileSkill}>
                     {selectedWorker.skill_name || 'Service Provider'}
                   </Text>
                    
                    <View style={styles.profileMeta}>
                      <View style={styles.profileLeftMetaInfo}>
                        {selectedWorker.distance && (
                          <View style={styles.profileLocation}>
                            <Ionicons name="location" size={14} color="#6b7280" />
                            <Text style={styles.profileDistance}>
                              {selectedWorker.distance && typeof selectedWorker.distance === 'number' 
                                ? `${selectedWorker.distance.toFixed(1)} Km Away` 
                                : 'Distance not available'}
                            </Text>
                          </View>
                        )}
                        
                        {selectedWorker.price && (
                          <View style={styles.profilePriceInfo}>
                            <Ionicons name="cash" size={14} color="#10b981" />
                            <Text style={styles.profilePriceText}>₹{Math.floor(selectedWorker.price)}/Per Hour</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.profileRating}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.profileRatingText}>4.7</Text>
                        <Text style={styles.profileReviewText}>(24 reviews)</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Contact Actions */}
                <View style={styles.contactActions}>
                  <TouchableOpacity 
                    style={styles.contactBtn}
                    onPress={() => handleCall(selectedWorker.mobile)}
                  >
                    <Ionicons name="call" size={20} color="#10b981" />
                    <Text style={styles.contactBtnText}>Call</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.contactBtn}
                    onPress={() => handleChat(selectedWorker.mobile)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={20} color="#3b82f6" />
                    <Text style={styles.contactBtnText}>Message</Text>
                  </TouchableOpacity>
                </View>

                {/* Address Section */}
                <View style={styles.addressSection}>
                  <Text style={styles.addressTitle}>Complete Address</Text>
                  <View style={styles.addressContent}>
                    <Ionicons name="location" size={18} color="#6b7280" />
                    <Text style={styles.addressText}>
                      {formatCompleteAddress(selectedWorker)}
                    </Text>
                  </View>
                </View>

                {/* Professional Documents */}
                <View style={styles.documentsSection}>
                  <Text style={styles.documentsTitle}>Professional Documents</Text>
                  <View style={styles.documentsGrid}>
                    {[selectedWorker.document1, selectedWorker.document2]
                      .filter(Boolean)
                      .map((doc: any, idx: number) => {
                        const url = getDocumentUrl(doc);
                        if (!url) return null;
                        return (
                          <View key={`${doc}-${idx}`} style={styles.documentItem}>
                            <Image source={{ uri: url }} style={styles.documentImage} resizeMode="cover" />
                          </View>
                        );
                      })}
                    {(!selectedWorker.document1 && !selectedWorker.document2) && (
                      <Text style={styles.noDocumentsText}>No professional documents uploaded</Text>
                    )}
                  </View>
                </View>


                {/* Reviews Section */}
                <View style={styles.reviewsSection}>
                  <Text style={styles.reviewsTitle}>Recent Reviews</Text>
                  
                  <View style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>Sarah M.</Text>
                      <View style={styles.reviewStars}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                      </View>
                    </View>
                    <Text style={styles.reviewContentText}>
                      "Excellent service! Very professional and completed the work quickly. Highly recommended!"
                    </Text>
                    <Text style={styles.reviewDate}>2 days ago</Text>
                  </View>
                  
                  <View style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>Mike R.</Text>
                      <View style={styles.reviewStars}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Ionicons name="star" size={14} color="#f59e0b" />
                      </View>
                    </View>
                    <Text style={styles.reviewContentText}>
                      "Great work quality and very punctual. Will definitely use again!"
                    </Text>
                    <Text style={styles.reviewDate}>1 week ago</Text>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </Modal>
    );
  };

  const renderQuickBookModal = () => {
    if (!showQuickBookModal) return null;

    return (
      <Modal
        visible={showQuickBookModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeQuickBookModal}
      >
        <View style={styles.quickBookModalOverlay}>
          <View style={styles.quickBookModalContainer}>
            {/* Enhanced Header with Icon */}
            <View style={styles.quickBookModalHeader}>
              <Text style={styles.quickBookModalTitle}>Quick Booking</Text>
              <TouchableOpacity onPress={closeQuickBookModal} style={styles.quickBookCloseBtn}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.quickBookModalSubtitle}>
              Book all available service providers at once
            </Text>

            <View style={styles.quickBookInputContainer}>
              <Ionicons name="call" size={20} color="#666" style={styles.quickBookInputIcon} />
              <TextInput
                style={styles.quickBookInput}
                placeholder="Location contact number"
                placeholderTextColor="#999"
                value={quickBookContactNumber}
                onChangeText={setQuickBookContactNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={[styles.quickBookInputContainer, { marginTop: 8 }]}>
              <Ionicons name="location" size={20} color="#666" style={styles.quickBookInputIcon} />
              <TextInput
                style={styles.quickBookInput}
                placeholder="Enter work location"
                placeholderTextColor="#999"
                value={quickBookWorkLocation}
                onChangeText={setQuickBookWorkLocation}
                multiline={true}
                numberOfLines={2}
              />
            </View>

            {/* Modified: Description Input with integrated Media Upload */}
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>
                Describe your service requirements
              </Text>
              <View style={styles.descriptionInputContainer}>
                <TextInput
                  style={styles.descriptionTextInput}
                  placeholder="Describe your service requirements..."
                  placeholderTextColor="#999"
                  value={quickBookDescription}
                  onChangeText={setQuickBookDescription}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                
                {/* Media Upload Button inside the input container */}
                <View style={styles.mediaUploadInside}>
                  <TouchableOpacity 
                    style={styles.mediaUploadButtonInside}
                    onPress={handleMediaSelect}
                    activeOpacity={0.7}
                  >
                    <View style={styles.mediaUploadContentInside}>
                      <View style={styles.mediaIconsContainerInside}>
                        <Ionicons name="camera" size={16} color="#4f46e5" />
                        <Ionicons name="videocam" size={14} color="#4f46e5" style={{ marginLeft: 3 }} />
                      </View>
                      <Text style={styles.mediaUploadTextInside}>Add Photos & Videos</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={18} color="#4f46e5" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Selected Media Preview */}
              {selectedMedia.length > 0 && (
                <View style={styles.selectedMediaPreview}>
                  <Text style={styles.selectedMediaCount}>
                    {selectedMedia.length} file{selectedMedia.length > 1 ? 's' : ''} selected
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.mediaScrollView}
                  >
                    {selectedMedia.map((media, index) => (
                      <View key={index} style={styles.mediaPreviewItem}>
                        <View style={styles.mediaThumb}>
                          {getMediaType(media.uri) === 'image' ? (
                            <Image source={{ uri: media.uri }} style={styles.mediaThumbnailImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.videoThumbnail}>
                              <Ionicons name="play-circle" size={24} color="#4f46e5" />
                              <Text style={styles.videoLabel}>Video</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity 
                          style={styles.removeMediaButton}
                          onPress={() => removeMediaItem(index)}
                        >
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={styles.quickBookInfo}>
              This will create booking requests for all {workerList.length} available service providers.
            </Text>

            <TouchableOpacity
              style={[styles.quickBookSubmitBtn, isSubmitting && styles.quickBookSubmitBtnDisabled]}
              onPress={handleQuickBookSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="flash" size={18} color="white" />
              )}
              <Text style={styles.quickBookSubmitText}>
                {isSubmitting ? 'Submitting...' : 'Submit Quick Booking'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderBookingModal = () => {
    if (!showBookingModal || !bookingWorker) return null;

    return (
      <Modal
        visible={showBookingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeBookingModal}
      >
        <View style={styles.bookingModalOverlay}>
          <View style={styles.bookingModalContainer}>
            {/* Close Icon - Top Right Corner */}
            <TouchableOpacity 
              style={styles.bookingCloseIcon} 
              onPress={closeBookingModal}
              activeOpacity={0.7}
            >
              <View style={styles.closeIconBackground}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>

            {/* Enhanced Header */}
            <View style={styles.bookingModalHeader}>
              <View style={styles.bookingHeaderContent}>
                <View style={styles.bookingWorkerInfo}>
                  <View style={styles.bookingWorkerAvatar}>
                    {bookingWorker.profile_image && bookingWorker.profile_image.trim() !== '' ? (
                      <Image
                        source={{ uri: `${BASE_IMAGE_URL}${bookingWorker.profile_image}` }}
                        style={styles.bookingWorkerImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.bookingWorkerPlaceholder}>
                        <Text style={styles.bookingWorkerInitial}>
                          {(bookingWorker.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.bookingWorkerDetails}>
                    <Text style={styles.bookingWorkerName}>
                      {bookingWorker.name || 'Unknown Name'}
                    </Text>
                    <Text style={styles.bookingWorkerSkill}>
                      {bookingWorker.skill_name || 'Service Provider'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <ScrollView 
              style={styles.bookingScrollView}
              contentContainerStyle={styles.bookingScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.bookingModalSubtitle}>
                Book {bookingWorker.name} for {bookingWorker.skill_name || 'your service'}
              </Text>

              {/* Enhanced Date Selection with Calendar */}
              <View style={styles.bookingSection}>
                <View style={styles.bookingSectionTitle}>
                  <Ionicons name="calendar-outline" size={18} color="#4f46e5" style={{marginRight: 8}} />
                  <Text style={styles.bookingSectionTitleText}>Select Date</Text>
                </View>
                <TouchableOpacity 
                  style={styles.datePickerContainer}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.dateDisplayWrapper}>
                    <Text style={styles.dateDisplayText}>
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.dateHelperText}>
                      {(() => {
                        const today = new Date();
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        
                        if (selectedDate.toDateString() === today.toDateString()) {
                          return "Today";
                        } else if (selectedDate.toDateString() === tomorrow.toDateString()) {
                          return "Tomorrow";
                        } else {
                          return null;
                        }
                      })()}
                    </Text>
                  </View>
                  <View style={styles.dateControls}>
                    <TouchableOpacity 
                      style={styles.dateChangeBtn}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(newDate.getDate() - 1);
                        // Don't allow past dates
                        if (newDate >= new Date(new Date().setHours(0, 0, 0, 0))) {
                          setSelectedDate(newDate);
                        }
                      }}
                    >
                      <Ionicons name="chevron-back" size={20} color="#4f46e5" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.dateChangeBtn}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(newDate.getDate() + 1);
                        setSelectedDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-forward" size={20} color="#4f46e5" />
                    </TouchableOpacity>
                  </View>
                  <Ionicons name="calendar" size={20} color="#4f46e5" style={styles.calendarIcon} />
                </TouchableOpacity>
              </View>

              {/* Enhanced Time Selection with Time Picker */}
              <View style={styles.bookingSection}>
                <View style={styles.bookingSectionTitle}>
                  <Ionicons name="time-outline" size={18} color="#4f46e5" style={{marginRight: 8}} />
                  <Text style={styles.bookingSectionTitleText}>Select Time</Text>
                </View>
                <TouchableOpacity 
                  style={styles.timePickerContainer}
                  onPress={() => setShowTimePicker(true)}
                >
                  <View style={styles.timeDisplayWrapper}>
                    <Text style={styles.timeDisplayText}>
                      {(() => {
                        const [hours, minutes] = selectedTime.split(':');
                        const hour = parseInt(hours);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                        return `${displayHour}:${minutes} ${ampm}`;
                      })()}
                    </Text>
                  </View>
                  <Ionicons name="time" size={20} color="#4f46e5" style={styles.timeIcon} />
                </TouchableOpacity>
              </View>

              {/* Enhanced Contact Number Input */}
              <View style={styles.bookingSection}>
                <View style={styles.bookingSectionTitle}>
                  <Ionicons name="call-outline" size={18} color="#4f46e5" style={{marginRight: 8}} />
                  <Text style={styles.bookingSectionTitleText}>Your Contact Number</Text>
                </View>
                <View style={styles.bookingInputContainer}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.bookingInput}
                    placeholder="Location contact number"
                    placeholderTextColor="#9ca3af"
                    value={bookingContactNumber}
                    onChangeText={setBookingContactNumber}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Work Location Input */}
              <View style={styles.bookingSection}>
                <View style={styles.bookingSectionTitle}>
                  <Ionicons name="location-outline" size={18} color="#4f46e5" style={{marginRight: 8}} />
                  <Text style={styles.bookingSectionTitleText}>Work Location</Text>
                </View>
                <View style={styles.bookingInputContainer}>
                  <TextInput
                    style={[styles.bookingInput, {minHeight: 60}]}
                    placeholder="Enter work location"
                    placeholderTextColor="#9ca3af"
                    value={bookingWorkLocation}
                    onChangeText={setBookingWorkLocation}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Service Description Input with Media Upload */}
              <View style={styles.bookingSection}>
                <View style={styles.bookingSectionTitle}>
                  <Ionicons name="document-text-outline" size={18} color="#4f46e5" style={{marginRight: 8}} />
                  <Text style={styles.bookingSectionTitleText}>Service Description </Text>
                </View>
                <View style={styles.descriptionInputContainer}>
                  <TextInput
                    style={styles.descriptionTextInput}
                    placeholder="Describe your service requirements..."
                    placeholderTextColor="#9ca3af"
                    value={bookingDescription}
                    onChangeText={setBookingDescription}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  
                  {/* Media Upload Button inside the input container */}
                  <View style={styles.mediaUploadInside}>
                    <TouchableOpacity 
                      style={styles.mediaUploadButtonInside}
                      onPress={handleBookingMediaSelect}
                      activeOpacity={0.7}
                    >
                      <View style={styles.mediaUploadContentInside}>
                        <View style={styles.mediaIconsContainerInside}>
                          <Ionicons name="camera" size={16} color="#4f46e5" />
                          <Ionicons name="videocam" size={14} color="#4f46e5" style={{ marginLeft: 3 }} />
                        </View>
                        <Text style={styles.mediaUploadTextInside}>Add Photos & Videos</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={18} color="#4f46e5" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selected Media Preview for Booking Modal */}
                {bookingSelectedMedia.length > 0 && (
                  <View style={styles.selectedMediaPreview}>
                    <Text style={styles.selectedMediaCount}>
                      {bookingSelectedMedia.length} file{bookingSelectedMedia.length > 1 ? 's' : ''} selected
                    </Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.mediaScrollView}
                    >
                      {bookingSelectedMedia.map((media, index) => (
                        <View key={index} style={styles.mediaPreviewItem}>
                          <View style={styles.mediaThumb}>
                            {getMediaType(media.uri) === 'image' ? (
                              <Image source={{ uri: media.uri }} style={styles.mediaThumbnailImage} resizeMode="cover" />
                            ) : (
                              <View style={styles.videoThumbnail}>
                                <Ionicons name="play-circle" size={24} color="#4f46e5" />
                                <Text style={styles.videoLabel}>Video</Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity 
                            style={styles.removeMediaButton}
                            onPress={() => removeBookingMediaItem(index)}
                          >
                            <Ionicons name="close-circle" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Enhanced Submit Button */}
            <TouchableOpacity
              style={[styles.bookingSubmitBtn, isBookingSubmitting && styles.bookingSubmitBtnDisabled]}
              onPress={handleBookingSubmit}
              disabled={isBookingSubmitting}
            >
              <View style={styles.submitBtnContent}>
                {isBookingSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                )}
                <Text style={styles.bookingSubmitText}>
                  {isBookingSubmitting ? 'Creating Booking...' : 'Confirm Booking'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Date Picker Modal */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
                style={Platform.OS === 'ios' ? { width: '100%' } : {}}
              />
            )}

            {/* Time Picker Modal */}
            {showTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = selectedTime.split(':');
                  const date = new Date();
                  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                  return date;
                })()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                is24Hour={false}
                style={Platform.OS === 'ios' ? { width: '100%' } : {}}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderWaitingModal = () => {
    if (!showWaitingModal) return null;

    return (
      <Modal
        visible={showWaitingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          stopBookingStatusPolling();
          setShowWaitingModal(false);
        }}
      >
        <View style={styles.waitingModalOverlay}>
          <View style={styles.waitingModalContainer}>
            {/* Animated Loading Icon */}
            <View style={styles.waitingIconContainer}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <View style={styles.waitingPulseRing} />
            </View>
            
            <Text style={styles.waitingTitle}>Waiting for Response</Text>
            <Text style={styles.waitingSubtitle}>
              Your booking request has been sent to service providers. Please wait while they respond...
            </Text>
            
            <View style={styles.waitingProgressContainer}>
              <View style={styles.waitingProgressBar}>
                <View style={styles.waitingProgressFill} />
              </View>
              <Text style={styles.waitingProgressText}>Checking for responses...</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.waitingCancelBtn}
              onPress={() => {
                stopBookingStatusPolling();
                setShowWaitingModal(false);
              }}
            >
              <Text style={styles.waitingCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderBookingStatusModal = () => {
    if (!showBookingStatusModal || !bookingStatusData) return null;

    const isConfirmed = bookingStatusData.status === 'confirmed';
    const isRejected = bookingStatusData.status === 'rejected';

    return (
      <Modal
        visible={showBookingStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          stopBookingStatusPolling();
          setShowBookingStatusModal(false);
          setBookingStatusData(null);
        }}
      >
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusModalContainer}>
            {/* Status Icon */}
            <View style={[
              styles.statusIconContainer,
              isConfirmed ? styles.statusIconSuccess : styles.statusIconError
            ]}>
              <Ionicons 
                name={isConfirmed ? "checkmark-circle" : "close-circle"} 
                size={64} 
                color={isConfirmed ? "#10b981" : "#ef4444"} 
              />
            </View>
            
            {/* Status Title */}
            <Text style={[
              styles.statusTitle,
              isConfirmed ? styles.statusTitleSuccess : styles.statusTitleError
            ]}>
              {isConfirmed ? 'Booking Confirmed!' : 'Booking Not Completed'}
            </Text>
            
            {/* Status Message */}
            <Text style={styles.statusMessage}>
              {bookingStatusData.message}
            </Text>
            
            {/* Confirmed Booking Details */}
            {isConfirmed && bookingStatusData.workerName && (
              <View style={styles.bookingDetailsContainer}>
                <View style={styles.bookingDetailItem}>
                  <Ionicons name="receipt" size={20} color="#6b7280" />
                  <Text style={styles.bookingDetailLabel}>Booking ID:</Text>
                  <Text style={styles.bookingDetailValue}>{bookingStatusData.bookingId}</Text>
                </View>
                
                <View style={styles.bookingDetailItem}>
                  <Ionicons name="person" size={20} color="#6b7280" />
                  <Text style={styles.bookingDetailLabel}>Service Provider:</Text>
                  <Text style={styles.bookingDetailValue}>{bookingStatusData.workerName}</Text>
                </View>
                
                <View style={styles.bookingDetailItem}>
                  <Ionicons name="call" size={20} color="#6b7280" />
                  <Text style={styles.bookingDetailLabel}>Contact:</Text>
                  <Text style={styles.bookingDetailValue}>{bookingStatusData.workerContact}</Text>
                </View>
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={styles.statusActionButtons}>
              {isConfirmed && bookingStatusData.workerContact && (
                <TouchableOpacity 
                  style={styles.statusActionBtn}
                  onPress={() => {
                    // Call the provider and close the popup
                    handleCall(bookingStatusData.workerContact!);
                    stopBookingStatusPolling();
                    setShowBookingStatusModal(false);
                    setBookingStatusData(null);
                  }}
                >
                  <Ionicons name="call" size={18} color="white" />
                  <Text style={styles.statusActionBtnText}>Call Provider</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.statusActionBtn,
                  isRejected ? styles.statusActionBtnPrimary : styles.statusActionBtnSecondary
                ]}
                onPress={() => {
                  // Close the popup
                  stopBookingStatusPolling();
                  setShowBookingStatusModal(false);
                  setBookingStatusData(null);
                  
                  if (isRejected) {
                    // Reset form for new booking
                    setQuickBookContactNumber('');
                    setQuickBookWorkLocation('');
                    setQuickBookDescription('');
                    setSelectedMedia([]);
                    setBookingContactNumber('');
                    setBookingWorkLocation('');
                    setBookingDescription('');
                    setBookingSelectedMedia([]);
                    
                    // Reset date and time to tomorrow
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                    setSelectedTime('09:00');
                  } else {
                    // For confirmed bookings, redirect to serviceseekerindex with refresh
                    router.replace('/serviceseekerindex');
                  }
                }}
              >
                <Text style={[
                  styles.statusActionBtnText,
                  isRejected ? styles.statusActionBtnTextPrimary : styles.statusActionBtnTextSecondary
                ]}>
                  {isRejected ? 'Book Again' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSortModal = () => {
    if (!showSortModal) return null;

    return (
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.sortModalOverlay}>
          <View style={styles.sortModalContainer}>
            {/* Header */}
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Filter & Sort</Text>
              <TouchableOpacity 
                style={styles.sortModalCloseBtn}
                onPress={() => setShowSortModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Info Text */}
            <Text style={styles.sortModalSubtitle}>
              Filter by both distance and price ranges, then sort by your preference
            </Text>

            {/* Sort Options */}
            <View style={styles.sortOptionsContainer}>
              <View>
                <TouchableOpacity 
                  style={[
                    styles.sortOption,
                    sortBy === 'distance' && styles.sortOptionSelected
                  ]}
                  onPress={() => handleSortSelection('distance')}
                >
                  <View style={styles.sortOptionContent}>
                    <Ionicons 
                      name="location" 
                      size={20} 
                      color={sortBy === 'distance' ? '#4f46e5' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.sortOptionText,
                      sortBy === 'distance' && styles.sortOptionTextSelected
                    ]}>
                      Distance
                    </Text>
                  </View>
                  {sortBy === 'distance' && (
                    <Ionicons name="checkmark" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>

                {/* Distance Range Slider - Show directly below Distance option */}
                {sortBy === 'distance' && (
                  <View style={styles.rangeContainer}>
                    <Text style={styles.rangeTitle}>
                      Distance Filter: {currentDistanceRange.min} - {currentDistanceRange.max} km
                    </Text>
                    <DualRangeSlider
                      min={distanceRange.min}
                      max={distanceRange.max}
                      value={currentDistanceRange}
                      onValueChange={(value) => handleRangeChange('distance', value.min, value.max)}
                      unit=" km"
                    />
                    <Text style={styles.rangeHint}>
                      💡 Price filter is also active: ₹{currentPriceRange.min} - ₹{currentPriceRange.max}
                    </Text>
                  </View>
                )}
              </View>

              <View>
                <TouchableOpacity 
                  style={[
                    styles.sortOption,
                    sortBy === 'price' && styles.sortOptionSelected
                  ]}
                  onPress={() => handleSortSelection('price')}
                >
                  <View style={styles.sortOptionContent}>
                    <Ionicons 
                      name="cash" 
                      size={20} 
                      color={sortBy === 'price' ? '#4f46e5' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.sortOptionText,
                      sortBy === 'price' && styles.sortOptionTextSelected
                    ]}>
                      Price
                    </Text>
                  </View>
                  {sortBy === 'price' && (
                    <Ionicons name="checkmark" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>

                {/* Price Range Slider - Show directly below Price option */}
                {sortBy === 'price' && (
                  <View style={styles.rangeContainer}>
                    <Text style={styles.rangeTitle}>
                      Price Filter: ₹{currentPriceRange.min} - ₹{currentPriceRange.max}
                    </Text>
                    <DualRangeSlider
                      min={priceRange.min}
                      max={priceRange.max}
                      value={currentPriceRange}
                      onValueChange={(value) => handleRangeChange('price', value.min, value.max)}
                      unit=""
                    />
                    <Text style={styles.rangeHint}>
                      💡 Distance filter is also active: {currentDistanceRange.min} - {currentDistanceRange.max} km
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity 
              style={styles.applySortBtn}
              onPress={applySort}
            >
              <Text style={styles.applySortBtnText}>Apply Filters & Sort</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderWorkerItem = ({ item, index }: { item: Worker; index: number }) => {
    const hasProfileImage = item.profile_image && item.profile_image.trim() !== '';

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity style={styles.workerCard} activeOpacity={0.7}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              {hasProfileImage ? (
                <Image
                  source={{ uri: `${BASE_IMAGE_URL}${item.profile_image}` }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(item.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.statusDot} />
            </View>

            <View style={styles.workerInfo}>
              <View style={styles.nameContainer}>
                <View style={styles.nameWrapper}>
                  <Text style={styles.workerName} numberOfLines={1}>
                    {splitName(item.name || 'Unknown Name').firstPart}
                  </Text>
                  {splitName(item.name || 'Unknown Name').secondPart ? (
                    <Text style={styles.workerNameSecondLine} numberOfLines={1}>
                      {splitName(item.name || 'Unknown Name').secondPart}
                    </Text>
                  ) : null}
                </View>
                {item.price && (
                  <View style={styles.priceInfo}>
                    <Ionicons name="cash" size={14} color="#10b981" />
                    <Text style={styles.priceText}>₹{Math.floor(item.price)}/Per Hour</Text>
                  </View>
                )}
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={26} color="#10b981" />
                </View>
              </View>

              <Text style={styles.skillText} numberOfLines={1}>
                {item.skill_name || 'Service Provider'}
              </Text>

              <View style={styles.metaInfo}>
                <View style={styles.leftMetaInfo}>
                  {item.distance && (
                    <View style={styles.locationInfo}>
                      <Ionicons name="location" size={12} color="#6b7280" />
                      <Text style={styles.distanceText}>
                        {item.distance && typeof item.distance === 'number' 
                          ? `${item.distance.toFixed(1)} Km Away` 
                          : 'Distance not available'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.ratingInfo}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.ratingText}>4.7</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Section */}
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.primaryAction}
              onPress={() => {
                handleBookNow(item);
              }}
            >
              <Text style={styles.primaryActionText}>Book Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.viewProfileBtn}
              onPress={() => showProfileModal(item)}
            >
              <Text style={styles.viewProfileText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => handleCall(item.mobile)}
            >
              <Ionicons name="call" size={18} color="#10b981" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => handleChat(item.mobile)}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={64} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>No Workers Available</Text>
      <Text style={styles.emptyMessage}>
        We couldn't find any service providers in your area right now. Try refreshing or adjusting your search criteria.
      </Text>
      <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
        <Ionicons name="refresh" size={16} color="white" />
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Providers</Text>
      </View>

      <View style={styles.headerStats}>
        <Text style={styles.resultsText}>
          {workerList.length} provider{workerList.length !== 1 ? 's' : ''} available
        </Text>
        <TouchableOpacity 
          style={styles.sortIconBtn}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="funnel-outline" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingTitle}>Finding Providers</Text>
          <Text style={styles.loadingSubtitle}>Please wait...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
      
      {/* Fixed Header - Not affected by scroll */}
      {renderHeader()}

      <FlatList
        data={workerList}
        keyExtractor={(item: Worker, index: number) => item.id ? item.id.toString() : index.toString()}
        renderItem={renderWorkerItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4f46e5']}
            tintColor="#4f46e5"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={workerList.length === 0 ? styles.emptyContainer : styles.listContainer}
      />

      {/* Quick Book Section - Moved to bottom */}
      {workerList.length > 0 && (
        <View style={styles.quickBookSection}>
          <View style={styles.quickBookContent}>
            <View style={styles.quickBookSectionInfo}>
              <View style={styles.quickBookIconContainer}>
                <Ionicons name="flash" size={24} color="#f59e0b" />
              </View>
              <View style={styles.quickBookTextContainer}>
                <Text style={styles.quickBookTitle}>Quick Book All Providers</Text>
                <Text style={styles.quickBookSubtitle}>
                  Book all {workerList.length} available service providers at once
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.quickBookActionBtn}
              onPress={handleQuickBooking}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.quickBookActionText}>Quick Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderProfileModal()}
      {renderQuickBookModal()}
      {renderBookingModal()}
      {renderWaitingModal()}
      {renderBookingStatusModal()}
      {renderSortModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#4f46e5',
    paddingTop: 45,
    paddingBottom: 14,
    marginTop: -20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 10,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginRight: 170,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: -7,
  },
  resultsText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  sortIconBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  listContainer: {
    marginTop: -3,
    paddingBottom: 20,
  },
  cardWrapper: {
    paddingHorizontal: 16,
    marginBottom: -1,
  },
  workerCard: {
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  profileSection: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: -8,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  statusDot: {
    position: 'absolute',
    bottom: 22,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white',
  },
  workerInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    position: 'relative',
    flexWrap: 'nowrap',
  },
  nameWrapper: {
    flexDirection: 'column',
  },
  workerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  workerNameSecondLine: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginTop: 4,
  },
  verifiedBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  skillText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 2,
    fontWeight: '500',
  },
  priceInfo: {
    position: 'absolute',
    right: 40,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  priceText: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 2,
    fontWeight: '600',
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 3,
    marginRight: 3,
  },
  profileReviewText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: -5,
    marginTop: -5,
  },
  primaryAction: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    marginRight: 8,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewProfileBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flex: 1,
    marginRight: 8,
  },
  viewProfileText: {
    color: '#4f46e6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileModal: {
    width: '100%',
    height: height * 0.7,
    backgroundColor: 'white',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    overflow: 'hidden',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  profileStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
     profileName: {
     fontSize: 20,
     fontWeight: '700',
     color: '#111827',
     flex: 1,
   },
   profileEmail: {
     fontSize: 14,
     color: '#6b7280',
     fontWeight: '500',
     marginBottom: 4,
   },
   profileVerifiedBadge: {
     marginLeft: 6,
   },
  profileSkill: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  profileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLeftMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  profileLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDistance: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 3,
    fontWeight: '500',
  },
  profilePriceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginLeft: 6,
  },
  profilePriceText: {
    fontSize: 13,
    color: '#10b981',
    marginLeft: 3,
    fontWeight: '600',
  },
  profileRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 3,
    marginRight: 3,
  },
  reviewCountText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  contactBtn: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 5,
  },
  addressSection: {
    marginBottom: 20,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
    textAlign: 'justify',
  },
  documentsSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  documentsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  documentItem: {
    width: (width - 40 - 15) / 2,
    aspectRatio: 1.2,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  reviewsSection: {
    marginTop: 20,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  reviewItem: {
    backgroundColor: '#e1e6ebff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewContentText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  quickBookSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 11,
    marginBottom: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  quickBookContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickBookSectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickBookIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  quickBookTextContainer: {
    flex: 1,
    marginRight: 3,
    marginLeft: 10,
  },
  quickBookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  quickBookSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  quickBookActionBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginRight: -13,
  },
  quickBookActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  quickBookModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  
  quickBookModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  
  quickBookModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  quickBookHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  quickBookHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quickBookHeaderText: {
    flex: 1,
  },
  quickBookCloseBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBookInputSection: {
    marginBottom: 20,
  },
  quickBookInputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  quickBookPhonePrefix: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  quickBookPhonePrefixText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  quickBookInfoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  quickBookInfoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  quickBookInfoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    flex: 1,
  },
  quickBookSubmitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  quickBookModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  
  quickBookCloseBtn: {
    padding: 4,
  },
  
  quickBookModalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 22,
  },
  
  quickBookInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  quickBookInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  quickBookInputIcon: {
    marginRight: 12,
  },
  quickBookInfo: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  quickBookSubmitBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  quickBookSubmitBtnDisabled: {
    opacity: 0.7,
  },
  
  quickBookSubmitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  bookingModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    height: '86%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  bookingScrollView: {
    flex: 1,
    marginBottom: 16,
  },
  bookingScrollContent: {
    paddingBottom: 8,
  },
  bookingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingWorkerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingWorkerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },
  bookingWorkerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  bookingWorkerPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingWorkerInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  bookingWorkerDetails: {
    flex: 1,
  },
  bookingWorkerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  bookingWorkerSkill: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  bookingCloseBtn: {
    padding: 4,
  },
  bookingModalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  bookingSection: {
    marginBottom: 20,
    marginTop: -10,
  },
  bookingSectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingSectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  timePickerContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateDisplayWrapper: {
    flex: 1,
  },
  dateDisplayText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  dateHelperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  dateChangeBtn: {
    padding: 8,
    marginHorizontal: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  timePickerWrapper: {
    width: '100%',
  },
  timePicker: {
    width: '100%',
  },
  bookingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  phonePrefix: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  phonePrefixText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  bookingInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  bookingSubmitBtn: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingSubmitBtnDisabled: {
    opacity: 0.7,
  },
  bookingSubmitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingCloseIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  closeIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarIcon: {
    position: 'absolute',
    right: 10,
    top: 30,
  },
  timeIcon: {
    position: 'absolute',
    right: 10,
    bottom: 14,
  },
  timeDisplayWrapper: {
    flex: 1,
  },
  timeDisplayText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },

  // NEW: Description Section Styles
  descriptionSection: {
    marginTop: 16,
    marginBottom: 16,
  },

  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

  descriptionInputContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },

  descriptionTextInput: {
    fontSize: 16,
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 80,
    maxHeight: 120,
  },

  // New: Media upload inside the input container
  mediaUploadInside: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },

  mediaUploadButtonInside: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  mediaUploadContentInside: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mediaIconsContainerInside: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },

  mediaUploadTextInside: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4f46e5',
  },

  // Remove the old media upload button styles and keep the preview styles
  selectedMediaPreview: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  selectedMediaCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },

  mediaScrollView: {
    flexDirection: 'row',
  },

  mediaPreviewItem: {
    position: 'relative',
    marginRight: 8,
  },

  mediaThumb: {
    width: 50,
    height: 50,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },

  removeMediaButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Updated media thumbnail styles
  mediaThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },

  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },

  videoLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },

  // Waiting Modal Styles
  waitingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  waitingIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  waitingPulseRing: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#4f46e5',
    opacity: 0.3,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  waitingProgressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  waitingProgressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  waitingProgressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 2,
    width: '70%',
  },
  waitingProgressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  waitingCancelBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  waitingCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },

  // Booking Status Modal Styles
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  statusIconContainer: {
    marginBottom: 24,
  },
  statusIconSuccess: {
    // Additional success styling if needed
  },
  statusIconError: {
    // Additional error styling if needed
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusTitleSuccess: {
    color: '#10b981',
  },
  statusTitleError: {
    color: '#ef4444',
  },
  statusMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  bookingDetailsContainer: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 100,
  },
  bookingDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  statusActionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statusActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  statusActionBtnPrimary: {
    backgroundColor: '#4f46e5',
  },
  statusActionBtnSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusActionBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusActionBtnTextPrimary: {
    color: 'white',
  },
  statusActionBtnTextSecondary: {
    color: '#6b7280',
  },

  // Sort Modal Styles
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  sortModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sortModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  sortModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  sortModalCloseBtn: {
    padding: 4,
  },
  sortOptionsContainer: {
    gap: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  sortOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#4f46e5',
  },
  sortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 12,
  },
  sortOptionTextSelected: {
    color: '#4f46e5',
    fontWeight: '600',
  },

  // Range Bar Styles
  rangeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rangeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 12,
    textAlign: 'center',
  },
  rangeHint: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Dual Range Slider Styles
  dualSliderContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sliderTrack: {
    width: '100%',
    height: 4,
    position: 'relative',
    marginBottom: 16,
  },
  sliderBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  sliderActiveRange: {
    position: 'absolute',
    top: 0,
    height: 4,
    backgroundColor: '#4f46e5',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4f46e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  applySortBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applySortBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});