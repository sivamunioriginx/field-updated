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
}

export default function CustomerServiceScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
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

    // Special handling for "No, other" option
    if (option === 'No, other') {
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
