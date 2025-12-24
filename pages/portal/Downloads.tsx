import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, FileImage, FileVideo, Clock, X, Loader2 } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { DownloadItem } from '../../types';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

const Downloads: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const orderFilter = searchParams.get('order');
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchDownloads();
        }
    }, [user]);

    const fetchDownloads = async () => {
        try {
            // Join order_items -> orders -> gallery_items
            // Supabase postgrest syntax for nested joins can be tricky.
            // We fetch order_items where the parent order belongs to the user.
            const { data, error } = await supabase
                .from('order_items')
                .select(`
                    id,
                    price,
                    orders!inner (
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
                .eq('orders.client_id', user!.id);

            if (error) throw error;

            if (data) {
                const items: DownloadItem[] = data.map((row: any) => ({
                    id: row.id,
                    fileName: row.gallery_items.title + (row.gallery_items.type === 'video' ? '.mp4' : '.jpg'),
                    fileSize: 'Unknown', // Not stored in DB currently
                    format: row.gallery_items.type === 'video' ? 'MP4' : 'JPG',
                    thumbnailUrl: row.gallery_items.watermarked_url,
                    originalUrl: row.gallery_items.original_url,
                    orderId: row.orders.order_number,
                    orderDate: new Date(row.orders.created_at).toISOString().split('T')[0],
                    downloadsRemaining: 999 // Unlimited for now
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
            // Check if this is a Supabase Storage URL
            const isSupabaseStorage = item.originalUrl.includes('supabase.co/storage');

            if (isSupabaseStorage) {
                // Handle Supabase Storage URLs with signed URLs
                const url = new URL(item.originalUrl);
                const pathParts = url.pathname.split('/');

                // Find 'object' in path and get bucket name
                const objectIndex = pathParts.indexOf('object');
                if (objectIndex === -1) {
                    throw new Error('Invalid storage URL format');
                }

                // Get bucket name and file path
                const bucketName = pathParts[objectIndex + 2];
                const filePath = pathParts.slice(objectIndex + 3).join('/');

                // Generate signed URL (valid for 60 seconds)
                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .createSignedUrl(filePath, 60);

                if (error) {
                    console.error('Signed URL error:', error);
                    // Fallback to direct download
                    window.open(item.originalUrl, '_blank');
                    return;
                }

                // Fetch the file as a blob and trigger download
                const response = await fetch(data.signedUrl);
                const blob = await response.blob();

                // Create blob URL and trigger download
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = item.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Clean up blob URL
                URL.revokeObjectURL(blobUrl);
            } else {
                // Handle external URLs (like picsum.photos)
                // Try to fetch and download, fallback to opening if CORS fails
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
            // Fallback: just open the URL
            window.open(item.originalUrl, '_blank');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDownloads.map(item => (
                        <div key={item.id} className="bg-white dark:bg-charcoal p-4 rounded-xl border border-gray-200 dark:border-white/5 flex gap-4 hover:border-electric/50 transition-colors group">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                                <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
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
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-electric hover:text-white text-gray-600 dark:text-gray-300 transition-colors"
                                        title={`Download ${item.fileName}`}
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-gray-500 dark:text-gray-400">No download files found.</p>
                </div>
            )}
        </div>
    );
};

export default Downloads;