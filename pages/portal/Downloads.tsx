import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, FileImage, FileVideo, Clock, X, Loader2, ChevronLeft, ChevronRight, CheckSquare, Square, Folder, Trash2, Mail } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
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

    // Folder View State
    const [viewMode, setViewMode] = useState<'folders' | 'files'>('folders');
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedEventName, setSelectedEventName] = useState<string>('');
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 50;

    // Download packages state
    const [downloadPackages, setDownloadPackages] = useState<any[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(false);

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
        const currentItemList = filteredDownloads; // Use current filtered list
        if (modalOpen && currentItemList[currentIndex]) {
            loadModalImage(currentItemList[currentIndex]);
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
            // const from = (currentPage - 1) * itemsPerPage;
            // const to = from + itemsPerPage - 1;
            // Note: Pagination needs to be handled carefully with folder grouping.
            // For now, we'll fetch ALL items to group them correctly, then paginate inside folders if needed.

            console.log('📥 [DOWNLOADS] Fetching downloads for user:', user?.id);

            // Fetch orders with nested items in one go
            const { data: ordersWithItems, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    created_at,
                    status,
                    order_items (
                        id,
                        price,
                        gallery_items (
                            id,
                            title,
                            type,
                            watermarked_url,
                            original_url,
                            session_id,
                            sessions (
                                name
                            )
                        )
                    )
                `)
                .eq('client_id', user!.id)
                .eq('status', 'paid')
                .order('created_at', { ascending: false });

            console.log('📦 [DOWNLOADS] Orders query result:', {
                count: ordersWithItems?.length || 0,
                error
            });

            if (error) {
                console.error('❌ [DOWNLOADS] Error fetching data:', error);
                throw error;
            }

            if (ordersWithItems) {
                // Flatten the structure: Orders -> OrderItems -> GalleryItems
                const allItems: any[] = [];

                ordersWithItems.forEach((order: any) => {
                    if (order.order_items && order.order_items.length > 0) {
                        order.order_items.forEach((item: any) => {
                            if (item.gallery_items) {
                                allItems.push({
                                    orderId: order.order_number,
                                    orderDate: formatDate(order.created_at),
                                    ...item,
                                    gallery_items: item.gallery_items
                                });
                            }
                        });
                    }
                });

                console.log('🎨 [DOWNLOADS] Total extracted items:', allItems.length);

                const uniqueItems = allItems; // Keeping deduplication logic simple
                setTotalCount(uniqueItems.length);

                const items: DownloadItem[] = uniqueItems.map((item: any) => ({
                    id: item.gallery_items.id, // Use gallery ID for download tracking
                    fileName: item.gallery_items.title,
                    fileSize: 'Unknown',
                    format: item.gallery_items.type === 'video' ? 'MP4' : 'JPG',
                    thumbnailUrl: item.gallery_items.watermarked_url,
                    originalUrl: item.gallery_items.original_url,
                    orderId: item.orderId,
                    orderDate: item.orderDate,
                    downloadsRemaining: 999,
                    eventName: item.gallery_items?.sessions?.name || 'Uncategorized',
                    sessionId: item.gallery_items?.session_id
                }));

                console.log('✅ [DOWNLOADS] Final items:', items.length);
                setDownloads(items);
            }
        } catch (error) {
            console.error('❌ [DOWNLOADS] Error in fetchDownloads:', error);
        } finally {
            setLoading(false);
        }

        // Fetch download packages
        fetchDownloadPackages();
    };

    const fetchDownloadPackages = async () => {
        if (!user) return;

        setLoadingPackages(true);
        try {
            const { data, error } = await supabase
                .from('download_packages')
                .select(`
                    *,
                    orders!inner (
                        id,
                        order_number,
                        client_id,
                        order_items (
                            gallery_items (
                                sessions (
                                    name
                                )
                            )
                        )
                    )
                `)
                .eq('orders.client_id', user.id)
                .eq('status', 'ready')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching download packages:', error);
            } else {
                setDownloadPackages(data || []);
            }
        } catch (error) {
            console.error('Error in fetchDownloadPackages:', error);
        } finally {
            setLoadingPackages(false);
        }
    };

    // Calculate hours until package expiry
    const getHoursUntilExpiry = (expiryDate: string) => {
        const hours = Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60));
        return hours;
    };

    // Delete download package
    const handleDeletePackage = async (packageId: string) => {
        try {
            const { error } = await supabase
                .from('download_packages')
                .delete()
                .eq('id', packageId);

            if (error) throw error;

            toast.success('Package deleted successfully');
            fetchDownloadPackages();
        } catch (error: any) {
            console.error('Error deleting package:', error);
            toast.error('Failed to delete package');
        }
    };

    // Resend email for download package
    const handleResendEmail = async (pkg: any) => {
        try {
            const { data, error } = await supabase.functions.invoke('resend-download-email', {
                body: {
                    package_id: pkg.id,
                    zip_url: pkg.zip_file_url,
                    expires_at: pkg.expires_at,
                    item_count: pkg.item_count,
                    file_size: pkg.zip_file_size
                }
            });

            if (error) throw error;
            toast.success('Email sent successfully!');
        } catch (error: any) {
            console.error('Error resending email:', error);
            toast.error('Failed to send email');
        }
    };

    // Download bulk package with signed URL (using same approach as individual downloads)
    const handleDownloadPackage = async (zipFileUrl: string, eventName: string) => {
        try {
            // Parse URL to extract bucket and file path (same as individual download logic)
            const url = new URL(zipFileUrl);
            const pathParts = url.pathname.split('/');
            const objectIndex = pathParts.indexOf('object');

            if (objectIndex === -1) {
                throw new Error('Invalid storage URL format');
            }

            const bucketName = pathParts[objectIndex + 2]; // Should be 'media'
            const filePath = pathParts.slice(objectIndex + 3).join('/'); // Should be 'download-packages/filename.zip'

            // Generate signed URL
            const { data, error } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (error) throw error;

            // Download using signed URL
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = `${eventName}-download.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error: any) {
            console.error('Error downloading package:', error);
            toast.error('Failed to download package');
        }
    };

    // Filter download packages based on order filter
    const filteredDownloadPackages = React.useMemo(() => {
        if (!orderFilter) return downloadPackages;

        return downloadPackages.filter(pkg => {
            // Robustly get order object (handle array or object)
            const order = Array.isArray(pkg.orders) ? pkg.orders[0] : pkg.orders;

            if (!order?.order_number) return false;

            // Normalize for reliable comparison
            const pkgOrder = String(order.order_number).trim();
            const filterOrder = String(orderFilter).trim().replace(/^#/, '');

            return pkgOrder === filterOrder;
        });
    }, [downloadPackages, orderFilter]);

    // Filter Logic for individual downloads
    const filteredDownloads = React.useMemo(() => {
        let results = downloads;

        if (orderFilter) {
            results = results.filter(item => item.orderId === orderFilter);
        }

        if (selectedFolder) {
            results = results.filter(item => item.eventName === selectedFolder);
        }

        return results;
    }, [downloads, orderFilter, selectedFolder]);


    // Group items by Event Name for Folder View
    const groupedFolders = React.useMemo(() => {
        const folders = new Map<string, { count: number; thumbnail: string }>();

        // If order filter is active, we validly group items from that order into folders
        // If NO filter, we group ALL items
        const sourceItems = orderFilter ? downloads.filter(item => item.orderId === orderFilter) : downloads;

        sourceItems.forEach(item => {
            const eventName = item.eventName || 'Uncategorized';
            if (!folders.has(eventName)) {
                folders.set(eventName, {
                    count: 0,
                    thumbnail: item.thumbnailUrl
                });
            }
            const folder = folders.get(eventName)!;
            folder.count++;
            // Could optimize thumbnail selection (avoid video?)
        });
        return Array.from(folders.entries()).map(([name, data]) => ({
            name,
            ...data
        }));
    }, [downloads, orderFilter]);

    const handleFolderClick = (folderName: string) => {
        setSelectedFolder(folderName);
        setSelectedEventName(folderName);
        setViewMode('files');
        setCurrentPage(1); // Reset pagination for folder view
    };

    const handleBackToFolders = () => {
        setSelectedFolder(null);
        setSelectedEventName('');
        setViewMode('folders');
        setCurrentPage(1);
    };

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

                {/* Folder Navigation / Breadcrumbs */}
                {viewMode === 'files' && (
                    <div className="w-full flex items-center gap-2 mb-4 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                        <button
                            onClick={handleBackToFolders}
                            className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-electric dark:hover:text-electric transition-colors"
                        >
                            <Folder className="w-4 h-4" /> All Events
                        </button>
                        <span className="text-gray-300">/</span>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {selectedEventName}
                        </h2>
                    </div>
                )}

                {/* Download Packages - Zip Files Ready */}
                {filteredDownloadPackages.length > 0 && (
                    <div className="space-y-4 mb-6 w-full">
                        {filteredDownloadPackages.map((pkg) => {
                            const hoursLeft = getHoursUntilExpiry(pkg.expires_at);
                            // Robust access to order for event name
                            const order = Array.isArray(pkg.orders) ? pkg.orders[0] : pkg.orders;
                            const eventName = order?.order_items?.[0]?.gallery_items?.sessions?.name || 'Event';

                            return (
                                <motion.div
                                    key={pkg.id}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6"
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-blue-800 dark:text-blue-300 text-lg flex items-center gap-2">
                                                <span>📦</span> The {eventName} Download Ready
                                            </h3>
                                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                                {pkg.item_count} items • {pkg.zip_file_size ? (pkg.zip_file_size / 1024 / 1024).toFixed(1) + ' MB' : 'Calculating...'}
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                                Expires {new Date(pkg.expires_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit'
                                                })} ({hoursLeft} hours left)
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            {pkg.zip_file_url ? (
                                                <>
                                                    <button
                                                        onClick={() => handleDownloadPackage(pkg.zip_file_url, eventName)}
                                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap justify-center"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                        Download Zip
                                                    </button>
                                                    <button
                                                        onClick={() => handleResendEmail(pkg)}
                                                        className="px-4 py-3 bg-white dark:bg-charcoal border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap justify-center hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                                    >
                                                        <Mail className="w-5 h-5" />
                                                        Email Zip File
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePackage(pkg.id)}
                                                        className="px-4 py-3 bg-white dark:bg-charcoal border border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap justify-center hover:bg-red-50 dark:hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                        Delete
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg font-bold flex items-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Generating...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'files' && filteredDownloads.length > 0 && (
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

            {
                loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-electric" />
                    </div>
                ) : (
                    <>
                        {/* Conditional Rendering: Folders vs Files */}
                        {viewMode === 'folders' ? (
                            <div className="space-y-4">
                                {groupedFolders.map((folder) => (
                                    <motion.div
                                        key={folder.name}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6"
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-blue-800 dark:text-blue-300 text-lg flex items-center gap-2">
                                                    <span>📁</span> The {folder.name} Event
                                                </h3>
                                                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                                    {folder.count} {folder.count === 1 ? 'item' : 'items'} purchased
                                                </p>
                                                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                                    Available for individual download
                                                </p>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => handleFolderClick(folder.name)}
                                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap justify-center"
                                                >
                                                    <Folder className="w-5 h-5" />
                                                    View Files
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {groupedFolders.length === 0 && (
                                    <div className="col-span-full text-center py-12">
                                        <p className="text-gray-500">No downloads found yet.</p>
                                        <Link to="/gallery" className="text-electric hover:underline font-bold mt-2 inline-block">
                                            Browse Gallery
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Existing File Grid */
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
                                {filteredDownloads.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-gray-500">
                                        <p>No files in this folder.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )
            }

            {/* Pagination Controls - Only show in file view if needed (though we disabled it for now) */}

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
        </div >
    );
};

export default Downloads;