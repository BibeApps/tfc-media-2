import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, ShoppingCart, Loader2, Heart, Calendar, Image as ImageIcon, Video, Search, ChevronRight, ChevronLeft, Home, Download, Lock, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatDate } from '../utils/dateFormatter';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useFavorites } from '../hooks/useFavorites';
import { ImageModal } from '../components/ImageModal';
import {
  checkDownloadPermission,
  getBannerMessage,
  shouldShowPrices,
  areDownloadsFree,
  getDownloadButtonText
} from '../utils/downloadPermissions';

interface Event {
  id: string;
  name: string;
  project_id: string | null;
  email: string | null;
  date: string;
  thumbnail: string | null;
  payment_status?: 'not_paid' | 'invoice_partially_paid' | 'invoice_fully_paid';
  invoice_id?: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { addItem } = useCart();
  const { favorites, isFavorited, toggleFavorite } = useFavorites();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 24; // 4 rows of 6 images

  // Image modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Bulk download state
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);

  // Selection state for checkbox-based downloads
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  // Sync with URL - load event from URL if present
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId && events.length > 0) {
      const event = events.find(e => e.id === eventId);
      if (event && (!selectedEvent || selectedEvent.id !== eventId)) {
        setSelectedEvent(event);
        setCurrentPage(1); // Reset to page 1 when switching events
        fetchGalleryItems(event.id, 1);
      }
    } else if (!eventId && selectedEvent) {
      setSelectedEvent(null);
      setGalleryItems([]);
      setCurrentPage(1);
      setTotalItems(0);
    }
  }, [searchParams, events]);

  const fetchEvents = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      // Explicitly filter by user to ensure we only get relevant events
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('archived', false)
        .eq('email', user.email)
        .order('date', { ascending: false })
        .limit(100); // Limit to recent 100 events for performance

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      toast.error(`Error loading gallery: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryItems = async (eventId: string, page = 1) => {
    try {
      setLoading(true);
      const { data, count, error } = await supabase
        .from('gallery_items')
        .select('*', { count: 'exact' })
        .eq('session_id', eventId)
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setGalleryItems(data || []);
      setTotalItems(count || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching gallery items:', err);
      toast.error('Failed to load gallery items');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    setSearchParams({ event: event.id });
  };

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear selected event and items
    setSelectedEvent(null);
    setGalleryItems([]);
    setSelectedItems(new Set());
  };

  // Toggle individual item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Toggle select all items
  const toggleSelectAll = () => {
    if (selectedItems.size === galleryItems.length) {
      // Deselect all
      setSelectedItems(new Set());
    } else {
      // Select all
      setSelectedItems(new Set(galleryItems.map(item => item.id)));
    }
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

  // Instant download for $0 items
  const handleAddToDownloads = async (item: GalleryItem) => {
    if (!user) {
      toast.error('Please log in to download');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-instant-order', {
        body: {
          gallery_item_ids: [item.id],
          user_id: user.id,
        },
      });

      if (error) throw error;
      toast.success('✅ Added to Downloads!');
    } catch (error: any) {
      console.error('Error creating instant order:', error);
      toast.error('Failed to add to downloads');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Download selected items
  const handleDownloadSelected = async () => {
    if (!selectedEvent || selectedItems.size === 0) {
      toast.error('Please select items to download');
      return;
    }

    const itemsToDownload = galleryItems.filter(item => selectedItems.has(item.id));
    const isSelectingAll = selectedItems.size === totalItems;

    if (itemsToDownload.length > 500) {
      toast.error('Cannot download more than 500 items at once. Please contact support for large events.');
      return;
    }

    setIsCreatingOrder(true);
    setBulkDownloadProgress(0);

    try {
      // Only check for duplicates if user is downloading ALL items
      if (isSelectingAll) {
        const { data: existingPackages, error: checkError } = await supabase
          .from('download_packages')
          .select(`
          id,
          zip_file_url,
          item_count,
          created_at,
          expires_at,
          orders (
            order_items (
              gallery_items (
                session_id
              )
            )
          )
        `)
          .eq('status', 'ready')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (!checkError && existingPackages && existingPackages.length > 0) {
          // Check if any package is for this event
          const matchingPackage = existingPackages.find(pkg => {
            const orders = Array.isArray(pkg.orders) ? pkg.orders : [pkg.orders];
            const sessionIds = orders.flatMap((order: any) =>
              order?.order_items?.map((item: any) => item.gallery_items?.session_id).filter(Boolean) || []
            );
            return sessionIds.includes(selectedEvent.id);
          });

          if (matchingPackage) {
            // Package already exists
            toast((t) => (
              <div className="flex flex-col gap-2">
                <p className="font-bold">📦 Download Already Ready!</p>
                <p className="text-sm">You already have an active download package for this event.</p>
                <button
                  onClick={() => {
                    navigate('/portal/downloads');
                    toast.dismiss(t.id);
                  }}
                  className="px-4 py-2 bg-electric text-white rounded-lg font-bold hover:bg-electric/90 transition-colors"
                >
                  View Downloads
                </button>
              </div>
            ), {
              duration: 6000,
            });
            setIsCreatingOrder(false);
            return;
          }
        }
      }

      // Create instant order for selected items
      setBulkDownloadProgress(25);
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-instant-order', {
        body: {
          gallery_item_ids: itemsToDownload.map(i => i.id),
          user_id: user.id,
        },
      });

      if (orderError) throw orderError;

      setBulkDownloadProgress(50);

      // Trigger zip generation
      const { data: packageData, error: packageError } = await supabase.functions.invoke('generate-download-package', {
        body: {
          order_id: orderData.order.id,
        },
      });

      if (packageError) throw packageError;

      setBulkDownloadProgress(100);
      toast.success(`✅ ${itemsToDownload.length} item${itemsToDownload.length !== 1 ? 's' : ''} added to Downloads! Check your email for the download package.`, {
        duration: 5000,
      });

      // Clear selection and redirect to Downloads page after 2 seconds
      setSelectedItems(new Set());
      setTimeout(() => navigate('/portal/downloads'), 2000);
    } catch (error: any) {
      console.error('Error creating bulk download:', error);
      toast.error('Failed to create bulk download');
    } finally {
      setIsCreatingOrder(false);
      setBulkDownloadProgress(0);
    }
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
                // Navigate to gallery list (remove event param)
                navigate('/gallery');
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
                    // Refresh by re-setting the same URL param
                    if (selectedEvent) {
                      fetchGalleryItems(selectedEvent.id);
                    }
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

          {/* Select All Checkbox - for fully paid events */}
          {selectedEvent && galleryItems.length > 0 && (() => {
            const isEventFullyPaid = galleryItems.every(item => item.price === 0);
            if (!isEventFullyPaid) return null;

            const allSelected = selectedItems.size === galleryItems.length;
            const someSelected = selectedItems.size > 0 && selectedItems.size < galleryItems.length;

            return (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                      <span>✅</span> This event is fully paid
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Select items below and click Download to create your package.
                    </p>
                  </div>
                  <button
                    onClick={toggleSelectAll}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <div className={`w-5 h-5 border-2 border-white rounded flex items-center justify-center ${allSelected ? 'bg-white' : someSelected ? 'bg-white/50' : 'bg-transparent'
                      }`}>
                      {allSelected && <Check className="w-4 h-4 text-green-600" />}
                      {someSelected && <div className="w-2 h-2 bg-green-600 rounded" />}
                    </div>
                    {allSelected ? 'Deselect All' : `Select All (${totalItems})`}
                  </button>
                </div>
              </motion.div>
            );
          })()}

          {/* Payment Status Banner */}
          {selectedEvent && (() => {
            const banner = getBannerMessage(selectedEvent);
            if (!banner) return null;

            const bannerColors = {
              success: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-800 dark:text-green-300',
              warning: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-800 dark:text-yellow-300',
              info: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-300',
            };

            return (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-lg border ${bannerColors[banner.type]}`}
              >
                <p className="text-sm font-medium">{banner.message}</p>
                {banner.type === 'warning' && selectedEvent.invoice_id && (
                  <a
                    href={`/#/admin/invoices`}
                    className="text-xs underline mt-2 inline-block hover:opacity-80"
                  >
                    View Invoice
                  </a>
                )}
              </motion.div>
            );
          })()}
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
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <video
                        src={item.watermarked_url}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Checkbox Overlay - Only for $0 items */}
                    {item.price === 0 && (
                      <div
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemSelection(item.id);
                        }}
                      >
                        <div className={`w-6 h-6 border-2 rounded cursor-pointer transition-all ${selectedItems.has(item.id)
                          ? 'bg-electric border-electric'
                          : 'bg-black/60 border-white hover:bg-black/80'
                          } flex items-center justify-center`}>
                          {selectedItems.has(item.id) && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
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
                      className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
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
                      {/* Only show Add to Cart for paid items */}
                      {item.price > 0 && (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="flex items-center gap-1 px-3 py-1 bg-electric hover:bg-electric/90 text-white rounded text-xs font-bold transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Pagination Controls */}
        {selectedEvent && galleryItems.length > 0 && totalItems > itemsPerPage && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => {
                if (currentPage > 1 && selectedEvent) {
                  fetchGalleryItems(selectedEvent.id, currentPage - 1);
                }
              }}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
            </span>

            <button
              onClick={() => {
                if (currentPage < Math.ceil(totalItems / itemsPerPage) && selectedEvent) {
                  fetchGalleryItems(selectedEvent.id, currentPage + 1);
                }
              }}
              disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Download Button */}
      <AnimatePresence>
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <button
              onClick={handleDownloadSelected}
              disabled={isCreatingOrder}
              className="px-6 py-4 bg-electric hover:bg-electric/90 text-white rounded-full font-bold transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {bulkDownloadProgress > 0 ? `${bulkDownloadProgress}%` : 'Processing...'}
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  Download ({selectedItems.size})
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
        selectedItems={selectedItems}
        onToggleSelection={toggleItemSelection}
      />
    </div>
  );
};

export default Gallery;
