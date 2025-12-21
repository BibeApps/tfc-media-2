import React, { useState, useEffect } from 'react';
import { Plus, Upload, Sparkles, X, Check, Loader2, ChevronRight, Image as ImageIcon, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventCategory, Event, Session, GalleryItem } from '../../types';
import { supabase } from '../../supabaseClient';

interface UploadFile {
    id: string;
    file: File;
    preview: string;
    title: string;
    description: string;
    price: number;
    tags: string[];
    type: 'photo' | 'video';
    status: 'pending' | 'analyzing' | 'uploading' | 'success' | 'error';
    error?: string;
}

const GalleryManager: React.FC = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [categories, setCategories] = useState<EventCategory[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);

    // Selected IDs
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState('');

    // New item forms
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newSessionName, setNewSessionName] = useState('');
    const [newSessionDate, setNewSessionDate] = useState('');

    // Upload
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
    const [defaultPhotoPrice, setDefaultPhotoPrice] = useState(25);
    const [defaultVideoPrice, setDefaultVideoPrice] = useState(50);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCategoryId) {
            fetchEvents(selectedCategoryId);
        }
    }, [selectedCategoryId]);

    useEffect(() => {
        if (selectedEventId) {
            fetchSessions(selectedEventId);
        }
    }, [selectedEventId]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('event_categories')
                .select('*')
                .eq('archived', false)
                .order('name');
            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchEvents = async (categoryId: string) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('category_id', categoryId)
                .eq('archived', false)
                .order('date', { ascending: false });
            if (error) throw error;
            setEvents(data || []);
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
                .eq('archived', false)
                .order('date', { ascending: false });
            if (error) throw error;
            setSessions(data || []);
        } catch (err) {
            console.error('Error fetching sessions:', err);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const { data, error } = await supabase
                .from('event_categories')
                .insert([{
                    name: newCategoryName,
                    slug: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
                    description: '',
                    thumbnail: '',
                }])
                .select()
                .single();

            if (error) throw error;
            setCategories([...categories, data]);
            setSelectedCategoryId(data.id);
            setNewCategoryName('');
        } catch (err) {
            console.error('Error creating category:', err);
        }
    };

    const handleCreateEvent = async () => {
        if (!newEventName.trim() || !newEventDate || !selectedCategoryId) return;
        try {
            const { data, error } = await supabase
                .from('events')
                .insert([{
                    category_id: selectedCategoryId,
                    name: newEventName,
                    slug: newEventName.toLowerCase().replace(/\s+/g, '-'),
                    date: newEventDate,
                    thumbnail: '',
                }])
                .select()
                .single();

            if (error) throw error;
            setEvents([...events, data]);
            setSelectedEventId(data.id);
            setNewEventName('');
            setNewEventDate('');
        } catch (err) {
            console.error('Error creating event:', err);
        }
    };

    const handleCreateSession = async () => {
        if (!newSessionName.trim() || !newSessionDate || !selectedEventId) return;
        try {
            const { data, error } = await supabase
                .from('sessions')
                .insert([{
                    event_id: selectedEventId,
                    name: newSessionName,
                    date: newSessionDate,
                    thumbnail: '',
                }])
                .select()
                .single();

            if (error) throw error;
            setSessions([...sessions, data]);
            setSelectedSessionId(data.id);
            setNewSessionName('');
            setNewSessionDate('');
        } catch (err) {
            console.error('Error creating session:', err);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const files = Array.from(e.target.files) as File[];
        const newFiles: UploadFile[] = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: '',
            price: file.type.startsWith('video/') ? defaultVideoPrice : defaultPhotoPrice,
            tags: [],
            type: file.type.startsWith('video/') ? 'video' : 'photo',
            status: 'pending',
        }));

        setUploadFiles([...uploadFiles, ...newFiles]);
    };

    const handleRemoveFile = (id: string) => {
        setUploadFiles(uploadFiles.filter(f => f.id !== id));
    };

    const handleUpdateFile = (id: string, updates: Partial<UploadFile>) => {
        setUploadFiles(uploadFiles.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handlePublish = async () => {
        if (!selectedSessionId) return;

        setLoading(true);

        for (const file of uploadFiles) {
            try {
                handleUpdateFile(file.id, { status: 'uploading' });

                // Upload to Supabase Storage
                const fileExt = file.file.name.split('.').pop();
                const fileName = `${selectedSessionId}/${Date.now()}_${file.id}.${fileExt}`;

                const { data: storageData, error: storageError } = await supabase.storage
                    .from('gallery')
                    .upload(fileName, file.file);

                if (storageError) throw storageError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('gallery')
                    .getPublicUrl(fileName);

                // Insert into gallery_items
                const { error: dbError } = await supabase
                    .from('gallery_items')
                    .insert([{
                        session_id: selectedSessionId,
                        title: file.title,
                        description: file.description,
                        type: file.type,
                        watermarked_url: publicUrl,
                        original_url: publicUrl,
                        price: file.price,
                        tags: file.tags,
                    }]);

                if (dbError) throw dbError;

                handleUpdateFile(file.id, { status: 'success' });
            } catch (err: any) {
                console.error('Upload error:', err);
                handleUpdateFile(file.id, { status: 'error', error: err.message });
            }
        }

        setLoading(false);
        alert('Media published successfully!');
        setUploadFiles([]);
        setStep(1);
    };

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const selectedEvent = events.find(e => e.id === selectedEventId);
    const selectedSession = sessions.find(s => s.id === selectedSessionId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery Upload Manager</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-electric text-white' : 'bg-gray-200 dark:bg-charcoal'}`}>
                        1. Category
                    </span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-electric text-white' : 'bg-gray-200 dark:bg-charcoal'}`}>
                        2. Event
                    </span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-electric text-white' : 'bg-gray-200 dark:bg-charcoal'}`}>
                        3. Session
                    </span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={`px-3 py-1 rounded-full ${step >= 4 ? 'bg-electric text-white' : 'bg-gray-200 dark:bg-charcoal'}`}>
                        4. Upload
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Step 1: Category */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-electric text-white flex items-center justify-center text-sm">1</span>
                        Event Category
                    </h3>

                    <select
                        value={selectedCategoryId}
                        onChange={(e) => {
                            setSelectedCategoryId(e.target.value);
                            setSelectedEventId('');
                            setSelectedSessionId('');
                            if (e.target.value) setStep(2);
                        }}
                        className="w-full mb-3 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    >
                        <option value="">Select Category...</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                        <button
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim()}
                            className="px-3 py-2 bg-electric hover:bg-electric/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Step 2: Event */}
                <div className={`bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 ${!selectedCategoryId ? 'opacity-50' : ''}`}>
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full ${step >= 2 ? 'bg-electric' : 'bg-gray-300'} text-white flex items-center justify-center text-sm`}>2</span>
                        Event
                    </h3>

                    <select
                        value={selectedEventId}
                        onChange={(e) => {
                            setSelectedEventId(e.target.value);
                            setSelectedSessionId('');
                            if (e.target.value) setStep(3);
                        }}
                        disabled={!selectedCategoryId}
                        className="w-full mb-3 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric disabled:opacity-50"
                    >
                        <option value="">Select Event...</option>
                        {events.map(evt => (
                            <option key={evt.id} value={evt.id}>{evt.name} ({evt.date})</option>
                        ))}
                    </select>

                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Event name"
                            value={newEventName}
                            onChange={(e) => setNewEventName(e.target.value)}
                            disabled={!selectedCategoryId}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric disabled:opacity-50"
                        />
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={newEventDate}
                                onChange={(e) => setNewEventDate(e.target.value)}
                                disabled={!selectedCategoryId}
                                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric disabled:opacity-50"
                            />
                            <button
                                onClick={handleCreateEvent}
                                disabled={!selectedCategoryId || !newEventName.trim() || !newEventDate}
                                className="px-3 py-2 bg-electric hover:bg-electric/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Step 3: Session */}
                <div className={`bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 ${!selectedEventId ? 'opacity-50' : ''}`}>
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full ${step >= 3 ? 'bg-electric' : 'bg-gray-300'} text-white flex items-center justify-center text-sm`}>3</span>
                        Session
                    </h3>

                    <select
                        value={selectedSessionId}
                        onChange={(e) => {
                            setSelectedSessionId(e.target.value);
                            if (e.target.value) setStep(4);
                        }}
                        disabled={!selectedEventId}
                        className="w-full mb-3 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric disabled:opacity-50"
                    >
                        <option value="">Select Session...</option>
                        {sessions.map(sess => (
                            <option key={sess.id} value={sess.id}>{sess.name} ({sess.date})</option>
                        ))}
                    </select>

                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Session name (e.g., Ceremony)"
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            disabled={!selectedEventId}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric disabled:opacity-50"
                        />
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={newSessionDate}
                                onChange={(e) => setNewSessionDate(e.target.value)}
                                disabled={!selectedEventId}
                                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric disabled:opacity-50"
                            />
                            <button
                                onClick={handleCreateSession}
                                disabled={!selectedEventId || !newSessionName.trim() || !newSessionDate}
                                className="px-3 py-2 bg-electric hover:bg-electric/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 4: Upload */}
            {selectedSessionId && (
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-electric text-white flex items-center justify-center text-sm">4</span>
                            Upload Media
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <label className="text-gray-600 dark:text-gray-400">Photo $</label>
                                <input
                                    type="number"
                                    value={defaultPhotoPrice}
                                    onChange={(e) => setDefaultPhotoPrice(Number(e.target.value))}
                                    className="w-20 px-2 py-1 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <label className="text-gray-600 dark:text-gray-400">Video $</label>
                                <input
                                    type="number"
                                    value={defaultVideoPrice}
                                    onChange={(e) => setDefaultVideoPrice(Number(e.target.value))}
                                    className="w-20 px-2 py-1 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Uploading to: <span className="font-bold text-electric">{selectedCategory?.name}</span> → <span className="font-bold text-electric">{selectedEvent?.name}</span> → <span className="font-bold text-electric">{selectedSession?.name}</span>
                        </p>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl p-8 text-center mb-6 hover:border-electric/50 transition-colors">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Drop files here or click to browse</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="inline-block px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold cursor-pointer transition-colors"
                        >
                            Select Files
                        </label>
                    </div>

                    {uploadFiles.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white">Files ({uploadFiles.length})</h4>
                                <button
                                    onClick={handlePublish}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                    Publish All to Gallery
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {uploadFiles.map(file => (
                                    <div key={file.id} className="bg-gray-50 dark:bg-obsidian rounded-lg p-4 border border-gray-200 dark:border-white/10">
                                        <div className="relative aspect-video mb-3 rounded overflow-hidden bg-gray-200 dark:bg-charcoal">
                                            {file.type === 'photo' ? (
                                                <img src={file.preview} alt={file.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <video src={file.preview} className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute top-2 right-2">
                                                <button
                                                    onClick={() => handleRemoveFile(file.id)}
                                                    className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-2 left-2">
                                                <span className="px-2 py-1 bg-black/60 text-white text-xs rounded flex items-center gap-1">
                                                    {file.type === 'photo' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                                    {file.type}
                                                </span>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={file.title}
                                            onChange={(e) => handleUpdateFile(file.id, { title: e.target.value })}
                                            placeholder="Title"
                                            className="w-full mb-2 px-2 py-1 text-sm bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded"
                                        />
                                        <input
                                            type="number"
                                            value={file.price}
                                            onChange={(e) => handleUpdateFile(file.id, { price: Number(e.target.value) })}
                                            className="w-full px-2 py-1 text-sm bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded"
                                        />
                                        {file.status === 'success' && (
                                            <div className="mt-2 flex items-center gap-1 text-green-500 text-xs">
                                                <Check className="w-3 h-3" />
                                                Uploaded
                                            </div>
                                        )}
                                        {file.status === 'error' && (
                                            <div className="mt-2 text-red-500 text-xs">{file.error}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GalleryManager;
