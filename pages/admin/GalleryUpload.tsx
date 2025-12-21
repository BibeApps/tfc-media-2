import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Upload, X, Check, Loader2, ArrowLeft, DollarSign, Tag, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryItem, Session } from '../../types';
import { supabase } from '../../supabaseClient';

interface UploadFile {
    id: string;
    file: File;
    preview: string;
    title: string;
    description: string;
    price: number;
    tags: string[];
    uploading: boolean;
    uploaded: boolean;
    error?: string;
}

const GalleryUpload: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('sessionId');

    const [session, setSession] = useState<Session | null>(null);
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [defaultPrice, setDefaultPrice] = useState(25);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error) throw error;
            setSession(data);
        } catch (err) {
            console.error('Error fetching session:', err);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files) as File[];
        handleFiles(droppedFiles);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files) as File[];
            handleFiles(selectedFiles);
        }
    };

    const handleFiles = (newFiles: File[]) => {
        const uploadFiles: UploadFile[] = newFiles
            .filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
            .map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                preview: URL.createObjectURL(file),
                title: file.name.replace(/\.[^/.]+$/, ''),
                description: '',
                price: defaultPrice,
                tags: [],
                uploading: false,
                uploaded: false,
            }));

        setFiles(prev => [...prev, ...uploadFiles]);
    };

    const removeFile = (id: string) => {
        setFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file) URL.revokeObjectURL(file.preview);
            return prev.filter(f => f.id !== id);
        });
    };

    const updateFile = (id: string, updates: Partial<UploadFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const uploadFile = async (uploadFile: UploadFile) => {
        updateFile(uploadFile.id, { uploading: true, error: undefined });

        try {
            // Upload to Supabase Storage
            const fileExt = uploadFile.file.name.split('.').pop();
            const fileName = `${sessionId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

            const { data: storageData, error: storageError } = await supabase.storage
                .from('gallery')
                .upload(fileName, uploadFile.file);

            if (storageError) throw storageError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(fileName);

            // Create gallery item record
            const { error: dbError } = await supabase
                .from('gallery_items')
                .insert([{
                    session_id: sessionId,
                    title: uploadFile.title,
                    description: uploadFile.description,
                    type: uploadFile.file.type.startsWith('image/') ? 'photo' : 'video',
                    watermarked_url: publicUrl,
                    original_url: publicUrl, // In production, you'd upload a watermarked version separately
                    price: uploadFile.price,
                    tags: uploadFile.tags,
                }]);

            if (dbError) throw dbError;

            updateFile(uploadFile.id, { uploading: false, uploaded: true });
        } catch (err: any) {
            console.error('Upload error:', err);
            updateFile(uploadFile.id, {
                uploading: false,
                error: err.message || 'Upload failed'
            });
        }
    };

    const uploadAll = async () => {
        const pendingFiles = files.filter(f => !f.uploaded && !f.uploading);
        for (const file of pendingFiles) {
            await uploadFile(file);
        }
    };

    const applyPriceToAll = () => {
        setFiles(prev => prev.map(f => ({ ...f, price: defaultPrice })));
    };

    if (!sessionId) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No session selected</p>
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
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Upload Media
                        </h1>
                        {session && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {session.name}
                            </p>
                        )}
                    </div>
                </div>
                {files.length > 0 && (
                    <button
                        onClick={uploadAll}
                        disabled={files.every(f => f.uploaded)}
                        className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                    >
                        <Upload className="w-5 h-5" />
                        Upload All ({files.filter(f => !f.uploaded).length})
                    </button>
                )}
            </div>

            {/* Pricing Controls */}
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Default Price
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                value={defaultPrice}
                                onChange={(e) => setDefaultPrice(Number(e.target.value))}
                                min="0"
                                step="0.01"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            />
                        </div>
                    </div>
                    <button
                        onClick={applyPriceToAll}
                        className="mt-7 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors"
                    >
                        Apply to All
                    </button>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive
                    ? 'border-electric bg-electric/5'
                    : 'border-gray-300 dark:border-white/10 hover:border-electric/50'
                    }`}
            >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Drop files here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Supports images and videos
                </p>
                <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className="inline-block px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold cursor-pointer transition-colors"
                >
                    Browse Files
                </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Files ({files.length})
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {files.map((file) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-4"
                            >
                                <div className="flex gap-4">
                                    {/* Preview */}
                                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-obsidian">
                                        {file.file.type.startsWith('image/') ? (
                                            <img src={file.preview} alt={file.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={file.preview} className="w-full h-full object-cover" />
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={file.title}
                                                    onChange={(e) => updateFile(file.id, { title: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Price</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="number"
                                                        value={file.price}
                                                        onChange={(e) => updateFile(file.id, { price: Number(e.target.value) })}
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                                            <textarea
                                                value={file.description}
                                                onChange={(e) => updateFile(file.id, { description: e.target.value })}
                                                rows={2}
                                                className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                            />
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex flex-col items-end gap-2">
                                        {file.uploaded ? (
                                            <div className="flex items-center gap-2 text-green-500">
                                                <Check className="w-5 h-5" />
                                                <span className="text-sm font-bold">Uploaded</span>
                                            </div>
                                        ) : file.uploading ? (
                                            <div className="flex items-center gap-2 text-electric">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span className="text-sm font-bold">Uploading...</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => uploadFile(file)}
                                                className="px-3 py-1.5 bg-electric hover:bg-electric/90 text-white rounded-lg text-sm font-bold transition-colors"
                                            >
                                                Upload
                                            </button>
                                        )}
                                        {!file.uploaded && !file.uploading && (
                                            <button
                                                onClick={() => removeFile(file.id)}
                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4 text-gray-500" />
                                            </button>
                                        )}
                                        {file.error && (
                                            <p className="text-xs text-red-500">{file.error}</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GalleryUpload;
