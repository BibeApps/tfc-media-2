import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Loader2, Heart, Calendar, Image as ImageIcon, Video, Search, ChevronRight, Home } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatDate } from '../utils/dateFormatter';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useFavorites } from '../hooks/useFavorites';
import { ImageModal } from '../components/ImageModal';

interface Event {
  id: string;
  name: string;
  project_id: string | null;
  email: string | null;
  date: string;
  thumbnail: string | null;
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
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { addItem } = useCart();
  const { favorites, isFavorited, toggleFavorite } = useFavorites();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // Image modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // RLS policies will automatically filter events based on client email
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('archived', false)
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryItems = async (eventId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('session_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (err) {
      console.error('Error fetching gallery items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    fetchGalleryItems(event.id);
  };

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear selected event and items
    setSelectedEvent(null);
    setGalleryItems([]);
  };

  const handleAddToCart = (item: GalleryItem) => {
    addItem({
      id: item.id,
      title: item.title,
      price: item.price,
      type: 'gallery_item',
      imageUrl: item.watermarked_url,
    });
  };

  // Filter events based on search query
  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-electric" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-obsidian py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectedEvent) {
                  // Go back to gallery list
                  setSelectedEvent(null);
                  setGalleryItems([]);
                } else {
                  // Already on gallery list, refresh the page
                  window.location.reload();
                }
              }}
              className={`hover:text-electric whitespace-nowrap transition-colors ${!selectedEvent ? 'font-bold text-gray-900 dark:text-white' : ''}`}
            >
              Gallery
            </button>
            {selectedEvent && (
              <>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Refresh the current session view
                    fetchGalleryItems(selectedEvent.id);
                  }}
                  className="text-gray-900 dark:text-white font-bold whitespace-nowrap hover:text-electric transition-colors"
                >
                  {selectedEvent.name}
                </button>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {selectedEvent ? selectedEvent.name : 'My Events'}
          </h1>

          {/* Search Bar - Only show when viewing events list */}
          {!selectedEvent && (
            <div className="relative w-full sm:max-w-md mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
              />
            </div>
          )}

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {selectedEvent
              ? 'Browse and purchase your event photos and videos'
              : 'Select an event to view your gallery'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-electric" />
          </div>
        ) : !selectedEvent ? (
          /* Events Grid */
          filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-gray-500">No events assigned to you yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleEventClick(event)}
                  className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:border-electric/50 transition-all cursor-pointer group"
                >
                  {event.thumbnail && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={event.thumbnail}
                        alt={event.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {formatDate(event.date)}
                    </div>
                    {event.project_id && (
                      <div className="mt-2 text-xs font-mono text-electric">
                        Project: {event.project_id}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Gallery Items Grid */
          galleryItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-gray-500">No media has been uploaded for this event yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {galleryItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden group"
                >
                  <div
                    className="relative aspect-square cursor-pointer"
                    onClick={() => handleImageClick(index)}
                  >
                    {item.type === 'photo' ? (
                      <img
                        src={item.watermarked_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <video
                        src={item.watermarked_url}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-black/60 text-white text-xs rounded flex items-center gap-1">
                        {item.type === 'photo' ? (
                          <ImageIcon className="w-3 h-3" />
                        ) : (
                          <Video className="w-3 h-3" />
                        )}
                        {item.type}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${isFavorited(item.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-white'
                          }`}
                      />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm text-gray-900 dark:text-white mb-2 truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-electric font-bold text-lg">
                        ${item.price.toFixed(2)}
                      </span>
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
          )
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={modalOpen}
        items={galleryItems}
        currentIndex={currentImageIndex}
        onClose={() => setModalOpen(false)}
        onNext={() => setCurrentImageIndex((prev) => Math.min(prev + 1, galleryItems.length - 1))}
        onPrevious={() => setCurrentImageIndex((prev) => Math.max(prev - 1, 0))}
        onToggleFavorite={toggleFavorite}
        onAddToCart={handleAddToCart}
        isFavorited={isFavorited}
      />
    </div>
  );
};

export default Gallery;
