import getBaseUrl from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CartService } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

export default function CartScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
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

  const cartItems = getCartItems();

  // Create responsive styles based on screen dimensions
  const styles = useMemo(() => createStyles(screenHeight, screenWidth), [screenHeight, screenWidth]);

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
      await updateUser({
        name: trimmedName,
        mobile: trimmedPhone,
      });
      setShowContactModal(false);
    } catch (error) {
      console.error('Error updating contact info:', error);
    } finally {
      setIsSavingContact(false);
    }
  };

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
          <Ionicons name="arrow-back" size={getIconSize(22)} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your cart</Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={getIconSize(60)} color="#bdbdbd" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add services to continue booking.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Browse services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: screenHeight * 0.17 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cartList}>
            {cartItems.map(item => (
              <View key={item.service.id} style={styles.cartItem}>
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

          {isAuthenticated && (
            <View style={[styles.section, styles.infoSection]}>
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person-outline" size={getIconSize(18)} color="#8B5CF6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{user?.name || 'Guest user'}</Text>
                  <Text style={styles.infoSubtitle}>{user?.mobile || 'Phone number unavailable'}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setContactName(user?.name || '');
                    setContactPhone(user?.mobile || '');
                    setShowContactModal(true);
                  }}
                >
                  <Text style={styles.infoActionText}>Change</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}

          {suggestionsLoading ? null : suggestedServices.length > 0 && (
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
          )}

          <View style={styles.section}>
            <View style={styles.couponRow}>
              <View style={styles.couponIcon}>
                <Ionicons name="pricetag-outline" size={getIconSize(16)} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.couponTitle}>Coupons and offers</Text>
                <Text style={styles.couponSubtitle}>Login/Sign up to view offers</Text>
              </View>
            </View>
          </View>

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
      )}

      <View style={styles.footer}>
        {isAuthenticated ? (
          <>
            <TouchableOpacity
              style={styles.footerLocationCard}
              onPress={() => router.push('/location-picker')}
              activeOpacity={0.85}
            >
              <View style={styles.footerLocationIcon}>
                <Ionicons name={addressIconName} size={getIconSize(18)} color="#8B5CF6" />
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
            <TouchableOpacity style={[styles.primaryButton, styles.primaryButtonFull]}>
              <Text style={styles.primaryButtonText}>Select slot</Text>
            </TouchableOpacity>
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
              {savedAddresses.map((address) => {
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
                    key={address.id || 'default'}
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
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getResponsiveWidth(20),
      paddingTop: getResponsiveValue(50, 40, 60),
      paddingBottom: getResponsiveValue(10, 8, 12),
    },
    backButton: {
      marginRight: getResponsiveSpacing(12),
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700',
      color: '#000',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: getResponsiveWidth(20),
    },
    cartList: {
      backgroundColor: '#FFFFFF',
    },
    cartItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: getResponsiveValue(16, 12, 20),
      borderBottomWidth: 1,
      borderBottomColor: '#F1F1F1',
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
      backgroundColor: '#F5F5F5',
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
      color: '#000',
      marginBottom: getResponsiveSpacing(4),
    },
    cartItemPrice: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
    },
    cartItemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(20),
      paddingHorizontal: getResponsiveSpacing(8),
      paddingVertical: getResponsiveSpacing(4),
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
      marginTop: getResponsiveValue(24, 20, 28),
    },
    sectionTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
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
      borderColor: '#F0E9FF',
      backgroundColor: '#F9F6FF',
      marginBottom: getResponsiveSpacing(16),
    },
    infoIcon: {
      width: getResponsiveWidth(40, 34, 46),
      height: getResponsiveWidth(40, 34, 46),
      borderRadius: getResponsiveSpacing(20),
      backgroundColor: '#EFE6FF',
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
      marginTop: getResponsiveValue(12, 8, 14),
      marginBottom: getResponsiveValue(2, 0, 4),
    },
    suggestionsSection: {
      marginTop: getResponsiveValue(10, 8, 12),
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
      borderColor: '#F0F0F0',
      borderRadius: getResponsiveSpacing(16),
    },
    couponIcon: {
      width: getResponsiveWidth(32, 28, 36),
      height: getResponsiveWidth(32, 28, 36),
      borderRadius: getResponsiveSpacing(16),
      backgroundColor: '#F2ECFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(12),
    },
    couponTitle: {
      fontSize: getResponsiveFontSize(15),
      fontWeight: '600',
      color: '#000',
    },
    couponSubtitle: {
      fontSize: getResponsiveFontSize(13),
      color: '#8E8E8E',
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
      color: '#555',
    },
    summarySubLabel: {
      fontSize: getResponsiveFontSize(12),
      color: '#999',
    },
    summaryValue: {
      fontSize: getResponsiveFontSize(15),
      color: '#111',
      fontWeight: '600',
    },
    summaryDivider: {
      height: 1,
      backgroundColor: '#F0F0F0',
      marginVertical: getResponsiveSpacing(8),
    },
    summaryTotalLabel: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '700',
      color: '#000',
    },
    summaryTotalValue: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: getResponsiveSpacing(12),
      paddingBottom: getResponsiveSpacing(10),
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
    },
    footerLocationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getResponsiveSpacing(10),
      borderWidth: 1,
      borderColor: '#F0F0F0',
      borderRadius: getResponsiveSpacing(16),
      marginBottom: getResponsiveSpacing(6),
      backgroundColor: '#FFF',
    },
    footerLocationIcon: {
      width: getResponsiveWidth(34, 30, 40),
      height: getResponsiveWidth(34, 30, 40),
      borderRadius: getResponsiveSpacing(17),
      backgroundColor: '#F2ECFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(10),
    },
    footerLocationContent: {
      flex: 1,
    },
    footerLocationValue: {
      fontSize: getResponsiveFontSize(13),
      color: '#555',
    },
    primaryButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(26),
      paddingVertical: getResponsiveValue(12, 10, 14),
      alignItems: 'center',
    },
    primaryButtonFull: {
      marginTop: getResponsiveSpacing(2),
    },
    primaryButtonText: {
      color: '#FFF',
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: getResponsiveWidth(32),
    },
    emptyTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
      marginTop: getResponsiveValue(12, 10, 14),
    },
    emptySubtitle: {
      fontSize: getResponsiveFontSize(14),
      color: '#777',
      marginTop: getResponsiveSpacing(6),
      textAlign: 'center',
    },
    emptyButton: {
      marginTop: getResponsiveValue(20, 16, 24),
      paddingHorizontal: getResponsiveWidth(24),
      paddingVertical: getResponsiveValue(12, 10, 14),
      borderRadius: getResponsiveSpacing(24),
      borderWidth: 1,
      borderColor: '#8B5CF6',
    },
    emptyButtonText: {
      color: '#8B5CF6',
      fontWeight: '600',
      fontSize: getResponsiveFontSize(14),
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
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
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
      borderBottomColor: '#F0F0F0',
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
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
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
      top: getResponsiveValue(-4, -4, 1),
      left: getResponsiveSpacing(204),
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
    },
    contactModalTitle: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
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
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: getResponsiveSpacing(8),
      backgroundColor: '#FFF',
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
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: getResponsiveSpacing(8),
      paddingHorizontal: getResponsiveSpacing(10),
      paddingVertical: getResponsiveSpacing(8),
      fontSize: getResponsiveFontSize(14),
      color: '#000',
      backgroundColor: '#FFF',
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
  });
};


