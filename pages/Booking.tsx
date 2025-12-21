

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBooking } from '../context/BookingContext';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { generateTimeSlots, calculateDuration } from '../utils/timeUtils';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { sendBookingConfirmation } from '../utils/notifications';

interface BlackoutDate {
  id: string;
  date: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

interface Booking {
  booking_date: string;
  booking_time: string;
  status: string;
}

const Booking: React.FC = () => {
  const { addBooking, isSlotAvailable, getBlackoutForDate } = useBooking();
  const [step, setStep] = useState(1);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'Photography',
    date: '',
    time: '',
    endTime: '',
    isFullDay: false,
    notes: ''
  });

  const [dateError, setDateError] = useState('');

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate time slots dynamically (30-min increments, 6 AM - 11 PM)
  const availableTimeSlots = generateTimeSlots();

  useEffect(() => {
    fetchAvailabilityData();
  }, []);

  const fetchAvailabilityData = async () => {
    try {
      // Fetch blackout dates
      const { data: blackouts } = await supabase
        .from('blackout_dates')
        .select('*');

      if (blackouts) {
        const mappedBlackouts = blackouts.map(b => ({
          id: b.id,
          date: b.date,
          isFullDay: b.is_full_day,
          startTime: b.start_time,
          endTime: b.end_time,
          reason: b.reason
        }));
        setBlackoutDates(mappedBlackouts);
      }

      // Fetch confirmed bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_date, booking_time, status')
        .eq('status', 'confirmed');

      if (bookingsData) {
        setBookings(bookingsData);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'date') {
      const blackouts = getBlackoutForDate(value);
      const fullDayBlackout = blackouts.find(b => b.isFullDay);

      if (fullDayBlackout) {
        setDateError(`Date unavailable: ${fullDayBlackout.reason || 'Blackout Date'}`);
        setFormData({ ...formData, date: '' }); // Clear invalid date
        return;
      } else {
        setDateError('');
      }
    }

    setFormData({ ...formData, [name]: value });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isFullDay && (!formData.time || !formData.endTime)) {
      alert('Please select both start and end time for your booking.');
      return;
    }

    addBooking({
      clientName: formData.name,
      clientEmail: formData.email,
      serviceType: formData.type,
      date: formData.date,
      time: formData.isFullDay ? 'Full Day' : formData.time,
      endTime: formData.isFullDay ? 'Full Day' : formData.endTime,
      phone: formData.phone,
      notes: formData.notes
    });

    // Send booking confirmation email
    try {
      const timeDisplay = formData.isFullDay 
        ? 'Full Day' 
        : `${formData.time} - ${formData.endTime}`;
      await sendBookingConfirmation(
        formData.email,
        `${formData.date} (${timeDisplay})`,
        formData.type
      );
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't block booking if email fails
    }

    setStep(3); // Success
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const isDateBlackedOut = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return blackoutDates.find(bd => bd.date === dateStr);
  };

  const isDateBooked = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayBookings = bookings.filter(b => b.booking_date === dateStr);
    return dayBookings.length > 0 ? dayBookings : null;
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const blackout = isDateBlackedOut(date);

    if (blackout?.isFullDay) {
      setDateError(`Date unavailable: ${blackout.reason || 'Blackout Date'}`);
      return;
    }

    setFormData({ ...formData, date: dateStr });
    setDateError('');

    // Auto-advance to step 2 if valid date selected
    if (step === 1) {
      setTimeout(() => setStep(2), 300);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-16">
        {/* Info Column */}
        <div className="space-y-8">
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl mb-6 text-gray-900 dark:text-white">Book a Session</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
              Ready to create something amazing? Select your service and preferred date. We'll get back to you within 24 hours to confirm details.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 flex gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-electric/10 dark:bg-electric/20 flex items-center justify-center text-electric flex-shrink-0">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Flexible Scheduling</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Choose a time that works best for you. Weekends available.</p>
              </div>
            </div>
            <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 flex gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-cyber/10 dark:bg-cyber/20 flex items-center justify-center text-cyber flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Quick Turnaround</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get your edited photos within 5 business days.</p>
              </div>
            </div>
          </div>

          {/* Availability Calendar - Full Width */}
          <div className="lg:col-span-2">
            <AvailabilityCalendar
              selectedDate={formData.date}
              onDateSelect={(dateStr) => {
                setFormData({ ...formData, date: dateStr });
                setDateError('');
                if (step === 1) setTimeout(() => setStep(2), 300);
              }}
            />
          </div>
        </div>

        {/* Form Column */}
        <div className="bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl">
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); if (formData.date && !dateError) setStep(2); }} className="space-y-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Service Details</h2>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Service Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                >
                  <option>Photography Session</option>
                  <option>Videography</option>
                  <option>Event Coverage (Full Day)</option>
                  <option>Brand Identity Package</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Preferred Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full bg-gray-50 dark:bg-obsidian border rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 outline-none ${dateError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-white/10 focus:ring-electric'}`}
                />
                {dateError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
                    <AlertCircle className="w-4 h-4" /> {dateError}
                  </div>
                )}
              </div>

              <button type="submit" disabled={!!dateError || !formData.date} className="w-full bg-electric hover:bg-electric/90 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-electric/20 disabled:opacity-50 disabled:cursor-not-allowed">
                Next Step
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Time & Contact</h2>

              {/* Service Type Display */}
              <div className="bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Service:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{formData.type}</span>
                </div>
              </div>

              {/* Full Day Checkbox */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg">
                <input
                  type="checkbox"
                  id="fullDay"
                  checked={formData.isFullDay}
                  onChange={(e) => setFormData({ ...formData, isFullDay: e.target.checked, time: '', endTime: '' })}
                  className="w-4 h-4 text-electric bg-gray-100 border-gray-300 rounded focus:ring-electric focus:ring-2"
                />
                <label htmlFor="fullDay" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Full Day Booking (entire day will be blocked)
                </label>
              </div>

              {!formData.isFullDay && (
              <>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                  Select Time Range for {formData.date}
                </label>
                
                {/* Start Time */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-2">Start Time</label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value, endTime: '' })}
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                  >
                    <option value="">Select start time...</option>
                    {availableTimeSlots.map((time) => {
                      const available = isSlotAvailable(formData.date, time);
                      return (
                        <option key={time} value={time} disabled={!available}>
                          {time} {!available ? '(Unavailable)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* End Time */}
                {formData.time && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-2">End Time</label>
                    <select
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                    >
                      <option value="">Select end time...</option>
                      {availableTimeSlots
                        .filter(time => {
                          const startIdx = availableTimeSlots.indexOf(formData.time);
                          const endIdx = availableTimeSlots.indexOf(time);
                          return endIdx > startIdx;
                        })
                        .map((time) => {
                          const available = isSlotAvailable(formData.date, time);
                          return (
                            <option key={time} value={time} disabled={!available}>
                              {time} {!available ? '(Unavailable)' : ''}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}

                {/* Duration Display */}
                {formData.time && formData.endTime && (
                  <div className="bg-electric/10 dark:bg-electric/20 border border-electric/20 dark:border-electric/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-electric" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Duration: {calculateDuration(formData.time, formData.endTime)}
                      </span>
                    </div>
              
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {formData.time} - {formData.endTime}
                    </p>
                  </div>
                )}
              </div>
              </>
              )}

              <div className="space-y-2 mt-6">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
                />
              </div>


              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Phone Number (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Message (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
                />
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-transparent border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-bold py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                  Back
                </button>
                <button type="submit" disabled={!formData.isFullDay && (!formData.time || !formData.endTime)} className="w-2/3 bg-electric hover:bg-electric/90 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-electric/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  Confirm Booking
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-neon/10 dark:bg-neon/20 rounded-full flex items-center justify-center text-neon mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Request Received!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Thanks {formData.name}, we've received your booking request for {formData.type} on {formData.date} at {formData.time}. Check your email for a confirmation.
              </p>
              <button onClick={() => { setStep(1); setFormData({ ...formData, name: '', email: '', date: '', time: '' }); }} className="text-electric font-bold hover:underline">
                Book another session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;