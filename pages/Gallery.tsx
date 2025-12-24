import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, ShoppingCart, Lock, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';

enum ViewState {
  TYPES = 'types',
  EVENTS = 'events',
  SESSIONS = 'sessions',
  GRID = 'grid',
}

interface EventCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
}

interface Event {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  date: string;
  thumbnail: string;
  client_id?: string;
}

interface Session {
  id: string;
  event_id: string;
  name: string;
  date: string;
  thumbnail: string;
}

interface GalleryItem {
  id: string;
  session_id: string;
  title: string;
  type: 'photo' | 'video';
  watermarked_url: string;
  original_url: string;
  price: number;
  width: number;
  height: number;
  description: string;
  tags: string[];
}

const Gallery: React.FC = () => {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>(ViewState.TYPES);

  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .eq('archived', false)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (categoryId: string) => {
    try {
      setLoading(true);
      // Fetch only public events (no client_id) or you can adjust this logic
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('category_id', categoryId)
        .eq('archived', false)
        .is('client_id', null) // Only public events
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (eventId: string) => {
    try {
      setLoading(true);
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

  const fetchGalleryItems = async (sessionId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (err) {
      console.error('Error fetching gallery items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category: EventCategory) => {
    setSelectedCategory(category);
    setViewState(ViewState.EVENTS);
    fetchEvents(category.id);
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setViewState(ViewState.SESSIONS);
    fetchSessions(event.id);
  };

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
    setViewState(ViewState.GRID);
    fetchGalleryItems(session.id);
  };

  const handleBack = () => {
    if (viewState === ViewState.GRID) {
      setViewState(ViewState.SESSIONS);
      setSelectedSession(null);
    } else if (viewState === ViewState.SESSIONS) {
      setViewState(ViewState.EVENTS);
      setSelectedEvent(null);
    } else if (viewState === ViewState.EVENTS) {
      setViewState(ViewState.TYPES);
      setSelectedCategory(null);
    }
  };

  const handleAddToCart = async (item: GalleryItem) => {
    await addItem({
      id: item.id,
      title: item.title,
      price: item.price,
      type: item.type,
      url: item.watermarked_url,
      watermarked_url: item.watermarked_url,
      original_url: item.original_url,
      width: item.width,
      height: item.height,
      description: item.description,
      tags: item.tags,
      session_id: item.session_id,
    });
  };

  // Breadcrumbs
  const Breadcrumbs = () => (
    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-8 overflow-x-auto pb-2">
      <button onClick={() => { setViewState(ViewState.TYPES); setSelectedCategory(null); setSelectedEvent(null); setSelectedSession(null); }} className="hover:text-electric whitespace-nowrap">
        Gallery
      </button>
      {selectedCategory && (
        <>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <button onClick={() => { setViewState(ViewState.EVENTS); setSelectedEvent(null); setSelectedSession(null); }} className={`hover:text-electric whitespace-nowrap ${viewState === ViewState.EVENTS ? 'text-gray-900 dark:text-white font-bold' : ''}`}>
            {selectedCategory.name}
          </button>
        </>
      )}
      {selectedEvent && viewState !== ViewState.EVENTS && viewState !== ViewState.TYPES && (
        <>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <button onClick={() => { setViewState(ViewState.SESSIONS); setSelectedSession(null); }} className={`hover:text-electric whitespace-nowrap ${viewState === ViewState.SESSIONS ? 'text-gray-900 dark:text-white font-bold' : ''}`}>
            {selectedEvent.name}
          </button>
        </>
      )}
      {selectedSession && viewState === ViewState.GRID && (
        <>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-gray-900 dark:text-white font-bold whitespace-nowrap">{selectedSession.name}</span>
        </>
      )}
    </div>
  );

  if (loading && viewState === ViewState.TYPES) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-electric" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        {viewState !== ViewState.TYPES && (
          <button onClick={handleBack} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
        )}
      </div>

      <Breadcrumbs />

      {/* VIEW: CATEGORIES */}
      {viewState === ViewState.TYPES && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {categories.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p>No gallery categories available yet.</p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} onClick={() => handleSelectCategory(category)} className="group cursor-pointer bg-white dark:bg-charcoal rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 hover:border-electric/50 transition-all shadow-sm hover:shadow-xl hover:shadow-electric/10 flex flex-col">
                <div className="h-40 overflow-hidden bg-gray-100 dark:bg-black/50">
                  {category.thumbnail ? (
                    <img src={category.thumbnail} alt={category.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">No Image</div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-heading font-bold mb-2 text-gray-900 dark:text-white group-hover:text-electric transition-colors">{category.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-1">{category.description}</p>
                  <div className="mt-auto flex items-center text-electric text-sm font-bold">
                    View Events <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* VIEW: EVENTS */}
      {viewState === ViewState.EVENTS && selectedCategory && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <h2 className="text-3xl font-heading font-bold mb-6 text-gray-900 dark:text-white">{selectedCategory.name} Events</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-electric" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {events.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5">
                  <p>No events found in this category.</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} onClick={() => handleSelectEvent(event)} className="flex flex-col bg-white dark:bg-charcoal rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm hover:shadow-md hover:border-electric/30 group">
                    <div className="w-full h-48 bg-gray-100 dark:bg-black/50 overflow-hidden">
                      {event.thumbnail ? (
                        <img src={event.thumbnail} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">No Image</div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white group-hover:text-electric transition-colors line-clamp-1">{event.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">{event.date}</p>
                      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                        <span className="text-xs bg-gray-100 dark:bg-black/30 px-2 py-1 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                          View Sessions
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-electric" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* VIEW: SESSIONS */}
      {viewState === ViewState.SESSIONS && selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl font-heading font-bold mb-2 text-gray-900 dark:text-white">{selectedEvent.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Select a session to view photos</p>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-electric" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sessions.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5">
                  <p>No sessions uploaded yet.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} onClick={() => handleSelectSession(session)} className="relative group cursor-pointer rounded-xl overflow-hidden aspect-video bg-white dark:bg-charcoal shadow-sm hover:shadow-md border border-gray-200 dark:border-white/5 hover:border-electric/50">
                    {session.thumbnail ? (
                      <img src={session.thumbnail} alt={session.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-charcoal">No Preview</div>
                    )}
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="text-center p-4">
                        <h3 className="text-xl font-bold text-white mb-1 drop-shadow-md">{session.name}</h3>
                        <p className="text-gray-200 text-xs drop-shadow-sm">{session.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* VIEW: GRID ITEMS */}
      {viewState === ViewState.GRID && selectedSession && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-1 text-gray-900 dark:text-white">{selectedSession.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{selectedSession.date}</p>
            </div>
            <div className="bg-electric/10 px-4 py-2 rounded-lg border border-electric/20 text-electric text-sm">
              <Lock className="w-3 h-3 inline mr-1" /> Watermarked Previews
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-electric" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {galleryItems.length === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-500">
                  <p>No items in this session.</p>
                </div>
              ) : (
                galleryItems.map((item) => (
                  <div key={item.id} className="group relative bg-white dark:bg-charcoal rounded-lg overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm">
                    <div className="aspect-[4/5] relative overflow-hidden">
                      <img src={item.watermarked_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4 text-center">
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center max-h-12 overflow-hidden">
                            {item.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] bg-white/10 px-1 rounded text-gray-300">#{tag}</span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                          className="mt-2 bg-electric hover:bg-electric/80 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg shadow-electric/20"
                        >
                          <ShoppingCart className="w-3 h-3" /> Add ${item.price.toFixed(2)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Gallery;
