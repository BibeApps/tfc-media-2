import React, { useState, useEffect } from 'react';
import { Upload, Wand2, X, Check, Loader2, ArrowRight, ArrowLeft, Image as ImageIcon, Video, DollarSign, Plus, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { PortalProject } from '../../types';
import toast from 'react-hot-toast';
import {
    uploadOriginalMedia,
    generateWatermarkedMedia,
    detectMediaType,
    getImageDimensions,
    generateMediaDescription,
} from '../../utils/aiUtils';

interface Event {
    id: string;
    name: string;
    date: string;
    thumbnail: string | null;
    project_id: string | null;
    email: string | null;
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

const GalleryManagerSimple: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<Step>(Step.SETUP);

    // Step 1: Setup
    const [newEventName, setNewEventName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [eventThumbnail, setEventThumbnail] = useState<File | null>(null);
    const [eventPreview, setEventPreview] = useState('');
    const [confirmedEvent, setConfirmedEvent] = useState<Event | null>(null);
    const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
    const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

    // Project linking
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
        fetchProjects();
    }, []);

    // Debounced project search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProjects(projectSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [projectSearch]);


    const fetchProjects = async (searchTerm = '') => {
        try {
            let query = supabase
                .from('portal_projects')
                .select('*, invoices(status)')
                .neq('status', 'uploaded'); // Server-side filter for non-uploaded projects

            if (searchTerm) {
                // Server-side search across ALL projects (no limit when searching)
                const search = searchTerm.toLowerCase();
                query = query.or(`project_id.ilike.%${search}%,name.ilike.%${search}%,client_name.ilike.%${search}%,client_email.ilike.%${search}%`);
            } else {
                // When no search, limit to recent 100 for performance
                query = query.limit(100);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('Fetch Projects Error:', error);
                throw error;
            }

            const mappedProjects = (data || []).map((p: any) => ({
                id: p.id,
                project_id: p.project_id,
                name: p.name,
                status: p.status,
                clientName: p.client_name,
                clientEmail: p.client_email,
                serviceType: p.service_type,
                eventDate: p.event_date,
                isPaid: p.invoices?.some((inv: any) => inv.status === 'fully_paid' || inv.status === 'paid'),
            }));

            setProjects(mappedProjects);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };




    const handleConfirmEvent = async () => {
        if (!newEventName) {
            toast.error('Please enter an event name');
            return;
        }

        setIsSubmittingEvent(true);

        try {
            const selectedProject = projects.find(p => p.id === selectedProjectId);

            // Always create new event
            const { data, error } = await supabase
                .from('sessions')
                .insert({
                    name: newEventName,
                    date: newEventDate || new Date().toISOString().split('T')[0],
                    thumbnail: eventPreview || null,
                    project_id: selectedProject?.project_id || null,
                    email: selectedProject?.clientEmail || null,
                    event_id: null,
                    archived: false,
                })
                .select()
                .single();

            if (error) throw error;

            setConfirmedEvent(data);
            toast.success('Event created successfully!');
        } catch (error: any) {
            console.error('Error saving event:', error);
            toast.error(`Failed to save event: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmittingEvent(false);
        }
    };

    const handleThumbnailUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setEventPreview(e.target?.result as string);
            setEventThumbnail(file);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerateThumbnail = async () => {
        setGeneratingThumbnail(true);
        try {
            const name = newEventName;

            if (!name) {
                toast.error('Please enter event name first');
                setGeneratingThumbnail(false);
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

            // Add subtitle
            ctx.font = '36px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.shadowBlur = 5;
            ctx.fillText('Event', 600, 450);

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
            handleThumbnailUpload(file);
            toast.success('Thumbnail generated!');
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            toast.error('Failed to generate thumbnail');
        } finally {
            setGeneratingThumbnail(false);
        }
    };

    const handleContinueToUpload = () => {
        if (!newEventName) {
            toast.error('Please enter an event name');
            return;
        }
        if (!selectedProjectId) {
            toast.error('Please select a project');
            return;
        }
        if (!confirmedEvent) {
            toast.error('Please confirm the event first');
            return;
        }

        const project = projects.find(p => p.id === selectedProjectId);
        if (project?.isPaid) {
            setDefaultImagePrice(0);
            setDefaultVideoPrice(0);
            setCurrentStep(Step.UPLOAD);
            toast.success('Project is paid - Skipping pricing step');
        } else {
            setCurrentStep(Step.PRICING);
        }
    };

    const handleContinueFromPricing = () => {
        setCurrentStep(Step.UPLOAD);
    };

    const handleFilesDropped = async (files: FileList) => {
        setProcessingFiles(true);
        const newFiles: MediaFile[] = [];
        let failedDescriptions = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const type = detectMediaType(file);
            const price = type === 'photo' ? defaultImagePrice : defaultVideoPrice;
            const preview = URL.createObjectURL(file);

            let dimensions = { width: 0, height: 0 };
            if (type === 'photo') {
                try {
                    dimensions = await getImageDimensions(file);
                } catch (error) {
                    console.error('Error getting dimensions:', error);
                }
            }

            let description = 'Processing...';
            try {
                description = await generateMediaDescription(file);
            } catch (error) {
                console.error('Error generating description:', error);
                description = 'Professional media capture.';
                failedDescriptions++;
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

        // Notify user if AI descriptions failed
        if (failedDescriptions > 0) {
            toast(`${failedDescriptions} file${failedDescriptions > 1 ? 's' : ''} used generic descriptions (AI generation failed)`, {
                icon: '⚠️',
                duration: 4000,
            });
        }

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
            // Validate project is selected
            if (!selectedProjectId) {
                toast.error('No project selected. Please go back and select a project.');
                setCurrentStep(Step.SETUP);
                return;
            }

            // Use confirmed event (always exists at this point)
            const eventId = confirmedEvent?.id;

            if (!eventId) {
                toast.error('No event found. Please go back and confirm event.');
                setCurrentStep(Step.SETUP);
                return;
            }

            // Verify project still exists and is valid
            const selectedProject = projects.find(p => p.id === selectedProjectId);
            if (!selectedProject) {
                toast.error('Selected project no longer exists. Please go back and select a valid project.');
                setCurrentStep(Step.SETUP);
                return;
            }

            // Upload media files
            setUploadProgress('Uploading media files...');

            for (let i = 0; i < mediaFiles.length; i++) {
                const mediaFile = mediaFiles[i];
                setUploadedCount(i + 1);
                setUploadProgress(`Uploading ${i + 1} of ${mediaFiles.length}...`);

                const { url: originalUrl, fileName } = await uploadOriginalMedia(mediaFile.file, eventId);
                const watermarkedUrl = await generateWatermarkedMedia(mediaFile.file, eventId, fileName);

                await supabase.from('gallery_items').insert({
                    session_id: eventId,
                    title: fileName,
                    type: mediaFile.type,
                    watermarked_url: watermarkedUrl,
                    original_url: originalUrl,
                    price: mediaFile.price,
                    width: mediaFile.width,
                    height: mediaFile.height,
                    description: mediaFile.description,
                });
            }

            // Update project status to 'uploaded' if a project was linked
            if (selectedProjectId) {
                const { error: updateError } = await supabase
                    .from('portal_projects')
                    .update({ status: 'uploaded' })
                    .eq('id', selectedProjectId);

                if (updateError) {
                    console.error('Error updating project status:', updateError);
                    toast.error('Media uploaded, but failed to update project status');
                } else {
                    // Refresh projects list to remove the uploaded one
                    fetchProjects();
                }
            }

            setCurrentStep(Step.SUCCESS);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed. Please try again.');
            setCurrentStep(Step.REVIEW);
        }
    };

    const handleReset = () => {
        setCurrentStep(Step.SETUP);
        setMediaFiles([]);
        setConfirmedEvent(null);
        setNewEventName('');
        setNewEventDate('');
        setEventThumbnail(null);
        setEventPreview('');
        setUploadedCount(0);
        setSelectedProjectId('');
        setProjectSearch('');
    };

    // Projects are already filtered server-side, no need for client-side filtering
    const filteredProjects = projects;

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
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Event</h3>
                            {confirmedEvent ? (
                                <Check className="w-5 h-5 text-green-500" />
                            ) : (
                                <Plus className="w-5 h-5 text-electric" />
                            )}
                        </div>

                        <input
                            type="text"
                            placeholder="Event Name (e.g., Paul Smith's Sweet Sixteen)"
                            value={newEventName}
                            onChange={(e) => setNewEventName(e.target.value)}
                            disabled={!!confirmedEvent}
                            className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg disabled:opacity-50"
                        />
                        <input
                            type="date"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            className="w-full mb-4 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                        />

                        {/* Project Selector */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Link to Project (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={projectSearch}
                                    onChange={(e) => {
                                        setProjectSearch(e.target.value);
                                        setShowProjectDropdown(true);
                                    }}
                                    onFocus={() => setShowProjectDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                                    placeholder="Search by Project ID, Client Name, or Email"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                                {showProjectDropdown && filteredProjects.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {filteredProjects.map(project => (
                                            <button
                                                key={project.id}
                                                onClick={() => {
                                                    setSelectedProjectId(project.id);
                                                    setProjectSearch(`${project.project_id} - ${project.name || 'Untitled'} (${project.clientName})`);
                                                    setShowProjectDropdown(false);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
                                            >
                                                <div className="font-mono text-electric font-bold">{project.project_id}</div>
                                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{project.name}</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">{project.clientName}</div>
                                                <div className="text-xs text-gray-500">{project.clientEmail}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Thumbnail Upload */}
                        <div className="flex gap-2 mb-4">
                            <label className="flex-1 cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleThumbnailUpload(e.target.files[0])}
                                    className="hidden"
                                />
                                <div className="px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    Upload Thumbnail
                                </div>
                            </label>
                            <button
                                onClick={handleGenerateThumbnail}
                                disabled={!newEventName || generatingThumbnail}
                                className="flex-1 px-3 py-2 bg-electric/10 hover:bg-electric/20 disabled:opacity-50 border border-electric rounded-lg text-center transition-colors"
                            >
                                {generatingThumbnail ? (
                                    <>
                                        <Loader2 className="w-4 h-4 inline mr-2 animate-spin text-electric" />
                                        <span className="font-bold text-electric">Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 inline mr-2 text-electric" />
                                        <span className="font-bold text-electric">AI Thumbnail</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {eventPreview && (
                            <div className="mb-4">
                                <img src={eventPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                            </div>
                        )}

                        <button
                            onClick={handleConfirmEvent}
                            disabled={isSubmittingEvent}
                            className="w-full px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmittingEvent && <Loader2 className="w-4 h-4 animate-spin" />}
                            {confirmedEvent ? 'Event Confirmed' : 'Confirm Event'}
                        </button>

                        {confirmedEvent && (
                            <div className="flex items-center gap-2 text-green-500 font-bold mt-3">
                                <Check className="w-5 h-5" />
                                Event "{newEventName}" is confirmed and ready for upload
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleContinueToUpload}
                            disabled={!confirmedEvent}
                            className="flex items-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                        >
                            Continue to Pricing
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step 2: Pricing */}
            {currentStep === Step.PRICING && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Set Default Prices</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Image Price
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        value={defaultImagePrice}
                                        onChange={(e) => setDefaultImagePrice(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Video Price
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        value={defaultVideoPrice}
                                        onChange={(e) => setDefaultVideoPrice(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setCurrentStep(Step.SETUP)}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back
                        </button>
                        <button
                            onClick={handleContinueFromPricing}
                            className="flex items-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                        >
                            Continue to Upload
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step 3: Upload */}
            {currentStep === Step.UPLOAD && (
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
                        <div className="text-center py-4">
                            <Loader2 className="w-8 h-8 animate-spin text-electric mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Processing files with AI...</p>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <button
                            onClick={() => setCurrentStep(Step.PRICING)}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step 4: Edit */}
            {currentStep === Step.EDIT && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Add More Files Section with Drag & Drop */}
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
                                        {media.type === 'photo' ? (
                                            <img src={media.preview} alt={media.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={media.preview} className="w-full h-full object-cover" />
                                        )}
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

                        {/* Add More Files Button */}
                        <label className="cursor-pointer block mt-4">
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={(e) => e.target.files && handleFilesDropped(e.target.files)}
                                className="hidden"
                            />
                            <div className="px-4 py-3 bg-electric/10 hover:bg-electric/20 border-2 border-dashed border-electric rounded-lg text-center transition-colors">
                                <Plus className="w-5 h-5 inline mr-2 text-electric" />
                                <span className="font-bold text-electric">Add More Files</span>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setCurrentStep(Step.UPLOAD)}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back
                        </button>
                        <button
                            onClick={handleContinueToReview}
                            disabled={mediaFiles.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                        >
                            Continue to Review
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step 5: Review */}
            {currentStep === Step.REVIEW && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Review & Upload</h3>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Event:</span>
                                <span className="font-bold">{newEventName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Files:</span>
                                <span className="font-bold">{mediaFiles.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                                <span className="font-bold text-electric">
                                    ${mediaFiles.reduce((sum, f) => sum + f.price, 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setCurrentStep(Step.EDIT)}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back
                        </button>
                        <button
                            onClick={handleStartUpload}
                            className="flex items-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                        >
                            Start Upload
                            <Upload className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step 6: Uploading */}
            {currentStep === Step.UPLOADING && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                        <Loader2 className="w-16 h-16 animate-spin text-electric mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Uploading...</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{uploadProgress}</p>
                        <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                            <div
                                className="bg-electric h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(uploadedCount / mediaFiles.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Step 7: Success */}
            {currentStep === Step.SUCCESS && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Complete!</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Successfully uploaded {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''}
                        </p>
                        <button
                            onClick={handleReset}
                            className="px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                        >
                            Upload More Media
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default GalleryManagerSimple;
