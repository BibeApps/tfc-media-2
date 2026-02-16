import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ShoppingCart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GalleryItem {
    id: string;
    watermarked_url: string;
    price: number;
    type: 'photo' | 'video';
    description?: string;
}

interface ImageModalProps {
    isOpen: boolean;
    items: GalleryItem[];
    currentIndex: number;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onToggleFavorite: (itemId: string) => void;
    onAddToCart: (item: GalleryItem) => void;
    isFavorited: (itemId: string) => boolean;
    selectedItems?: Set<string>;
    onToggleSelection?: (itemId: string) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
    isOpen,
    items,
    currentIndex,
    onClose,
    onNext,
    onPrevious,
    onToggleFavorite,
    onAddToCart,
    isFavorited,
    selectedItems,
    onToggleSelection
}) => {
    const currentItem = items[currentIndex];
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < items.length - 1;

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (hasPrevious) onPrevious();
                    break;
                case 'ArrowRight':
                    if (hasNext) onNext();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, hasPrevious, hasNext, onClose, onPrevious, onNext]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !currentItem) return null;

    const favorited = isFavorited(currentItem.id);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors touch-manipulation"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>

                    {items.length > 1 && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:top-4 z-50 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 rounded-full text-white text-xs sm:text-sm font-medium">
                            {currentIndex + 1} / {items.length}
                        </div>
                    )}

                    {hasPrevious && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onPrevious();
                            }}
                            className="absolute left-2 sm:left-4 z-50 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors touch-manipulation"
                            aria-label="Previous"
                        >
                            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </button>
                    )}

                    {hasNext && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onNext();
                            }}
                            className="absolute right-2 sm:right-4 z-50 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors touch-manipulation"
                            aria-label="Next"
                        >
                            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </button>
                    )}

                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-7xl max-h-[90vh] w-full mx-2 sm:mx-4"
                    >
                        <motion.div
                            key={currentItem.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="relative"
                        >
                            {/* Image/Video */}
                            {currentItem.type === 'video' ? (
                                <video
                                    src={currentItem.watermarked_url}
                                    controls
                                    className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
                                    autoPlay
                                />
                            ) : (
                                <img
                                    src={currentItem.watermarked_url}
                                    alt="Gallery item"
                                    className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
                                />
                            )}

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite(currentItem.id);
                                }}
                                className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-3 bg-white/90 dark:bg-black/90 rounded-full hover:scale-110 transition-transform shadow-lg touch-manipulation"
                                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <Heart
                                    className={`w-5 h-5 sm:w-6 sm:h-6 ${favorited
                                        ? 'fill-red-500 text-red-500'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                />
                            </button>

                            {/* Bottom Bar - Price + Action Button */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 rounded-b-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-2xl font-bold">
                                            ${currentItem.price.toFixed(2)}
                                        </p>
                                        {currentItem.description && (
                                            <p className="text-white/80 text-sm mt-1">
                                                {currentItem.description}
                                            </p>
                                        )}
                                    </div>
                                    {currentItem.price === 0 && selectedItems && onToggleSelection ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleSelection(currentItem.id);
                                            }}
                                            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg ${selectedItems.has(currentItem.id)
                                                    ? 'bg-electric hover:bg-electric/90 text-white'
                                                    : 'bg-white/20 hover:bg-white/30 text-white border-2 border-white'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${selectedItems.has(currentItem.id)
                                                    ? 'bg-white border-white'
                                                    : 'bg-transparent border-white'
                                                }`}>
                                                {selectedItems.has(currentItem.id) && <Check className="w-4 h-4 text-electric" />}
                                            </div>
                                            {selectedItems.has(currentItem.id) ? 'Selected' : 'Select for Download'}
                                        </button>
                                    ) : currentItem.price > 0 ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddToCart(currentItem);
                                            }}
                                            className="px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
                                        >
                                            <ShoppingCart className="w-5 h-5" />
                                            Add to Cart
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
