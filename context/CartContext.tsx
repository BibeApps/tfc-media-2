import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, GalleryItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: GalleryItem) => void;
  removeItem: (cartId: string) => void;
  clearCart: () => void;
  subtotal: number;
  fee: number;
  total: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (item: GalleryItem) => {
    const newItem: CartItem = { ...item, cartId: Math.random().toString(36).substr(2, 9) };
    setItems((prev) => [...prev, newItem]);
    setIsOpen(true);
  };

  const removeItem = (cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const fee = subtotal * 0.15;
  const total = subtotal + fee;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, subtotal, fee, total, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};