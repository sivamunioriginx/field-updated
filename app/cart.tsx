import getBaseUrl from '@/constants/api';
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
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { getCartItems, incrementItem, decrementItem, addToCart } = useCart();
  const [suggestedServices, setSuggestedServices] = useState<CartService[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const cartItems = getCartItems();

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
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your cart</Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={60} color="#bdbdbd" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add services to continue booking.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Browse services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
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
                      <Ionicons name="image-outline" size={20} color="#8B5CF6" />
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
                    <Ionicons name="remove" size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => incrementItem(item.service.id, item.service)}
                  >
                    <Ionicons name="add" size={16} color="#8B5CF6" />
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
                          <Ionicons name="image-outline" size={20} color="#8B5CF6" />
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
                <Ionicons name="pricetag-outline" size={16} color="#8B5CF6" />
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
          <Text style={styles.primaryButtonText}>Login/Sign up to proceed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  cartList: {
    backgroundColor: '#FFFFFF',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  cartItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  cartItemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  cartItemPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    padding: 4,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginHorizontal: 8,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  suggestionsRow: {
    gap: 16,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 12,
  },
  suggestionImage: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginBottom: 10,
  },
  suggestionPlaceholder: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  suggestionPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  suggestionAddButton: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 20,
    paddingVertical: 4,
    alignItems: 'center',
  },
  suggestionAddText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
  },
  couponIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  couponSubtitle: {
    fontSize: 13,
    color: '#8E8E8E',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555',
  },
  summarySubLabel: {
    fontSize: 12,
    color: '#999',
  },
  summaryValue: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  emptyButtonText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
});


