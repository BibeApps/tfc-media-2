import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlackoutDate } from '../../types';
import { supabase } from '../../supabaseClient';

const BlackoutDates: React.FC = () => {
    const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        fetchBlackoutDates();

        // Set up real-time subscription for auto-refresh
        const channel = supabase
            .channel('blackout_dates_admin_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'blackout_dates' },
                () => fetchBlackoutDates()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchBlackoutDates = async () => {
        try {
            const { data, error } = await supabase
                .from('blackout_dates')
                .select('*')
                .order('date');

            if (error) throw error;

            const mappedDates = (data || []).map(d => ({
                id: d.id,
                date: d.date,
                isFullDay: d.is_full_day,
                startTime: d.start_time,
                endTime: d.end_time,
                reason: d.reason,
            }));

            setBlackoutDates(mappedDates);
        } catch (err) {
            console.error('Error fetching blackout dates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBlackout = async (blackout: Partial<BlackoutDate>) => {
        try {
            const { error } = await supabase
                .from('blackout_dates')
                .insert([{
                    date: blackout.date,
                    is_full_day: blackout.isFullDay,
                    start_time: blackout.startTime,
                    end_time: blackout.endTime,
                    reason: blackout.reason,
                }]);

            if (error) throw error;

            fetchBlackoutDates();
            setShowModal(false);
        } catch (err) {
            console.error('Error saving blackout date:', err);
        }
    };

    const handleDeleteBlackout = async (id: string) => {
        try {
            const { error } = await supabase
                .from('blackout_dates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchBlackoutDates();
        } catch (err) {
            console.error('Error deleting blackout date:', err);
        }
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

    const isBlackoutDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return blackoutDates.find(bd => bd.date === dateStr);
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blackout Dates</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Blackout Date
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-2 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{monthName}</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={previousMonth}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    →
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-sm font-bold text-gray-500 py-2">
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
                                const blackout = isBlackoutDate(date);
                                const isToday = new Date().toDateString() === date.toDateString();
                                const isPartialDay = blackout && !blackout.isFullDay;

                                return (
                                    <motion.div
                                        key={day}
                                        whileHover={{ scale: 1.05 }}
                                        className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer relative overflow-hidden ${blackout
                                            ? isPartialDay
                                                ? 'bg-gray-50 dark:bg-obsidian text-gray-900 dark:text-white'
                                                : 'bg-red-500 text-white'
                                            : isToday
                                                ? 'bg-electric text-white'
                                                : 'bg-gray-50 dark:bg-obsidian text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        {isPartialDay && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-red-500/70" />
                                        )}
                                        <span className="relative z-10">{day}</span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Blackout List */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Blackout Dates ({blackoutDates.length})
                        </h2>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {blackoutDates.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    No blackout dates
                                </div>
                            ) : (
                                blackoutDates.map((blackout) => (
                                    <motion.div
                                        key={blackout.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-4"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-red-500" />
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {(() => {
                                                        const [year, month, day] = blackout.date.split('-').map(Number);
                                                        const localDate = new Date(year, month - 1, day);
                                                        return localDate.toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        });
                                                    })()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this blackout date?')) {
                                                        handleDeleteBlackout(blackout.id);
                                                    }
                                                }}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                                            >
                                                <X className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>

                                        {blackout.isFullDay ? (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Full Day</p>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                <span>{blackout.startTime} - {blackout.endTime}</span>
                                            </div>
                                        )}

                                        {blackout.reason && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                                                "{blackout.reason}"
                                            </p>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Blackout Modal */}
            <AnimatePresence>
                {showModal && (
                    <BlackoutModal
                        onClose={() => setShowModal(false)}
                        onSave={handleSaveBlackout}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Blackout Modal Component
const BlackoutModal: React.FC<{
    onClose: () => void;
    onSave: (blackout: Partial<BlackoutDate>) => void;
}> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        date: '',
        isFullDay: true,
        startTime: '12:00 PM',
        endTime: '01:00 PM',
        reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10">
                    <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                        Add Blackout Date
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isFullDay}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    isFullDay: e.target.checked,
                                    startTime: e.target.checked ? '' : formData.startTime,
                                    endTime: e.target.checked ? '' : formData.endTime
                                })}
                                className="w-4 h-4 text-electric focus:ring-electric rounded"
                            />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Full Day Blackout</span>
                        </label>
                    </div>

                    {!formData.isFullDay && (
                        <div className="space-y-4">
                            {/* Start Time */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Start Time
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <select
                                        value={formData.startTime.split(':')[0] || '12'}
                                        onChange={(e) => {
                                            const hour = e.target.value;
                                            const minute = formData.startTime.split(':')[1]?.substring(0, 2) || '00';
                                            const period = formData.startTime.includes('PM') ? 'PM' : 'AM';
                                            setFormData({ ...formData, startTime: `${hour}:${minute} ${period}` });
                                        }}
                                        className="px-3 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                            <option key={h} value={h.toString().padStart(2, '0')}>{h}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={formData.startTime.split(':')[1]?.substring(0, 2) || '00'}
                                        onChange={(e) => {
                                            const hour = formData.startTime.split(':')[0] || '12';
                                            const minute = e.target.value;
                                            const period = formData.startTime.includes('PM') ? 'PM' : 'AM';
                                            setFormData({ ...formData, startTime: `${hour}:${minute} ${period}` });
                                        }}
                                        className="px-3 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    >
                                        {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                            <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={formData.startTime.includes('PM') ? 'PM' : 'AM'}
                                        onChange={(e) => {
                                            const hour = formData.startTime.split(':')[0] || '12';
                                            const minute = formData.startTime.split(':')[1]?.substring(0, 2) || '00';
                                            setFormData({ ...formData, startTime: `${hour}:${minute} ${e.target.value}` });
                                        }}
                                        className="px-3 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            </div>

                            {/* End Time */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    End Time
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <select
                                        value={formData.endTime.split(':')[0] || '01'}
                                        onChange={(e) => {
                                            const hour = e.target.value;
                                            const minute = formData.endTime.split(':')[1]?.substring(0, 2) || '00';
                                            const period = formData.endTime.includes('PM') ? 'PM' : 'AM';
                                            setFormData({ ...formData, endTime: `${hour}:${minute} ${period}` });
                                        }}
                                        className="px-3 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                            <option key={h} value={h.toString().padStart(2, '0')}>{h}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={formData.endTime.split(':')[1]?.substring(0, 2) || '00'}
                                        onChange={(e) => {
                                            const hour = formData.endTime.split(':')[0] || '01';
                                            const minute = e.target.value;
                                            const period = formData.endTime.includes('PM') ? 'PM' : 'AM';
                                            setFormData({ ...formData, endTime: `${hour}:${minute} ${period}` });
                                        }}
                                        className="px-3 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    >
                                        {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                            <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={formData.endTime.includes('PM') ? 'PM' : 'AM'}
                                        onChange={(e) => {
                                            const hour = formData.endTime.split(':')[0] || '01';
                                            const minute = formData.endTime.split(':')[1]?.substring(0, 2) || '00';
                                            setFormData({ ...formData, endTime: `${hour}:${minute} ${e.target.value}` });
                                        }}
                                        className="px-3 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={3}
                            placeholder="e.g., Holiday, Personal event, etc."
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default BlackoutDates;
