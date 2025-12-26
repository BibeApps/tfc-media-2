
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, Instagram, Facebook, User, Trash2, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabaseClient';

// --- STRIPE CONFIGURATION ---
const STRIPE_PUBLISHABLE_KEY = "pk_test_51SbMOd2Q5sKQr6xREozZINHdxVg2xYDQMzfV38IqsJRP8KUEkcJyTgAyX0dQvtW4fdy3nP8vKC5eRK1HhVidNI5q00MzKPaQH1";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { items, setIsOpen } = useCart();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    if (location.pathname === path) {
      window.location.reload();
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Book Us', path: '/book' },
  ];

  const handleDashboardClick = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/portal');
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path) && path !== '/' ? true : location.pathname === path;

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 dark:bg-obsidian/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
            <img
              src="/assets/images/tfc-logo.png"
              alt="TFC Media"
              className="h-48 w-auto object-contain hover:scale-105 transition-transform duration-200"
            />
          </Link>

          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className={({ isActive: linkActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive(link.path) ? 'text-electric bg-electric/10' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  {link.name}
                </NavLink>
              ))}

              {/* Dynamic Auth Button - Updated text to LOGIN */}
              {isAuthenticated ? (
                <button
                  onClick={handleDashboardClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <User className="w-4 h-4" />
                  Dashboard
                </button>
              ) : (
                <NavLink
                  to="/login"
                  className={({ isActive }) => `px-4 py-2 rounded-full border border-gray-300 dark:border-white/20 text-sm font-bold transition-all ${isActive ? 'bg-electric text-white border-electric' : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'}`}
                >
                  Login
                </NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-electric dark:hover:text-white transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {items.length > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-cyber rounded-full">
                  {items.length}
                </span>
              )}
            </button>
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-electric dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-charcoal border-b border-gray-200 dark:border-white/10"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => {
                    handleNavClick(link.path);
                    setIsMenuOpen(false);
                  }}
                  className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'text-electric bg-electric/10' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-black/20'}`}
                >
                  {link.name}
                </NavLink>
              ))}
              <div className="border-t border-gray-200 dark:border-white/10 my-2 pt-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => { setIsMenuOpen(false); handleDashboardClick(); }}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-bold text-electric bg-electric/10"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <NavLink
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-bold text-gray-600 dark:text-gray-300 hover:text-electric"
                  >
                    Login
                  </NavLink>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const CartDrawer: React.FC = () => {
  const { isOpen, setIsOpen, items, removeItem, subtotal, fee, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  const handlePaymentSubmit = async () => {
    // Validate card details
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      alert('Please fill in all card details');
      return;
    }

    // Validate test cards (Stripe test card numbers)
    const validTestCards = [
      '4242424242424242', // Visa
      '5555555555554444', // Mastercard
      '378282246310005',  // American Express
      '6011111111111117', // Discover
      '3056930009020004', // Diners Club
      '4000056655665556', // Visa (debit)
    ];

    const cleanCardNumber = cardNumber.replace(/\s/g, '');

    if (!validTestCards.includes(cleanCardNumber)) {
      alert('Please use a valid Stripe test card number.\n\nTest cards:\n• 4242 4242 4242 4242 (Visa)\n• 5555 5555 5555 4444 (Mastercard)\n• 3782 822463 10005 (Amex)');
      return;
    }

    // Validate expiry format (MM/YY)
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryRegex.test(cardExpiry)) {
      alert('Please enter expiry in MM/YY format');
      return;
    }

    // Validate CVC (3-4 digits)
    if (!/^\d{3,4}$/.test(cardCvc)) {
      alert('Please enter a valid CVC (3-4 digits)');
      return;
    }

    // Close payment modal and process checkout
    setShowPaymentModal(false);
    await handleCheckout();
  };


  const handleDigitalWalletPayment = async (method: 'apple' | 'google') => {
    // Process payment directly without confirmation dialog
    setLoading(true);

    try {
      // Small delay to simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 800));

      // Process checkout
      await handleCheckout();
    } catch (error) {
      console.error('Digital wallet payment error:', error);
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to complete your purchase');
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate unique order number
      const orderNumber = await generateOrderNumber();

      // 2. Create order in database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          client_id: user.id,
          order_number: orderNumber,
          total_amount: total,
          status: 'paid', // Mock payment - set as paid immediately
          currency: 'usd',
          stripe_session_id: `mock_session_${Date.now()}`, // Mock Stripe session ID
          stripe_payment_intent_id: `mock_pi_${Date.now()}`, // Mock payment intent ID
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        gallery_item_id: item.id,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 4. Clear cart
      await clearCart();

      // 5. Send order placed notification to client
      try {
        const { notificationService } = await import('../services/notificationService');
        await notificationService.sendNotification('order_placed', user.id, {
          orderNumber: orderNumber,
          total: total,
          items: items.map(item => ({
            name: item.title,
            quantity: 1,
            price: item.price
          }))
        });
      } catch (notifError) {
        console.error('Failed to send order notification:', notifError);
        // Don't block checkout if notification fails
      }

      // 6. Close cart drawer and payment modal
      setIsOpen(false);
      setShowPaymentModal(false);

      // 7. Show success message and redirect
      alert(`Order ${orderNumber} placed successfully! Total: $${total.toFixed(2)}`);
      navigate('/portal/purchases?success=true');

    } catch (error: any) {
      console.error('Checkout Error:', error);

      // Provide more specific error messages
      let errorMessage = 'Checkout failed. Please try again.';
      if (error?.message?.includes('duplicate key')) {
        errorMessage = 'Order number conflict. Please try again.';
      } else if (error?.message) {
        errorMessage = `Checkout failed: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate order number
  const generateOrderNumber = async (): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePrefix = `TFC-${year}${month}${day}`;

    // Get the highest order number for today
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('order_number')
      .like('order_number', `${datePrefix}%`)
      .order('order_number', { ascending: false })
      .limit(1);

    let orderCount = 1;
    if (existingOrders && existingOrders.length > 0) {
      // Extract the sequence number from the last order
      const lastOrderNumber = existingOrders[0].order_number;
      const lastSequence = parseInt(lastOrderNumber.split('-').pop() || '0');
      orderCount = lastSequence + 1;
    }

    // Generate order number and verify it doesn't exist (safety check)
    let orderNumber = `${datePrefix}-${String(orderCount).padStart(4, '0')}`;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (!existing) {
        // Order number is unique
        return orderNumber;
      }

      // If it exists, increment and try again
      orderCount++;
      orderNumber = `${datePrefix}-${String(orderCount).padStart(4, '0')}`;
      attempts++;
    }

    // Fallback: use timestamp if we couldn't find a unique number
    return `${datePrefix}-${Date.now().toString().slice(-4)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment key="cart-drawer">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-charcoal border-l border-gray-200 dark:border-white/10 z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">Shopping Cart ({items.length})</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Your cart is empty.</p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/gallery');
                    }}
                    className="mt-4 text-electric font-bold hover:underline"
                  >
                    Browse Gallery
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.cartId} className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-black rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{item.type} Download</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-electric">${item.price.toFixed(2)}</span>
                        <button
                          onClick={() => removeItem(item.cartId)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-white/10 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Service Fee (15%)</span>
                    <span>${fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-white/10">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={loading}
                  className="w-full bg-electric hover:bg-electric/90 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-electric/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>Processing <Loader2 className="w-4 h-4 animate-spin" /></>
                  ) : (
                    <>Checkout with Stripe <CreditCard className="w-4 h-4" /></>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400">
                  <span>Secured by Stripe (Test Mode)</span>
                </div>
                <button onClick={clearCart} className="w-full text-xs text-gray-500 hover:text-red-500 transition-colors">
                  Empty Cart
                </button>
              </div>
            )}
          </motion.div>
        </React.Fragment>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <React.Fragment key="payment-modal">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPaymentModal(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div className="bg-white dark:bg-charcoal rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-6 my-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white">Payment Details</h2>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">Test Mode - Use Test Cards</p>
                <div className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                  <p>• <strong>Visa:</strong> 4242 4242 4242 4242</p>
                  <p>• <strong>Mastercard:</strong> 5555 5555 5555 4444</p>
                  <p>• <strong>Amex:</strong> 3782 822463 10005</p>
                  <p className="mt-2">Use any future date for expiry and any 3-4 digits for CVC</p>
                </div>
              </div>

              {/* Digital Wallet Options */}
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={() => handleDigitalWalletPayment('apple')}
                  disabled={loading}
                  className="w-full bg-black hover:bg-black/90 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Pay with Apple Pay
                </button>

                <button
                  onClick={() => handleDigitalWalletPayment('google')}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Pay with Google Pay
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-3 sm:px-4 bg-white dark:bg-charcoal text-gray-500 dark:text-gray-400">Or pay with card</span>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '');
                      const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                      setCardNumber(formatted);
                    }}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Expiry</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.slice(0, 2) + '/' + value.slice(2, 4);
                        }
                        setCardExpiry(value);
                      }}
                      placeholder="12/28"
                      maxLength={5}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">CVC</label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      placeholder="456"
                      maxLength={4}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span>Service Fee</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base sm:text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-white/10">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  disabled={loading}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg bg-electric hover:bg-electric/90 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-electric/20 transition-all disabled:opacity-70 order-1 sm:order-2"
                >
                  {loading ? (
                    <>Processing <Loader2 className="w-4 h-4 animate-spin" /></>
                  ) : (
                    <>Pay ${total.toFixed(2)}</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

const Footer: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <footer className="bg-charcoal text-white pt-16 pb-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <img
                src="/assets/images/tfc-logo.png"
                alt="TFC Media"
                className="h-56 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </Link>
            <p className="text-gray-400 max-w-sm leading-relaxed mb-6">
              Professional photography, videography, and digital media services tailored to your unique vision. Capturing moments, creating legacies.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-electric hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-electric hover:text-white transition-all">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/portfolio" className="text-gray-400 hover:text-electric transition-colors">Portfolio</Link></li>
              <li><Link to="/gallery" className="text-gray-400 hover:text-electric transition-colors">Client Galleries</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-electric transition-colors">About Us</Link></li>
              <li><Link to="/services" className="text-gray-400 hover:text-electric transition-colors">Services</Link></li>
              <li><Link to="/book" className="text-gray-400 hover:text-electric transition-colors">Book Now</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Support</h4>
            <ul className="space-y-3">
              <li><Link to="/faq" className="text-gray-400 hover:text-electric transition-colors">FAQ</Link></li>
              <li><Link to="/licensing" className="text-gray-400 hover:text-electric transition-colors">Licensing</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-electric transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-electric transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} TFC Media Group. All rights reserved.</p>
          <div className="flex gap-6">
            {/* Consolidated Footer Login Link */}
            {isAuthenticated ? (
              <Link to={user?.role === 'admin' ? '/admin' : '/portal'} className="hover:text-white transition-colors">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-obsidian transition-colors duration-300">
      <Navbar />
      <CartDrawer />
      <main className="pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
