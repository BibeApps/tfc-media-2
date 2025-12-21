import React, { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, Search, Filter, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Booking, BookingStatus } from '../../types';
import { supabase } from '../../supabaseClient';

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .order('booking_date', { ascending: false });

            if (error) throw error;

            // Map database fields to component fields
            const mappedBookings = (data || []).map(booking => ({
                id: booking.id,
                clientName: booking.client_name,
                clientEmail: booking.client_email,
                serviceType: booking.service_type,
                date: booking.booking_date,
                time: booking.booking_time,
                status: booking.status,
                notes: booking.notes,
                created_at: booking.created_at,
            }));

            setBookings(mappedBookings);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (id: string, status: BookingStatus) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            fetchBookings();
        } catch (err) {
            console.error('Error updating booking:', err);
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
                    {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
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
                                            <span>{booking.time}</span>
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

                                {booking.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Bookings;
