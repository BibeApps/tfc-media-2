import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';
import Gallery from './pages/Gallery';
import Booking from './pages/Booking';
import Admin from './pages/Admin';
import Services from './pages/Services';
import FAQ from './pages/FAQ';
import Licensing from './pages/Licensing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AboutUs from './pages/AboutUs';
import PortalLayout from './pages/portal/PortalLayout';
import Dashboard from './pages/portal/Dashboard';
import Projects from './pages/portal/Projects';
import Purchases from './pages/portal/Purchases';
import Downloads from './pages/portal/Downloads';
import Settings from './pages/portal/Settings';
import Events from './pages/admin/Events';
import Bookings from './pages/admin/Bookings';
import Sessions from './pages/admin/Sessions';
import GalleryUpload from './pages/admin/GalleryUpload';
import Orders from './pages/admin/Orders';
import BlackoutDates from './pages/admin/BlackoutDates';
import { CartProvider } from './context/CartContext';
import { GalleryProvider } from './context/GalleryContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { ClientProvider } from './context/ClientContext';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import ProtectedRoute from './components/ProtectedRoute';

// Custom ScrollToTop component to handle scroll restoration and hash scrolling
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    } else {
      // Use a small timeout to ensure the new page content has rendered before trying to scroll
      const timeoutId = setTimeout(() => {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [pathname, hash]);

  return null;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GalleryProvider>
          <CartProvider>
            <ProjectProvider>
              <ClientProvider>
                <BookingProvider>
                  <HashRouter>
                    <ScrollToTop />
                    <Routes>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="portfolio" element={<Portfolio />} />
                        <Route path="gallery" element={<Gallery />} />
                        <Route path="book" element={<Booking />} />
                        <Route path="services" element={<Services />} />
                        <Route path="about" element={<AboutUs />} />
                        <Route path="faq" element={<FAQ />} />
                        <Route path="licensing" element={<Licensing />} />
                        <Route path="privacy" element={<PrivacyPolicy />} />
                        <Route path="terms" element={<TermsOfService />} />
                        <Route path="login" element={<Login />} />
                        <Route path="signup" element={<Signup />} />
                        <Route path="forgot-password" element={<ForgotPassword />} />
                        <Route path="reset-password" element={<ResetPassword />} />

                        {/* Admin Routes - Protected */}
                        <Route
                          path="admin"
                          element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <Admin />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="admin/events"
                          element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <Events />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="admin/bookings"
                          element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <Bookings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="admin/sessions"
                          element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <Sessions />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="admin/gallery-upload"
                          element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <GalleryUpload />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="admin/orders"
                          element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <Orders />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="admin/blackout-dates"
                          element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <BlackoutDates />
                            </ProtectedRoute>
                          }
                        />

                        {/* Client Portal Routes - Protected */}
                        <Route
                          path="portal"
                          element={
                            <ProtectedRoute allowedRoles={['client']}>
                              <PortalLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route index element={<Dashboard />} />
                          <Route path="projects" element={<Projects />} />
                          <Route path="purchases" element={<Purchases />} />
                          <Route path="downloads" element={<Downloads />} />
                          <Route path="settings" element={<Settings />} />
                        </Route>
                      </Route>
                    </Routes>
                  </HashRouter>
                </BookingProvider>
              </ClientProvider>
            </ProjectProvider>
          </CartProvider>
        </GalleryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;