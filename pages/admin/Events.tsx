import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, Search, FolderOpen, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventCategory, Event } from '../../types';
import { supabase } from '../../supabaseClient';

const Events: React.FC = () => {
    const [categories, setCategories] = useState<EventCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchEvents(selectedCategory.id);
        }
    }, [selectedCategory]);

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
        } finally {
            setLoading(false);
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

    const handleSaveCategory = async (category: Partial<EventCategory>) => {
        try {
            if (editingCategory) {
                const { error } = await supabase
                    .from('event_categories')
                    .update(category)
                    .eq('id', editingCategory.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('event_categories')
                    .insert([category]);
                if (error) throw error;
            }

            fetchCategories();
            setShowCategoryModal(false);
            setEditingCategory(null);
        } catch (err) {
            console.error('Error saving category:', err);
        }
    };

    const handleSaveEvent = async (event: Partial<Event>) => {
        try {
            const eventData = {
                ...event,
                category_id: selectedCategory?.id,
            };

            if (editingEvent) {
                const { error } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', editingEvent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('events')
                    .insert([eventData]);
                if (error) throw error;
            }

            if (selectedCategory) {
                fetchEvents(selectedCategory.id);
            }
            setShowEventModal(false);
            setEditingEvent(null);
        } catch (err) {
            console.error('Error saving event:', err);
        }
    };

    const handleArchiveCategory = async (id: string) => {
        try {
            const { error } = await supabase
                .from('event_categories')
                .update({ archived: true })
                .eq('id', id);

            if (error) throw error;
            fetchCategories();
            if (selectedCategory?.id === id) {
                setSelectedCategory(null);
            }
        } catch (err) {
            console.error('Error archiving category:', err);
        }
    };

    const handleArchiveEvent = async (id: string) => {
        try {
            const { error } = await supabase
                .from('events')
                .update({ archived: true })
                .eq('id', id);

            if (error) throw error;
            if (selectedCategory) {
                fetchEvents(selectedCategory.id);
            }
        } catch (err) {
            console.error('Error archiving event:', err);
        }
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Management</h1>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setShowCategoryModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Category
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Categories List */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Categories</h2>
                        {filteredCategories.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No categories found</div>
                        ) : (
                            filteredCategories.map((category) => (
                                <motion.div
                                    key={category.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`bg-white dark:bg-charcoal rounded-xl border-2 p-4 cursor-pointer transition-all ${selectedCategory?.id === category.id
                                            ? 'border-electric shadow-lg shadow-electric/20'
                                            : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                        }`}
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    <div className="flex items-start gap-4">
                                        {category.thumbnail && (
                                            <img
                                                src={category.thumbnail}
                                                alt={category.name}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 dark:text-white">{category.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{category.description}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCategory(category);
                                                    setShowCategoryModal(true);
                                                }}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Archive this category?')) {
                                                        handleArchiveCategory(category.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Archive className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Events List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {selectedCategory ? `Events in ${selectedCategory.name}` : 'Select a category'}
                            </h2>
                            {selectedCategory && (
                                <button
                                    onClick={() => {
                                        setEditingEvent(null);
                                        setShowEventModal(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-electric hover:bg-electric/90 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Event
                                </button>
                            )}
                        </div>

                        {selectedCategory ? (
                            events.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    No events in this category
                                </div>
                            ) : (
                                events.map((event) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-4 hover:border-electric/50 transition-all"
                                    >
                                        <div className="flex items-start gap-4">
                                            {event.thumbnail && (
                                                <img
                                                    src={event.thumbnail}
                                                    alt={event.name}
                                                    className="w-16 h-16 rounded-lg object-cover"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 dark:text-white">{event.name}</h3>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                    <Calendar className="w-4 h-4" />
                                                    {event.date}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingEvent(event);
                                                        setShowEventModal(true);
                                                    }}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4 text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Archive this event?')) {
                                                            handleArchiveEvent(event.id);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <Archive className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                Select a category to view events
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Category Modal */}
            <AnimatePresence>
                {showCategoryModal && (
                    <CategoryModal
                        category={editingCategory}
                        onClose={() => {
                            setShowCategoryModal(false);
                            setEditingCategory(null);
                        }}
                        onSave={handleSaveCategory}
                    />
                )}
            </AnimatePresence>

            {/* Event Modal */}
            <AnimatePresence>
                {showEventModal && (
                    <EventModal
                        event={editingEvent}
                        onClose={() => {
                            setShowEventModal(false);
                            setEditingEvent(null);
                        }}
                        onSave={handleSaveEvent}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Category Modal Component
const CategoryModal: React.FC<{
    category: EventCategory | null;
    onClose: () => void;
    onSave: (category: Partial<EventCategory>) => void;
}> = ({ category, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: category?.name || '',
        slug: category?.slug || '',
        description: category?.description || '',
        thumbnail: category?.thumbnail || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10">
                    <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                        {category ? 'Edit Category' : 'New Category'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Category Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Thumbnail URL
                        </label>
                        <input
                            type="url"
                            value={formData.thumbnail}
                            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Event Modal Component
const EventModal: React.FC<{
    event: Event | null;
    onClose: () => void;
    onSave: (event: Partial<Event>) => void;
}> = ({ event, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: event?.name || '',
        slug: event?.slug || '',
        date: event?.date || '',
        thumbnail: event?.thumbnail || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10">
                    <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                        {event ? 'Edit Event' : 'New Event'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Event Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Event Date
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Thumbnail URL
                        </label>
                        <input
                            type="url"
                            value={formData.thumbnail}
                            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Events;
