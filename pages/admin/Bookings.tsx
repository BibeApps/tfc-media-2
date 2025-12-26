import React, { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, Search, Filter, Loader2, Mail, Edit, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Booking, BookingStatus } from '../../types';
import { supabase } from '../../supabaseClient';
import { generateTimeSlots, calculateDuration, timeToMinutes } from '../../utils/timeUtils';

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [editForm, setEditForm] = useState({
        clientName: '',
        clientEmail: '',
        serviceType: '',
        date: '',
        time: '',
        endTime: '',
        notes: ''
    });
    const [blackoutDates, setBlackoutDates] = useState<any[]>([]);

    // Generate time slots (6 AM - 11 PM in 30-min increments)
    const availableTimeSlots = generateTimeSlots();

    // Check if a time slot is available on a given date
    const isSlotAvailable = (date: string, time: string): boolean => {
        if (!date || !time) return true;

        // Check blackout dates
        const blackout = blackoutDates.find(b => b.date === date);
        if (blackout) {
            if (blackout.is_full_day) return false;

            // Check if time falls within partial blackout
            if (blackout.start_time && blackout.end_time) {
                const slotMinutes = timeToMinutes(time);
                const blackoutStart = timeToMinutes(blackout.start_time);
                const blackoutEnd = timeToMinutes(blackout.end_time);
                if (slotMinutes >= blackoutStart && slotMinutes < blackoutEnd) {
                    return false;
                }
            }
        }

        // Check existing bookings (exclude the booking being edited)
        const conflictingBookings = bookings.filter(b =>
            b.date === date &&
            b.status !== 'cancelled' &&
            b.id !== editingBooking?.id // Exclude current booking from conflicts
        );

        for (const booking of conflictingBookings) {
            const slotMinutes = timeToMinutes(time);
            const bookingStart = timeToMinutes(booking.time);
            const bookingEnd = booking.endTime ? timeToMinutes(booking.endTime) : bookingStart + 30;

            // Check if slot falls within an existing booking
            if (slotMinutes >= bookingStart && slotMinutes < bookingEnd) {
                return false;
            }
        }

        return true;
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*');

            if (error) throw error;

            // Map database fields to component fields
            const mappedBookings = (data || []).map(booking => ({
                id: booking.id,
                clientName: booking.client_name,
                clientEmail: booking.client_email,
                serviceType: booking.service_type,
                date: booking.booking_date,
                time: booking.booking_time,
                endTime: booking.end_time,
                status: booking.status,
                notes: booking.notes,
                created_at: booking.created_at,
            }));

            // Sort: Active bookings (pending, confirmed) by date ascending, then completed/cancelled at bottom
            const sortedBookings = mappedBookings.sort((a, b) => {
                // Completed and cancelled go to bottom
                const aIsComplete = a.status === 'completed' || a.status === 'cancelled';
                const bIsComplete = b.status === 'completed' || b.status === 'cancelled';

                if (aIsComplete && !bIsComplete) return 1;
                if (!aIsComplete && bIsComplete) return -1;

                // Both active or both complete: sort by date ascending
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            setBookings(sortedBookings);

            // Fetch blackout dates
            const { data: blackouts } = await supabase
                .from('blackout_dates')
                .select('*');

            if (blackouts) {
                setBlackoutDates(blackouts);
            }
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (id: string, status: BookingStatus) => {
        try {
            // Get booking details before updating
            const { data: booking, error: fetchError } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Update booking status
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            // Send notification if booking is confirmed
            if (status === 'confirmed' && booking) {
                try {
                    // Get user ID from email
                    const { data: user } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', booking.client_email)
                        .single();

                    if (user) {
                        const { notificationService } = await import('../../services/notificationService');
                        await notificationService.sendNotification('booking_confirmed', user.id, {
                            bookingId: booking.id,
                            serviceType: booking.service_type,
                            confirmedDate: booking.booking_date,
                            confirmedTime: booking.booking_time
                        });
                    }
                } catch (notifError) {
                    console.error('Failed to send booking confirmation notification:', notifError);
                    // Don't block status update if notification fails
                }
            }

            fetchBookings();
        } catch (err) {
            console.error('Error updating booking:', err);
        }
    };

    const sendEmail = (email: string, serviceType: string, date: string, time: string, clientName: string) => {
        const subject = encodeURIComponent(`Re: Your Booking - ${serviceType} on ${date}`);
        const body = encodeURIComponent(`Hi ${clientName},\n\nRegarding your booking:\n\nService: ${serviceType}\nDate: ${date}\nTime: ${time}\n\nBest regards,\nTFC Media`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const openEditModal = (booking: Booking) => {
        setEditingBooking(booking);
        setEditForm({
            clientName: booking.clientName,
            clientEmail: booking.clientEmail,
            serviceType: booking.serviceType,
            date: booking.date,
            time: booking.time,
            endTime: booking.endTime || '',
            notes: booking.notes || ''
        });
    };

    const closeEditModal = () => {
        setEditingBooking(null);
        setEditForm({
            clientName: '',
            clientEmail: '',
            serviceType: '',
            date: '',
            time: '',
            endTime: '',
            notes: ''
        });
    };

    const saveBookingEdit = async () => {
        if (!editingBooking) return;

        try {
            const { error } = await supabase
                .from('bookings')
                .update({
                    client_name: editForm.clientName,
                    client_email: editForm.clientEmail,
                    service_type: editForm.serviceType,
                    booking_date: editForm.date,
                    booking_time: editForm.time,
                    end_time: editForm.endTime,
                    notes: editForm.notes
                })
                .eq('id', editingBooking.id);

            if (error) throw error;

            closeEditModal();
            fetchBookings();
        } catch (err) {
            console.error('Error updating booking:', err);
            alert('Failed to update booking. Please try again.');
        }
    };

    const filteredBookings = bookings.filter(booking => {
        const matchesFilter = filter === 'all' || booking.status === filter;
        const matchesSearch =
            booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
            case 'completed':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
            case 'cancelled':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
        }
    };

    const getStatusIcon = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle className="w-4 h-4" />;
            case 'pending':
                return <Clock className="w-4 h-4" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Management</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-5 h-5" />
                    {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                ? 'bg-electric text-white'
                                : 'bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 hover:border-electric/50'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No bookings found
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                        <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 hover:border-electric/50 transition-all"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{booking.clientName}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{booking.clientEmail}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusColor(booking.status)}`}>
                                            {getStatusIcon(booking.status)}
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Users className="w-4 h-4" />
                                            <span>{booking.serviceType}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Calendar className="w-4 h-4" />
                                            <span>{booking.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Clock className="w-4 h-4" />
                                            <span>
                                                {booking.time === 'Full Day' || booking.endTime === 'Full Day'
                                                    ? 'Full Day'
                                                    : booking.endTime
                                                        ? `${booking.time} - ${booking.endTime}`
                                                        : booking.time
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {booking.notes && (
                                        <div className="p-3 bg-gray-50 dark:bg-obsidian rounded-lg">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-bold">Notes:</span> {booking.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 lg:w-64">
                                    {/* Status Dropdown - Only show if not cancelled or completed */}
                                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Update Status</label>
                                            <select
                                                value={booking.status || 'pending'}
                                                onChange={(e) => updateBookingStatus(booking.id, e.target.value as BookingStatus)}
                                                className="w-full px-3 py-2 bg-white dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                                            >
                                                {(booking.status === 'pending' || !booking.status) && (
                                                    <>
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirm</option>
                                                        <option value="cancelled">Cancel</option>
                                                    </>
                                                )}
                                                {booking.status === 'confirmed' && (
                                                    <>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="completed">Mark Complete</option>
                                                        <option value="cancelled">Cancel</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    )}

                                    {/* Edit Button */}
                                    <button
                                        onClick={() => openEditModal(booking)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors border border-gray-200 dark:border-white/10"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Details
                                    </button>

                                    {/* Email Button */}
                                    <button
                                        onClick={() => sendEmail(booking.clientEmail, booking.serviceType, booking.date, booking.time, booking.clientName)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-electric/10 hover:bg-electric/20 dark:bg-electric/20 dark:hover:bg-electric/30 text-electric rounded-lg font-medium transition-colors border border-electric/20"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Send Email
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingBooking && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-charcoal rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-charcoal z-10">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Booking</h2>
                            <button
                                onClick={closeEditModal}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Client Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</label>
                                <input
                                    type="text"
                                    value={editForm.clientName}
                                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Client Email */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Email</label>
                                <input
                                    type="email"
                                    value={editForm.clientEmail}
                                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Service Type */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Type</label>
                                <input
                                    type="text"
                                    value={editForm.serviceType}
                                    onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                                <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Availability Warnings */}
                            {editForm.date && (
                                <>
                                    {/* Blackout Date Warning */}
                                    {blackoutDates.some(b => b.date === editForm.date && b.is_full_day) && (
                                        <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                                            <XCircle className="w-4 h-4 flex-shrink-0" />
                                            <span><strong>Blocked:</strong> This date has a full day blackout</span>
                                        </div>
                                    )}
                                    {/* Conflicting Bookings Warning */}
                                    {bookings.filter(b =>
                                        b.date === editForm.date &&
                                        b.status !== 'cancelled' &&
                                        b.id !== editingBooking?.id
                                    ).length > 0 && (
                                            <div className="text-amber-700 dark:text-amber-300 text-sm p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock className="w-4 h-4 flex-shrink-0" />
                                                    <strong>⚠️ {bookings.filter(b => b.date === editForm.date && b.status !== 'cancelled' && b.id !== editingBooking?.id).length} existing booking(s) on this date:</strong>
                                                </div>
                                                <ul className="ml-6 space-y-1 text-xs">
                                                    {bookings.filter(b => b.date === editForm.date && b.status !== 'cancelled' && b.id !== editingBooking?.id).map(b => (
                                                        <li key={b.id} className="flex items-center gap-2">
                                                            <span className="font-medium">{b.time}</span>
                                                            {b.endTime && <span>→ {b.endTime}</span>}
                                                            <span className="text-gray-600 dark:text-gray-400">({b.clientName})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                </>
                            )}

                            {/* Start Time */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                                <select
                                    value={editForm.time}
                                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value, endTime: '' })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none"
                                >
                                    <option value="">Select start time...</option>
                                    {availableTimeSlots.map((time) => {
                                        const available = isSlotAvailable(editForm.date, time);
                                        return (
                                            <option key={time} value={time} disabled={!available}>
                                                {time} {!available ? '(Unavailable)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* End Time */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                                <select
                                    value={editForm.endTime}
                                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                    disabled={!editForm.time}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select end time...</option>
                                    {availableTimeSlots
                                        .filter(time => {
                                            const startIdx = availableTimeSlots.indexOf(editForm.time);
                                            const endIdx = availableTimeSlots.indexOf(time);
                                            return endIdx > startIdx;
                                        })
                                        .map((time) => {
                                            const available = isSlotAvailable(editForm.date, time);
                                            return (
                                                <option key={time} value={time} disabled={!available}>
                                                    {time} {!available ? '(Unavailable)' : ''}
                                                </option>
                                            );
                                        })}
                                </select>
                            </div>

                            {/* Duration Display */}
                            {editForm.time && editForm.endTime && (
                                <div className="bg-electric/10 dark:bg-electric/20 border border-electric/20 dark:border-electric/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="w-4 h-4 text-electric" />
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            Duration: {calculateDuration(editForm.time, editForm.endTime)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {editForm.time} - {editForm.endTime}
                                    </p>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-electric focus:border-transparent outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="p-6 border-t border-gray-200 dark:border-white/10 flex gap-3 sticky bottom-0 bg-white dark:bg-charcoal">
                            <button
                                onClick={closeEditModal}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveBookingEdit}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors shadow-lg shadow-electric/20"
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Bookings;
