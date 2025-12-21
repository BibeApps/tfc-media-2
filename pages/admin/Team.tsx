import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Upload, X, Loader2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { TeamMember } from '../../types';

const Team: React.FC = () => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [formData, setFormData] = useState<Partial<TeamMember>>({});

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

    const handleNew = () => {
        setSelectedMember(null);
        setFormData({
            name: '',
            title: '',
            bio: '',
            photo: '',
            display_order: team.length + 1,
        });
        setIsEditing(true);
    };

    const handleEdit = (member: TeamMember) => {
        setSelectedMember(member);
        setFormData(member);
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            if (selectedMember) {
                // Update
                const { error } = await supabase
                    .from('team_members')
                    .update(formData)
                    .eq('id', selectedMember.id);

                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('team_members')
                    .insert([formData]);

                if (error) throw error;
            }

            await fetchTeam();
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving team member:', err);
            alert('Failed to save team member');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this team member?')) return;

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {team.map((member) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden group"
                        >
                            <div className="aspect-square bg-gray-200 dark:bg-obsidian relative overflow-hidden">
                                {member.photo ? (
                                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-400">
                                        {member.name.charAt(0)}
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(member)}
                                        className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-electric hover:text-white transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(member.id)}
                                        className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{member.name}</h3>
                                <p className="text-electric text-sm font-bold mb-2">{member.title}</p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">{member.bio}</p>
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
                            className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-xl shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
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
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    />
                                </div>

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
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                                    <textarea
                                        value={formData.bio || ''}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Photo URL</label>
                                    <input
                                        type="text"
                                        value={formData.photo || ''}
                                        onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                                        placeholder="https://example.com/photo.jpg"
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

                            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
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
