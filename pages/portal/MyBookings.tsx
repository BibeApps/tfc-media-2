import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, Phone, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface Booking {
    id: string;
    client_name: string;
    client_email: string;
    service_type: string;
    booking_date: string;
    booking_time: string;
    status: string;
    notes: string;
    created_at: string;
}

const MyBookings: React.FC = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchBookings();
        }
    }, [user]);

    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('client_email', user?.email)
                .order('booking_date', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;
            fetchBookings();
        } catch (err) {
            console.error('Error cancelling booking:', err);
            alert('Failed to cancel booking');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
            case 'cancelled':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-electric" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
                <p className="text-gray-600 dark:text-gray-400">View and manage your service bookings</p>
            </div>

            {bookings.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No bookings found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((booking) => (
                        <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        {booking.service_type}
                                    </h3>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                </div>
                                {booking.status === 'pending' && (
                                    <button
                                        onClick={() => handleCancelBooking(booking.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Clock className="w-4 h-4" />
                                    <span>{booking.booking_time}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Mail className="w-4 h-4" />
                                    <span>{booking.client_email}</span>
                                </div>
                            </div>

                            {booking.notes && (
                                <div className="p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-bold">Notes:</span> {booking.notes}
                                    </p>
                                </div>
                            )}

                            {booking.status === 'confirmed' && (
                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        ✓ Your booking has been confirmed! We'll contact you closer to the date.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyBookings;
