import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { PortfolioProject } from '../../types';

const Portfolio: React.FC = () => {
    const [projects, setProjects] = useState<PortfolioProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
    const [formData, setFormData] = useState<Partial<PortfolioProject>>({});

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

    const handleNew = () => {
        setSelectedProject(null);
        setFormData({
            title: '',
            description: '',
            image_url: '',
            category: '',
            tags: [],
            display_order: projects.length + 1,
        });
        setIsEditing(true);
    };

    const handleEdit = (project: PortfolioProject) => {
        setSelectedProject(project);
        setFormData(project);
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            if (selectedProject) {
                const { error } = await supabase
                    .from('portfolio_projects')
                    .update(formData)
                    .eq('id', selectedProject.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('portfolio_projects')
                    .insert([formData]);

                if (error) throw error;
            }

            await fetchProjects();
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving project:', err);
            alert('Failed to save project');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const { error } = await supabase
                .from('portfolio_projects')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchProjects();
        } catch (err) {
            console.error('Error deleting project:', err);
            alert('Failed to delete project');
        }
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
                    Add Project
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No portfolio projects yet. Add your first project!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
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
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{project.title}</h3>
                                    <span className="text-xs text-gray-500">#{project.display_order}</span>
                                </div>
                                {project.category && (
                                    <p className="text-electric text-sm font-bold mb-2">{project.category}</p>
                                )}
                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{project.description}</p>
                                {project.tags && project.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {project.tags.map((tag, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded text-xs text-gray-600 dark:text-gray-400">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
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
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-charcoal">
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
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Image URL</label>
                                    <input
                                        type="text"
                                        value={formData.image_url || ''}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                                        <input
                                            type="text"
                                            value={formData.category || ''}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="e.g., Wedding, Corporate"
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Display Order</label>
                                        <input
                                            type="number"
                                            value={formData.display_order || 0}
                                            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={formData.tags?.join(', ') || ''}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()) })}
                                        placeholder="photography, wedding, outdoor"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    />
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
                                    className="px-6 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                                >
                                    {selectedProject ? 'Save Changes' : 'Add Project'}
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
