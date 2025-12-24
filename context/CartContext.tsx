import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, GalleryItem } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  addItem: (item: GalleryItem) => Promise<void>;
  removeItem: (cartId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  subtotal: number;
  fee: number;
  total: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load cart from database on mount and when user changes
  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setItems([]); // Clear cart if user logs out
    }
  }, [user]);

  const loadCart = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cart')
        .select(`
          id,
          gallery_item_id,
          gallery_items (
            id,
            title,
            type,
            watermarked_url,
            price,
            width,
            height,
            description,
            tags
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const cartItems: CartItem[] = (data || []).map((item: any) => ({
        id: item.gallery_items.id,
        cartId: item.id, // Use the cart table's ID as cartId
        title: item.gallery_items.title,
        type: item.gallery_items.type,
        url: item.gallery_items.watermarked_url,
        watermarked_url: item.gallery_items.watermarked_url,
        price: item.gallery_items.price,
        width: item.gallery_items.width,
        height: item.gallery_items.height,
        description: item.gallery_items.description,
        tags: item.gallery_items.tags,
      }));

      setItems(cartItems);
    } catch (err) {
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: GalleryItem) => {
    if (!user) {
      alert('Please log in to add items to your cart');
      return;
    }

    try {
      // Check if item already in cart
      const existingItem = items.find(i => i.id === item.id);
      if (existingItem) {
        alert('This item is already in your cart');
        return;
      }

      // Insert into database
      const { data, error } = await supabase
        .from('cart')
        .insert([{
          user_id: user.id,
          gallery_item_id: item.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newItem: CartItem = {
        ...item,
        cartId: data.id,
        url: item.watermarked_url || item.url || '',
      };
      setItems((prev) => [...prev, newItem]);
      setIsOpen(true);
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add item to cart');
    }
  };

  const removeItem = async (cartId: string) => {
    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('id', cartId);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.cartId !== cartId));
    } catch (err) {
      console.error('Error removing from cart:', err);
      alert('Failed to remove item from cart');
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setItems([]);
    } catch (err) {
      console.error('Error clearing cart:', err);
      alert('Failed to clear cart');
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const fee = subtotal * 0.15;
  const total = subtotal + fee;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, subtotal, fee, total, isOpen, setIsOpen, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};