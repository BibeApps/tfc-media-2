import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Image as ImageIcon, Upload, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { PortfolioProject } from '../../types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortablePortfolioCardProps {
    project: PortfolioProject;
    onEdit: (project: PortfolioProject) => void;
    onDelete: (id: string) => void;
}

const SortablePortfolioCard: React.FC<SortablePortfolioCardProps> = ({ project, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden group"
        >
            <div className="aspect-video bg-gray-200 dark:bg-obsidian relative overflow-hidden">
                {project.image_url ? (
                    <img src={project.image_url} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                )}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(project)}
                            className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-electric hover:text-white transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(project.id)}
                            className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{project.title}</h3>
                {project.category && (
                    <p className="text-electric text-sm font-bold mb-2">{project.category}</p>
                )}
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">{project.description}</p>
                {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded text-xs text-gray-600 dark:text-gray-400">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Portfolio: React.FC = () => {
    const [projects, setProjects] = useState<PortfolioProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
    const [formData, setFormData] = useState<Partial<PortfolioProject>>({});
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [tagsInput, setTagsInput] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('portfolio_projects')
                .select('*')
                .order('display_order');

            if (error) throw error;
            setProjects(data || []);
        } catch (err) {
            console.error('Error fetching portfolio:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = projects.findIndex((item) => item.id === active.id);
            const newIndex = projects.findIndex((item) => item.id === over.id);

            const newProjects = arrayMove(projects, oldIndex, newIndex);

            // Update display_order for all items
            const updatedProjects = newProjects.map((project, index) => ({
                ...project,
                display_order: index + 1,
            }));

            setProjects(updatedProjects);

            // Save new order to database
            try {
                const updates = updatedProjects.map((project) =>
                    supabase
                        .from('portfolio_projects')
                        .update({ display_order: project.display_order })
                        .eq('id', project.id)
                );

                await Promise.all(updates);
            } catch (err) {
                console.error('Error updating order:', err);
                // Revert on error
                fetchProjects();
            }
        }
    };

    const handleNew = () => {
        setSelectedProject(null);
        setFormData({
            title: '',
            description: '',
            image_url: '',
            category: '',
            tags: [],
        });
        setTagsInput('');
        setImagePreview(null);
        setIsEditing(true);
    };

    const handleEdit = (project: PortfolioProject) => {
        setSelectedProject(project);
        setFormData(project);
        setTagsInput(project.tags?.join(', ') || '');
        setImagePreview(project.image_url);
        setIsEditing(true);
    };

    const handleImageUpload = async (file: File) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        try {
            setUploading(true);

            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `portfolio/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('thumbnails')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(filePath);

            setFormData({ ...formData, image_url: publicUrl });
            setImagePreview(publicUrl);
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Failed to upload image');
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

    const handleTagsChange = (value: string) => {
        setTagsInput(value);
        // Parse tags: split by comma, trim whitespace, filter empty strings
        const parsedTags = value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        setFormData({ ...formData, tags: parsedTags });
    };

    const handleSave = async () => {
        if (!formData.title || !formData.description) {
            alert('Please fill in title and description');
            return;
        }

        try {
            const dataToSave: any = {
                title: formData.title,
                description: formData.description,
                image_url: formData.image_url || '',
                category: formData.category || '',
                tags: formData.tags || [],
            };

            if (selectedProject) {
                // Update
                const { error } = await supabase
                    .from('portfolio_projects')
                    .update(dataToSave)
                    .eq('id', selectedProject.id);

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }
            } else {
                // Create - set display_order to be last
                const { error } = await supabase
                    .from('portfolio_projects')
                    .insert([{
                        ...dataToSave,
                        display_order: projects.length + 1,
                    }]);

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }
            }

            await fetchProjects();
            setIsEditing(false);
            setImagePreview(null);
            setTagsInput('');
        } catch (err: any) {
            console.error('Error saving portfolio item:', err);
            const errorMessage = err.message || 'Unknown error';
            alert('Failed to save portfolio item: ' + errorMessage);
        }
    };

    const handleDelete = async (id: string) => {
        setTimeout(async () => {
            if (!window.confirm('Are you sure you want to delete this portfolio item?')) return;

            try {
                const { error } = await supabase
                    .from('portfolio_projects')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                await fetchProjects();
            } catch (err) {
                console.error('Error deleting portfolio item:', err);
                alert('Failed to delete portfolio item');
            }
        }, 0);
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage portfolio showcase projects</p>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Portfolio Item
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No portfolio projects yet. Add your first project!</p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <SortablePortfolioCard
                                    key={project.id}
                                    project={project}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

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
                                    {selectedProject ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
                                </h3>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Project Image
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
                                                    className="w-full h-64 object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setImagePreview(null);
                                                        setFormData({ ...formData, image_url: '' });
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
                                                <p className="text-xs text-gray-500 mt-2">PNG, JPG, WebP up to 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="Project Title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="Describe this project..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.category || ''}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="e.g., Wedding, Corporate, Event"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Tags (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={tagsInput}
                                        onChange={(e) => handleTagsChange(e.target.value)}
                                        placeholder="photography, wedding, outdoor"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    />
                                    {formData.tags && formData.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.tags.map((tag, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-electric/10 text-electric rounded text-xs">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
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
                                    {selectedProject ? 'Save Changes' : 'Add Portfolio Item'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Portfolio;
