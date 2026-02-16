import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Upload, X, Loader2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { TeamMember } from '../../types';
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

interface SortableTeamCardProps {
    member: TeamMember;
    onEdit: (member: TeamMember) => void;
    onDelete: (id: string) => void;
}

const SortableTeamCard: React.FC<SortableTeamCardProps> = ({ member, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: member.id });

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
            <div className="aspect-square bg-gray-200 dark:bg-obsidian relative overflow-hidden">
                {member.image_url ? (
                    <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-400">
                        {member.name.charAt(0)}
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
                            onClick={() => onEdit(member)}
                            className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-electric hover:text-white transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(member.id)}
                            className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{member.name}</h3>
                <p className="text-electric text-sm font-bold mb-2">{member.title}</p>
                {member.bio && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">{member.bio}</p>
                )}
            </div>
        </div>
    );
};

const Team: React.FC = () => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [formData, setFormData] = useState<Partial<TeamMember>>({});
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('display_order');

            if (error) throw error;
            setTeam(data || []);
        } catch (err) {
            console.error('Error fetching team:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = team.findIndex((item) => item.id === active.id);
            const newIndex = team.findIndex((item) => item.id === over.id);

            const newTeam = arrayMove(team, oldIndex, newIndex);

            // Update display_order for all items
            const updatedTeam = newTeam.map((member, index) => ({
                ...member,
                display_order: index + 1,
            }));

            setTeam(updatedTeam);

            // Save new order to database
            try {
                const updates = updatedTeam.map((member) =>
                    supabase
                        .from('team_members')
                        .update({ display_order: member.display_order })
                        .eq('id', member.id)
                );

                await Promise.all(updates);
            } catch (err) {
                console.error('Error updating order:', err);
                // Revert on error
                fetchTeam();
            }
        }
    };

    const handleNew = () => {
        setSelectedMember(null);
        setFormData({
            name: '',
            title: '',
            bio: '',
            image_url: '',
        });
        setImagePreview(null);
        setIsEditing(true);
    };

    const handleEdit = (member: TeamMember) => {
        setSelectedMember(member);
        setFormData(member);
        setImagePreview(member.image_url);
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
            const filePath = `team/${fileName}`;

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

    const handleSave = async () => {
        if (!formData.name || !formData.title) {
            alert('Please fill in name and title');
            return;
        }

        try {
            const dataToSave: any = {
                name: formData.name,
                title: formData.title,
                image_url: formData.image_url || '',
            };

            // Only include bio if it has a value
            if (formData.bio) {
                dataToSave.bio = formData.bio;
            }

            if (selectedMember) {
                // Update
                const { error } = await supabase
                    .from('team_members')
                    .update(dataToSave)
                    .eq('id', selectedMember.id);

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }
            } else {
                // Create - set display_order to be last
                const { error } = await supabase
                    .from('team_members')
                    .insert([{
                        ...dataToSave,
                        display_order: team.length + 1,
                    }]);

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }
            }

            await fetchTeam();
            setIsEditing(false);
            setImagePreview(null);
        } catch (err: any) {
            console.error('Error saving team member:', err);
            const errorMessage = err.message || 'Unknown error';

            // Check if it's a bio column error
            if (errorMessage.includes('bio') || errorMessage.includes('column')) {
                alert('Database schema issue: The bio field may not exist in the database yet. Please run the migration script or contact your administrator.\n\nError: ' + errorMessage);
            } else {
                alert('Failed to save team member: ' + errorMessage);
            }
        }
    };

    const handleDelete = async (id: string) => {
        setTimeout(async () => {
            if (!window.confirm('Are you sure you want to delete this team member?')) return;

            try {
                const { error } = await supabase
                    .from('team_members')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                await fetchTeam();
            } catch (err) {
                console.error('Error deleting team member:', err);
                alert('Failed to delete team member');
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage team members for About Us page</p>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Member
                </button>
            </div>

            {team.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-gray-500">No team members yet. Add your first member!</p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={team.map(m => m.id)} strategy={verticalListSortingStrategy}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {team.map((member) => (
                                <SortableTeamCard
                                    key={member.id}
                                    member={member}
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
                                    {selectedMember ? 'Edit Team Member' : 'Add Team Member'}
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
                                        Profile Photo
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
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="John Doe"
                                    />
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
                                        placeholder="Lead Photographer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        value={formData.bio || ''}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="Tell us about this team member..."
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
                                    disabled={uploading}
                                    className="px-6 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {selectedMember ? 'Save Changes' : 'Add Member'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Team;
