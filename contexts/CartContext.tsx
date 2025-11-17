import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface Service {
  id: number;
  name: string;
  price?: number;
  image?: string;
}

interface CartContextType {
  cart: { [key: number]: number };
  addToCart: (serviceId: number) => void;
  incrementItem: (serviceId: number) => void;
  decrementItem: (serviceId: number) => void;
  removeFromCart: (serviceId: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: (services: Service[]) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<{ [key: number]: number }>({});

  const addToCart = (serviceId: number) => {
    setCart(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || 0) + 1
    }));
  };

  const incrementItem = (serviceId: number) => {
    setCart(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || 0) + 1
    }));
  };

  const decrementItem = (serviceId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[serviceId] > 1) {
        newCart[serviceId] = newCart[serviceId] - 1;
      } else {
        delete newCart[serviceId];
      }
      return newCart;
    });
  };

  const removeFromCart = (serviceId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[serviceId];
      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getTotalPrice = (services: Service[]) => {
    let total = 0;
    Object.entries(cart).forEach(([serviceId, quantity]) => {
      const service = services.find(s => s.id === parseInt(serviceId));
      if (service) {
        total += (service.price || 299) * quantity;
      }
    });
    return total;
  };

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      incrementItem,
      decrementItem,
      removeFromCart,
      clearCart,
      getTotalItems,
      getTotalPrice,
    }),
    [cart]
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

