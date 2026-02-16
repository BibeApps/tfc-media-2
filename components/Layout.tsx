
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, Instagram, Facebook, User, Trash2, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabaseClient';
import { SupportModal } from './SupportModal';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// --- STRIPE CONFIGURATION ---
const STRIPE_PUBLISHABLE_KEY = "pk_test_51SbMOd2Q5sKQr6xREozZINHdxVg2xYDQMzfV38IqsJRP8KUEkcJyTgAyX0dQvtW4fdy3nP8vKC5eRK1HhVidNI5q00MzKPaQH1";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

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
        <div className="flex items-center justify-between h-32">
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
            <img
              src="/assets/images/tfc-logo.png"
              alt="TFC Media"
              className="h-48 w-auto object-contain hover:scale-105 transition-transform duration-200"
            />
          </Link>

          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              {navLinks
                .filter(link => link.name !== 'Gallery' || isAuthenticated)
                .map((link) => (
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
              {navLinks
                .filter(link => link.name !== 'Gallery' || isAuthenticated)
                .map((link) => (
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

const CheckoutForm: React.FC<{
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage('Payment system not ready. Please refresh and try again.');
      return;
    }

    setIsLoading(true);
    setMessage(null); // Clear previous errors

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/#/portal/purchases?success=true`,
      },
      redirect: 'if_required',
    });

    if (error) {
      // Handle specific error types
      let errorMessage = error.message || 'An unexpected error occurred.';

      if (error.type === 'card_error') {
        errorMessage = error.message || 'Your card was declined. Please try a different payment method.';
      } else if (error.type === 'validation_error') {
        errorMessage = 'Please check your payment details and try again.';
      }

      setMessage(errorMessage);
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else if (paymentIntent && paymentIntent.status === 'processing') {
      setMessage('Payment is processing. Please wait...');
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'requires_payment_method') {
      setMessage('Payment failed. Please try a different payment method.');
      setIsLoading(false);
    } else {
      setMessage('Payment status: ' + (paymentIntent?.status || 'unknown'));
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {message && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400 text-sm font-medium">{message}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-3 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !stripe || !elements}
          className="flex-1 px-4 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold shadow-lg shadow-electric/25 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay $${amount.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

const CartDrawer: React.FC = () => {
  const { isOpen, setIsOpen, items, removeItem, subtotal, tax, fee, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitiateCheckout = async () => {
    setError(null); // Clear previous errors

    if (!user) {
      setError('Please log in to complete your purchase');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate unique order number
      const orderNumber = await generateOrderNumber();

      // 2. Create order in database (PENDING)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          client_id: user.id,
          order_number: orderNumber,
          total_amount: total,
          status: 'pending',
          currency: 'usd',
        }])
        .select()
        .single();

      if (orderError) throw new Error('Failed to create order: ' + orderError.message);
      setCurrentOrderId(orderData.id);

      // 3. Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        gallery_item_id: item.id,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw new Error('Failed to add items to order: ' + itemsError.message);

      // 4. Create Payment Intent via Edge Function
      const { data, error: intentError } = await supabase.functions.invoke('create-gallery-payment-intent', {
        body: {
          orderId: orderData.id,
          amount: total,
          userEmail: user.email,
        }
      });

      if (intentError) throw new Error('Payment setup failed: ' + intentError.message);
      if (!data?.clientSecret) throw new Error('Payment system error. Please try again.');

      setClientSecret(data.clientSecret);

    } catch (error: any) {
      console.error('Checkout Init Error:', error);
      setError(error.message || 'Failed to initiate checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handlePaymentSuccess = async () => {
    console.log('🎉 Payment succeeded! Order ID:', currentOrderId);

    // Update order status in DB first
    if (currentOrderId) {
      console.log('📝 Updating order status to paid...');
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', currentOrderId)
        .select();

      if (error) {
        console.error('❌ Error updating order:', error);
      } else {
        console.log('✅ Order updated successfully:', data);
      }
    }

    // Clear cart
    console.log('🛒 Clearing cart...');
    await clearCart();
    setClientSecret(null);
    setIsOpen(false);

    // Navigate to purchases
    console.log('🔄 Navigating to purchases page...');
    navigate('/portal/purchases?success=true');
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
                    <div className="w-20 h-32 bg-gray-100 dark:bg-black rounded-lg overflow-hidden flex-shrink-0">
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
                  {tax > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                  )}
                  {fee > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Service Fee</span>
                      <span>${fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-white/10">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
                  </div>
                )}
                <button
                  onClick={handleInitiateCheckout}
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

      {/* Embedded Payment Modal */}
      {clientSecret && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setClientSecret(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-electric" />
              Secure Payment
            </h2>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <CheckoutForm amount={total} onSuccess={handlePaymentSuccess} onCancel={() => setClientSecret(null)} />
            </Elements>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Footer: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  return (
    <>
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
                {isAuthenticated && (
                  <li><Link to="/gallery" className="text-gray-400 hover:text-electric transition-colors">Client Galleries</Link></li>
                )}
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
                <li>
                  <button
                    onClick={() => setIsSupportModalOpen(true)}
                    className="text-gray-400 hover:text-electric transition-colors"
                  >
                    Contact Support
                  </button>
                </li>
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

      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </>
  );
};

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-obsidian transition-colors duration-300">
      <Navbar />
      <CartDrawer />
      <main className="pt-32">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
