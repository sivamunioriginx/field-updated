import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  options?: string[];
  bookings?: BookingData[];
  services?: ServiceData[];
  payments?: PaymentData[];
}

interface BookingData {
  booking_id: string;
  worker_name: string;
  status: number;
}

interface ServiceData {
  name: string;
  price: number;
  rating: number;
}

interface PaymentData {
  booking_id: string;
  amount: number;
  payment_id: string;
  created_at: string;
}

export default function CustomerServiceScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no previous screen, navigate to home tab
      router.replace('/(tabs)');
    }
  };

  // Create responsive styles
  const styles = useMemo(() => createStyles(screenWidth, screenHeight), [screenWidth, screenHeight]);
  
  // Calculate scale for dynamic padding
  const baseHeight = 812;
  const scaleHeight = (size: number) => (screenHeight / baseHeight) * size;

  // Initialize with welcome messages (like typical e-commerce support)
  useEffect(() => {
    // Set options based on authentication status
    const options = isAuthenticated 
      ? ['Booking inquiries', 'Service-related questions', 'Payment and billing', 'Complaints and feedback', 'No, other']
      : ['Service-related questions', 'No, other'];
    
    const welcomeMessages: Message[] = [
      {
        id: '1',
        text: 'Hello! 👋 Welcome to our customer support. How can I assist you today?',
        sender: 'support',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
      },
      {
        id: '2',
        text: 'I\'m here to help you with:',
        sender: 'support',
        timestamp: new Date(Date.now() - 55000), // 55 seconds ago
        options: options,
      },
      {
        id: '3',
        text: '💡 Tip: Our team typically responds within a few minutes during business hours (9 AM - 8 PM).',
        sender: 'support',
        timestamp: new Date(Date.now() - 50000), // 50 seconds ago
      },
    ];
    setMessages(welcomeMessages);
  }, [isAuthenticated]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      setInputText('');

      // Simulate auto-reply after a delay (like typical support systems)
      setTimeout(() => {
        const autoReply: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Thank you for your message. Our support team will get back to you shortly. In the meantime, feel free to ask any other questions!',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, autoReply]);
      }, 2000);
    }
  };

  const handleOptionClick = (option: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: option,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Special handling for "Booking inquiries" option
    if (option === 'Booking inquiries') {
      if (!isAuthenticated || !user?.id) {
        setTimeout(() => {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Please login to view your booking inquiries.',
            sender: 'support',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }, 500);
        return;
      }
      
      // Show loading message
      setTimeout(() => {
        const loadingMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Fetching your booking inquiries...',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, loadingMessage]);
      }, 500);
      
      // Fetch bookings
      fetchBookings();
    } else if (option === 'Service-related questions') {
      // Show loading message
      setTimeout(() => {
        const loadingMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Fetching services...',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, loadingMessage]);
      }, 500);
      
      // Fetch services
      fetchServices();
    } else if (option === 'Payment and billing') {
      if (!isAuthenticated || !user?.id) {
        setTimeout(() => {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Please login to view your payment records.',
            sender: 'support',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }, 500);
        return;
      }
      
      // Show loading message
      setTimeout(() => {
        const loadingMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Fetching your payment records...',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, loadingMessage]);
      }, 500);
      
      // Fetch payments
      fetchPayments();
    } else if (option === 'No, other') {
      setTimeout(() => {
        const specialReply: Message = {
          id: (Date.now() + 1).toString(),
          text: 'I understand. Would you like to make a call request to speak with our support team directly?',
          sender: 'support',
          timestamp: new Date(),
          options: ['Make a call request', 'No'],
        };
        setMessages(prev => [...prev, specialReply]);
      }, 1500);
    } else if (option === 'Make a call request') {
      // Handle call request
      setTimeout(() => {
        const callReply: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Great! We\'ve received your call request. Our support team will call you shortly. Please keep your phone nearby. 📞',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, callReply]);
      }, 1500);
    } else if (option === 'No') {
      // Handle "No" response
      setTimeout(() => {
        const noReply: Message = {
          id: (Date.now() + 1).toString(),
          text: 'No problem! If you need any assistance in the future, feel free to reach out. We\'re here to help! 😊',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, noReply]);
      }, 1500);
    } else {
      // Regular auto-reply for other options
      setTimeout(() => {
        const autoReply: Message = {
          id: (Date.now() + 1).toString(),
          text: `Thank you for selecting "${option}". Our support team will assist you with this. Please provide more details if needed!`,
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, autoReply]);
      }, 1500);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get status text based on status number
  const getStatusText = (status: number): string => {
    switch (status) {
      case 1:
        return 'Accept';
      case 2:
        return 'Start';
      case 3:
        return 'Complete';
      case 4:
        return 'Reject';
      case 5:
        return 'Cancel';
      case 6:
        return 'Reschedule';
      case 7:
        return 'Cancel Request';
      case 8:
        return 'Reschedule Request';
      default:
        return 'Unknown';
    }
  };

  // Get status color based on status number
  const getStatusColor = (status: number): { backgroundColor: string } => {
    switch (status) {
      case 1:
        return { backgroundColor: '#dbeafe' }; // Accept - blue
      case 2:
        return { backgroundColor: '#fef3c7' }; // Start - yellow
      case 3:
        return { backgroundColor: '#d1fae5' }; // Complete - green
      case 4:
        return { backgroundColor: '#fee2e2' }; // Reject - red
      case 5:
        return { backgroundColor: '#fee2e2' }; // Cancel - red
      case 6:
        return { backgroundColor: '#fed7aa' }; // Reschedule - orange
      case 7:
        return { backgroundColor: '#fef3c7' }; // Cancel Request - yellow
      case 8:
        return { backgroundColor: '#fef3c7' }; // Reschedule Request - yellow
      default:
        return { backgroundColor: '#f3f4f6' }; // Unknown - gray
    }
  };

  // Fetch bookings for the current user
  const fetchBookings = async () => {
    if (!user?.id) {
      return;
    }

    setLoadingBookings(true);
    try {
      // Use TOTAL_BOOKINGS_BY_USER to fetch all bookings (no status filter)
      const response = await fetch(API_ENDPOINTS.TOTAL_BOOKINGS_BY_USER(user.id));
      const result = await response.json();

      if (result.success && result.data && Array.isArray(result.data)) {
        // Sort all records by id (highest first) DESC
        const sortedBookings = [...result.data].sort((a: any, b: any) => {
          const idA = a.id || 0;
          const idB = b.id || 0;
          // Sort by id DESC (highest first)
          return idB - idA;
        });

        // Group by booking_id and keep only the latest (first occurrence after sorting)
        const bookingsMap = new Map<string, any>();
        
        sortedBookings.forEach((booking: any) => {
          const bookingId = String(booking.booking_id || booking.id || 'N/A');
          
          // Only add if this booking_id hasn't been seen yet (since we sorted, first = latest)
          if (!bookingsMap.has(bookingId)) {
            bookingsMap.set(bookingId, booking);
          }
        });

        // Convert map to array and map to BookingData format
        const bookings: BookingData[] = Array.from(bookingsMap.values()).map((booking: any) => ({
          booking_id: booking.booking_id || booking.id || 'N/A',
          worker_name: booking.worker_name || 'N/A',
          status: booking.status || 0,
        }));

        // Create message with bookings data
        const bookingsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: bookings.length > 0 
            ? `Here are your booking inquiries (${bookings.length}):`
            : 'You don\'t have any bookings yet.',
          sender: 'support',
          timestamp: new Date(),
          bookings: bookings,
        };

        setMessages(prev => [...prev, bookingsMessage]);
      } else {
        const noBookingsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'You don\'t have any bookings yet.',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, noBookingsMessage]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I couldn\'t fetch your bookings. Please try again later.',
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Fetch services with status = 1 and visibility = 1, ordered by id DESC
  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_SERVICES);
      const result = await response.json();

      if (result.success && result.services && Array.isArray(result.services)) {
        // Filter by status = 1 and visibility = 1, then sort by id DESC
        const filteredServices = result.services
          .filter((service: any) => {
            const status = service.status !== undefined ? service.status : 1;
            const visibility = service.visibility !== undefined 
              ? (typeof service.visibility === 'boolean' ? (service.visibility ? 1 : 0) : service.visibility)
              : 1;
            return status === 1 && visibility === 1;
          })
          .sort((a: any, b: any) => {
            // Sort by id DESC
            const idA = a.id || 0;
            const idB = b.id || 0;
            return idB - idA;
          })
          .map((service: any) => ({
            name: service.name || service.service_name || 'N/A',
            price: service.price || 0,
            rating: (service.rating !== undefined && service.rating !== null) ? Number(service.rating) : 0,
          }));

        // Create message with services data
        const servicesMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: filteredServices.length > 0 
            ? `Here are our services (${filteredServices.length}):`
            : 'No services available at the moment.',
          sender: 'support',
          timestamp: new Date(),
          services: filteredServices,
        };

        setMessages(prev => [...prev, servicesMessage]);
      } else {
        const noServicesMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'No services available at the moment.',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, noServicesMessage]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I couldn\'t fetch services. Please try again later.',
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Fetch payments for the current user
  const fetchPayments = async () => {
    if (!user?.id) {
      return;
    }

    setLoadingPayments(true);
    try {
      const response = await fetch(API_ENDPOINTS.PAYMENTS_BY_USER(user.id));
      const result = await response.json();

      if (result.success && result.data && Array.isArray(result.data)) {
        // Map payments to include booking_id, amount, payment_id, and created_at
        const payments: PaymentData[] = result.data.map((payment: any) => ({
          booking_id: payment.booking_id || 'N/A',
          amount: payment.amount || 0,
          payment_id: payment.payment_id || 'N/A',
          created_at: payment.payment_date || payment.created_at || 'N/A',
        }));

        // Create message with payments data
        const paymentsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: payments.length > 0 
            ? `Here are your payment records (${payments.length}):`
            : 'You don\'t have any payment records yet.',
          sender: 'support',
          timestamp: new Date(),
          payments: payments,
        };

        setMessages(prev => [...prev, paymentsMessage]);
      } else {
        const noPaymentsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'You don\'t have any payment records yet.',
          sender: 'support',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, noPaymentsMessage]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I couldn\'t fetch your payment records. Please try again later.',
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoadingPayments(false);
    }
  };

  return (
    <View style={styles.containerGradient}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={[]}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {/* Modern Header */}
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerGradient, { paddingTop: Math.max(0, insets.top - scaleHeight(2)) }]}
            >
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.backButtonInner}>
                    <Ionicons name="arrow-back" size={styles.headerIconSize} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                  <View style={styles.headerTitleContainer}>
                    <View style={styles.headerIconWrapper}>
                      <Ionicons name="chatbubbles" size={styles.headerIconSize - 2} color="#FFFFFF" />
                    </View>
                    <View style={styles.headerTitleTextContainer}>
                      <Text style={styles.headerTitle}>Customer Support</Text>
                      <View style={styles.onlineIndicator}>
                        <View style={styles.onlineDot}>
                          <View style={styles.onlineDotInner} />
                        </View>
                        <Text style={styles.onlineText}>Online now</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>

          {/* Messages Area with Gradient Background */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, index) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.sender === 'user' ? styles.userMessageWrapper : styles.supportMessageWrapper,
                ]}
              >
                {message.sender === 'support' && (
                  <View style={styles.supportAvatar}>
                    <Ionicons name="headset" size={styles.avatarIconSize} color="#667eea" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.sender === 'user' ? styles.userMessage : styles.supportMessage,
                  ]}
                >
                  {message.sender === 'user' ? (
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.userMessageGradient}
                    >
                      <Text style={styles.userMessageText}>
                        {message.text}
                      </Text>
                      <Text style={styles.userMessageTime}>
                        {formatTime(message.timestamp)}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.supportMessageContent}>
                      <Text style={styles.supportMessageText}>
                        {message.text}
                      </Text>
                      {message.bookings && message.bookings.length > 0 && (
                        <View style={styles.bookingsContainer}>
                          {message.bookings.map((booking, idx) => (
                            <View key={idx} style={styles.bookingCard}>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Booking ID:</Text>
                                <Text style={styles.bookingValue}>{booking.booking_id}</Text>
                              </View>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Worker Name:</Text>
                                <Text style={styles.bookingValue}>{booking.worker_name}</Text>
                              </View>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Status:</Text>
                                <View style={[styles.statusBadge, getStatusColor(booking.status)]}>
                                  <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      {message.services && message.services.length > 0 && (
                        <View style={styles.bookingsContainer}>
                          {message.services.map((service, idx) => (
                            <View key={idx} style={styles.bookingCard}>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Name:</Text>
                                <Text style={styles.bookingValue}>{service.name}</Text>
                              </View>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Price:</Text>
                                <Text style={styles.bookingValue}>₹{service.price}</Text>
                              </View>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Rating:</Text>
                                <Text style={styles.bookingValue}>
                                  {(service.rating && typeof service.rating === 'number' ? service.rating.toFixed(1) : '0.0')} ⭐
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      {message.payments && message.payments.length > 0 && (
                        <View style={styles.bookingsContainer}>
                          {message.payments.map((payment, idx) => (
                            <View key={idx} style={styles.bookingCard}>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Booking ID:</Text>
                                <Text style={styles.bookingValue}>{payment.booking_id}</Text>
                              </View>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Amount:</Text>
                                <Text style={styles.bookingValue}>₹{payment.amount}</Text>
                              </View>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Payment ID:</Text>
                                <Text style={styles.bookingValue}>{payment.payment_id}</Text>
                              </View>
                              <View style={styles.bookingRow}>
                                <Text style={styles.bookingLabel}>Date:</Text>
                                <Text style={styles.bookingValue}>
                                  {payment.created_at !== 'N/A' 
                                    ? new Date(payment.created_at).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : 'N/A'}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      {message.options && message.options.length > 0 && (
                        <View style={styles.optionsContainer}>
                          {message.options.map((option, idx) => {
                            const isOtherOption = option === 'No, other';
                            const isCallRequest = option === 'Make a call request';
                            const isNoOption = option === 'No';
                            
                            if (isCallRequest) {
                              return (
                                <TouchableOpacity
                                  key={idx}
                                  style={styles.optionButtonCall}
                                  onPress={() => handleOptionClick(option)}
                                  activeOpacity={0.8}
                                >
                                  <LinearGradient
                                    colors={['#667eea', '#764ba2']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.optionButtonCallGradient}
                                  >
                                    <Ionicons name="call" size={styles.headerIconSize - 4} color="#FFFFFF" style={styles.optionIcon} />
                                    <Text style={styles.optionTextCall}>{option}</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                              );
                            }
                            
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={isOtherOption || isNoOption ? styles.optionButtonOther : styles.optionButton}
                                onPress={() => handleOptionClick(option)}
                                activeOpacity={0.7}
                              >
                                <Text style={isOtherOption || isNoOption ? styles.optionTextOther : styles.optionText}>• {option}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                      <Text style={styles.supportMessageTime}>
                        {formatTime(message.timestamp)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Modern Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={styles.attachIconSize} color="#667eea" />
              </TouchableOpacity>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type your message..."
                  placeholderTextColor="#999"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
              </View>
              {inputText.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    <Ionicons
                      name="send"
                      size={styles.sendIconSize}
                      color="#FFF"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emojiButton} activeOpacity={0.7}>
                  <Ionicons name="happy-outline" size={styles.sendIconSize} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const createStyles = (screenWidth: number, screenHeight: number) => {
  const baseWidth = 375;
  const baseHeight = 812;

  const scale = (size: number) => (screenWidth / baseWidth) * size;
  const scaleHeight = (size: number) => (screenHeight / baseHeight) * size;
  const moderateScale = (size: number, factor: number = 0.5) =>
    size + (scale(size) - size) * factor;

  const headerIconSize = Math.max(22, Math.min(26, moderateScale(24)));
  const sendIconSize = Math.max(18, Math.min(22, moderateScale(20)));
  const attachIconSize = Math.max(22, Math.min(26, moderateScale(24)));
  const avatarIconSize = Math.max(16, Math.min(20, moderateScale(18)));

  return StyleSheet.create({
    containerGradient: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    container: {
      flex: 1,
      backgroundColor: '#f0f2f5',
    },
    safeArea: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    headerGradient: {
      paddingBottom: scale(2),
      zIndex: 100,
      elevation: 100,
      shadowColor: '#667eea',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scale(16),
      paddingVertical: scale(6),
    },
    backButton: {
      width: scale(44),
      height: scale(44),
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonInner: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContent: {
      flex: 1,
      alignItems: 'flex-start',
      marginLeft: scale(-10),
      marginRight: scale(12),
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(14),
    },
    headerIconWrapper: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleTextContainer: {
      alignItems: 'flex-start',
      flex: 1,
      marginLeft: scale(-10),
    },
    headerTitle: {
      fontSize: moderateScale(20),
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      marginBottom: scale(2),
    },
    onlineIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: scale(10),
      paddingVertical: scale(4),
      borderRadius: scale(12),
      marginTop: scale(2),
    },
    onlineDot: {
      width: scale(10),
      height: scale(10),
      borderRadius: scale(5),
      backgroundColor: '#4ade80',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#4ade80',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 4,
      elevation: 2,
    },
    onlineDotInner: {
      width: scale(6),
      height: scale(6),
      borderRadius: scale(3),
      backgroundColor: '#FFFFFF',
    },
    onlineText: {
      fontSize: moderateScale(12),
      color: '#FFFFFF',
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    headerIconSize: headerIconSize,
    messagesContainer: {
      flex: 1,
      backgroundColor: '#f0f2f5',
    },
    messagesContent: {
      padding: scale(16),
      paddingTop: scale(20),
      paddingBottom: scale(20),
    },
    messageWrapper: {
      marginBottom: scale(16),
      maxWidth: '75%',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: scale(8),
    },
    userMessageWrapper: {
      alignSelf: 'flex-end',
      flexDirection: 'row-reverse',
    },
    supportMessageWrapper: {
      alignSelf: 'flex-start',
    },
    supportAvatar: {
      width: scale(32),
      height: scale(32),
      borderRadius: scale(16),
      backgroundColor: '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e0e7ff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    avatarIconSize: avatarIconSize,
    messageBubble: {
      borderRadius: scale(20),
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    userMessage: {
      borderBottomRightRadius: scale(4),
    },
    userMessageGradient: {
      paddingHorizontal: scale(16),
      paddingVertical: scale(12),
      borderRadius: scale(20),
    },
    supportMessage: {
      backgroundColor: '#FFFFFF',
      borderBottomLeftRadius: scale(4),
      borderWidth: 0,
    },
    supportMessageContent: {
      paddingHorizontal: scale(16),
      paddingVertical: scale(12),
    },
    messageText: {
      fontSize: moderateScale(15),
      lineHeight: moderateScale(22),
      marginBottom: scale(6),
    },
    userMessageText: {
      color: '#FFFFFF',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    supportMessageText: {
      color: '#1a1a1a',
      fontWeight: '400',
      lineHeight: moderateScale(22),
    },
    messageTime: {
      fontSize: moderateScale(10),
      alignSelf: 'flex-end',
      marginTop: scale(2),
    },
    userMessageTime: {
      color: 'rgba(255, 255, 255, 0.85)',
      fontWeight: '500',
    },
    supportMessageTime: {
      color: '#999',
      fontWeight: '400',
      marginTop: scale(4),
    },
    optionsContainer: {
      marginTop: scale(12),
      marginBottom: scale(4),
      gap: scale(8),
    },
    optionButton: {
      backgroundColor: '#f3f4f6',
      paddingHorizontal: scale(16),
      paddingVertical: scale(12),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: '#e5e7eb',
      marginBottom: scale(4),
    },
    optionText: {
      fontSize: moderateScale(14),
      color: '#667eea',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    optionButtonOther: {
      backgroundColor: '#e5e7eb',
      paddingHorizontal: scale(16),
      paddingVertical: scale(12),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: '#d1d5db',
      marginBottom: scale(4),
    },
    optionTextOther: {
      fontSize: moderateScale(14),
      color: '#6b7280',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    optionButtonCall: {
      borderRadius: scale(12),
      overflow: 'hidden',
      marginBottom: scale(4),
      shadowColor: '#667eea',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    optionButtonCallGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(20),
      paddingVertical: scale(14),
      gap: scale(8),
    },
    optionIcon: {
      marginRight: scale(4),
    },
    optionTextCall: {
      fontSize: moderateScale(15),
      color: '#FFFFFF',
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    bookingsContainer: {
      marginTop: scale(12),
      marginBottom: scale(4),
      gap: scale(12),
    },
    bookingCard: {
      backgroundColor: '#f9fafb',
      padding: scale(12),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: '#e5e7eb',
      gap: scale(8),
      width: '70%',
      minWidth: scale(260),
    },
    bookingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: scale(4),
    },
    bookingLabel: {
      fontSize: moderateScale(13),
      color: '#6b7280',
      fontWeight: '500',
      flex: 1,
    },
    bookingValue: {
      fontSize: moderateScale(13),
      color: '#1f2937',
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    statusBadge: {
      paddingHorizontal: scale(10),
      paddingVertical: scale(4),
      borderRadius: scale(8),
    },
    statusText: {
      fontSize: moderateScale(12),
      color: '#1f2937',
      fontWeight: '600',
    },
    inputContainer: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: scale(16),
      paddingTop: scale(12),
      paddingBottom: 0,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: scale(8),
      paddingBottom: Platform.OS === 'ios' ? scale(8) : scale(12),
    },
    attachButton: {
      width: scale(44),
      height: scale(44),
      borderRadius: scale(22),
      backgroundColor: '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    attachIconSize: attachIconSize,
    textInputContainer: {
      flex: 1,
      backgroundColor: '#f3f4f6',
      borderRadius: scale(24),
      paddingHorizontal: scale(16),
      paddingVertical: scale(10),
      minHeight: scale(44),
      maxHeight: scaleHeight(120),
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    textInput: {
      flex: 1,
      fontSize: moderateScale(15),
      color: '#1a1a1a',
      paddingVertical: scale(4),
      textAlignVertical: 'center',
    },
    sendButton: {
      width: scale(44),
      height: scale(44),
      borderRadius: scale(22),
      overflow: 'hidden',
      shadowColor: '#667eea',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    sendButtonGradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiButton: {
      width: scale(44),
      height: scale(44),
      borderRadius: scale(22),
      backgroundColor: '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendIconSize: sendIconSize,
  } as any);
};
