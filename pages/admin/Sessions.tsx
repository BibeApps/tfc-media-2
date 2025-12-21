import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Archive, Calendar, Image as ImageIcon, Loader2, ArrowLeft, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session, Event } from '../../types';
import { supabase } from '../../supabaseClient';

const Sessions: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const eventId = searchParams.get('eventId');

    const [event, setEvent] = useState<Event | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);

    useEffect(() => {
        if (eventId) {
            fetchEvent();
            fetchSessions();
        }
    }, [eventId]);

    const fetchEvent = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            setEvent(data);
        } catch (err) {
            console.error('Error fetching event:', err);
        }
    };

    const fetchSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('event_id', eventId)
                .eq('archived', false)
                .order('date', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (err) {
            console.error('Error fetching sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSession = async (session: Partial<Session>) => {
        try {
            const sessionData = {
                ...session,
                event_id: eventId,
            };

            if (editingSession) {
                const { error } = await supabase
                    .from('sessions')
                    .update(sessionData)
                    .eq('id', editingSession.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('sessions')
                    .insert([sessionData]);
                if (error) throw error;
            }

            fetchSessions();
            setShowModal(false);
            setEditingSession(null);
        } catch (err) {
            console.error('Error saving session:', err);
        }
    };

    const handleArchiveSession = async (id: string) => {
        try {
            const { error } = await supabase
                .from('sessions')
                .update({ archived: true })
                .eq('id', id);

            if (error) throw error;
            fetchSessions();
        } catch (err) {
            console.error('Error archiving session:', err);
        }
    };

    if (!eventId) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No event selected</p>
                <button
                    onClick={() => navigate('/admin/events')}
                    className="px-4 py-2 bg-electric text-white rounded-lg font-bold"
                >
                    Go to Events
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/events')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {event?.name || 'Event'} - Sessions
                        </h1>
                        {event && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                {event.date}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingSession(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Session
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No sessions yet. Create your first session to start uploading media.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:border-electric/50 transition-all group"
                        >
                            {session.thumbnail && (
                                <div className="relative aspect-video overflow-hidden">
                                    <img
                                        src={session.thumbnail}
                                        alt={session.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                </div>
                            )}
                            <div className="p-4">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{session.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <Calendar className="w-4 h-4" />
                                    {session.date}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/admin/gallery-upload?sessionId=${session.id}`)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg text-sm font-bold transition-colors"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        Upload Media
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingSession(session);
                                            setShowModal(true);
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Archive this session?')) {
                                                handleArchiveSession(session.id);
                                            }
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Archive className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Session Modal */}
            <AnimatePresence>
                {showModal && (
                    <SessionModal
                        session={editingSession}
                        onClose={() => {
                            setShowModal(false);
                            setEditingSession(null);
                        }}
                        onSave={handleSaveSession}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Session Modal Component
const SessionModal: React.FC<{
    session: Session | null;
    onClose: () => void;
    onSave: (session: Partial<Session>) => void;
}> = ({ session, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: session?.name || '',
        date: session?.date || '',
        thumbnail: session?.thumbnail || '',
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
                        {session ? 'Edit Session' : 'New Session'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Session Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Ceremony, Reception, Portraits"
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Session Date
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
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Thumbnail URL
                        </label>
                        <input
                            type="url"
                            value={formData.thumbnail}
                            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                            placeholder="https://..."
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

export default Sessions;
