import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, DollarSign, Clock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';

interface ServiceType {
    id: string;
    name: string;
    description: string | null;
    base_price: number | null;
    duration_hours: number | null;
    is_active: boolean;
    display_order: number;
}

const ServiceTypes: React.FC = () => {
    const [services, setServices] = useState<ServiceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingService, setEditingService] = useState<ServiceType | null>(null);
    const [formData, setFormData] = useState<Partial<ServiceType>>({
        name: '',
        description: '',
        base_price: null,
        duration_hours: null,
        is_active: true,
        display_order: 0
    });

    useEffect(() => {
        fetchServices();

        // Set up real-time subscription for auto-refresh
        const channel = supabase
            .channel('service_types_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'service_types' },
                () => fetchServices()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('service_types')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            setServices(data || []);
        } catch (err) {
            console.error('Error fetching service types:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (service: ServiceType) => {
        setEditingService(service);
        setFormData(service);
        setIsEditing(true);
    };

    const handleNew = () => {
        setEditingService(null);
        setFormData({
            name: '',
            description: '',
            base_price: null,
            duration_hours: null,
            is_active: true,
            display_order: services.length
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            if (editingService) {
                // Update existing
                const { error } = await supabase
                    .from('service_types')
                    .update(formData)
                    .eq('id', editingService.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('service_types')
                    .insert([formData]);

                if (error) throw error;
            }

            await fetchServices();
            setIsEditing(false);
            setEditingService(null);
        } catch (err) {
            console.error('Error saving service type:', err);
            alert('Failed to save service type');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service type?')) return;

        try {
            const { error } = await supabase
                .from('service_types')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchServices();
        } catch (err) {
            console.error('Error deleting service type:', err);
            alert('Failed to delete service type');
        }
    };

    const toggleActive = async (service: ServiceType) => {
        try {
            const { error } = await supabase
                .from('service_types')
                .update({ is_active: !service.is_active })
                .eq('id', service.id);

            if (error) throw error;
            await fetchServices();
        } catch (err) {
            console.error('Error toggling service status:', err);
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Types</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage available booking services</p>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Service
                </button>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <motion.div
                        key={service.id}
                        layout
                        className={`bg-white dark:bg-charcoal rounded-xl border ${service.is_active
                            ? 'border-gray-200 dark:border-white/10'
                            : 'border-gray-300 dark:border-white/20 opacity-60'
                            } p-6 hover:shadow-lg transition-all`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                                    {service.name}
                                </h3>
                                {service.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        {service.description}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => toggleActive(service)}
                                className={`p-2 rounded-lg transition-colors ${service.is_active
                                    ? 'text-green-500 hover:bg-green-500/10'
                                    : 'text-gray-400 hover:bg-gray-400/10'
                                    }`}
                            >
                                {service.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="space-y-2 mb-4">
                            {service.base_price && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="font-semibold">${service.base_price.toFixed(2)}</span>
                                </div>
                            )}
                            {service.duration_hours && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Clock className="w-4 h-4" />
                                    <span>{service.duration_hours} hours</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
                            <button
                                onClick={() => handleEdit(service)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-electric hover:bg-electric/10 rounded-lg transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(service.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-xl shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingService ? 'Edit Service Type' : 'New Service Type'}
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
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Service Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        placeholder="e.g., Wedding Photography"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric resize-none"
                                        placeholder="Brief description of the service..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Base Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.base_price || ''}
                                            onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || null })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                            placeholder="299.99"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Duration (hours)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.duration_hours || ''}
                                            onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) || null })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                            placeholder="2"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Display Order
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.display_order || 0}
                                            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Status
                                        </label>
                                        <label className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active || false}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-5 h-5 text-electric rounded focus:ring-electric"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!formData.name}
                                    className="flex items-center gap-2 px-6 py-2 bg-electric hover:bg-electric/90 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                >
                                    <Save className="w-5 h-5" />
                                    {editingService ? 'Save Changes' : 'Create Service'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ServiceTypes;
