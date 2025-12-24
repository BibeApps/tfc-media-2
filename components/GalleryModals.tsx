import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2, MoveRight, Loader2 } from 'lucide-react';
import { DependencyCheckResult } from '../utils/galleryDependencies';

// Delete Warning Modal
interface DeleteWarningModalProps {
    isOpen: boolean;
    type: 'event' | 'subcategory' | 'category';
    itemName: string;
    dependencies: DependencyCheckResult;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
}

export const DeleteWarningModal: React.FC<DeleteWarningModalProps> = ({
    isOpen,
    type,
    itemName,
    dependencies,
    onConfirm,
    onCancel,
    isDeleting = false
}) => {
    if (!isOpen) return null;

    const { canDelete, dependencies: deps, message } = dependencies;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className={`p-6 border-b border-gray-200 dark:border-white/10 ${!canDelete ? 'bg-red-50 dark:bg-red-500/10' : 'bg-yellow-50 dark:bg-yellow-500/10'}`}>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${!canDelete ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-500'}`} />
                                <div>
                                    <h2 className={`text-xl font-bold ${!canDelete ? 'text-red-900 dark:text-red-300' : 'text-yellow-900 dark:text-yellow-300'}`}>
                                        {!canDelete ? 'Cannot Delete' : 'Confirm Delete'}
                                    </h2>
                                    <p className={`text-sm mt-1 ${!canDelete ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                                        {type === 'event' ? 'Event' : type === 'subcategory' ? 'Sub Category' : 'Category'}: <span className="font-bold">{itemName}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-gray-700 dark:text-gray-300">{message}</p>

                            {deps && (
                                <div className="bg-gray-50 dark:bg-obsidian rounded-lg p-4 space-y-2">
                                    {deps.subCategories !== undefined && deps.subCategories > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Sub Categories:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{deps.subCategories}</span>
                                        </div>
                                    )}
                                    {deps.events !== undefined && deps.events > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Events:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{deps.events}</span>
                                        </div>
                                    )}
                                    {deps.mediaItems !== undefined && deps.mediaItems > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Media Items:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{deps.mediaItems}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!canDelete && (
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-700 dark:text-red-400">
                                        Please move or delete all {type === 'category' ? 'sub categories' : 'events'} first.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-obsidian flex gap-3">
                            <button
                                onClick={onCancel}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 font-medium transition-colors disabled:opacity-50"
                            >
                                {canDelete ? 'Cancel' : 'Close'}
                            </button>
                            {canDelete && (
                                <button
                                    onClick={onConfirm}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Delete {type === 'event' && deps.mediaItems ? 'Everything' : ''}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Move Event Modal
interface MoveEventModalProps {
    isOpen: boolean;
    eventName: string;
    currentSubCategoryId: string;
    subCategories: Array<{ id: string; name: string; category_id: string }>;
    categories: Array<{ id: string; name: string }>;
    onMove: (newSubCategoryId: string) => void;
    onCancel: () => void;
    isMoving?: boolean;
}

export const MoveEventModal: React.FC<MoveEventModalProps> = ({
    isOpen,
    eventName,
    currentSubCategoryId,
    subCategories,
    categories,
    onMove,
    onCancel,
    isMoving = false
}) => {
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState(currentSubCategoryId);

    useEffect(() => {
        setSelectedSubCategoryId(currentSubCategoryId);
    }, [currentSubCategoryId]);

    if (!isOpen) return null;

    // Group sub categories by category
    const groupedSubCategories = categories.map(category => ({
        category,
        subCategories: subCategories.filter(sc => sc.category_id === category.id)
    })).filter(group => group.subCategories.length > 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Move Event</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{eventName}</p>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 max-h-96 overflow-y-auto space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Select the new sub category for this event:
                            </p>

                            {groupedSubCategories.map(({ category, subCategories: subs }) => (
                                <div key={category.id} className="space-y-2">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {category.name}
                                    </h3>
                                    <div className="space-y-1">
                                        {subs.map(subCategory => (
                                            <label
                                                key={subCategory.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedSubCategoryId === subCategory.id
                                                    ? 'border-electric bg-electric/5'
                                                    : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                                    } ${subCategory.id === currentSubCategoryId ? 'opacity-50' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="subCategory"
                                                    value={subCategory.id}
                                                    checked={selectedSubCategoryId === subCategory.id}
                                                    onChange={() => setSelectedSubCategoryId(subCategory.id)}
                                                    disabled={subCategory.id === currentSubCategoryId}
                                                    className="w-4 h-4 text-electric"
                                                />
                                                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                                                    {subCategory.name}
                                                    {subCategory.id === currentSubCategoryId && (
                                                        <span className="ml-2 text-xs text-gray-500">(Current)</span>
                                                    )}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-obsidian flex gap-3">
                            <button
                                onClick={onCancel}
                                disabled={isMoving}
                                className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onMove(selectedSubCategoryId)}
                                disabled={isMoving || selectedSubCategoryId === currentSubCategoryId}
                                className="flex-1 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isMoving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Moving...
                                    </>
                                ) : (
                                    <>
                                        <MoveRight className="w-4 h-4" />
                                        Move Event
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Move Sub Category Modal
interface MoveSubCategoryModalProps {
    isOpen: boolean;
    subCategoryName: string;
    currentCategoryId: string;
    categories: Array<{ id: string; name: string }>;
    dependencyCounts: { events: number; mediaItems: number };
    onMove: (newCategoryId: string) => void;
    onCancel: () => void;
    isMoving?: boolean;
}

export const MoveSubCategoryModal: React.FC<MoveSubCategoryModalProps> = ({
    isOpen,
    subCategoryName,
    currentCategoryId,
    categories,
    dependencyCounts,
    onMove,
    onCancel,
    isMoving = false
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState(currentCategoryId);

    useEffect(() => {
        setSelectedCategoryId(currentCategoryId);
    }, [currentCategoryId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Move Sub Category</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subCategoryName}</p>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-2">
                                    This will move:
                                </p>
                                <div className="space-y-1 text-sm text-blue-600 dark:text-blue-400">
                                    <div>• 1 sub category</div>
                                    <div>• {dependencyCounts.events} event{dependencyCounts.events !== 1 ? 's' : ''}</div>
                                    <div>• {dependencyCounts.mediaItems} media item{dependencyCounts.mediaItems !== 1 ? 's' : ''}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Select the new category:
                                </p>
                                <div className="space-y-1">
                                    {categories.map(category => (
                                        <label
                                            key={category.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedCategoryId === category.id
                                                ? 'border-electric bg-electric/5'
                                                : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                                } ${category.id === currentCategoryId ? 'opacity-50' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="category"
                                                value={category.id}
                                                checked={selectedCategoryId === category.id}
                                                onChange={() => setSelectedCategoryId(category.id)}
                                                disabled={category.id === currentCategoryId}
                                                className="w-4 h-4 text-electric"
                                            />
                                            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                                                {category.name}
                                                {category.id === currentCategoryId && (
                                                    <span className="ml-2 text-xs text-gray-500">(Current)</span>
                                                )}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-obsidian flex gap-3">
                            <button
                                onClick={onCancel}
                                disabled={isMoving}
                                className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onMove(selectedCategoryId)}
                                disabled={isMoving || selectedCategoryId === currentCategoryId}
                                className="flex-1 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isMoving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Moving...
                                    </>
                                ) : (
                                    <>
                                        <MoveRight className="w-4 h-4" />
                                        Move All
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
