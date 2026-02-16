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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import AboutUs from './pages/AboutUs';
import PayInvoice from './pages/PayInvoice';
import PaymentSuccess from './pages/PaymentSuccess';
import PortalLayout from './pages/portal/PortalLayout';
import Dashboard from './pages/portal/Dashboard';
import Projects from './pages/portal/Projects';
import Purchases from './pages/portal/Purchases';
import Downloads from './pages/portal/Downloads';
import Favorites from './pages/portal/Favorites';
import Settings from './pages/portal/Settings';
import MyEvents from './pages/portal/MyEvents';
import MyBookings from './pages/portal/MyBookings';
import SupportTickets from './pages/portal/SupportTickets';

import Bookings from './pages/admin/Bookings';
import Orders from './pages/admin/Orders';
import Invoices from './pages/admin/Invoices';
import BlackoutDates from './pages/admin/BlackoutDates';
import ServiceTypes from './pages/admin/ServiceTypes';
import AdminHome from './pages/admin/AdminHome';
import GalleryManagerSimple from './pages/admin/GalleryManagerSimple';
import GalleryEdit from './pages/admin/GalleryEdit';
import Clients from './pages/admin/Clients';
import Team from './pages/admin/Team';
import PortfolioAdmin from './pages/admin/PortfolioAdmin';
import ProjectsAdmin from './pages/admin/ProjectsAdmin';
import NotificationSettings from './pages/admin/NotificationSettings';
import AdminSettings from './pages/admin/Settings';
import Support from './pages/admin/Support';
import AdminLayout from './components/AdminLayout';
import { CartProvider } from './context/CartContext';
import { GalleryProvider } from './context/GalleryContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { ClientProvider } from './context/ClientContext';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

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
      <SettingsProvider>
        <AuthProvider>
          <GalleryProvider>
            <CartProvider>
              <ProjectProvider>
                <ClientProvider>
                  <BookingProvider>
                    <HashRouter>
                      <Toaster
                        position="top-right"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: '#1f2937',
                            color: '#fff',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                          },
                          success: {
                            iconTheme: {
                              primary: '#10b981',
                              secondary: '#fff',
                            },
                          },
                          error: {
                            iconTheme: {
                              primary: '#ef4444',
                              secondary: '#fff',
                            },
                          },
                        }}
                      />
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
                          <Route path="forgot-password" element={<ForgotPassword />} />
                          <Route path="reset-password" element={<ResetPassword />} />
                          <Route path="auth/callback" element={<AuthCallback />} />

                          {/* Public Payment Pages */}
                          <Route path="pay/:token" element={<PayInvoice />} />
                          <Route path="payment-success" element={<PaymentSuccess />} />

                          {/* Admin Dashboard - No Sidebar */}
                          <Route
                            path="admin"
                            element={
                              <ProtectedRoute allowedRoles={['admin']}>
                                <AdminHome />
                              </ProtectedRoute>
                            }
                          />

                          {/* Admin Pages - With Sidebar Layout */}
                          <Route
                            path="admin"
                            element={
                              <ProtectedRoute allowedRoles={['admin']}>
                                <AdminLayout />
                              </ProtectedRoute>
                            }
                          >
                            <Route path="gallery" element={<GalleryManagerSimple />} />
                            <Route path="gallery-edit" element={<GalleryEdit />} />
                            <Route path="bookings" element={<Bookings />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="invoices" element={<Invoices />} />
                            <Route path="blackout-dates" element={<BlackoutDates />} />
                            <Route path="service-types" element={<ServiceTypes />} />
                            <Route path="clients" element={<Clients />} />
                            <Route path="projects" element={<ProjectsAdmin />} />
                            <Route path="team" element={<Team />} />
                            <Route path="portfolio" element={<PortfolioAdmin />} />
                            <Route path="notifications" element={<NotificationSettings />} />
                            <Route path="settings" element={<AdminSettings />} />
                            <Route path="support" element={<Support />} />
                          </Route>

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
                            <Route path="events" element={<MyEvents />} />
                            <Route path="bookings" element={<MyBookings />} />
                            <Route path="purchases" element={<Purchases />} />
                            <Route path="downloads" element={<Downloads />} />
                            <Route path="favorites" element={<Favorites />} />
                            <Route path="support-tickets" element={<SupportTickets />} />
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
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;