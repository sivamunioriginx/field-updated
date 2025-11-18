import getBaseUrl from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CartService } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

export default function CartScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const { getCartItems, incrementItem, decrementItem, addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [suggestedServices, setSuggestedServices] = useState<CartService[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

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

          {suggestionsLoading ? null : suggestedServices.length > 0 && (
            <View style={styles.section}>
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
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {isAuthenticated ? 'Proceed to checkout' : 'Login/Sign up to proceed'}
          </Text>
        </TouchableOpacity>
      </View>
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
      padding: getResponsiveSpacing(16),
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
    },
    primaryButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(30),
      paddingVertical: getResponsiveValue(14, 12, 16),
      alignItems: 'center',
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
  });
};


