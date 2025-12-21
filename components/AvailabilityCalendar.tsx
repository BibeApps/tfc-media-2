import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

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
    end_time?: string;
    status: string;
}

interface AvailabilityCalendarProps {
    selectedDate: string;
    onDateSelect: (dateStr: string) => void;
    maxAvailableSlots?: number;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
    selectedDate,
    onDateSelect,
    maxAvailableSlots = 9
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

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
                .select('booking_date, booking_time, end_time, status')
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
        
        // Check if any booking is full day
        const hasFullDay = dayBookings.some(b => b.booking_time === 'Full Day' || b.end_time === 'Full Day');
        if (hasFullDay) {
            return 'full';
        }
        
        return dayBookings.length > 0 ? 'partial' : null;
    };

    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const blackout = isDateBlackedOut(date);

        // Don't allow selection of full-day blackouts
        if (blackout?.isFullDay) {
            return;
        }

        onDateSelect(dateStr);
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
        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Check Availability</h2>
                <div className="flex gap-2">
                    <button
                        onClick={previousMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            <h3 className="text-center text-lg font-bold text-gray-900 dark:text-white mb-4">{monthName}</h3>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 py-2">
                        {day}
                    </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dateStr = date.toISOString().split('T')[0];
                    const blackout = isDateBlackedOut(date);
                    const booked = isDateBooked(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const isSelected = selectedDate === dateStr;

                    const isPartialBlackout = blackout && !blackout.isFullDay;
                    const isPartialBooked = booked === 'partial';
                    const isFullyBooked = booked === 'full';

                    return (
                        <motion.button
                            key={day}
                            type="button"
                            onClick={() => !isPast && !blackout?.isFullDay && !isFullyBooked && handleDateClick(date)}
                            disabled={isPast || !!blackout?.isFullDay || isFullyBooked}
                            whileHover={!isPast && !blackout?.isFullDay ? { scale: 1.05 } : {}}
                            className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all relative overflow-hidden ${isPast || blackout?.isFullDay
                                    || isFullyBooked ? 'cursor-not-allowed opacity-40'
                                    : 'cursor-pointer'
                                } ${blackout?.isFullDay
                                    ? 'bg-red-500 text-white'
                                    : isFullyBooked
                                        ? 'bg-amber-500 text-white'
                                        : isSelected
                                            ? 'bg-electric text-white ring-2 ring-electric ring-offset-2 dark:ring-offset-charcoal'
                                            : isToday
                                                ? 'bg-electric/20 text-electric dark:text-electric font-bold ring-1 ring-electric'
                                                : 'bg-gray-50 dark:bg-obsidian text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                        >
                            {/* Partial indicators */}
                            {isPartialBlackout && !blackout?.isFullDay && (
                                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-red-500/70" />
                            )}
                            {isPartialBooked && !isFullyBooked && !blackout && (
                                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-amber-500/70" />
                            )}
                            <span className="relative z-10">{day}</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded bg-red-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Blackout</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded bg-amber-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Booked</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded bg-electric flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Today</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded bg-gray-200 dark:bg-obsidian border border-gray-300 dark:border-white/20 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Available</span>
                </div>
            </div>
        </div>
    );
};

export default AvailabilityCalendar;
