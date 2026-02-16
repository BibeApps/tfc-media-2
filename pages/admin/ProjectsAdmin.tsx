import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Briefcase, Upload, Image as ImageIcon, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { PortalProject, ProjectStatus } from '../../types';

interface ServiceType {
    id: string;
    name: string;
    is_active: boolean;
}

const PROJECT_STEPS = ['Planning', 'Editing', 'Reviewing', 'Finalizing'];

const ProjectsAdmin: React.FC = () => {
    const [projects, setProjects] = useState<PortalProject[]>([]);
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProject, setSelectedProject] = useState<PortalProject | null>(null);
    const [formData, setFormData] = useState<Partial<PortalProject>>({});
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchProjects();
        fetchServiceTypes();

        // Set up real-time subscription for auto-refresh
        const channel = supabase
            .channel('portal_projects_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'portal_projects' },
                () => fetchProjects()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchServiceTypes = async () => {
        try {
            const { data, error } = await supabase
                .from('service_types')
                .select('id, name, is_active')
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;
            setServiceTypes(data || []);
        } catch (err) {
            console.error('Error fetching service types:', err);
        }
    };

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('portal_projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map database fields to TypeScript interface
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

            setProjects(mappedProjects);
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setSelectedProject(null);
        setFormData({
            name: '',
            clientName: '',
            clientEmail: '',
            serviceType: '',
            eventDate: '',
            status: 'not_started',
            coverImage: '',
            progress: 0,
            currentStep: 'Planning',
            totalSteps: 10,
            manager: 'Admin',
        });
        setImagePreview(null);
        setIsEditing(true);
    };

    const handleEdit = (project: PortalProject) => {
        setSelectedProject(project);
        setFormData(project);
        setImagePreview(project.coverImage);
        setIsEditing(true);
    };

    const handleImageUpload = async (file: File) => {
        if (!file) return;

        console.log('Upload attempt:', {
            name: file.name,
            size: file.size,
            type: file.type,
            sizeInMB: (file.size / 1024 / 1024).toFixed(2)
        });

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB. Please compress your image and try again.');
            return;
        }

        try {
            setUploading(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `project-covers/${fileName}`;

            console.log('Uploading to:', filePath);

            const { error: uploadError } = await supabase.storage
                .from('thumbnails')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(filePath);

            console.log('Upload successful:', publicUrl);

            setFormData({ ...formData, coverImage: publicUrl });
            setImagePreview(publicUrl);
            toast.success('Image uploaded successfully!');
        } catch (err: any) {
            console.error('Error uploading image:', err);
            const errorMsg = err.message || 'Unknown error';
            toast.error(`Failed to upload: ${errorMsg}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
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

    const handleSave = async () => {
        if (!formData.name || !formData.clientName || !formData.clientEmail) {
            toast.error('Please fill in project name, client name, and client email');
            return;
        }

        try {
            const dataToSave: any = {
                name: formData.name,
                client_name: formData.clientName,
                client_email: formData.clientEmail,
                service_type: formData.serviceType || '',
                event_date: formData.eventDate || '',
                status: formData.status || 'not_started',
                cover_image: formData.coverImage || '',
                progress: formData.progress || 0,
                current_step: formData.currentStep || 'Planning',
                total_steps: formData.totalSteps || 10,
                manager: formData.manager || 'Admin',
                transaction_id: formData.transaction_id || null,
            };

            if (selectedProject) {
                // Updating existing project - detect changes
                const updates: any = {};

                if (selectedProject.status !== formData.status) {
                    updates.status = { old: selectedProject.status, new: formData.status };
                }

                if (selectedProject.progress !== formData.progress) {
                    updates.progress = { old: selectedProject.progress, new: formData.progress };
                }

                if (selectedProject.currentStep !== formData.currentStep) {
                    updates.currentStep = { old: selectedProject.currentStep, new: formData.currentStep };
                }

                const { error } = await supabase
                    .from('portal_projects')
                    .update(dataToSave)
                    .eq('id', selectedProject.id);

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }

                // Send update email if there are changes
                if (Object.keys(updates).length > 0) {
                    try {
                        const portalUrl = `${window.location.origin}/portal`;

                        const { error: emailError } = await supabase.functions.invoke('send-project-update-email', {
                            body: {
                                clientName: formData.clientName,
                                clientEmail: formData.clientEmail,
                                projectName: formData.name,
                                updates: updates,
                                portalUrl: portalUrl,
                            },
                        });

                        if (emailError) {
                            console.error('Error sending project update email:', emailError);
                            // Don't fail the whole operation if email fails
                        }
                    } catch (emailErr) {
                        console.error('Failed to send project update email:', emailErr);
                        // Continue even if email fails
                    }
                }
            } else {
                // Creating new project
                const { error } = await supabase
                    .from('portal_projects')
                    .insert([dataToSave]);

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }

                // Send email notification to client
                try {
                    const portalUrl = `${window.location.origin}/portal`;

                    const { error: emailError } = await supabase.functions.invoke('send-project-email', {
                        body: {
                            clientName: formData.clientName,
                            clientEmail: formData.clientEmail,
                            projectName: formData.name,
                            serviceType: formData.serviceType || '',
                            eventDate: formData.eventDate || '',
                            portalUrl: portalUrl,
                        },
                    });

                    if (emailError) {
                        console.error('Error sending project email:', emailError);
                        // Don't fail the whole operation if email fails
                    }
                } catch (emailErr) {
                    console.error('Failed to send project notification email:', emailErr);
                    // Continue even if email fails
                }
            }

            await fetchProjects();
            setIsEditing(false);
            setImagePreview(null);
        } catch (err: any) {
            console.error('Error saving project:', err);
            const errorMessage = err.message || 'Unknown error';
            toast.error('Failed to save project: ' + errorMessage);
        }
    };

    const handleDelete = async (id: string) => {
        setTimeout(async () => {
            if (!window.confirm('Are you sure you want to delete this project?')) return;

            try {
                const { error } = await supabase
                    .from('portal_projects')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                await fetchProjects();
            } catch (err) {
                console.error('Error deleting project:', err);
                toast.error('Failed to delete project');
            }
        }, 0);
    };

    const getStatusColor = (status: ProjectStatus) => {
        switch (status) {
            case 'not_started': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
            case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
            case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
            case 'uploaded': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch =
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusLabel = (status: ProjectStatus) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-electric" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage client projects and deliverables</p>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Project
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search projects by name or client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'not_started', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${statusFilter === status
                                ? 'bg-electric text-white'
                                : 'bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 hover:border-electric/50'
                                }`}
                        >
                            {status === 'all' ? 'All' : status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </button>
                    ))}
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No projects found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden group"
                        >
                            <div className="aspect-video bg-gray-200 dark:bg-obsidian relative overflow-hidden">
                                {project.coverImage ? (
                                    <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Briefcase className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(project)}
                                        className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-electric hover:text-white transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(project.id)}
                                        className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{project.name}</h3>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(project.status)}`}>
                                        {getStatusLabel(project.status)}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                                    <strong>Client:</strong> {project.clientName}
                                </p>
                                {project.serviceType && (
                                    <p className="text-electric text-sm font-bold mb-2">{project.serviceType}</p>
                                )}
                                {project.eventDate && (
                                    <p className="text-gray-500 text-xs mb-3">Event: {new Date(project.eventDate).toLocaleDateString()}</p>
                                )}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                        <span>{project.currentStep}</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-electric h-2 rounded-full transition-all"
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )
            }

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-charcoal z-10">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {selectedProject ? 'Edit Project' : 'Add Project'}
                                </h3>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Project ID Display (Edit mode only) */}
                                {selectedProject && selectedProject.project_id && (
                                    <div className="bg-electric/10 border border-electric/20 rounded-lg p-4">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                            Project ID
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <code className="text-lg font-mono font-bold text-electric">
                                                {selectedProject.project_id}
                                            </code>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                (Auto-generated, read-only)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Transaction ID Field */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Transaction ID (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.transaction_id || ''}
                                        onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="TXN-123456 or Stripe payment ID"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Optional: Link this project to a payment/transaction ID
                                    </p>
                                </div>

                                {/* Cover Image Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Cover Image
                                    </label>
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${dragActive
                                            ? 'border-electric bg-electric/5'
                                            : 'border-gray-300 dark:border-white/20'
                                            }`}
                                    >
                                        {imagePreview ? (
                                            <div className="relative">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-48 object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setImagePreview(null);
                                                        setFormData({ ...formData, coverImage: '' });
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                                <p className="text-gray-600 dark:text-gray-400 mb-2">
                                                    Drag and drop an image here, or click to select
                                                </p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleImageUpload(e.target.files[0]);
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="image-upload"
                                                />
                                                <label
                                                    htmlFor="image-upload"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold cursor-pointer transition-colors"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    {uploading ? 'Uploading...' : 'Choose File'}
                                                </label>
                                                <p className="text-xs text-gray-500 mt-2">PNG, JPG, WebP up to 10MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Project Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="Smith Wedding"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Client Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.clientName || ''}
                                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="John Smith"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Client Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.clientEmail || ''}
                                            onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Service Type
                                        </label>
                                        <select
                                            value={formData.serviceType || ''}
                                            onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select a service type</option>
                                            {serviceTypes.map((service) => (
                                                <option key={service.id} value={service.name}>
                                                    {service.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Event Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.eventDate || ''}
                                            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={formData.status || 'not_started'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        >
                                            <option value="not_started">Not Started</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="uploaded">Uploaded</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Progress (%)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.progress || 0}
                                            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Current Step
                                    </label>
                                    <select
                                        value={formData.currentStep || ''}
                                        onChange={(e) => setFormData({ ...formData, currentStep: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select current step</option>
                                        {PROJECT_STEPS.map((step) => (
                                            <option key={step} value={step}>
                                                {step}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-charcoal">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={uploading}
                                    className="px-6 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {selectedProject ? 'Save Changes' : 'Add Project'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default ProjectsAdmin;
