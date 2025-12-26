import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, FileImage, FileVideo, Clock, X, Loader2, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadItem } from '../../types';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

const Downloads: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const orderFilter = searchParams.get('order');
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 50;

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [modalImageUrl, setModalImageUrl] = useState<string>('');
    const [loadingModalImage, setLoadingModalImage] = useState(false);

    useEffect(() => {
        if (user) {
            setLoading(true);
            fetchDownloads();
        }
    }, [user, currentPage]);

    // Load image URL when modal opens or index changes
    useEffect(() => {
        if (modalOpen && filteredDownloads[currentIndex]) {
            loadModalImage(filteredDownloads[currentIndex]);
        }
    }, [modalOpen, currentIndex]);

    // Keyboard navigation for modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!modalOpen) return;

            if (e.key === 'Escape') {
                setModalOpen(false);
            } else if (e.key === 'ArrowLeft') {
                handlePrevious();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [modalOpen, currentIndex]);

    const loadModalImage = async (item: DownloadItem) => {
        setLoadingModalImage(true);
        try {
            const isSupabaseStorage = item.originalUrl.includes('supabase.co/storage');

            if (isSupabaseStorage) {
                const url = new URL(item.originalUrl);
                const pathParts = url.pathname.split('/');
                const objectIndex = pathParts.indexOf('object');

                if (objectIndex !== -1) {
                    const bucketName = pathParts[objectIndex + 2];
                    const filePath = pathParts.slice(objectIndex + 3).join('/');

                    const { data, error } = await supabase.storage
                        .from(bucketName)
                        .createSignedUrl(filePath, 300); // 5 minutes for viewing

                    if (!error && data) {
                        setModalImageUrl(data.signedUrl);
                        setLoadingModalImage(false);
                        return;
                    }
                }
            }

            // Fallback to original URL or watermarked URL
            setModalImageUrl(item.originalUrl || item.thumbnailUrl);
        } catch (error) {
            console.error('Error loading modal image:', error);
            setModalImageUrl(item.thumbnailUrl); // Fallback to thumbnail
        } finally {
            setLoadingModalImage(false);
        }
    };

    const fetchDownloads = async () => {
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            // First, get all order IDs for this user
            const { data: userOrders } = await supabase
                .from('orders')
                .select('id')
                .eq('client_id', user!.id);

            if (!userOrders || userOrders.length === 0) {
                setDownloads([]);
                setTotalCount(0);
                setLoading(false);
                return;
            }

            const orderIds = userOrders.map(o => o.id);

            // Get all order_items for this user
            const { data: allOrderItems, error } = await supabase
                .from('order_items')
                .select(`
                    id,
                    price,
                    gallery_item_id,
                    order_id,
                    orders (
                        id,
                        order_number,
                        created_at,
                        client_id
                    ),
                    gallery_items (
                        id,
                        title,
                        type,
                        watermarked_url,
                        original_url,
                        width,
                        height
                    )
                `)
                .in('order_id', orderIds)
                .order('created_at', { foreignTable: 'orders', ascending: false });

            if (error) throw error;

            if (allOrderItems) {
                // Deduplicate by gallery_item_id - keep only the first occurrence (most recent order)
                const uniqueItemsMap = new Map<string, any>();
                allOrderItems.forEach(item => {
                    if (!uniqueItemsMap.has(item.gallery_item_id)) {
                        uniqueItemsMap.set(item.gallery_item_id, item);
                    }
                });

                const uniqueItems = Array.from(uniqueItemsMap.values());
                setTotalCount(uniqueItems.length);

                // Apply pagination to deduplicated items
                const paginatedItems = uniqueItems.slice(from, to + 1);

                const items: DownloadItem[] = paginatedItems.map((row: any) => ({
                    id: row.id,
                    fileName: row.gallery_items.title, // Title already contains the full filename with extension
                    fileSize: 'Unknown',
                    format: row.gallery_items.type === 'video' ? 'MP4' : 'JPG',
                    thumbnailUrl: row.gallery_items.watermarked_url,
                    originalUrl: row.gallery_items.original_url,
                    orderId: row.orders.order_number,
                    orderDate: formatDate(row.orders.created_at),
                    downloadsRemaining: 999
                }));
                setDownloads(items);
            }
        } catch (err) {
            console.error('Error fetching downloads:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredDownloads = orderFilter
        ? downloads.filter(item => item.orderId === orderFilter)
        : downloads;

    const handleDownload = async (item: DownloadItem) => {
        try {
            const isSupabaseStorage = item.originalUrl.includes('supabase.co/storage');

            if (isSupabaseStorage) {
                const url = new URL(item.originalUrl);
                const pathParts = url.pathname.split('/');
                const objectIndex = pathParts.indexOf('object');

                if (objectIndex === -1) {
                    throw new Error('Invalid storage URL format');
                }

                const bucketName = pathParts[objectIndex + 2];
                const filePath = pathParts.slice(objectIndex + 3).join('/');

                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .createSignedUrl(filePath, 60);

                if (error) {
                    console.error('Signed URL error:', error);
                    window.open(item.originalUrl, '_blank');
                    return;
                }

                const response = await fetch(data.signedUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = item.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            } else {
                try {
                    const response = await fetch(item.originalUrl);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = item.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                } catch (fetchError) {
                    console.warn('CORS prevented download, opening in new tab:', fetchError);
                    window.open(item.originalUrl, '_blank');
                }
            }
        } catch (error) {
            console.error('Download error:', error);
            window.open(item.originalUrl, '_blank');
        }
    };

    const handleBatchDownload = async () => {
        const itemsToDownload = filteredDownloads.filter(item => selectedItems.has(item.id));
        if (itemsToDownload.length === 0) return;

        setDownloading(true);
        setDownloadProgress({ current: 0, total: itemsToDownload.length });

        for (let i = 0; i < itemsToDownload.length; i++) {
            setDownloadProgress({ current: i + 1, total: itemsToDownload.length });
            await handleDownload(itemsToDownload[i]);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setDownloading(false);
        setDownloadProgress({ current: 0, total: 0 });
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === filteredDownloads.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredDownloads.map(item => item.id)));
        }
    };

    const openModal = (index: number) => {
        setCurrentIndex(index);
        setModalOpen(true);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredDownloads.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < filteredDownloads.length - 1 ? prev + 1 : 0));
    };

    const currentItem = filteredDownloads[currentIndex];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Download Center</h1>
                    {orderFilter && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Showing files for order: <span className="font-bold text-electric">#{orderFilter}</span></span>
                            <Link to="/portal/downloads" className="text-xs bg-gray-200 dark:bg-white/10 px-2 py-1 rounded-full hover:bg-gray-300 dark:hover:bg-white/20 transition-colors flex items-center gap-1">
                                Clear Filter <X className="w-3 h-3" />
                            </Link>
                        </div>
                    )}
                </div>

                {filteredDownloads.length > 0 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm font-medium"
                        >
                            {selectedItems.size === filteredDownloads.length ? (
                                <><CheckSquare className="w-4 h-4" /> Deselect All</>
                            ) : (
                                <><Square className="w-4 h-4" /> Select All</>
                            )}
                        </button>

                        {selectedItems.size > 0 && (
                            <button
                                onClick={handleBatchDownload}
                                disabled={downloading}
                                className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {downloading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Downloading {downloadProgress.current}/{downloadProgress.total}
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Download Selected ({selectedItems.size})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    <strong>Note:</strong> Please download and back up your files immediately.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : filteredDownloads.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDownloads.map((item, index) => (
                            <div key={item.id} className="bg-white dark:bg-charcoal p-4 rounded-xl border border-gray-200 dark:border-white/5 flex gap-4 hover:border-electric/50 transition-colors group">
                                <div className="flex items-center">
                                    <button
                                        onClick={() => toggleSelection(item.id)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                                    >
                                        {selectedItems.has(item.id) ? (
                                            <CheckSquare className="w-5 h-5 text-electric" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>

                                <div
                                    onClick={() => openModal(index)}
                                    className="w-20 h-20 bg-gray-100 dark:bg-black rounded-lg overflow-hidden flex-shrink-0 relative cursor-pointer hover:ring-2 hover:ring-electric transition-all"
                                >
                                    <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.format === 'MP4' ? <FileVideo className="w-8 h-8 text-white" /> : <FileImage className="w-8 h-8 text-white" />}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1" title={item.fileName}>{item.fileName}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {item.format} • Order #{item.orderId}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-1 text-xs text-green-500 font-medium">
                                            <Clock className="w-3 h-3" />
                                            Ready
                                        </div>

                                        <button
                                            onClick={() => handleDownload(item)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-electric hover:bg-electric/90 text-white rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <Download className="w-3 h-3" />
                                            Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {!orderFilter && totalCount > itemsPerPage && (
                        <div className="flex items-center justify-center gap-4 mt-8">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)} ({totalCount} total items)
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20">
                    <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Downloads Available</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">You don't have any files to download yet.</p>
                    <Link to="/gallery" className="inline-flex items-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors">
                        Browse Gallery
                    </Link>
                </div>
            )}

            {/* Full-Size Modal */}
            <AnimatePresence>
                {modalOpen && currentItem && (
                    <React.Fragment>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setModalOpen(false)}
                            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100]"
                        />
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative max-w-7xl w-full max-h-[90vh] flex flex-col"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4 px-4">
                                    <div className="text-white">
                                        <h3 className="font-bold text-lg">{currentItem.fileName}</h3>
                                        <p className="text-sm text-gray-300">
                                            {currentIndex + 1} of {filteredDownloads.length}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDownload(currentItem)}
                                            className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download
                                        </button>
                                        <button
                                            onClick={() => setModalOpen(false)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Image/Video Container */}
                                <div className="relative flex-1 flex items-center justify-center min-h-[400px]">
                                    {loadingModalImage ? (
                                        <Loader2 className="w-12 h-12 animate-spin text-white" />
                                    ) : currentItem.format === 'MP4' ? (
                                        <video
                                            src={modalImageUrl}
                                            controls
                                            className="max-w-full max-h-[calc(90vh-120px)] rounded-lg shadow-2xl"
                                        />
                                    ) : (
                                        <img
                                            src={modalImageUrl}
                                            alt={currentItem.fileName}
                                            onError={(e) => {
                                                // Fallback to thumbnail if original fails
                                                e.currentTarget.src = currentItem.thumbnailUrl;
                                            }}
                                            className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded-lg shadow-2xl"
                                        />
                                    )}

                                    {/* Navigation Buttons */}
                                    {filteredDownloads.length > 1 && !loadingModalImage && (
                                        <>
                                            <button
                                                onClick={handlePrevious}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                                            >
                                                <ChevronLeft className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={handleNext}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors backdrop-blur-sm"
                                            >
                                                <ChevronRight className="w-6 h-6" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </React.Fragment>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Downloads;