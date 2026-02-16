import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Image as ImageIcon, Video, ShoppingCart, Eye, Loader2 } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';
import { motion } from 'framer-motion';
import { EventCategory, Event, Session, GalleryItem } from '../../types';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const MyEvents: React.FC = () => {
    const { user } = useAuth();
    const { addToCart } = useCart();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<EventCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

    useEffect(() => {
        fetchMyEvents();
    }, [user]);

    const fetchMyEvents = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Fetch sessions assigned to this client (Simple Mode)
            const { data: sessions, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('email', user.email)
                .eq('archived', false);

            if (error) throw error;

            // In Simple Mode, sessions act as "Events"
            // We'll group them into a "General" category or by date
            const categoryMap = new Map<string, EventCategory>();

            // Create a default category for these sessions
            const defaultCategory: EventCategory = {
                id: 'general',
                name: 'My Events',
                slug: 'general',
                description: 'All your events',
                thumbnail: sessions?.[0]?.thumbnail || '',
                events: [] // We map sessions to events interface
            };

            categoryMap.set('general', defaultCategory);

            sessions?.forEach((session: any) => {
                // Map session to Event interface for display
                const eventFromSession: Event = {
                    id: session.id,
                    name: session.name,
                    slug: session.id,
                    date: session.date,
                    thumbnail: session.thumbnail,
                    sessions: [session], // It contains itself
                };
                defaultCategory.events?.push(eventFromSession);
            });

            setCategories(Array.from(categoryMap.values()));
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEvents = async (categoryId: string) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('category_id', categoryId)
                .eq('client_id', user?.id)
                .eq('archived', false);

            if (error) throw error;

            if (selectedCategory) {
                setSelectedCategory({ ...selectedCategory, events: data || [] });
            }
        } catch (err) {
            console.error('Error fetching events:', err);
        }
    };

    const fetchSessions = async (eventId: string) => {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('event_id', eventId)
                .eq('archived', false);

            if (error) throw error;

            if (selectedEvent) {
                setSelectedEvent({ ...selectedEvent, sessions: data || [] });
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
        }
    };

    const fetchGalleryItems = async (sessionId: string) => {
        try {
            const { data, error } = await supabase
                .from('gallery_items')
                .select('*')
                .eq('session_id', sessionId);

            if (error) throw error;

            setGalleryItems(data || []);
        } catch (err) {
            console.error('Error fetching gallery items:', err);
        }
    };

    const handleCategoryClick = (category: EventCategory) => {
        setSelectedCategory(category);
        setSelectedEvent(null);
        setSelectedSession(null);
        fetchEvents(category.id);
    };

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setSelectedSession(null);
        fetchSessions(event.id);
    };

    const handleSessionClick = (session: Session) => {
        setSelectedSession(session);
        fetchGalleryItems(session.id);
    };

    const handleAddToCart = (item: GalleryItem) => {
        addToCart({
            id: item.id,
            title: item.title,
            price: item.price,
            type: 'gallery_item',
            imageUrl: item.watermarked_url,
        });
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Events</h1>
                <p className="text-gray-600 dark:text-gray-400">Browse and purchase photos from your events</p>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No events assigned to you yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Categories */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wide">Categories</h3>
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryClick(category)}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${selectedCategory?.id === category.id
                                    ? 'border-electric bg-electric/5'
                                    : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                    }`}
                            >
                                <p className="font-bold text-gray-900 dark:text-white">{category.name}</p>
                            </button>
                        ))}
                    </div>

                    {/* Events */}
                    {selectedCategory && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wide">Events</h3>
                            {selectedCategory.events?.map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedEvent?.id === event.id
                                        ? 'border-electric bg-electric/5'
                                        : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                        }`}
                                >
                                    <p className="font-bold text-gray-900 dark:text-white">{event.name}</p>
                                    <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Sessions */}
                    {selectedEvent && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wide">Sessions</h3>
                            {selectedEvent.sessions?.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => handleSessionClick(session)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedSession?.id === session.id
                                        ? 'border-electric bg-electric/5'
                                        : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                        }`}
                                >
                                    <p className="font-bold text-gray-900 dark:text-white">{session.name}</p>
                                    <p className="text-sm text-gray-500">{formatDate(session.date)}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Gallery */}
                    {selectedSession && (
                        <div className="lg:col-span-1 space-y-3">
                            <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wide">
                                Gallery ({galleryItems.length})
                            </h3>
                            <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto">
                                {galleryItems.map(item => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white dark:bg-charcoal rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden"
                                    >
                                        <div className="relative aspect-video">
                                            {item.type === 'photo' ? (
                                                <img src={item.watermarked_url} alt={item.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <video src={item.watermarked_url} className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute top-2 left-2">
                                                <span className="px-2 py-1 bg-black/60 text-white text-xs rounded flex items-center gap-1">
                                                    {item.type === 'photo' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                                    {item.type}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white mb-1">{item.title}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-electric font-bold">${item.price}</span>
                                                <button
                                                    onClick={() => handleAddToCart(item)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-electric hover:bg-electric/90 text-white rounded text-xs font-bold transition-colors"
                                                >
                                                    <ShoppingCart className="w-3 h-3" />
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyEvents;
