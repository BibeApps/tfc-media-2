import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { Search, Plus, X, Mail, Phone, Building, DollarSign, ShoppingBag, Calendar, Edit, Trash2, Loader2, UserPlus, Shield, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { createUser } from '../../utils/userManagement';

// First admin email - this user cannot be deleted
const FIRST_ADMIN_EMAIL = 'admin@tfcmedia.com';

interface Client {
    id: string;
    email: string;
    name: string;
    phone: string;
    company: string;
    total_spent: number;
    member_since: string;
    status: string;
    city: string;
    state: string;
}

const Clients: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'admin'>('all');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<Partial<Client>>({});
    const [createdPassword, setCreatedPassword] = useState<string | null>(null);
    const [addUserData, setAddUserData] = useState({
        email: '',
        name: '',
        role: 'client' as 'admin' | 'client',
        phone: '',
        company: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: 'USA'
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('member_since', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (client: Client) => {
        setSelectedClient(client);
        setFormData(client);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!selectedClient) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    company: formData.company,
                    city: formData.city,
                    state: formData.state,
                    status: formData.status,
                })
                .eq('id', selectedClient.id);

            if (error) throw error;

            await fetchClients();
            setIsEditing(false);
            setSelectedClient(null);
        } catch (err) {
            console.error('Error updating client:', err);
            alert('Failed to update client');
        }
    };

    const handleDelete = async (id: string) => {
        // Use setTimeout to ensure Chrome doesn't block the confirm dialog
        setTimeout(async () => {
            if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

            try {
                setLoading(true);
                // Call the Edge Function to delete the user securely
                const { data, error } = await supabase.functions.invoke('delete-user', {
                    body: { userId: id }
                });

                if (error) throw error;

                if (!data.success) {
                    throw new Error(data.error || 'Failed to delete user');
                }

                await fetchClients();
                alert('User deleted successfully from both Auth and profiles');
            } catch (err: any) {
                console.error('Error deleting user:', err);
                alert(`Failed to delete user: ${err.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        }, 0);
    };

    const handleAddUser = async () => {
        if (!addUserData.email || !addUserData.name) {
            alert('Please fill in all required fields (Name and Email)');
            return;
        }

        try {
            setLoading(true);
            const result = await createUser(addUserData);

            if (result.success) {
                setCreatedPassword(result.tempPassword || null);
                await fetchClients();
                // Don't close modal yet - show password to admin
            } else {
                alert(`Failed to create user: ${result.error}`);
            }
        } catch (err) {
            console.error('Error adding user:', err);
            alert('Failed to add user');
        } finally {
            setLoading(false);
        }
    };

    const closeAddModal = () => {
        setIsAdding(false);
        setCreatedPassword(null);
        setAddUserData({
            email: '',
            name: '',
            role: 'client',
            phone: '',
            company: '',
            address: '',
            city: '',
            state: '',
            zip: '',
            country: 'USA'
        });
    };

    const filteredClients = clients.filter(client => {
        const matchesSearch =
            client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.company?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
        const matchesRole = roleFilter === 'all' || (client as any).role === roleFilter;

        return matchesSearch && matchesStatus && matchesRole;
    });

    const totalRevenue = clients.reduce((sum, client) => sum + (client.total_spent || 0), 0);
    const activeClients = clients.filter(c => c.status === 'active').length;

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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage clients and admin users</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors shadow-lg shadow-electric/20"
                >
                    <UserPlus className="w-5 h-5" />
                    Add User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <ShoppingBag className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Clients</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <Calendar className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Active Clients</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeClients}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-electric/10 rounded-lg">
                            <DollarSign className="w-6 h-6 text-electric" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalRevenue.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as 'all' | 'client' | 'admin')}
                    className="px-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                >
                    <option value="all">All Roles</option>
                    <option value="client">Clients</option>
                    <option value="admin">Admins</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="onboarding">Onboarding</option>
                </select>
            </div>

            {/* Clients Table */}
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-obsidian border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{client.name || 'N/A'}</p>
                                                <p className="text-sm text-gray-500">{client.city}, {client.state}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Mail className="w-4 h-4" />
                                                    {client.email}
                                                </div>
                                                {client.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <Phone className="w-4 h-4" />
                                                        {client.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <Building className="w-4 h-4" />
                                                {client.company || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {(client as any).role === 'admin' ? (
                                                    <>
                                                        <Shield className="w-4 h-4 text-purple-500" />
                                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                                                            Admin
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <User className="w-4 h-4 text-blue-500" />
                                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                                                            Client
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-electric">${(client.total_spent || 0).toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                                client.status === 'inactive' ? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400' :
                                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                                }`}>
                                                {client.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(client)}
                                                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-electric hover:bg-electric/10 rounded-lg transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {client.email !== FIRST_ADMIN_EMAIL && (
                                                    <button
                                                        onClick={() => handleDelete(client.id)}
                                                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-charcoal w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-charcoal z-10">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New User</h3>
                                <button
                                    onClick={closeAddModal}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {createdPassword ? (
                                // Success screen with password
                                <div className="p-6 space-y-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <UserPlus className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">User Created Successfully!</h4>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                                            The user has been created and an activation email has been sent.
                                        </p>
                                    </div>

                                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="font-bold text-amber-900 dark:text-amber-200 mb-2">Temporary Password</p>
                                                <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                                                    Save this password securely. The user will need to reset it upon first login.
                                                </p>
                                                <div className="bg-white dark:bg-obsidian rounded-lg p-3 font-mono text-lg font-bold text-gray-900 dark:text-white border border-amber-300 dark:border-amber-500/30">
                                                    {createdPassword}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-blue-900 dark:text-blue-200 mb-1">Next Steps</p>
                                                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                                                    <li>User will receive an activation email at <strong>{addUserData.email}</strong></li>
                                                    <li>They must click the link to activate their account</li>
                                                    <li>Status will change from "Onboarding" to "Active" after activation</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={closeAddModal}
                                            className="px-6 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Add user form
                                <>
                                    <div className="p-6 space-y-6">
                                        {/* Role Selection */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                                User Role <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setAddUserData({ ...addUserData, role: 'client' })}
                                                    className={`p-4 rounded-lg border-2 transition-all ${addUserData.role === 'client'
                                                        ? 'border-electric bg-electric/10 dark:bg-electric/20'
                                                        : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                                        }`}
                                                >
                                                    <User className={`w-8 h-8 mx-auto mb-2 ${addUserData.role === 'client' ? 'text-electric' : 'text-gray-400'}`} />
                                                    <p className="font-bold text-gray-900 dark:text-white">Client</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Customer access only</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddUserData({ ...addUserData, role: 'admin' })}
                                                    className={`p-4 rounded-lg border-2 transition-all ${addUserData.role === 'admin'
                                                        ? 'border-electric bg-electric/10 dark:bg-electric/20'
                                                        : 'border-gray-200 dark:border-white/10 hover:border-electric/50'
                                                        }`}
                                                >
                                                    <Shield className={`w-8 h-8 mx-auto mb-2 ${addUserData.role === 'admin' ? 'text-electric' : 'text-gray-400'}`} />
                                                    <p className="font-bold text-gray-900 dark:text-white">Admin</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Full system access</p>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                    Full Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={addUserData.name}
                                                    onChange={(e) => setAddUserData({ ...addUserData, name: e.target.value })}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                    Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={addUserData.email}
                                                    onChange={(e) => setAddUserData({ ...addUserData, email: e.target.value })}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                                                <input
                                                    type="tel"
                                                    value={addUserData.phone}
                                                    onChange={(e) => setAddUserData({ ...addUserData, phone: formatPhoneNumber(e.target.value) })}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company</label>
                                                <input
                                                    type="text"
                                                    value={addUserData.company}
                                                    onChange={(e) => setAddUserData({ ...addUserData, company: e.target.value })}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                    placeholder="Company Name"
                                                />
                                            </div>
                                        </div>

                                        {/* Address Info */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Address</label>
                                                <input
                                                    type="text"
                                                    value={addUserData.address}
                                                    onChange={(e) => setAddUserData({ ...addUserData, address: e.target.value })}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                    placeholder="123 Main St"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">City</label>
                                                    <input
                                                        type="text"
                                                        value={addUserData.city}
                                                        onChange={(e) => setAddUserData({ ...addUserData, city: e.target.value })}
                                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                        placeholder="New York"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">State</label>
                                                    <input
                                                        type="text"
                                                        value={addUserData.state}
                                                        onChange={(e) => setAddUserData({ ...addUserData, state: e.target.value })}
                                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                        placeholder="NY"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ZIP</label>
                                                    <input
                                                        type="text"
                                                        value={addUserData.zip}
                                                        onChange={(e) => setAddUserData({ ...addUserData, zip: e.target.value })}
                                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                                        placeholder="10001"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-charcoal">
                                        <button
                                            onClick={closeAddModal}
                                            className="px-6 py-2 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddUser}
                                            disabled={!addUserData.email || !addUserData.name || loading}
                                            className="px-6 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4" />
                                                    Create User
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && selectedClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-xl shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Client</h3>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company</label>
                                        <input
                                            type="text"
                                            value={formData.company || ''}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">City</label>
                                        <input
                                            type="text"
                                            value={formData.city || ''}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">State</label>
                                        <input
                                            type="text"
                                            value={formData.state || ''}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                        <select
                                            value={formData.status || 'active'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="onboarding">Onboarding</option>
                                        </select>
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
                                    className="px-6 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Clients;
