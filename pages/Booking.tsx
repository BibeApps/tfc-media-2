

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useBooking } from '../context/BookingContext';

const Booking: React.FC = () => {
  const { addBooking, isSlotAvailable, getBlackoutForDate } = useBooking();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'Photography',
    date: '',
    time: '',
    notes: ''
  });

  const [dateError, setDateError] = useState('');

  // Available times for booking (e.g. 9 AM to 5 PM)
  const availableTimeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

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

  const handleTimeSelect = (time: string) => {
      setFormData({ ...formData, time });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time) {
        alert('Please select a time for your booking.');
        return;
    }
    
    addBooking({
        clientName: formData.name,
        clientEmail: formData.email,
        serviceType: formData.type,
        date: formData.date,
        time: formData.time,
        notes: formData.notes
    });

    setStep(3); // Success
  };

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
        </div>

        {/* Form Column */}
        <div className="bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl">
          {step === 1 && (
             <form onSubmit={(e) => { e.preventDefault(); if(formData.date && !dateError) setStep(2); }} className="space-y-6">
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
                
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Select Time Slot for {formData.date}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {availableTimeSlots.map(time => {
                            const available = isSlotAvailable(formData.date, time);
                            return (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => handleTimeSelect(time)}
                                    disabled={!available}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                                        !available 
                                            ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed border-gray-200 dark:border-white/5 decoration-slice line-through' 
                                            : formData.time === time 
                                                ? 'bg-electric text-white border-electric shadow-md' 
                                                : 'bg-white dark:bg-charcoal text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/20 hover:border-electric'
                                    }`}
                                >
                                    {time}
                                </button>
                            );
                        })}
                    </div>
                    {formData.time && <p className="text-xs text-electric font-bold mt-1">Selected: {formData.time}</p>}
                </div>

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
                  <button type="submit" disabled={!formData.time} className="w-2/3 bg-electric hover:bg-electric/90 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-electric/20 disabled:opacity-50 disabled:cursor-not-allowed">
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
              <button onClick={() => { setStep(1); setFormData({...formData, name: '', email: '', date: '', time: ''}); }} className="text-electric font-bold hover:underline">
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