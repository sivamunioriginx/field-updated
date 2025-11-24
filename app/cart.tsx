import getBaseUrl, { API_ENDPOINTS } from '@/constants/api';
import type { CartService } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

interface Subcategory {
  id: number;
  name: string;
  image: string;
}

interface GroupedCartItem {
  subcategoryId: string;
  subcategoryName: string;
  subcategoryImage: string | null;
  services: Array<{
    service: CartService;
    quantity: number;
  }>;
  totalServices: number;
  totalPrice: number;
  isInstant: boolean;
}

export default function CartScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const { cart, cartDetails, incrementItem, decrementItem, removeFromCart, getTotalPrice, getTotalItems } = useCart();
  
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch subcategories to get names
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.SUBCATEGORIES);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setSubcategories(data.data);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubcategories();
  }, []);

  const isInstantService = (value: CartService['instant_service']) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === '1' || value.toLowerCase?.() === 'true';
    return value === 1;
  };

  // Group cart items by subcategory
  const groupedCartItems = useMemo(() => {
    const subcategoryMap = new Map<string, Subcategory>();
    subcategories.forEach(sub => {
      subcategoryMap.set(sub.id.toString(), sub);
    });

    const grouped = new Map<string, GroupedCartItem>();

    Object.entries(cart).forEach(([serviceId, quantity]) => {
      const service = cartDetails[parseInt(serviceId)];
      if (!service) return;

      const subcategoryId = service.subcategory_id || 'unknown';
      const subcategory = subcategoryMap.get(subcategoryId);
      const subcategoryName = subcategory?.name || 'Unknown Category';
      const subcategoryImage = subcategory?.image ? `/uploads/subcategorys/${subcategory.image}` : null;
      const isInstant = isInstantService(service.instant_service);
      const groupKey = `${subcategoryId}-${isInstant ? 'instant' : 'regular'}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          subcategoryId,
          subcategoryName,
          subcategoryImage,
          services: [],
          totalServices: 0,
          totalPrice: 0,
          isInstant,
        });
      }

      const group = grouped.get(groupKey)!;
      group.services.push({
        service,
        quantity
      });
      group.totalServices += quantity;
      group.totalPrice += (service.price || 0) * quantity;
    });

    return Array.from(grouped.values());
  }, [cart, cartDetails, subcategories]);

  // Calculate totals
  const cartTotal = useMemo(() => {
    const itemCount = getTotalItems();
    const services = Object.values(cartDetails);
    const total = getTotalPrice(services);
    return { total, itemCount };
  }, [cart, cartDetails, getTotalItems, getTotalPrice]);

  const handleIncrement = (service: CartService) => {
    incrementItem(service.id, service);
  };

  const handleDecrement = (serviceId: number) => {
    decrementItem(serviceId);
  };

  const handleRemove = (serviceId: number) => {
    removeFromCart(serviceId);
  };

  const handleRemoveSubcategory = (subcategoryId: string, isInstant = false) => {
    // Remove all services in this subcategory
    groupedCartItems.forEach(group => {
      if (group.subcategoryId === subcategoryId && group.isInstant === isInstant) {
        group.services.forEach(({ service }) => {
          removeFromCart(service.id);
        });
      }
    });
  };

  const handleAddServices = (subcategoryId: string) => {
    // Navigate to services screen with subcategory
    router.push({
      pathname: '/services-screen',
      params: {
        subcategoryId: subcategoryId,
      }
    });
  };

  const handleCheckout = () => {
    if (cartTotal.itemCount > 0) {
      router.push('/checkout');
    }
  };

  const handleGroupCheckout = (subcategoryId: string, isInstant = false) => {
    // Navigate to checkout with subcategory filter
    const params: Record<string, string> = { subcategoryId };
    if (isInstant) {
      params.instantOnly = 'true';
    }
    router.push({
      pathname: '/checkout',
      params,
    });
  };

  // Responsive icon size helper
  const getIconSize = (baseSize: number) => {
    const baseWidth = 375;
    const scaledSize = (baseSize * screenWidth) / baseWidth;
    return Math.max(baseSize * 0.8, Math.min(baseSize * 1.2, scaledSize));
  };

  const styles = createStyles(screenWidth, screenHeight);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  if (cartTotal.itemCount === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="cart-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add services to get started</Text>
        <TouchableOpacity 
          style={styles.continueShoppingButton}
          onPress={() => router.back()}
        >
          <Text style={styles.continueShoppingText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={getIconSize(22)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your cart</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {groupedCartItems.map((group) => (
          <View key={`${group.subcategoryId}-${group.isInstant ? 'instant' : 'regular'}`} style={styles.subcategoryCard}>
            {/* Subcategory Header with Icon and Title */}
            <View style={styles.subcategoryHeader}>
              {/* Subcategory Icon */}
              <View style={styles.subcategoryIconContainer}>
                {group.subcategoryImage ? (
                  <Image
                    source={{ uri: `${getBaseUrl().replace('/api', '')}${group.subcategoryImage}` }}
                    style={styles.subcategoryIcon}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.subcategoryIconPlaceholder}>
                    <Ionicons name="construct-outline" size={32} color="#8B5CF6" />
                  </View>
                )}
              </View>

              {/* Subcategory Title and Summary */}
              <View style={styles.subcategoryTitleContainer}>
              <View style={styles.subcategoryTitleRow}>
                <View style={styles.subcategoryTitleLeft}>
                  <Text style={styles.subcategoryName}>{group.subcategoryName}</Text>
                  {group.isInstant && (
                    <View style={styles.instantBadge}>
                      <Text style={styles.instantBadgeText}>Instant</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeSubcategoryButton}
                  onPress={() => handleRemoveSubcategory(group.subcategoryId, group.isInstant)}
                >
                  <Ionicons name="trash-outline" size={20} color="#666" />
                </TouchableOpacity>
                </View>
                <Text style={styles.subcategorySummary}>
                {group.isInstant
                  ? `Instant services (${group.totalServices}) • ₹${group.totalPrice.toLocaleString('en-IN')}`
                  : `${group.totalServices} service${group.totalServices > 1 ? 's' : ''} • ₹${group.totalPrice.toLocaleString('en-IN')}`}
                </Text>
              </View>
            </View>

            {/* Services List */}
            <View style={styles.servicesList}>
              {group.services.map(({ service, quantity }) => (
                <View key={service.id} style={styles.serviceListItem}>
                  <Text style={styles.serviceBullet}>•</Text>
                  <Text style={styles.serviceListItemText}>
                    {service.name} X {quantity}
                  </Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.addServicesButton}
                onPress={() => handleAddServices(group.subcategoryId)}
              >
                <Text style={styles.addServicesButtonText}>Add Services</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkoutGroupButton}
                onPress={() => handleGroupCheckout(group.subcategoryId, group.isInstant)}
              >
                <Text style={styles.checkoutGroupButtonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

    </View>
  );
}

const createStyles = (screenWidth: number, screenHeight: number) => {
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
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: getResponsiveSpacing(16),
      fontSize: getResponsiveFontSize(16),
      color: '#666',
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
    headerRight: {
      width: getResponsiveWidth(32),
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: getResponsiveValue(20),
      paddingHorizontal: getResponsiveWidth(16),
    },
    subcategoryCard: {
      backgroundColor: '#ebe6f3ff',
      marginTop: getResponsiveSpacing(8),
      marginBottom: getResponsiveSpacing(2),
      borderRadius: getResponsiveSpacing(8),
      borderWidth: 1,
      borderColor: '#E8D5FF',
      overflow: 'hidden',
    },
    subcategoryHeader: {
      flexDirection: 'row',
      padding: getResponsiveSpacing(16),
      alignItems: 'flex-start',
    },
    subcategoryIconContainer: {
      width: getResponsiveWidth(80, 60, 100),
      height: getResponsiveWidth(80, 60, 100),
      borderRadius: getResponsiveSpacing(8),
      backgroundColor: '#F5F5F5',
      marginRight: getResponsiveSpacing(12),
      overflow: 'hidden',
    },
    subcategoryIcon: {
      width: '100%',
      height: '100%',
    },
    subcategoryIconPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
    },
    subcategoryTitleContainer: {
      flex: 1,
    },
    subcategoryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getResponsiveSpacing(4),
    },
    subcategoryTitleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    subcategoryName: {
      fontSize: getResponsiveFontSize(18),
      fontWeight: '700',
      color: '#000',
    },
    removeSubcategoryButton: {
      padding: getResponsiveSpacing(4),
    },
    instantBadge: {
      backgroundColor: '#FFE5B4',
      borderRadius: getResponsiveSpacing(10),
      paddingHorizontal: getResponsiveSpacing(8),
      paddingVertical: getResponsiveSpacing(2),
      marginLeft: getResponsiveSpacing(6),
    },
    instantBadgeText: {
      fontSize: getResponsiveFontSize(12),
      color: '#FF6B00',
      fontWeight: '600',
    },
    subcategorySummary: {
      fontSize: getResponsiveFontSize(14),
      color: '#666',
    },
    servicesList: {
      paddingHorizontal: getResponsiveSpacing(16),
      paddingBottom: getResponsiveSpacing(12),
    },
    serviceListItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: getResponsiveSpacing(4),
    },
    serviceBullet: {
      fontSize: getResponsiveFontSize(16),
      color: '#000',
      marginRight: getResponsiveSpacing(8),
      marginTop: getResponsiveSpacing(2),
    },
    serviceListItemText: {
      fontSize: getResponsiveFontSize(14),
      color: '#333',
      flex: 1,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      paddingHorizontal: getResponsiveSpacing(16),
      paddingBottom: getResponsiveSpacing(16),
    },
    addServicesButton: {
      flex: 1,
      backgroundColor: '#D4C4F0',
      borderWidth: 1,
      borderColor: '#D4C4F0',
      borderRadius: getResponsiveSpacing(8),
      paddingVertical: getResponsiveValue(12, 10, 14),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getResponsiveSpacing(12),
    },
    addServicesButtonText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#000',
    },
    checkoutGroupButton: {
      flex: 1,
      backgroundColor: '#8B5CF6',
      borderRadius: getResponsiveSpacing(8),
      paddingVertical: getResponsiveValue(12, 10, 14),
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkoutGroupButtonText: {
      fontSize: getResponsiveFontSize(14),
      fontWeight: '600',
      color: '#FFFFFF',
    },
    emptyTitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600',
      color: '#666',
      marginTop: getResponsiveSpacing(16),
      marginBottom: getResponsiveSpacing(8),
    },
    emptySubtitle: {
      fontSize: getResponsiveFontSize(14),
      color: '#999',
      marginBottom: getResponsiveSpacing(24),
    },
    continueShoppingButton: {
      backgroundColor: '#8B5CF6',
      paddingHorizontal: getResponsiveWidth(24),
      paddingVertical: getResponsiveValue(12, 10, 14),
      borderRadius: getResponsiveSpacing(8),
    },
    continueShoppingText: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
};

