import React, { useState, useEffect } from 'react';
import { Upload, Wand2, X, Check, Loader2, ArrowRight, ArrowLeft, Image as ImageIcon, Video, DollarSign, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { PortalProject } from '../../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    uploadThumbnail,
    generateMediaDescription,
    uploadOriginalMedia,
    generateWatermarkedMedia,
    detectMediaType,
    getImageDimensions,
} from '../../utils/aiUtils';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface Category {
    id: string;
    name: string;
    thumbnail: string;
}

interface SubCategory {
    id: string;
    category_id: string;
    name: string;
    thumbnail: string;
    date: string;
}

interface Event {
    id: string;
    event_id: string;
    name: string;
    thumbnail: string;
    date: string;
}

interface MediaFile {
    file: File;
    id: string;
    name: string;
    type: 'photo' | 'video';
    price: number;
    description: string;
    preview: string;
    width?: number;
    height?: number;
    originalUrl?: string;
    watermarkedUrl?: string;
}

enum Step {
    SETUP = 1,
    PRICING = 2,
    UPLOAD = 3,
    EDIT = 4,
    REVIEW = 5,
    UPLOADING = 6,
    SUCCESS = 7,
}

const GalleryManagerNew: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<Step>(Step.SETUP);

    // Step 1: Setup
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [events, setEvents] = useState<Event[]>([]);

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newSubCategoryName, setNewSubCategoryName] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');

    const [categoryThumbnail, setCategoryThumbnail] = useState<File | null>(null);
    const [subCategoryThumbnail, setSubCategoryThumbnail] = useState<File | null>(null);
    const [eventThumbnail, setEventThumbnail] = useState<File | null>(null);

    const [categoryPreview, setCategoryPreview] = useState('');
    const [subCategoryPreview, setSubCategoryPreview] = useState('');
    const [eventPreview, setEventPreview] = useState('');

    const [generatingThumbnail, setGeneratingThumbnail] = useState<string | null>(null);

    // Confirmation tracking for sequential flow
    const [categoryConfirmed, setCategoryConfirmed] = useState(false);
    const [subCategoryConfirmed, setSubCategoryConfirmed] = useState(false);
    const [eventConfirmed, setEventConfirmed] = useState(false);

    // Project linking for events
    const [projects, setProjects] = useState<PortalProject[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);

    // Step 2: Pricing
    const [defaultImagePrice, setDefaultImagePrice] = useState(25);
    const [defaultVideoPrice, setDefaultVideoPrice] = useState(50);

    // Step 3-4: Media
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [processingFiles, setProcessingFiles] = useState(false);

    // Step 6: Upload Progress
    const [uploadProgress, setUploadProgress] = useState('');
    const [uploadedCount, setUploadedCount] = useState(0);

    useEffect(() => {
        fetchCategories();
        fetchProjects();
    }, []);

    const fetchCategories = async () => {
        const { data } = await supabase
            .from('event_categories')
            .select('*')
            .eq('archived', false)
            .order('name');
        setCategories(data || []);
    };

    const fetchSubCategories = async (categoryId: string) => {
        const { data } = await supabase
            .from('events')
            .select('*')
            .eq('category_id', categoryId)
            .eq('archived', false)
            .is('client_id', null)
            .order('name');
        setSubCategories(data || []);
    };

    const fetchEvents = async (subCategoryId: string) => {
        const { data } = await supabase
            .from('sessions')
            .select('*')
            .eq('event_id', subCategoryId)
            .eq('archived', false)
            .order('date', { ascending: false });
        setEvents(data || []);
    };

    const { data, error } = await supabase
        .from('portal_projects')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
    if (error) throw error;

    const mappedProjects = (data || []).map((p: any) => ({
        id: p.id,
        project_id: p.project_id,
        transaction_id: p.transaction_id,
        client_id: p.client_id,
        name: p.name,
        status: p.status,
        clientName: p.client_name,
        clientEmail: p.client_email,
        serviceType: p.service_type,
        eventDate: p.event_date,
        coverImage: p.cover_image,
        progress: p.progress,
        currentStep: p.current_step,
        totalSteps: p.total_steps,
        manager: p.manager,
        created_at: p.created_at,
    }));

    console.log('Loaded projects:', mappedProjects);
    setProjects(mappedProjects);
} catch (err) {
    console.error('Error fetching projects:', err);
}
    };

const handleCategoryChange = async (categoryId: string) => {
    if (categoryId === 'new') {
        setSelectedCategory(null);
        setCategoryPreview('');
        setCategoryConfirmed(false);
        setSubCategoryConfirmed(false);
        setEventConfirmed(false);
        return;
    }

    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category || null);
    setCategoryPreview(category?.thumbnail || '');
    setCategoryConfirmed(false); // Don't auto-confirm - allow updates

    if (category) {
        await fetchSubCategories(category.id);
    }

    // Reset downstream confirmations
    setSubCategoryConfirmed(false);
    setEventConfirmed(false);
};

const handleSubCategoryChange = async (subCategoryId: string) => {
    if (subCategoryId === 'new') {
        setSelectedSubCategory(null);
        setSubCategoryPreview('');
        setSubCategoryConfirmed(false);
        setEventConfirmed(false);
        return;
    }

    const subCategory = subCategories.find(sc => sc.id === subCategoryId);
    setSelectedSubCategory(subCategory || null);
    setSubCategoryPreview(subCategory?.thumbnail || '');
    setSubCategoryConfirmed(false); // Don't auto-confirm - allow updates

    if (subCategory) {
        await fetchEvents(subCategory.id);
    }

    // Reset downstream confirmations
    setEventConfirmed(false);
};

const handleEventChange = (eventId: string) => {
    if (eventId === 'new') {
        setSelectedEvent(null);
        setEventPreview('');
        setEventConfirmed(false);
        return;
    }

    const event = events.find(e => e.id === eventId);
    setSelectedEvent(event || null);
    setEventPreview(event?.thumbnail || '');
    setEventConfirmed(false); // Don't auto-confirm - allow updates
};

const handleConfirmCategory = async () => {
    if (!selectedCategory && !newCategoryName) {
        alert('Please select or enter a category name');
        return;
    }

    try {
        // If creating new category
        if (!selectedCategory && newCategoryName) {
            const { data, error } = await supabase
                .from('event_categories')
                .insert({
                    name: newCategoryName,
                    thumbnail: categoryPreview || null
                })
                .select()
                .single();

            if (error) throw error;

            setSelectedCategory(data);
            await fetchCategories();
            alert('Category created successfully!');
        }
        // If updating existing category with new thumbnail
        else if (selectedCategory && categoryThumbnail) {
            const { error } = await supabase
                .from('event_categories')
                .update({
                    thumbnail: categoryPreview
                })
                .eq('id', selectedCategory.id);

            if (error) throw error;

            await fetchCategories();
            alert('Category thumbnail updated successfully!');
        }

        setCategoryConfirmed(true);
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Failed to save category. Please try again.');
    }
};

const handleConfirmSubCategory = async () => {
    if (!selectedSubCategory && !newSubCategoryName) {
        alert('Please select or enter a sub-category name');
        return;
    }

    if (!selectedCategory) {
        alert('Please save category first');
        return;
    }

    try {
        // If creating new sub-category
        if (!selectedSubCategory && newSubCategoryName) {
            const { data, error } = await supabase
                .from('events')
                .insert({
                    name: newSubCategoryName,
                    category_id: selectedCategory.id,
                    thumbnail: subCategoryPreview || null
                })
                .select()
                .single();

            if (error) throw error;

            setSelectedSubCategory(data);
            await fetchSubCategories(selectedCategory.id);
            alert('Sub-Category created successfully!');
        }
        // If updating existing sub-category with new thumbnail
        else if (selectedSubCategory && subCategoryThumbnail) {
            const { error } = await supabase
                .from('events')
                .update({
                    thumbnail: subCategoryPreview
                })
                .eq('id', selectedSubCategory.id);

            if (error) throw error;

            await fetchSubCategories(selectedCategory.id);
            alert('Sub-Category thumbnail updated successfully!');
        }

        setSubCategoryConfirmed(true);
    } catch (error) {
        console.error('Error saving sub-category:', error);
        alert('Failed to save sub-category. Please try again.');
    }
};

const handleConfirmEvent = async () => {
    if (!selectedEvent && !newEventName) {
        alert('Please select or enter an event name');
        return;
    }

    if (!selectedSubCategory) {
        alert('Please save sub-category first');
        return;
    }

    try {
        const selectedProject = projects.find(p => p.id === selectedProjectId);

        // If creating new event
        if (!selectedEvent && newEventName) {
            const { data, error } = await supabase
                .from('sessions')
                .insert({
                    name: newEventName,
                    event_id: selectedSubCategory.id,
                    date: newEventDate || null,
                    thumbnail: eventPreview || null,
                    project_id: selectedProject?.project_id || null,
                    email: selectedProject?.clientEmail || null,
                })
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            setSelectedEvent(data);
            await fetchEvents(selectedSubCategory.id);
            alert('Event created successfully!');
        }
        // If updating existing event with new thumbnail
        else if (selectedEvent && eventThumbnail) {
            const { error } = await supabase
                .from('sessions')
                .update({
                    thumbnail: eventPreview,
                    date: newEventDate || selectedEvent.date
                })
                .eq('id', selectedEvent.id);

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            await fetchEvents(selectedSubCategory.id);
            alert('Event updated successfully!');
        }

        setEventConfirmed(true);
        // setSelectedProjectId('');
        // setProjectSearch('');
    } catch (error) {
        console.error('Error saving event:', error);
        alert(`Failed to save event. Please try again. Error: ${error.message || 'Unknown error'}`);
    }
};

const handleThumbnailUpload = (type: 'category' | 'subcategory' | 'event', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = e.target?.result as string;
        if (type === 'category') {
            setCategoryThumbnail(file);
            setCategoryPreview(preview);
        } else if (type === 'subcategory') {
            setSubCategoryThumbnail(file);
            setSubCategoryPreview(preview);
        } else {
            setEventThumbnail(file);
            setEventPreview(preview);
        }
    };
    reader.readAsDataURL(file);
};

const handleGenerateThumbnail = async (type: 'category' | 'subcategory' | 'event') => {
    setGeneratingThumbnail(type);
    try {
        const name = type === 'category' ? newCategoryName || selectedCategory?.name :
            type === 'subcategory' ? newSubCategoryName || selectedSubCategory?.name :
                newEventName || selectedEvent?.name;

        if (!name) {
            alert('Please enter a name first');
            setGeneratingThumbnail(null);
            return;
        }

        // Create gradient-based thumbnail with unique colors based on name
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('Could not get canvas context');

        // Create dynamic gradient based on name hash
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue1 = hash % 360;
        const hue2 = (hash + 120) % 360;

        const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
        gradient.addColorStop(0, `hsl(${hue1}, 70%, 50%)`);
        gradient.addColorStop(1, `hsl(${hue2}, 70%, 40%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1200, 800);

        // Add overlay pattern for visual interest
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 1200, Math.random() * 800, Math.random() * 100, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add dark overlay for text readability (centered)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 300, 1200, 200);

        // Add main text (name) - centered in middle
        ctx.fillStyle = 'white';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(name.toUpperCase(), 600, 380);

        // Add subtitle (type)
        ctx.font = '36px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 5;
        ctx.fillText(type.charAt(0).toUpperCase() + type.slice(1), 600, 450);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/jpeg', 0.95);
        });

        const file = new File([blob], `${name}-thumbnail.jpg`, { type: 'image/jpeg' });
        handleThumbnailUpload(type, file);
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        alert('Failed to generate thumbnail. Please try again or upload manually.');
    } finally {
        setGeneratingThumbnail(null);
    }
};

const handleContinueToUpload = () => {
    // Validate required fields
    if (!selectedCategory && !newCategoryName) {
        alert('Please select or create a category');
        return;
    }
    if (!selectedSubCategory && !newSubCategoryName) {
        alert('Please select or create a sub-category');
        return;
    }
    if (!selectedEvent && !newEventName) {
        alert('Please select or create an event');
        return;
    }

    // Check for linked project and bypass pricing if paid
    if (selectedProjectId) {
        const linkedProject = projects.find(p => p.id === selectedProjectId);
        console.log('Checking project status for bypass:', linkedProject);

        if (linkedProject && linkedProject.status === 'completed') {
            console.log('Project is completed. Bypassing pricing screen and setting defaults to $0.');
            setDefaultImagePrice(0);
            setDefaultVideoPrice(0);
            setCurrentStep(Step.UPLOAD);
            return;
        }
    }

    setCurrentStep(Step.PRICING);
};

const handleContinueFromPricing = () => {
    setCurrentStep(Step.UPLOAD);
};

const handleFilesDropped = async (files: FileList) => {
    setProcessingFiles(true);
    const newFiles: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const type = detectMediaType(file);
        const price = type === 'photo' ? defaultImagePrice : defaultVideoPrice;

        // Generate preview
        const preview = URL.createObjectURL(file);

        // Get dimensions for images
        let dimensions = { width: 0, height: 0 };
        if (type === 'photo') {
            try {
                dimensions = await getImageDimensions(file);
            } catch (error) {
                console.error('Error getting dimensions:', error);
            }
        }

        // Generate AI description
        let description = 'Processing...';
        try {
            description = await generateMediaDescription(file);
        } catch (error) {
            console.error('Error generating description:', error);
            description = 'Professional media capture.';
        }

        newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            name: file.name,
            type,
            price,
            description,
            preview,
            width: dimensions.width,
            height: dimensions.height,
        });
    }

    setMediaFiles([...mediaFiles, ...newFiles]);
    setProcessingFiles(false);

    // Only change step if not already in EDIT mode
    if (currentStep !== Step.EDIT) {
        setCurrentStep(Step.EDIT);
    }
};

const handleUpdateMediaFile = (id: string, updates: Partial<MediaFile>) => {
    setMediaFiles(mediaFiles.map(f => f.id === id ? { ...f, ...updates } : f));
};

const handleRemoveMediaFile = (id: string) => {
    setMediaFiles(mediaFiles.filter(f => f.id !== id));
};

const handleContinueToReview = () => {
    setCurrentStep(Step.REVIEW);
};

const handleStartUpload = async () => {
    setCurrentStep(Step.UPLOADING);

    try {
        // Step 1: Create/Update Category
        setUploadProgress('Creating category...');
        let categoryId = selectedCategory?.id;

        if (!categoryId) {
            const { data: newCategory, error } = await supabase
                .from('event_categories')
                .insert([{ name: newCategoryName, slug: newCategoryName.toLowerCase().replace(/\s+/g, '-') }])
                .select()
                .single();

            if (error) throw error;
            categoryId = newCategory.id;

            // Upload thumbnail
            if (categoryThumbnail) {
                const thumbnailUrl = await uploadThumbnail(categoryThumbnail, 'categories', categoryId);
                await supabase
                    .from('event_categories')
                    .update({ thumbnail: thumbnailUrl })
                    .eq('id', categoryId);
            }
        }

        // Step 2: Create/Update Sub-Category
        setUploadProgress('Creating sub-category...');
        let subCategoryId = selectedSubCategory?.id;

        if (!subCategoryId) {
            const { data: newSubCategory, error } = await supabase
                .from('events')
                .insert([{
                    category_id: categoryId,
                    name: newSubCategoryName,
                    slug: newSubCategoryName.toLowerCase().replace(/\s+/g, '-'),
                    date: new Date().toISOString().split('T')[0],
                }])
                .select()
                .single();

            if (error) throw error;
            subCategoryId = newSubCategory.id;

            // Upload thumbnail
            if (subCategoryThumbnail) {
                const thumbnailUrl = await uploadThumbnail(subCategoryThumbnail, 'events', subCategoryId);
                await supabase
                    .from('events')
                    .update({ thumbnail: thumbnailUrl })
                    .eq('id', subCategoryId);
            }
        }

        // Step 3: Create/Update Event
        setUploadProgress('Creating event...');
        let eventId = selectedEvent?.id;

        if (!eventId) {
            const { data: newEvent, error } = await supabase
                .from('sessions')
                .insert([{
                    event_id: subCategoryId,
                    name: newEventName,
                    date: newEventDate || new Date().toISOString().split('T')[0],
                }])
                .select()
                .single();

            if (error) throw error;
            eventId = newEvent.id;

            // Upload thumbnail
            if (eventThumbnail) {
                const thumbnailUrl = await uploadThumbnail(eventThumbnail, 'sessions', eventId);
                await supabase
                    .from('sessions')
                    .update({ thumbnail: thumbnailUrl })
                    .eq('id', eventId);
            }
        }

        // Step 4: Upload media files
        setUploadProgress('Uploading media files...');

        for (let i = 0; i < mediaFiles.length; i++) {
            const mediaFile = mediaFiles[i];
            setUploadedCount(i + 1);
            setUploadProgress(`Uploading ${i + 1} of ${mediaFiles.length}...`);

            // Upload original
            const { url: originalUrl, fileName: storedFileName } = await uploadOriginalMedia(mediaFile.file, eventId);

            // Generate and upload watermarked version using the same filename
            const watermarkedUrl = await generateWatermarkedMedia(mediaFile.file, eventId, storedFileName);

            // Save to database
            await supabase
                .from('gallery_items')
                .insert([{
                    session_id: eventId,
                    title: storedFileName, // Use the filename from uploadOriginalMedia
                    type: mediaFile.type,
                    watermarked_url: watermarkedUrl,
                    original_url: originalUrl,
                    price: mediaFile.price,
                    width: mediaFile.width,
                    height: mediaFile.height,
                    description: mediaFile.description,
                }]);
        }

        setCurrentStep(Step.SUCCESS);
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
        setCurrentStep(Step.REVIEW);
    }
};

const handleReset = () => {
    setCurrentStep(Step.SETUP);
    setMediaFiles([]);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedEvent(null);
    setNewCategoryName('');
    setNewSubCategoryName('');
    setNewEventName('');
    setCategoryThumbnail(null);
    setSubCategoryThumbnail(null);
    setEventThumbnail(null);
    setCategoryPreview('');
    setSubCategoryPreview('');
    setEventPreview('');
    setUploadedCount(0);
};

return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery Manager</h1>
                <p className="text-gray-600 dark:text-gray-400">Upload and manage gallery media</p>
            </div>
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div
                        key={step}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= step
                            ? 'bg-electric text-white'
                            : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                            }`}
                    >
                        {step}
                    </div>
                ))}
            </div>
        </div>

        {/* Step 1: Setup */}
        {currentStep === Step.SETUP && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Horizontal Grid Layout for Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Category Card */}
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Category</h3>
                            {selectedCategory ? (
                                <RefreshCw className="w-5 h-5 text-electric" />
                            ) : (
                                <Plus className="w-5 h-5 text-green-500" />
                            )}
                        </div>

                        <select
                            value={selectedCategory?.id || 'new'}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                        >
                            <option value="new">Create New Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>

                        {!selectedCategory && (
                            <input
                                type="text"
                                placeholder="Category Name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                        )}

                        <div className="flex gap-2 mb-4">
                            <label className="flex-1 cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleThumbnailUpload('category', e.target.files[0])}
                                    className="hidden"
                                />
                                <div className="px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <Upload className="w-4 h-4 mx-auto mb-1" />
                                    <span className="text-xs">Upload</span>
                                </div>
                            </label>

                            <button
                                onClick={() => handleGenerateThumbnail('category')}
                                disabled={generatingThumbnail === 'category'}
                                className="flex-1 px-3 py-2 bg-electric/10 border border-electric/20 rounded-lg hover:bg-electric/20 transition-colors disabled:opacity-50"
                            >
                                {generatingThumbnail === 'category' ? (
                                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mx-auto mb-1" />
                                        <span className="text-xs">AI Gen</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {categoryPreview && (
                            <div className="relative w-full h-32 bg-gray-100 dark:bg-obsidian rounded-lg overflow-hidden">
                                <img src={categoryPreview} alt="Category thumbnail" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {!categoryConfirmed && (
                            <button
                                onClick={handleConfirmCategory}
                                className="w-full mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {!selectedCategory ? 'Save Category' : categoryThumbnail ? 'Update Category' : 'Continue'}
                            </button>
                        )}

                        {categoryConfirmed && (
                            <div className="mt-4 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-700 dark:text-green-400 text-center font-bold">
                                ✓ Confirmed
                            </div>
                        )}
                    </div>

                    {/* Sub-Category Card */}
                    <div className={`bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 ${!categoryConfirmed ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sub-Category</h3>
                            {selectedSubCategory ? (
                                <RefreshCw className="w-5 h-5 text-electric" />
                            ) : (
                                <Plus className="w-5 h-5 text-green-500" />
                            )}
                        </div>

                        <select
                            value={selectedSubCategory?.id || 'new'}
                            onChange={(e) => handleSubCategoryChange(e.target.value)}
                            disabled={!categoryConfirmed}
                            className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg disabled:opacity-50"
                        >
                            <option value="new">Create New Sub-Category</option>
                            {subCategories.map(sc => (
                                <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                        </select>

                        {!selectedSubCategory && (
                            <input
                                type="text"
                                placeholder="Sub-Category Name"
                                value={newSubCategoryName}
                                onChange={(e) => setNewSubCategoryName(e.target.value)}
                                className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                        )}

                        <div className="flex gap-2 mb-4">
                            <label className="flex-1 cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleThumbnailUpload('subcategory', e.target.files[0])}
                                    className="hidden"
                                />
                                <div className="px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <Upload className="w-4 h-4 mx-auto mb-1" />
                                    <span className="text-xs">Upload</span>
                                </div>
                            </label>

                            <button
                                onClick={() => handleGenerateThumbnail('subcategory')}
                                disabled={generatingThumbnail === 'subcategory'}
                                className="flex-1 px-3 py-2 bg-electric/10 border border-electric/20 rounded-lg hover:bg-electric/20 transition-colors disabled:opacity-50"
                            >
                                {generatingThumbnail === 'subcategory' ? (
                                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mx-auto mb-1" />
                                        <span className="text-xs">AI Gen</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {subCategoryPreview && (
                            <div className="relative w-full h-32 bg-gray-100 dark:bg-obsidian rounded-lg overflow-hidden">
                                <img src={subCategoryPreview} alt="Sub-category thumbnail" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {categoryConfirmed && !subCategoryConfirmed && (
                            <button
                                onClick={handleConfirmSubCategory}
                                className="w-full mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {!selectedSubCategory ? 'Save Sub-Category' : subCategoryThumbnail ? 'Update Sub-Category' : 'Continue'}
                            </button>
                        )}

                        {subCategoryConfirmed && (
                            <div className="mt-4 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-700 dark:text-green-400 text-center font-bold">
                                ✓ Confirmed
                            </div>
                        )}
                    </div>

                    {/* Event Card */}
                    <div className={`bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 ${!subCategoryConfirmed ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Event</h3>
                            {selectedEvent ? (
                                <RefreshCw className="w-5 h-5 text-electric" />
                            ) : (
                                <Plus className="w-5 h-5 text-green-500" />
                            )}
                        </div>

                        <select
                            value={selectedEvent?.id || 'new'}
                            onChange={(e) => handleEventChange(e.target.value)}
                            disabled={!subCategoryConfirmed}
                            className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg disabled:opacity-50"
                        >
                            <option value="new">Create New Event</option>
                            {events.map(evt => (
                                <option key={evt.id} value={evt.id}>
                                    {evt.name.replace(/\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/, '')}
                                </option>
                            ))}
                        </select>

                        {!selectedEvent && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Event Name"
                                    value={newEventName}
                                    onChange={(e) => setNewEventName(e.target.value)}
                                    className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                                <input
                                    type="date"
                                    value={newEventDate}
                                    onChange={(e) => setNewEventDate(e.target.value)}
                                    className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                            </>
                        )}

                        {/* Project Selection - Always visible */}
                        <div className="relative mb-4">
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                Link to Project (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="Search by Project ID, name, or email..."
                                value={projectSearch}
                                onChange={(e) => {
                                    setProjectSearch(e.target.value);
                                    setShowProjectDropdown(true);
                                }}
                                onFocus={() => setShowProjectDropdown(true)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            />

                            {showProjectDropdown && projectSearch && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {projects
                                        .filter(p =>
                                            p.project_id?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                                            p.clientName?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                                            p.clientEmail?.toLowerCase().includes(projectSearch.toLowerCase())
                                        )
                                        .slice(0, 10)
                                        .map(project => (
                                            <button
                                                key={project.id}
                                                onClick={() => {
                                                    setSelectedProjectId(project.id);
                                                    setProjectSearch(`${project.project_id} - ${project.clientName}`);
                                                    setShowProjectDropdown(false);
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-electric/10 transition-colors text-sm"
                                            >
                                                <div className="font-mono text-electric font-bold">{project.project_id}</div>
                                                <div className="text-gray-900 dark:text-white">{project.clientName}</div>
                                                <div className="text-xs text-gray-500">{project.clientEmail}</div>
                                            </button>
                                        ))}
                                    {projects.filter(p =>
                                        p.project_id?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                                        p.clientName?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                                        p.clientEmail?.toLowerCase().includes(projectSearch.toLowerCase())
                                    ).length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500">No projects found</div>
                                        )}
                                </div>
                            )}
                        </div>


                        <div className="flex gap-2 mb-4">
                            <label className="flex-1 cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleThumbnailUpload('event', e.target.files[0])}
                                    className="hidden"
                                />
                                <div className="px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <Upload className="w-4 h-4 mx-auto mb-1" />
                                    <span className="text-xs">Upload</span>
                                </div>
                            </label>

                            <button
                                onClick={() => handleGenerateThumbnail('event')}
                                disabled={generatingThumbnail === 'event'}
                                className="flex-1 px-3 py-2 bg-electric/10 border border-electric/20 rounded-lg hover:bg-electric/20 transition-colors disabled:opacity-50"
                            >
                                {generatingThumbnail === 'event' ? (
                                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mx-auto mb-1" />
                                        <span className="text-xs">AI Gen</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {eventPreview && (
                            <div className="relative w-full h-32 bg-gray-100 dark:bg-obsidian rounded-lg overflow-hidden">
                                <img src={eventPreview} alt="Event thumbnail" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {subCategoryConfirmed && !eventConfirmed && (
                            <button
                                onClick={handleConfirmEvent}
                                className="w-full mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {!selectedEvent ? 'Save Event' : eventThumbnail ? 'Update Event' : 'Continue'}
                            </button>
                        )}

                        {eventConfirmed && (
                            <div className="mt-4 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-700 dark:text-green-400 text-center font-bold">
                                ✓ Confirmed
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleContinueToUpload}
                        disabled={!eventConfirmed}
                        className="px-8 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continue <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>
        )
        }

        {/* Step 2: Pricing */}
        {
            currentStep === Step.PRICING && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Global Pricing</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Set default prices for images and videos. You can adjust individual prices later.</p>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    <ImageIcon className="w-4 h-4 inline mr-2" />
                                    Default Image Price
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        value={defaultImagePrice}
                                        onChange={(e) => setDefaultImagePrice(parseFloat(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    <Video className="w-4 h-4 inline mr-2" />
                                    Default Video Price
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        value={defaultVideoPrice}
                                        onChange={(e) => setDefaultVideoPrice(parseFloat(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setCurrentStep(Step.SETUP)}
                            className="px-6 py-3 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg font-bold flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" /> Back
                        </button>
                        <button
                            onClick={handleContinueFromPricing}
                            className="flex-1 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                            Continue to Upload <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )
        }

        {/* Step 3: Upload - Will continue in next part due to length */}
        {
            currentStep === Step.UPLOAD && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div
                        onDrop={(e) => {
                            e.preventDefault();
                            handleFilesDropped(e.dataTransfer.files);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-12 text-center hover:border-electric transition-colors cursor-pointer"
                    >
                        <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Drag & Drop Media Files</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">or click to browse</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={(e) => e.target.files && handleFilesDropped(e.target.files)}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="inline-block px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold cursor-pointer"
                        >
                            Select Files
                        </label>
                    </div>

                    {processingFiles && (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-electric" />
                            <p className="text-gray-600 dark:text-gray-400">Processing files with AI...</p>
                        </div>
                    )}

                    <button
                        onClick={() => setCurrentStep(Step.PRICING)}
                        className="px-6 py-3 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg font-bold flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                </motion.div>
            )
        }

        {/* Step 4: Edit Individual Items */}
        {
            currentStep === Step.EDIT && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Add More Files Section */}
                    <div
                        onDrop={(e) => {
                            e.preventDefault();
                            handleFilesDropped(e.dataTransfer.files);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        className="border-2 border-dashed border-electric/50 dark:border-electric/30 rounded-xl p-8 text-center hover:border-electric hover:bg-electric/5 transition-all cursor-pointer bg-white dark:bg-charcoal"
                    >
                        <Upload className="w-10 h-10 mx-auto mb-3 text-electric" />
                        <p className="text-base font-bold mb-2 text-gray-900 dark:text-white">Add More Files</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Drag & drop files here or click the button below</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={(e) => e.target.files && handleFilesDropped(e.target.files)}
                            className="hidden"
                            id="add-more-files"
                        />
                        <label
                            htmlFor="add-more-files"
                            className="inline-block px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold cursor-pointer transition-colors"
                        >
                            <Upload className="w-4 h-4 inline mr-2" />
                            Browse Files
                        </label>
                    </div>

                    {processingFiles && (
                        <div className="text-center py-4 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-electric" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Processing new files with AI...</p>
                        </div>
                    )}

                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                            Edit Media Items ({mediaFiles.length} files)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {mediaFiles.map((media) => (
                                <div key={media.id} className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                                    <div className="aspect-video bg-gray-100 dark:bg-obsidian relative">
                                        <img src={media.preview} alt={media.name} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${media.type === 'photo' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                                                }`}>
                                                {media.type === 'photo' ? 'Image' : 'Video'}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveMediaFile(media.id)}
                                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <input
                                            type="text"
                                            value={media.name}
                                            onChange={(e) => handleUpdateMediaFile(media.id, { name: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded"
                                            placeholder="File name"
                                        />

                                        <div className="relative">
                                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="number"
                                                value={media.price}
                                                onChange={(e) => handleUpdateMediaFile(media.id, { price: parseFloat(e.target.value) })}
                                                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded"
                                                step="0.01"
                                            />
                                        </div>

                                        <textarea
                                            value={media.description}
                                            onChange={(e) => handleUpdateMediaFile(media.id, { description: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded"
                                            rows={3}
                                            placeholder="Description"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setCurrentStep(Step.UPLOAD)}
                            className="px-6 py-3 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg font-bold flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" /> Back
                        </button>
                        <button
                            onClick={handleContinueToReview}
                            className="flex-1 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                            Continue to Review <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )
        }

        {/* Step 5: Review */}
        {
            currentStep === Step.REVIEW && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Review & Confirm</h3>

                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Category</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedCategory?.name || newCategoryName}</p>
                                    {categoryPreview && (
                                        <img src={categoryPreview} alt="Category" className="w-16 h-16 mx-auto mt-2 rounded object-cover" />
                                    )}
                                </div>

                                <div className="text-center p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sub-Category</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedSubCategory?.name || newSubCategoryName}</p>
                                    {subCategoryPreview && (
                                        <img src={subCategoryPreview} alt="Sub-category" className="w-16 h-16 mx-auto mt-2 rounded object-cover" />
                                    )}
                                </div>

                                <div className="text-center p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Event</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedEvent?.name || newEventName}</p>
                                    {eventPreview && (
                                        <img src={eventPreview} alt="Event" className="w-16 h-16 mx-auto mt-2 rounded object-cover" />
                                    )}
                                </div>
                            </div>

                            {/* Media Stats */}
                            <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                                <h4 className="font-bold mb-4 text-gray-900 dark:text-white">Media Summary</h4>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{mediaFiles.length}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
                                    </div>

                                    <div className="text-center p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {mediaFiles.filter(f => f.type === 'photo').length}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Images</p>
                                    </div>

                                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                            {mediaFiles.filter(f => f.type === 'video').length}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Videos</p>
                                    </div>

                                    <div className="text-center p-4 bg-electric/10 rounded-lg">
                                        <p className="text-2xl font-bold text-electric">
                                            ${mediaFiles.reduce((sum, f) => sum + f.price, 0).toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setCurrentStep(Step.EDIT)}
                            className="px-6 py-3 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg font-bold flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" /> Back to Edit
                        </button>
                        <button
                            onClick={handleStartUpload}
                            className="flex-1 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                            <Upload className="w-5 h-5" /> Upload to Database
                        </button>
                    </div>
                </motion.div>
            )
        }

        {/* Step 6: Uploading */}
        {
            currentStep === Step.UPLOADING && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                        <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6 text-electric" />
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Uploading...</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{uploadProgress}</p>
                        {uploadedCount > 0 && (
                            <div className="max-w-md mx-auto">
                                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-electric transition-all duration-300"
                                        style={{ width: `${(uploadedCount / mediaFiles.length) * 100}%` }}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{uploadedCount} of {mediaFiles.length} files</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )
        }

        {/* Step 7: Success */}
        {
            currentStep === Step.SUCCESS && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                >
                    <div className="bg-white dark:bg-charcoal rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10 text-white" />
                        </div>

                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Upload Complete!</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">All media has been successfully uploaded to the gallery.</p>

                        <div className="bg-gray-50 dark:bg-obsidian rounded-lg p-4 mb-6 text-left">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Category</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedCategory?.name || newCategoryName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Sub-Category</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedSubCategory?.name || newSubCategoryName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Event</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedEvent?.name || newEventName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Files Uploaded</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{mediaFiles.length}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                                <p className="text-gray-500 mb-1">Breakdown</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {mediaFiles.filter(f => f.type === 'photo').length} Images • {' '}
                                    {mediaFiles.filter(f => f.type === 'video').length} Videos
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.href = '/#/gallery'}
                                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg font-bold"
                            >
                                View in Gallery
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold"
                            >
                                Upload More
                            </button>
                        </div>
                    </div>
                </motion.div>
            )
        }
    </div >
);
};

export default GalleryManagerNew;
