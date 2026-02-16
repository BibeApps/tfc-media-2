import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../hooks/useFavorites';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../supabaseClient';
import { ImageModal } from '../../components/ImageModal';

interface GalleryItem {
    id: string;
    watermarked_url: string;
    price: number;
    media_type: 'image' | 'video';
    description?: string;
    title: string;
}

const Favorites: React.FC = () => {
    const { favorites, isFavorited, toggleFavorite } = useFavorites();
    const { addItem } = useCart();
    const [favoriteItems, setFavoriteItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Fetch full details of favorited items
    useEffect(() => {
        if (favorites.length > 0) {
            fetchFavoriteItems();
        } else {
            setFavoriteItems([]);
            setLoading(false);
        }
    }, [favorites]);

    const fetchFavoriteItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('gallery_items')
                .select('*')
                .in('id', favorites);

            if (error) throw error;

            setFavoriteItems(data || []);
        } catch (err) {
            console.error('Error fetching favorite items:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (item: GalleryItem) => {
        addItem({
            id: item.id,
            name: item.title || 'Gallery Item',
            price: item.price,
            quantity: 1,
            image: item.watermarked_url
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">
                        My Favorites
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
                    </p>
                </div>
                <Link
                    to="/gallery"
                    className="px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    Browse Gallery
                </Link>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : favoriteItems.length === 0 ? (
                /* Empty State */
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-charcoal rounded-full mb-6">
                        <Heart className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        No favorites yet
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        Browse the gallery and click the heart icon to save your favorite photos and videos
                    </p>
                    <Link
                        to="/gallery"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                    >
                        <Heart className="w-5 h-5" />
                        Browse Gallery
                    </Link>
                </div>
            ) : (
                /* Favorites Grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {favoriteItems.map((item, index) => (
                        <div
                            key={item.id}
                            className="group relative bg-white dark:bg-charcoal rounded-lg overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-lg transition-shadow"
                        >
                            {/* Heart Icon - Filled Red */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(item.id);
                                }}
                                className="absolute top-2 right-2 z-10 p-2 bg-white/90 dark:bg-black/90 rounded-full hover:scale-110 transition-transform shadow-md"
                                aria-label="Remove from favorites"
                            >
                                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                            </button>

                            {/* Image - Clickable to open modal */}
                            <div
                                className="aspect-[4/5] relative overflow-hidden cursor-pointer"
                                onClick={() => {
                                    setCurrentImageIndex(index);
                                    setModalOpen(true);
                                }}
                            >
                                <img
                                    src={item.watermarked_url}
                                    alt={item.title || 'Favorite item'}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                />
                            </div>

                            {/* Bottom Bar - Price + Add to Cart */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-white font-bold text-sm">
                                        ${item.price.toFixed(2)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToCart(item);
                                        }}
                                        className="px-3 py-1.5 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg"
                                    >
                                        <ShoppingCart className="w-3 h-3" />
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Modal */}
            <ImageModal
                isOpen={modalOpen}
                items={favoriteItems.map(item => ({
                    id: item.id,
                    watermarked_url: item.watermarked_url,
                    price: item.price,
                    media_type: item.media_type || 'image',
                    description: item.description
                }))}
                currentIndex={currentImageIndex}
                onClose={() => setModalOpen(false)}
                onNext={() => setCurrentImageIndex(prev => Math.min(prev + 1, favoriteItems.length - 1))}
                onPrevious={() => setCurrentImageIndex(prev => Math.max(prev - 1, 0))}
                onToggleFavorite={toggleFavorite}
                onAddToCart={handleAddToCart}
                isFavorited={isFavorited}
            />
        </div>
    );
};

export default Favorites;
