import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface Category {
    id: string;
    name: string;
}

interface SubCategory {
    id: string;
    name: string;
    category_id: string;
}

interface Event {
    id: string;
    name: string;
    event_id: string;
    date: string | null;
}

export default function GalleryEdit() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [events, setEvents] = useState<Event[]>([]);

    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingSubCategory, setEditingSubCategory] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<string | null>(null);

    const [editValue, setEditValue] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        await Promise.all([
            fetchCategories(),
            fetchSubCategories(),
            fetchEvents()
        ]);
    };

    const fetchCategories = async () => {
        const { data } = await supabase
            .from('event_categories')
            .select('*')
            .order('name');
        if (data) setCategories(data);
    };

    const fetchSubCategories = async () => {
        const { data } = await supabase
            .from('events')
            .select('*')
            .order('name');
        if (data) setSubCategories(data);
    };

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('sessions')
            .select('*')
            .order('name');
        if (data) setEvents(data);
    };

    const handleEditCategory = (id: string, currentName: string) => {
        setEditingCategory(id);
        setEditValue(currentName);
    };

    const handleEditSubCategory = (id: string, currentName: string) => {
        setEditingSubCategory(id);
        setEditValue(currentName);
    };

    const handleEditEvent = (id: string, currentName: string) => {
        setEditingEvent(id);
        setEditValue(currentName);
    };

    const handleSaveCategory = async (id: string) => {
        if (!editValue.trim()) {
            alert('Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('event_categories')
                .update({ name: editValue })
                .eq('id', id);

            if (error) throw error;

            await fetchCategories();
            setEditingCategory(null);
            setEditValue('');
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Failed to update category');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSubCategory = async (id: string) => {
        if (!editValue.trim()) {
            alert('Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('events')
                .update({ name: editValue })
                .eq('id', id);

            if (error) throw error;

            await fetchSubCategories();
            setEditingSubCategory(null);
            setEditValue('');
        } catch (error) {
            console.error('Error updating sub-category:', error);
            alert('Failed to update sub-category');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEvent = async (id: string) => {
        if (!editValue.trim()) {
            alert('Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('sessions')
                .update({ name: editValue })
                .eq('id', id);

            if (error) throw error;

            await fetchEvents();
            setEditingEvent(null);
            setEditValue('');
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Failed to update event');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditingCategory(null);
        setEditingSubCategory(null);
        setEditingEvent(null);
        setEditValue('');
    };

    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.name || 'Unknown';
    };

    const getSubCategoryName = (subCategoryId: string) => {
        return subCategories.find(sc => sc.id === subCategoryId)?.name || 'Unknown';
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gallery Editor</h1>
                <p className="text-gray-600 dark:text-gray-400">Edit category, sub-category, and event names</p>
            </div>

            <div className="space-y-8">
                {/* Categories */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Categories</h2>
                    <div className="space-y-2">
                        {categories.map(category => (
                            <div key={category.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-obsidian rounded-lg">
                                {editingCategory === category.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-charcoal border border-gray-300 dark:border-white/20 rounded-lg"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveCategory(category.id)}
                                            disabled={loading}
                                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 text-gray-900 dark:text-white font-medium">{category.name}</span>
                                        <button
                                            onClick={() => handleEditCategory(category.id, category.name)}
                                            className="p-2 bg-electric/10 hover:bg-electric/20 text-electric rounded-lg"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No categories found</p>
                        )}
                    </div>
                </div>

                {/* Sub-Categories */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sub-Categories</h2>
                    <div className="space-y-2">
                        {subCategories.map(subCategory => (
                            <div key={subCategory.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-obsidian rounded-lg">
                                {editingSubCategory === subCategory.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-charcoal border border-gray-300 dark:border-white/20 rounded-lg"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveSubCategory(subCategory.id)}
                                            disabled={loading}
                                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <p className="text-gray-900 dark:text-white font-medium">{subCategory.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Category: {getCategoryName(subCategory.category_id)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleEditSubCategory(subCategory.id, subCategory.name)}
                                            className="p-2 bg-electric/10 hover:bg-electric/20 text-electric rounded-lg"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                        {subCategories.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No sub-categories found</p>
                        )}
                    </div>
                </div>

                {/* Events */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Events</h2>
                    <div className="space-y-2">
                        {events.map(event => (
                            <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-obsidian rounded-lg">
                                {editingEvent === event.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-charcoal border border-gray-300 dark:border-white/20 rounded-lg"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveEvent(event.id)}
                                            disabled={loading}
                                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <p className="text-gray-900 dark:text-white font-medium">{event.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Sub-Category: {getSubCategoryName(event.event_id)}
                                                {event.date && ` • ${new Date(event.date).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleEditEvent(event.id, event.name)}
                                            className="p-2 bg-electric/10 hover:bg-electric/20 text-electric rounded-lg"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                        {events.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No events found</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
