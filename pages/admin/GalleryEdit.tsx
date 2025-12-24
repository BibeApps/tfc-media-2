import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Trash2, Loader2, MoveRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import {
    checkEventDependencies,
    checkSubCategoryDependencies,
    checkCategoryDependencies,
    deleteEventWithMedia,
    deleteSubCategory,
    deleteCategory,
    moveEvent,
    moveSubCategory,
    DependencyCheckResult
} from '../../utils/galleryDependencies';
import {
    DeleteWarningModal,
    MoveEventModal,
    MoveSubCategoryModal
} from '../../components/GalleryModals';

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

    // Delete/Move modals state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteModalType, setDeleteModalType] = useState<'event' | 'subcategory' | 'category'>('event');
    const [deleteModalItem, setDeleteModalItem] = useState<any>(null);
    const [deleteDependencies, setDeleteDependencies] = useState<DependencyCheckResult | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [moveEventModalOpen, setMoveEventModalOpen] = useState(false);
    const [moveEventItem, setMoveEventItem] = useState<Event | null>(null);
    const [isMovingEvent, setIsMovingEvent] = useState(false);

    const [moveSubCategoryModalOpen, setMoveSubCategoryModalOpen] = useState(false);
    const [moveSubCategoryItem, setMoveSubCategoryItem] = useState<SubCategory | null>(null);
    const [moveSubCategoryDeps, setMoveSubCategoryDeps] = useState({ events: 0, mediaItems: 0 });
    const [isMovingSubCategory, setIsMovingSubCategory] = useState(false);

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

    // Delete handlers
    const handleDeleteClick = async (type: 'event' | 'subcategory' | 'category', item: any) => {
        setDeleteModalType(type);
        setDeleteModalItem(item);

        // Check dependencies
        let deps: DependencyCheckResult;
        if (type === 'event') {
            deps = await checkEventDependencies(item.id);
        } else if (type === 'subcategory') {
            deps = await checkSubCategoryDependencies(item.id);
        } else {
            deps = await checkCategoryDependencies(item.id);
        }

        setDeleteDependencies(deps);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteModalItem) return;

        setIsDeleting(true);
        let result;

        if (deleteModalType === 'event') {
            result = await deleteEventWithMedia(deleteModalItem.id);
        } else if (deleteModalType === 'subcategory') {
            result = await deleteSubCategory(deleteModalItem.id);
        } else {
            result = await deleteCategory(deleteModalItem.id);
        }

        setIsDeleting(false);

        if (result.success) {
            // Refresh data
            if (deleteModalType === 'event') {
                await fetchEvents();
            } else if (deleteModalType === 'subcategory') {
                await fetchSubCategories();
            } else if (deleteModalType === 'category') {
                await fetchCategories();
            }

            setDeleteModalOpen(false);
            setDeleteModalItem(null);
            alert(`${deleteModalType.charAt(0).toUpperCase() + deleteModalType.slice(1)} deleted successfully!`);
        } else {
            alert(`Failed to delete: ${result.error}`);
        }
    };

    // Move handlers
    const handleMoveEventClick = (event: Event) => {
        setMoveEventItem(event);
        setMoveEventModalOpen(true);
    };

    const handleConfirmMoveEvent = async (newSubCategoryId: string) => {
        if (!moveEventItem) return;

        setIsMovingEvent(true);
        const result = await moveEvent(moveEventItem.id, newSubCategoryId);
        setIsMovingEvent(false);

        if (result.success) {
            await fetchEvents();
            setMoveEventModalOpen(false);
            setMoveEventItem(null);
            alert('Event moved successfully!');
        } else {
            alert(`Failed to move event: ${result.error}`);
        }
    };

    const handleMoveSubCategoryClick = async (subCategory: SubCategory) => {
        // Get dependency counts
        const deps = await checkSubCategoryDependencies(subCategory.id);
        setMoveSubCategoryDeps({
            events: deps.dependencies.events || 0,
            mediaItems: deps.dependencies.mediaItems || 0
        });

        setMoveSubCategoryItem(subCategory);
        setMoveSubCategoryModalOpen(true);
    };

    const handleConfirmMoveSubCategory = async (newCategoryId: string) => {
        if (!moveSubCategoryItem) return;

        setIsMovingSubCategory(true);
        const result = await moveSubCategory(moveSubCategoryItem.id, newCategoryId);
        setIsMovingSubCategory(false);

        if (result.success) {
            await fetchSubCategories();
            setMoveSubCategoryModalOpen(false);
            setMoveSubCategoryItem(null);
            alert('Sub category moved successfully!');
        } else {
            alert(`Failed to move sub category: ${result.error}`);
        }
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
                                        <button
                                            onClick={() => handleDeleteClick('category', category)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
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
                                        <button
                                            onClick={() => handleMoveSubCategoryClick(subCategory)}
                                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg"
                                        >
                                            <MoveRight className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick('subcategory', subCategory)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
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
                                        <button
                                            onClick={() => handleMoveEventClick(event)}
                                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg"
                                        >
                                            <MoveRight className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick('event', event)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
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

            {/* Delete Warning Modal */}
            <DeleteWarningModal
                isOpen={deleteModalOpen}
                type={deleteModalType}
                itemName={deleteModalItem?.name || ''}
                dependencies={deleteDependencies || { canDelete: false, requiresWarning: true, dependencies: {}, message: '' }}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setDeleteModalItem(null);
                }}
                isDeleting={isDeleting}
            />

            {/* Move Event Modal */}
            <MoveEventModal
                isOpen={moveEventModalOpen}
                eventName={moveEventItem?.name || ''}
                currentSubCategoryId={moveEventItem?.event_id || ''}
                subCategories={subCategories}
                categories={categories}
                onMove={handleConfirmMoveEvent}
                onCancel={() => {
                    setMoveEventModalOpen(false);
                    setMoveEventItem(null);
                }}
                isMoving={isMovingEvent}
            />

            {/* Move Sub Category Modal */}
            <MoveSubCategoryModal
                isOpen={moveSubCategoryModalOpen}
                subCategoryName={moveSubCategoryItem?.name || ''}
                currentCategoryId={moveSubCategoryItem?.category_id || ''}
                categories={categories}
                dependencyCounts={moveSubCategoryDeps}
                onMove={handleConfirmMoveSubCategory}
                onCancel={() => {
                    setMoveSubCategoryModalOpen(false);
                    setMoveSubCategoryItem(null);
                }}
                isMoving={isMovingSubCategory}
            />
        </div>
    );
}
