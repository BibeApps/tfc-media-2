
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, Instagram, Facebook, User, Trash2, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';

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
              src="/TFC_Media_Logo.png"
              alt="TFC Media"
              className="h-12 w-auto object-contain bg-obsidian p-1 rounded-lg"
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
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // 1. Load Stripe
      const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
      if (!stripe) throw new Error("Stripe failed to load");

      // 2. Prepare order data
      const orderData = {
        items: items.map(item => ({
          id: item.id,
          price: item.price,
          quantity: 1
        })),
        successUrl: window.location.origin + '/#/portal/purchases?success=true',
        cancelUrl: window.location.origin + '/#/gallery',
      };

      console.log("Initiating Checkout with:", orderData);

      // --- BACKEND INTEGRATION PLACEHOLDER ---
      // In a real application, you would make a POST request to your backend here
      // to create a Stripe Checkout Session.
      /*
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
      */

      // --- SIMULATION FOR DEMO ---
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network request

      alert(
        `Stripe Checkout Integration Configured!\n\nEnvironment: Test Mode\nKey: ${STRIPE_PUBLISHABLE_KEY.substring(0, 15)}...\n\nTo complete the payment flow, you need a backend endpoint to create a Stripe Checkout Session using the Secret Key.`
      );

    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
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
                  <button onClick={() => setIsOpen(false)} className="mt-4 text-electric font-bold hover:underline">
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
                  onClick={handleCheckout}
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
        </>
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
            <Link to="/" className="flex items-center gap-2 mb-6">
              <img src="/TFC_Media_Logo.png" alt="TFC Media" className="h-10 w-auto bg-white/10 p-1 rounded" />
              <span className="text-2xl font-heading font-bold">TFC MEDIA</span>
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
