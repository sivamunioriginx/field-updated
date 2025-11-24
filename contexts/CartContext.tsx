import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export interface CartService {
  id: number;
  name: string;
  price?: number;
  image?: string;
  subcategory_id?: string;
  instant_service?: number | string | boolean;
}

interface CartItem {
  service: CartService;
  quantity: number;
}

interface CartContextType {
  cart: { [key: number]: number };
  cartDetails: { [key: number]: CartService };
  addToCart: (service: CartService) => void;
  incrementItem: (serviceId: number, serviceDetails?: CartService) => void;
  decrementItem: (serviceId: number) => void;
  removeFromCart: (serviceId: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: (services?: CartService[]) => number;
  getCartItems: () => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [cartDetails, setCartDetails] = useState<{ [key: number]: CartService }>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const { user } = useAuth();
  const storageKey = user ? `cart_${user.id}` : 'cart_guest';

  useEffect(() => {
    let isMounted = true;

    const loadCart = async () => {
      try {
        setIsHydrated(false);
        const savedCart = await AsyncStorage.getItem(storageKey);
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (isMounted) {
            setCart(parsed.cart || {});
            setCartDetails(parsed.cartDetails || {});
          }
        } else if (isMounted) {
          setCart({});
          setCartDetails({});
        }
      } catch (error) {
        console.error('Error loading cart from storage:', error);
        if (isMounted) {
          setCart({});
          setCartDetails({});
        }
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    loadCart();

    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const saveCart = async () => {
      try {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            cart,
            cartDetails,
          })
        );
      } catch (error) {
        console.error('Error saving cart to storage:', error);
      }
    };

    saveCart();
  }, [cart, cartDetails, storageKey, isHydrated]);

  const addToCart = (service: CartService) => {
    setCart(prev => ({
      ...prev,
      [service.id]: (prev[service.id] || 0) + 1
    }));
    setCartDetails(prev => ({
      ...prev,
      [service.id]: service,
    }));
  };

  const incrementItem = (serviceId: number, serviceDetails?: CartService) => {
    setCart(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || 0) + 1
    }));
    if (serviceDetails) {
      setCartDetails(prev => ({
        ...prev,
        [serviceId]: serviceDetails,
      }));
    }
  };

  const decrementItem = (serviceId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[serviceId] > 1) {
        newCart[serviceId] = newCart[serviceId] - 1;
      } else {
        delete newCart[serviceId];
      }
      setCartDetails(prevDetails => {
        const newDetails = { ...prevDetails };
        if (!newCart[serviceId]) {
          delete newDetails[serviceId];
        }
        return newDetails;
      });
      return newCart;
    });
  };

  const removeFromCart = (serviceId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[serviceId];
      return newCart;
    });
    setCartDetails(prev => {
      const newDetails = { ...prev };
      delete newDetails[serviceId];
      return newDetails;
    });
  };

  const clearCart = () => {
    setCart({});
    setCartDetails({});
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getTotalPrice = (services: CartService[] = []) => {
    let total = 0;
    Object.entries(cart).forEach(([serviceId, quantity]) => {
      const numericId = parseInt(serviceId);
      const service = services.find(s => s.id === numericId) || cartDetails[numericId];
      if (service) {
        total += (service.price || 299) * quantity;
      }
    });
    return total;
  };

  const getCartItems = () => {
    return Object.entries(cart)
      .map(([serviceId, quantity]) => {
        const service = cartDetails[parseInt(serviceId)];
        if (!service) return null;
        return {
          service,
          quantity,
        };
      })
      .filter((item): item is CartItem => item !== null);
  };

  const value = useMemo(
    () => ({
      cart,
      cartDetails,
      addToCart,
      incrementItem,
      decrementItem,
      removeFromCart,
      clearCart,
      getTotalItems,
      getTotalPrice,
      getCartItems,
    }),
    [cart, cartDetails]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

