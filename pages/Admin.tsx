
import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { formatZipCode, US_STATES } from '../utils/formValidation';
import { useGallery } from '../context/GalleryContext';
import { useTheme } from '../context/ThemeContext';
import { useProjects } from '../context/ProjectContext';
import { useClients } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { UploadItem, PricingConfig, GalleryItem, PortalProject, ProjectStatus, ClientUser, BlackoutDate } from '../types';
import { analyzeMediaWithAI, createWatermarkedImage, createVideoThumbnail } from '../utils/mediaUtils';
import {
  Upload, Sparkles, X, Plus, ChevronRight, ChevronLeft, Check, Image as ImageIcon, Video,
  Loader2, DollarSign, Save, Trash2, LayoutDashboard, Settings, LogOut, Sun, Moon,
  BarChart2, Users, ShoppingBag, Briefcase, Mail, Shield, MapPin, Phone, Lock, Building, Key,
  Edit, UserPlus, RefreshCw, Calendar as CalendarIcon, Clock, Ban, Repeat, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Sub-Components ---

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="flex items-center justify-center space-x-4 mb-8">
    {[1, 2, 3].map((step) => (
      <div key={step} className="flex items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step === currentStep ? 'bg-electric text-white shadow-lg shadow-electric/30' :
            step < currentStep ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-charcoal text-gray-500 dark:text-gray-500 border border-gray-300 dark:border-white/10'
          }`}>
          {step < currentStep ? <Check className="w-5 h-5" /> : step}
        </div>
        {step < 3 && <div className={`w-12 h-1 mx-2 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-charcoal'}`} />}
      </div>
    ))}
  </div>
);

// --- Dashboard Component ---
const DashboardHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const data = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
  ];

  const quickActions = [
    { name: 'Gallery Manager', path: '/admin/gallery', icon: ImageIcon, color: 'from-purple-500 to-purple-600' },
    { name: 'Gallery Editor', path: '/admin/gallery-edit', icon: Edit, color: 'from-pink-500 to-pink-600' },
    { name: 'Bookings', path: '/admin/bookings', icon: CalendarIcon, color: 'from-blue-500 to-blue-600' },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag, color: 'from-green-500 to-green-600' },
    { name: 'Blackout Dates', path: '/admin/blackout-dates', icon: Ban, color: 'from-red-500 to-red-600' },
    { name: 'Service Types', path: '/admin/service-types', icon: Briefcase, color: 'from-cyan-500 to-cyan-600' },
    { name: 'Clients', path: '/admin/clients', icon: Users, color: 'from-indigo-500 to-indigo-600' },
    { name: 'Projects', path: '/admin/projects', icon: Briefcase, color: 'from-orange-500 to-orange-600' },
    { name: 'Portfolio', path: '/admin/portfolio', icon: ImageIcon, color: 'from-yellow-500 to-yellow-600' },
    { name: 'Team', path: '/admin/team', icon: Shield, color: 'from-teal-500 to-teal-600' },
    { name: 'Notifications', path: '/admin/notifications', icon: Mail, color: 'from-violet-500 to-violet-600' },
    { name: 'Settings', path: '/admin/settings', icon: Settings, color: 'from-gray-500 to-gray-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-electric to-blue-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome Back, {user?.name || 'Admin'}!
        </h1>
        <p className="text-blue-100">
          Here's what's happening with your business today
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Revenue</h3>
            <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg text-green-600 dark:text-green-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading text-gray-900 dark:text-white">$12,450</p>
          <span className="text-green-500 text-sm font-medium">+15.3% from last month</span>
        </div>

        <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Active Bookings</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading text-gray-900 dark:text-white">24</p>
          <span className="text-blue-500 text-sm font-medium">8 new this week</span>
        </div>

        <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Total Sales</h3>
            <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-heading text-gray-900 dark:text-white">1,204</p>
          <span className="text-purple-500 text-sm font-medium">+5% from last month</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <motion.button
              key={action.path}
              onClick={() => navigate(action.path)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/10 hover:shadow-lg transition-all group"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-left">{action.name}</h4>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Revenue Overview</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F1F1F', border: 'none', borderRadius: '8px', color: '#fff' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// --- Calendar & Booking Manager Component ---
const CalendarManager = () => {
  const { bookings, blackouts, cancelBooking, addBlackout, addBlackouts, removeBlackout } = useBooking();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');

  // Blackout Form State
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [blackoutType, setBlackoutType] = useState<'full' | 'partial'>('full');
  const [blackoutReason, setBlackoutReason] = useState('');
  const [blackoutStart, setBlackoutStart] = useState('09:00');
  const [blackoutEnd, setBlackoutEnd] = useState('17:00');

  // Recurrence State
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Filtered Data
  const dayBookings = bookings.filter(b => b.date === selectedDate && b.status !== 'cancelled');
  const dayBlackouts = blackouts.filter(b => b.date === selectedDate);
  const allEventsForMonth = [...bookings.filter(b => b.status !== 'cancelled'), ...blackouts].filter(e => e.date.startsWith(selectedDate.substring(0, 7)));

  const handleAddBlackout = async () => {
    if (!recurrenceFrequency || recurrenceFrequency === 'none') {
      // Single Entry
      await addBlackout({
        date: selectedDate,
        isFullDay: blackoutType === 'full',
        reason: blackoutReason,
        startTime: blackoutType === 'partial' ? blackoutStart : undefined,
        endTime: blackoutType === 'partial' ? blackoutEnd : undefined
      });
    } else {
      // Recurrence Logic
      if (!recurrenceEndDate) {
        alert("Please select an end date for the recurrence.");
        return;
      }

      const startDate = new Date(selectedDate);
      const endDate = new Date(recurrenceEndDate);

      if (endDate <= startDate) {
        alert("End date must be after start date.");
        return;
      }

      const datesToBlock: string[] = [];
      const currentDate = new Date(startDate);

      let safetyCounter = 0;
      const MAX_ENTRIES = 365;

      while (currentDate <= endDate && safetyCounter < MAX_ENTRIES) {
        const dateStr = currentDate.toISOString().split('T')[0];
        datesToBlock.push(dateStr);

        switch (recurrenceFrequency) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }
        safetyCounter++;
      }

      const newBlackouts: Omit<BlackoutDate, 'id'>[] = datesToBlock.map(date => ({
        date: date,
        isFullDay: blackoutType === 'full',
        reason: `${blackoutReason} (Recurring)`,
        startTime: blackoutType === 'partial' ? blackoutStart : undefined,
        endTime: blackoutType === 'partial' ? blackoutEnd : undefined
      }));

      await addBlackouts(newBlackouts);
    }

    setIsBlackoutModalOpen(false);
    setBlackoutReason('');
    setRecurrenceFrequency('none');
    setRecurrenceEndDate('');
  };

  const handlePrevMonth = () => {
    const curr = new Date(selectedDate);
    curr.setUTCDate(1);
    curr.setUTCMonth(curr.getUTCMonth() - 1);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  const handleNextMonth = () => {
    const curr = new Date(selectedDate);
    curr.setUTCDate(1);
    curr.setUTCMonth(curr.getUTCMonth() + 1);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  const renderCalendarGrid = () => {
    const year = parseInt(selectedDate.split('-')[0]);
    const month = parseInt(selectedDate.split('-')[1]) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 dark:bg-white/5 opacity-50"></div>);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasBooking = bookings.some(b => b.date === dateStr && b.status === 'confirmed');
      const hasBlackout = blackouts.some(b => b.date === dateStr);
      const isSelected = dateStr === selectedDate;

      days.push(
        <div
          key={dateStr}
          onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
          className={`h-24 p-2 border border-gray-200 dark:border-white/5 cursor-pointer transition-colors relative ${isSelected ? 'bg-electric/10 ring-2 ring-electric inset-0 z-10' : 'bg-white dark:bg-charcoal hover:bg-gray-50 dark:hover:bg-white/5'}`}
        >
          <span className={`text-sm font-bold ${isSelected ? 'text-electric' : 'text-gray-700 dark:text-gray-300'}`}>{d}</span>
          <div className="mt-2 space-y-1">
            {hasBooking && <div className="h-1.5 w-full bg-blue-500 rounded-full" title="Has Bookings"></div>}
            {hasBlackout && <div className="h-1.5 w-full bg-red-500 rounded-full" title="Blackout"></div>}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Calendar</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage schedule availability and bookings</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
          />
          <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-bold ${viewMode === 'day' ? 'bg-electric text-white' : 'bg-white dark:bg-charcoal text-gray-600 dark:text-gray-300'}`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-bold ${viewMode === 'month' ? 'bg-electric text-white' : 'bg-white dark:bg-charcoal text-gray-600 dark:text-gray-300'}`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {viewMode === 'month' ? (
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {new Date(selectedDate + 'T12:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 font-bold text-gray-500 dark:text-gray-400 text-sm">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>
              <div className="grid grid-cols-7">
                {renderCalendarGrid()}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-6 min-h-[500px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Schedule for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => setIsBlackoutModalOpen(true)}
                  className="bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Block Date/Time
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase text-gray-500 tracking-wide">Client Bookings</h4>
                {dayBookings.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No bookings for this date.</p>
                ) : (
                  dayBookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{booking.time} - {booking.clientName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{booking.serviceType}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('Cancel this booking? The slot will become available.')) cancelBooking(booking.id) }}
                        className="text-red-500 text-xs font-bold hover:underline"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  ))
                )}

                <div className="h-px bg-gray-200 dark:bg-white/10 my-6"></div>

                <h4 className="font-bold text-sm uppercase text-gray-500 tracking-wide">Blackouts & Closures</h4>
                {dayBlackouts.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No blackouts set.</p>
                ) : (
                  dayBlackouts.map(bo => (
                    <div key={bo.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-400">
                          <Ban className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {bo.isFullDay ? 'Full Day Closed' : `${bo.startTime} - ${bo.endTime} Blocked`}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{bo.reason || 'No reason provided'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeBlackout(bo.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Bookings (This Month)</span>
                <span className="font-bold text-gray-900 dark:text-white">{allEventsForMonth.filter(e => 'clientName' in e).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Blocked Days</span>
                <span className="font-bold text-gray-900 dark:text-white">{allEventsForMonth.filter(e => 'isFullDay' in e && e.isFullDay).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isBlackoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-white/5 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Block Date or Time</h3>
                <button onClick={() => setIsBlackoutModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Date</p>
                  <p className="text-gray-500 dark:text-gray-400">{selectedDate}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Block Type</label>
                  <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/10">
                    <button onClick={() => setBlackoutType('full')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${blackoutType === 'full' ? 'bg-white dark:bg-charcoal text-red-500 shadow-sm' : 'text-gray-500'}`}>Full Day</button>
                    <button onClick={() => setBlackoutType('partial')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${blackoutType === 'partial' ? 'bg-white dark:bg-charcoal text-red-500 shadow-sm' : 'text-gray-500'}`}>Specific Hours</button>
                  </div>
                </div>

                {blackoutType === 'partial' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                      <input type="time" value={blackoutStart} onChange={(e) => setBlackoutStart(e.target.value)} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                      <input type="time" value={blackoutEnd} onChange={(e) => setBlackoutEnd(e.target.value)} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    <Repeat className="w-4 h-4 inline mr-1" /> Recurring Block
                  </label>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white mb-2"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>

                  {recurrenceFrequency !== 'none' && (
                    <div className="mt-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Until Date</label>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={selectedDate}
                        className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                  <input type="text" placeholder="e.g. Holiday, Maintenance, Personal" value={blackoutReason} onChange={(e) => setBlackoutReason(e.target.value)} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                </div>

                <button onClick={handleAddBlackout} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg mt-2">
                  {recurrenceFrequency !== 'none' ? 'Confirm Recurring Block' : 'Confirm Block'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


// --- Client Manager Component ---
const ClientManager = () => {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [formData, setFormData] = useState<Partial<ClientUser>>({});
  const [generatedPassword, setGeneratedPassword] = useState('');

  const openAddModal = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
      accountType: 'customer',
      role: 'client'
    });
    setGeneratedPassword('');
    setModalType('add');
  };

  const openEditModal = (client: ClientUser) => {
    setSelectedClient(client);
    setFormData(client);
    setModalType('edit');
  };

  const openDeleteModal = (client: ClientUser) => {
    setSelectedClient(client);
    setModalType('delete');
  };

  const handleGeneratePassword = () => {
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    setGeneratedPassword(password);
  };

  const handleSaveAdd = () => {
    if (!formData.name || !formData.email || !generatedPassword) {
      alert("Name, Email and Password are required.");
      return;
    }

    // We add the client to the database. The password will be stored if 'profiles' supports it or handled if 'signup' flow used.
    // ClientContext handles this by inserting into 'profiles'.
    addClient(formData as any);

    alert(`User created in database. Credentials:\nUsername: ${formData.email}\nPassword: ${generatedPassword}`);

    setModalType(null);
  };

  const handleSaveEdit = () => {
    if (selectedClient && formData) {
      updateClient(selectedClient.id, formData);
      setModalType(null);
    }
  };

  const handleDelete = () => {
    if (selectedClient) {
      deleteClient(selectedClient.id);
      setModalType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Users</h2>
        <button
          onClick={openAddModal}
          className="bg-electric hover:bg-electric/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-electric/20"
        >
          <UserPlus className="w-5 h-5" /> Add New User
        </button>
      </div>

      <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
            <tr>
              <th className="p-4 font-bold">User</th>
              <th className="p-4 font-bold">Contact</th>
              <th className="p-4 font-bold">Role</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Spent</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/5">
            {clients.map(client => (
              <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={client.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{client.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{client.company || 'Individual'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-sm text-gray-900 dark:text-white">{client.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{client.phone || '-'}</p>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${client.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'}`}>
                    {client.role || 'client'}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${client.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                      client.status === 'onboarding' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                    }`}>
                    {client.status}
                  </span>
                </td>
                <td className="p-4 text-gray-900 dark:text-white font-medium">
                  ${client.totalSpent.toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-electric rounded-lg transition-colors"
                      title="Manage User"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(client)}
                      className="p-2 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {modalType === 'add' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-charcoal w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Onboard New User</h3>
                  <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Company</label>
                      <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white">
                        <option value="onboarding">Onboarding</option>
                        <option value="active">Active</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">User Role</label>
                    <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/10">
                      <button
                        onClick={() => setFormData({ ...formData, role: 'client' })}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.role === 'client' ? 'bg-white dark:bg-charcoal text-electric shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        Client
                      </button>
                      <button
                        onClick={() => setFormData({ ...formData, role: 'admin' })}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.role === 'admin' ? 'bg-white dark:bg-charcoal text-electric shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Address (Optional)</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Initial Password Setup</label>
                    <div className="flex gap-2">
                      <input type="text" readOnly value={generatedPassword} placeholder="Click generate..." className="flex-1 bg-white dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white font-mono" />
                      <button onClick={handleGeneratePassword} className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 p-3 rounded-lg text-gray-700 dark:text-white" title="Generate Password">
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button onClick={() => setModalType(null)} className="px-6 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
                  <button onClick={handleSaveAdd} className="px-6 py-2 rounded-lg bg-electric hover:bg-electric/90 text-white font-bold shadow-lg shadow-electric/20">Save & Create</button>
                </div>
              </motion.div>
            )}

            {modalType === 'edit' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-charcoal w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit User Details</h3>
                  <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Company</label>
                      <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white">
                        <option value="onboarding">Onboarding</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">User Role</label>
                    <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/10">
                      <button
                        onClick={() => setFormData({ ...formData, role: 'client' })}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.role === 'client' ? 'bg-white dark:bg-charcoal text-electric shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        Client
                      </button>
                      <button
                        onClick={() => setFormData({ ...formData, role: 'admin' })}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.role === 'admin' ? 'bg-white dark:bg-charcoal text-electric shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button onClick={() => setModalType(null)} className="px-6 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-6 py-2 rounded-lg bg-electric hover:bg-electric/90 text-white font-bold shadow-lg shadow-electric/20">Save Changes</button>
                </div>
              </motion.div>
            )}

            {modalType === 'delete' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-white/5 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete User?</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to remove <strong>{selectedClient?.name}</strong> from the database? This action cannot be undone.
                </p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => setModalType(null)} className="px-6 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-white/5">
                    No, Cancel
                  </button>
                  <button onClick={handleDelete} className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20">
                    Yes, Delete
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Project Management Component ---
const ProjectManager = () => {
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PortalProject>>({
    name: '',
    clientName: '',
    clientEmail: '',
    serviceType: 'Photography',
    eventDate: '',
    status: 'not_started',
    progress: 0,
    currentStep: '',
    manager: 'Admin',
    coverImage: 'https://picsum.photos/800/600',
    totalSteps: 10
  });

  const handleEdit = (project: PortalProject) => {
    setForm(project);
    setSelectedId(project.id);
    setIsEditing(true);
  };

  const handleNew = () => {
    setForm({
      name: '',
      clientName: '',
      clientEmail: '',
      serviceType: 'Photography',
      eventDate: '',
      status: 'not_started',
      progress: 0,
      currentStep: 'Planning',
      manager: 'Admin',
      coverImage: 'https://picsum.photos/seed/new/800/600',
      totalSteps: 10
    });
    setSelectedId(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.clientName) return alert("Please fill required fields");

    const isUpdate = !!selectedId;

    if (isUpdate && selectedId) {
      await updateProject(selectedId, form);
    } else {
      await addProject(form as PortalProject);
    }

    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Active Projects</h2>
        <button onClick={handleNew} className="bg-electric hover:bg-electric/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <Plus className="w-5 h-5" /> New Project
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => handleEdit(p)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedId === p.id ? 'border-electric bg-electric/5' : 'border-gray-200 dark:border-white/5 bg-white dark:bg-charcoal hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white">{p.name}</h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{p.clientName}</p>
              <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-electric" style={{ width: `${p.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedId ? 'Edit Project' : 'New Project'}</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Project Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Service Type</label>
                  <select
                    value={form.serviceType}
                    onChange={e => setForm({ ...form, serviceType: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white"
                  >
                    <option>Photography</option>
                    <option>Videography</option>
                    <option>Event Coverage</option>
                    <option>Branding</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Client Name</label>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={e => setForm({ ...form, clientName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Client Email (For Notifications)</label>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={e => setForm({ ...form, clientEmail: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-obsidian/50 p-6 rounded-xl border border-gray-200 dark:border-white/5 mb-6">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-electric" /> Project Status & Progress
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Current Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}
                      className="w-full bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white font-medium"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed (Editing Done)</option>
                      <option value="uploaded">Uploaded (Visible to Client)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Detailed Step Description</label>
                    <input
                      type="text"
                      value={form.currentStep}
                      placeholder="e.g. Color Grading, Final Export"
                      onChange={e => setForm({ ...form, currentStep: e.target.value })}
                      className="w-full bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {form.status === 'in_progress' && (
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="font-bold text-gray-700 dark:text-gray-300">Completion Percentage</label>
                      <span className="text-electric font-bold">{form.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={form.progress}
                      onChange={e => setForm({ ...form, progress: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-electric"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                {selectedId && (
                  <button
                    onClick={() => { if (confirm('Delete project?')) { deleteProject(selectedId); setIsEditing(false); } }}
                    className="px-6 py-3 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="px-8 py-3 rounded-lg bg-electric hover:bg-electric/90 text-white font-bold flex items-center gap-2 shadow-lg shadow-electric/20"
                >
                  <Mail className="w-4 h-4" /> Save & Notify Client
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl">
              <Briefcase className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a project to edit or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Upload Wizard Component ---
const UploadWizard = () => {
  const { galleryData, addEventType, addEvent, addSession, addItemsToSession } = useGallery();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const [newTypeName, setNewTypeName] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');

  const [pricing, setPricing] = useState<PricingConfig>({ photoPrice: 15, videoPrice: 35 });
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

  const handleCreateType = async () => {
    if (!newTypeName) return;
    const newId = `et-${Date.now()}`;
    await addEventType({
      id: newId,
      name: newTypeName,
      slug: newTypeName.toLowerCase().replace(/\s+/g, '-'),
      description: 'New Category',
      thumbnail: '',
      events: []
    });
    setSelectedTypeId(newId);
    setNewTypeName('');
  };

  const handleCreateEvent = async () => {
    if (!newEventName || !selectedTypeId || !newEventDate) return;
    const newId = `ev-${Date.now()}`;
    await addEvent(selectedTypeId, {
      id: newId,
      name: newEventName,
      slug: newEventName.toLowerCase().replace(/\s+/g, '-'),
      date: newEventDate,
      thumbnail: '',
      sessions: []
    });
    setSelectedEventId(newId);
    setNewEventName('');
    setNewEventDate('');
  };

  const handleCreateSession = async () => {
    if (!newSessionName || !selectedTypeId || !selectedEventId || !newSessionDate) return;
    const newId = `s-${Date.now()}`;
    await addSession(selectedTypeId, selectedEventId, {
      id: newId,
      name: newSessionName,
      date: newSessionDate,
      thumbnail: '',
      items: []
    });
    setSelectedSessionId(newId);
    setNewSessionName('');
    setNewSessionDate('');
  };

  const selectedType = galleryData.find(t => t.id === selectedTypeId);
  const selectedEvent = selectedType?.events.find(e => e.id === selectedEventId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLoading(true);
      const newItems: UploadItem[] = [];
      const files = Array.from(e.target.files) as File[];

      for (const file of files) {
        const isVideo = file.type.startsWith('video');
        let watermarkedUrl = '';
        let previewUrl = '';

        try {
          if (isVideo) {
            watermarkedUrl = await createVideoThumbnail(file);
            previewUrl = watermarkedUrl;
          } else {
            watermarkedUrl = await createWatermarkedImage(file);
            previewUrl = URL.createObjectURL(file);
          }
        } catch (err) {
          console.error("Failed to process preview", err);
          continue;
        }

        newItems.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          previewUrl: previewUrl,
          watermarkedUrl: watermarkedUrl,
          type: isVideo ? 'video' : 'photo',
          title: file.name.split('.')[0],
          description: '',
          tags: [],
          price: isVideo ? pricing.videoPrice : pricing.photoPrice,
          status: 'pending'
        });
      }

      setUploadItems(prev => [...prev, ...newItems]);
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    const itemsToAnalyze = uploadItems.filter(i => i.status === 'pending');
    if (itemsToAnalyze.length === 0) return;

    setLoading(true);
    const newItems = [...uploadItems];

    for (let i = 0; i < newItems.length; i++) {
      if (newItems[i].status === 'pending') {
        newItems[i] = { ...newItems[i], status: 'analyzing' };
        setUploadItems([...newItems]);
        const analysis = await analyzeMediaWithAI(newItems[i]);
        newItems[i] = { ...newItems[i], ...analysis, status: 'success' };
        setUploadItems([...newItems]);
      }
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!selectedTypeId || !selectedEventId || !selectedSessionId) return;

    const finalItems: GalleryItem[] = uploadItems.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      url: item.watermarkedUrl,
      originalUrl: item.previewUrl,
      price: item.price,
      width: 800,
      height: 600,
      description: item.description,
      tags: item.tags
    }));

    await addItemsToSession(selectedTypeId, selectedEventId, selectedSessionId, finalItems);
    setUploadItems([]);
    setStep(1);
    alert("Media items published to database successfully!");
  };

  const handleRemoveItem = (id: string) => {
    setUploadItems(prev => prev.filter(i => i.id !== id));
  };
  const handleUpdateItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={step} />

      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 space-y-4 shadow-sm">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white"><span className="bg-electric w-6 h-6 rounded-full flex items-center justify-center text-xs text-white">1</span> Event Category</h3>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
              >
                <option value="">Select Category...</option>
                {galleryData.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Category"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                />
                <button onClick={handleCreateType} disabled={!newTypeName} className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 p-2 rounded-lg disabled:opacity-50 text-gray-700 dark:text-white"><Plus className="w-5 h-5" /></button>
              </div>
            </div>

            <div className={`bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 space-y-4 shadow-sm ${!selectedTypeId ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white"><span className="bg-electric w-6 h-6 rounded-full flex items-center justify-center text-xs text-white">2</span> Event Name</h3>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
              >
                <option value="">Select Event...</option>
                {selectedType?.events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="New Event Name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                  />
                  <button onClick={handleCreateEvent} disabled={!newEventName || !newEventDate} className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 p-2 rounded-lg disabled:opacity-50 text-gray-700 dark:text-white"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
            </div>

            <div className={`bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 space-y-4 shadow-sm ${!selectedEventId ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white"><span className="bg-electric w-6 h-6 rounded-full flex items-center justify-center text-xs text-white">3</span> Session/Date</h3>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
              >
                <option value="">Select Session...</option>
                {selectedEvent?.sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="New Session Name"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                  />
                  <button onClick={handleCreateSession} disabled={!newSessionName || !newSessionDate} className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 p-2 rounded-lg disabled:opacity-50 text-gray-700 dark:text-white"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><DollarSign className="w-5 h-5 text-electric" /> Default Pricing</h3>
            <div className="grid grid-cols-2 gap-8 max-w-lg">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Photo Price ($)</label>
                <input
                  type="number"
                  value={pricing.photoPrice}
                  onChange={(e) => setPricing({ ...pricing, photoPrice: parseFloat(e.target.value) })}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Video Price ($)</label>
                <input
                  type="number"
                  value={pricing.videoPrice}
                  onChange={(e) => setPricing({ ...pricing, videoPrice: parseFloat(e.target.value) })}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedSessionId}
              className="bg-electric hover:bg-electric/90 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-electric/20"
            >
              Continue to Upload <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-12 text-center hover:border-electric/50 transition-colors bg-white dark:bg-white/5 relative">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-electric/10 flex items-center justify-center text-electric">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Drop photos & videos here</h3>
              <p className="text-gray-500 dark:text-gray-400">or click to browse</p>
            </div>
          </div>

          {uploadItems.length > 0 && (
            <div className="flex justify-between items-center bg-white dark:bg-charcoal p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
              <div className="font-bold text-gray-700 dark:text-gray-300">
                {uploadItems.length} items ready
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleAIAnalysis}
                  disabled={loading}
                  className="bg-cyber hover:bg-cyber/90 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Process with AI
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-gray-100 dark:bg-white text-gray-900 dark:text-black hover:bg-gray-200 dark:hover:bg-gray-200 px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all"
                >
                  Review <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadItems.map((item) => (
              <div key={item.id} className="relative group bg-white dark:bg-charcoal rounded-lg overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="aspect-square relative">
                  <img src={item.watermarkedUrl} alt={item.title} className="w-full h-full object-cover" />
                  <button onClick={() => handleRemoveItem(item.id)} className="absolute top-2 left-2 bg-red-500/80 p-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 truncate max-w-[80px]">{item.title}</span>
                    <span className="text-xs font-bold text-electric">${item.price}</span>
                  </div>
                  <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    {item.status === 'analyzing' && <div className="h-full bg-cyber animate-pulse w-full"></div>}
                    {item.status === 'success' && <div className="h-full bg-green-500 w-full"></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review Details</h2>
            <button
              onClick={handlePublish}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-500/20"
            >
              <Save className="w-5 h-5" /> Publish to Gallery
            </button>
          </div>

          <div className="space-y-4">
            {uploadItems.map((item) => (
              <div key={item.id} className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-4 flex gap-6 shadow-sm">
                <div className="w-32 h-32 flex-shrink-0 bg-gray-100 dark:bg-black/20 rounded-lg overflow-hidden relative">
                  <img src={item.watermarkedUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-sm text-gray-900 dark:text-white h-20 resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleUpdateItem(item.id, { price: parseFloat(e.target.value) })}
                      className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-sm text-gray-900 dark:text-white font-bold text-electric"
                    />
                    <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded self-end"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// --- Settings Component ---
const SettingsPanel = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, updateProfile, resetPassword } = useAuth();
  const [tfaEnabled, setTfaEnabled] = useState(false);

  // Form States
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    company: user?.company || '',
    phone: user?.phone || '',
    address: user?.address || '',
    email: user?.email || '',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90012'
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Update form when user data changes (e.g. after save)
  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        name: user.name,
        company: user.company || '',
        phone: user.phone || '',
        address: user.address || '',
        email: user.email
      }));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const { success, message } = await updateProfile(user.id, {
      name: profileForm.name,
      company: profileForm.company,
      phone: profileForm.phone,
      address: profileForm.address
    });
    alert(message);
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      alert("New passwords do not match.");
      return;
    }
    if (!user?.email) return;

    const { success, message } = await resetPassword(user.email, passwordForm.new);
    alert(message);
    if (success) {
      setPasswordForm({ current: '', new: '', confirm: '' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Settings</h2>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Theme Mode</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark admin interface</p>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-obsidian border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors font-medium text-sm"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Personal Profile</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">First Name</label>
            <input type="text" value={profileForm.name.split(' ')[0]} onChange={e => setProfileForm({ ...profileForm, name: `${e.target.value} ${profileForm.name.split(' ').slice(1).join(' ')}` })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
            <input type="text" value={profileForm.name.split(' ').slice(1).join(' ')} onChange={e => setProfileForm({ ...profileForm, name: `${profileForm.name.split(' ')[0]} ${e.target.value}` })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <input type="email" value={profileForm.email} readOnly className="w-full bg-gray-100 dark:bg-obsidian/50 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={handleSaveProfile} className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg font-bold hover:opacity-90 transition-opacity">Save Profile</button>
        </div>
      </div>

      {/* Business Details */}
      <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
            <Building className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Business Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Business Name</label>
            <input type="text" value={profileForm.company} onChange={e => setProfileForm({ ...profileForm, company: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: formatPhoneNumber(e.target.value) })} className="w-full pl-10 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} className="w-full pl-10 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">City</label>
            <input type="text" value={profileForm.city} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">State / Province</label>
            <select value={profileForm.state} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all">
              <option value="">Select State</option>
              {US_STATES.map(state => (
                <option key={state.code} value={state.code}>{state.code} - {state.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Zip Code</label>
            <input type="text" value={profileForm.zip} onChange={e => setProfileForm({ ...profileForm, zip: formatZipCode(e.target.value) })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all" maxLength={5} placeholder="12345" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Country</label>
            <select className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all">
              <option>United States</option>
              <option>Canada</option>
              <option>United Kingdom</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={handleSaveProfile} className="px-6 py-2 bg-electric text-white rounded-lg font-bold hover:bg-electric/90 transition-colors shadow-lg shadow-electric/20">Save Business Details</button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Security</h3>
        </div>

        <div className="space-y-8">
          {/* Password */}
          <div>
            <h4 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-4">
              <Key className="w-4 h-4 text-gray-500" /> Change Password
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  placeholder="Current Password"
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 pr-10 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={passwordForm.new}
                  onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  placeholder="New Password"
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 pr-10 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  placeholder="Confirm Password"
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-3 pr-10 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleUpdatePassword} type="button" className="px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Update Password</button>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-white/5" />

          {/* 2FA */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-1">Two-Factor Authentication (2FA)</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your admin account by requiring a verification code during login.</p>
            </div>
            <button
              onClick={() => setTfaEnabled(!tfaEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tfaEnabled ? 'bg-electric' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tfaEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Admin Layout ---

const Admin: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'upload' | 'clients' | 'projects' | 'settings'>('dashboard');

  if (!user) return null; // Safety check

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-charcoal border-r border-gray-200 dark:border-white/5 hidden md:flex flex-col">
        {/* Admin Profile Snippet */}
        <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-0.5">
            <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="Admin" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</span>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Menu</h2>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-electric/10 text-electric' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-electric/10 text-electric' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <CalendarIcon className="w-5 h-5" /> Calendar
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clients' ? 'bg-electric/10 text-electric' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <UserPlus className="w-5 h-5" /> Manage Users
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-electric/10 text-electric' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <Upload className="w-5 h-5" /> Upload Manager
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'projects' ? 'bg-electric/10 text-electric' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <Briefcase className="w-5 h-5" /> Project Mgmt
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-electric/10 text-electric' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <Settings className="w-5 h-5" /> Settings
            </button>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-white/5 mt-auto">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 dark:bg-obsidian p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 md:hidden">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{activeTab}</h1>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-white dark:bg-charcoal rounded-lg"><LayoutDashboard className="w-5 h-5 text-gray-700 dark:text-white" /></button>
            <button onClick={() => setActiveTab('calendar')} className="p-2 bg-white dark:bg-charcoal rounded-lg"><CalendarIcon className="w-5 h-5 text-gray-700 dark:text-white" /></button>
            <button onClick={() => setActiveTab('clients')} className="p-2 bg-white dark:bg-charcoal rounded-lg"><UserPlus className="w-5 h-5 text-gray-700 dark:text-white" /></button>
            <button onClick={() => setActiveTab('upload')} className="p-2 bg-white dark:bg-charcoal rounded-lg"><Upload className="w-5 h-5 text-gray-700 dark:text-white" /></button>
            <button onClick={() => setActiveTab('projects')} className="p-2 bg-white dark:bg-charcoal rounded-lg"><Briefcase className="w-5 h-5 text-gray-700 dark:text-white" /></button>
            <button onClick={() => setActiveTab('settings')} className="p-2 bg-white dark:bg-charcoal rounded-lg"><Settings className="w-5 h-5 text-gray-700 dark:text-white" /></button>
          </div>
        </header>

        {activeTab === 'dashboard' && <DashboardHome />}
        {activeTab === 'calendar' && <CalendarManager />}
        {activeTab === 'clients' && <ClientManager />}
        {activeTab === 'upload' && <UploadWizard />}
        {activeTab === 'projects' && <ProjectManager />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
};

export default Admin;
