import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Trash2, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

interface Event {
    id: string;
    name: string;
    date: string | null;
}

interface Session {
    id: string;
    name: string;
    event_id: string;
    date: string | null;
}

export default function GalleryEdit() {
    const [events, setEvents] = useState<Event[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);

    const [editingEvent, setEditingEvent] = useState<string | null>(null);
    const [editingSession, setEditingSession] = useState<string | null>(null);

    const [editValue, setEditValue] = useState('');
    const [loading, setLoading] = useState(false);

    // Search, Pagination, and Expand/Collapse state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [eventPage, setEventPage] = useState(1);
    const [sessionPage, setSessionPage] = useState(1);
    const [eventTotal, setEventTotal] = useState(0);
    const [sessionTotal, setSessionTotal] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const itemsPerPage = 10;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setEventPage(1);
            setSessionPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchEvents();
    }, [eventPage, debouncedSearch]);

    useEffect(() => {
        fetchSessions();
    }, [sessionPage, debouncedSearch]);

    const fetchEvents = async () => {
        try {
            let query = supabase
                .from('events')
                .select('id, name, date', { count: 'exact' });

            if (debouncedSearch) {
                query = query.ilike('name', `%${debouncedSearch}%`);
            }

            const { data, count, error } = await query
                .order('name')
                .range((eventPage - 1) * itemsPerPage, eventPage * itemsPerPage - 1);

            if (error) throw error;
            setEvents(data || []);
            setEventTotal(count || 0);
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        }
    };

    const fetchSessions = async () => {
        try {
            let query = supabase
                .from('sessions')
                .select('id, name, event_id, date', { count: 'exact' });

            if (debouncedSearch) {
                query = query.ilike('name', `%${debouncedSearch}%`);
            }

            const { data, count, error } = await query
                .order('name')
                .range((sessionPage - 1) * itemsPerPage, sessionPage * itemsPerPage - 1);

            if (error) throw error;
            setSessions(data || []);
            setSessionTotal(count || 0);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Failed to load sessions');
        }
    };

    const handleEditEvent = (id: string, currentName: string) => {
        setEditingEvent(id);
        setEditValue(currentName);
    };

    const handleEditSession = (id: string, currentName: string) => {
        setEditingSession(id);
        setEditValue(currentName);
    };

    const handleSaveEvent = async (id: string) => {
        if (!editValue.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('events')
                .update({ name: editValue })
                .eq('id', id);

            if (error) throw error;

            await fetchEvents();
            setEditingEvent(null);
            setEditValue('');
            toast.success('Event updated successfully');
        } catch (error) {
            console.error('Error updating event:', error);
            toast.error('Failed to update event');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSession = async (id: string) => {
        if (!editValue.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('sessions')
                .update({ name: editValue })
                .eq('id', id);

            if (error) throw error;

            await fetchSessions();
            setEditingSession(null);
            setEditValue('');
            toast.success('Session updated successfully');
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error('Failed to update session');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (event: Event) => {
        // Warning: This logic is tricky with pagination as we might not have sessions loaded.
        // We should explicitly check server-side count of sessions for this event.
        const { count, error: countError } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

        if (countError) {
            console.error(countError);
            toast.error('Failed to check dependencies');
            return;
        }

        if (count && count > 0) {
            toast.error(`Cannot delete event "${event.name}" - it has ${count} session(s). Delete sessions first.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete event "${event.name}"?`)) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

            if (error) throw error;

            await fetchEvents();
            toast.success('Event deleted successfully');
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Failed to delete event');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSession = async (session: Session) => {
        const { count, error: countError } = await supabase
            .from('gallery_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

        if (countError) {
            toast.error('Failed to check session dependencies');
            return;
        }

        if (count && count > 0) {
            toast.error(`Cannot delete session "${session.name}" - it has ${count} gallery item(s). Delete items first.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete session "${session.name}"?`)) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', session.id);

            if (error) throw error;

            await fetchSessions();
            toast.success('Session deleted successfully');
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditingEvent(null);
        setEditingSession(null);
        setEditValue('');
    };

    // Helper to get event name (Might be missing if not in current page of events)
    // We should probably just display event_id or fetch it if needed, or remove the feature.
    // However, sessions table has event_id. Join?
    // Simplify: Just don't show event name, or rely on what we have (best effort).
    const getEventName = (eventId: string) => {
        const evt = events.find(e => e.id === eventId);
        return evt ? evt.name : 'Unknown (Not loaded)';
    };

    // Use derived state from server
    const filteredEvents = events;
    const filteredSessions = sessions;

    // Pagination controls logic
    const eventTotalPages = Math.ceil(eventTotal / itemsPerPage);
    const sessionTotalPages = Math.ceil(sessionTotal / itemsPerPage);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        // Debounce handles the rest
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setEventPage(1);
        setSessionPage(1);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        // Note: Expand/Collapse might behave differently with server pagination.
        // If "Expanded" means load ALL, that defeats the purpose.
        // Assuming "Expand" just means UI layout (show details?).
        // Actually the original code meant "Show All"?
        // Original: if (isExpanded) return items; (No slice)
        // We cannot support "Show All" efficiently.
        // I will repurpose it or disable it.
        // Or if Expanded -> setPageSize(100)?
        // For now, let's keep it as is (toggle state) but pagination remains active.
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Gallery Editor</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Edit event and session names</p>
            </div>

            {/* Search and Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search events or sessions..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-white dark:bg-charcoal border border-gray-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-electric focus:border-electric"
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                {/* Expand toggled disabled for now as it conflicts with server pagination
                <button
                    onClick={toggleExpand}
                    className="px-4 py-3 bg-electric/10 hover:bg-electric/20 text-electric border border-electric/20 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                     // ...
                </button>
                */}
            </div>

            <div className="space-y-8">
                {/* Events */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Events</h2>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Total: {eventTotal}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {events.map(event => (
                            <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 dark:bg-obsidian rounded-lg">
                                {editingEvent === event.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 w-full px-3 py-2 bg-white dark:bg-charcoal border border-gray-300 dark:border-white/20 rounded-lg"
                                            autoFocus
                                        />
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => handleSaveEvent(event.id)}
                                                disabled={loading}
                                                className="flex-1 sm:flex-none p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                className="flex-1 sm:flex-none p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-900 dark:text-white font-medium truncate">{event.name}</p>
                                            {event.date && (
                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(event.date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => handleEditEvent(event.id, event.name)}
                                                className="flex-1 sm:flex-none p-2 bg-electric/10 hover:bg-electric/20 text-electric rounded-lg"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEvent(event)}
                                                className="flex-1 sm:flex-none p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {events.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                                {searchQuery ? 'No events match your search' : 'No events found'}
                            </p>
                        )}
                    </div>

                    {/* Pagination */}
                    {eventTotalPages > 1 && (
                        <div className="mt-4 flex justify-center gap-2 flex-wrap">
                            <button
                                onClick={() => setEventPage(Math.max(1, eventPage - 1))}
                                disabled={eventPage === 1}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-obsidian border border-gray-300 dark:border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-obsidian/80"
                            >
                                Previous
                            </button>
                            <span className="flex items-center text-sm text-gray-500">
                                Page {eventPage} of {eventTotalPages}
                            </span>
                            <button
                                onClick={() => setEventPage(Math.min(eventTotalPages, eventPage + 1))}
                                disabled={eventPage === eventTotalPages}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-obsidian border border-gray-300 dark:border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-obsidian/80"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Sessions */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Sessions</h2>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Total: {sessionTotal}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {sessions.map(session => (
                            <div key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 dark:bg-obsidian rounded-lg">
                                {editingSession === session.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 w-full px-3 py-2 bg-white dark:bg-charcoal border border-gray-300 dark:border-white/20 rounded-lg"
                                            autoFocus
                                        />
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => handleSaveSession(session.id)}
                                                disabled={loading}
                                                className="flex-1 sm:flex-none p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                className="flex-1 sm:flex-none p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-900 dark:text-white font-medium truncate">{session.name}</p>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                {session.date && new Date(session.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => handleEditSession(session.id, session.name)}
                                                className="flex-1 sm:flex-none p-2 bg-electric/10 hover:bg-electric/20 text-electric rounded-lg"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSession(session)}
                                                className="flex-1 sm:flex-none p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {sessions.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                                {searchQuery ? 'No sessions match your search' : 'No sessions found'}
                            </p>
                        )}
                    </div>

                    {/* Pagination */}
                    {sessionTotalPages > 1 && (
                        <div className="mt-4 flex justify-center gap-2 flex-wrap">
                            <button
                                onClick={() => setSessionPage(Math.max(1, sessionPage - 1))}
                                disabled={sessionPage === 1}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-obsidian border border-gray-300 dark:border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-obsidian/80"
                            >
                                Previous
                            </button>
                            <span className="flex items-center text-sm text-gray-500">
                                Page {sessionPage} of {sessionTotalPages}
                            </span>
                            <button
                                onClick={() => setSessionPage(Math.min(sessionTotalPages, sessionPage + 1))}
                                disabled={sessionPage === sessionTotalPages}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-obsidian border border-gray-300 dark:border-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-obsidian/80"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
