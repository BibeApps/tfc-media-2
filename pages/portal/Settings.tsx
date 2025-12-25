
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { User, Bell, Shield, CreditCard, Lock, HelpCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Settings: React.FC = () => {
    const { user, updateProfile, resetPassword } = useAuth();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const isFirstLogin = searchParams.get('firstLogin') === 'true';

    // State for interactive toggles
    const [tfaEnabled, setTfaEnabled] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // Form States
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        company: user?.company || '',
        phone: user?.phone || '',
        address: user?.address || '',
        email: user?.email || '',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90012'
    });

    const [passwordForm, setPasswordForm] = useState({
        new: '',
        confirm: ''
    });

    // Sync form with user data
    useEffect(() => {
        if (user) {
            setProfileForm(prev => ({
                ...prev,
                name: user.name,
                company: user.company || '',
                phone: user.phone || '',
                address: user.address || '',
                city: user.city || '',
                state: user.state || '',
                zip: user.zip || '',
                email: user.email
            }));
        }
    }, [user]);

    // Handlers
    const handleSaveProfile = async () => {
        if (!user) return;
        const { success, message } = await updateProfile(user.id, {
            name: profileForm.name,
            company: profileForm.company,
            phone: profileForm.phone,
            address: profileForm.address,
            city: profileForm.city,
            state: profileForm.state,
            zip: profileForm.zip
        });
        alert(message);
    };

    const handleUpdatePassword = async () => {
        if (passwordForm.new !== passwordForm.confirm) {
            alert("New passwords do not match.");
            return;
        }
        if (!user?.email) return;

        const { success, message } = await resetPassword(user.email, passwordForm.new);
        alert(message);
        if (success) {
            setPasswordForm({ new: '', confirm: '' });
        }
    };

    const handleForgotPassword = () => {
        alert("A password reset link has been sent to your email address.");
    };

    return (
        <div className="max-w-4xl space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>

            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-white/5">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <User className="w-5 h-5 text-electric" /> Profile Information
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-black overflow-hidden relative group cursor-pointer">
                            <img src={user?.avatar} className="w-full h-full object-cover" alt="Profile" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                Change
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{user?.name}</h3>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                            <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                            <input type="text" value={profileForm.company} onChange={e => setProfileForm({ ...profileForm, company: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input type="email" value={profileForm.email} readOnly className="w-full bg-gray-100 dark:bg-obsidian/50 border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-500 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                            <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: formatPhoneNumber(e.target.value) })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                            <input type="text" value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-900 dark:text-white" placeholder="Street address" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                            <input type="text" value={profileForm.city} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-900 dark:text-white" placeholder="City" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                            <input type="text" value={profileForm.state} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-900 dark:text-white" placeholder="State" maxLength={2} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code</label>
                            <input type="text" value={profileForm.zip} onChange={e => setProfileForm({ ...profileForm, zip: e.target.value })} className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 text-gray-900 dark:text-white" placeholder="ZIP Code" maxLength={10} />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-obsidian/30 text-right">
                    <button onClick={handleSaveProfile} className="bg-electric text-white px-6 py-2 rounded-lg font-bold hover:bg-electric/90 transition-colors">Save Changes</button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                {/* Notifications Section */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-6 h-full">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-4">
                        <Bell className="w-5 h-5 text-cyber" /> Notifications
                    </h2>
                    <div className="space-y-4">
                        {['Project Updates', 'New Message Alerts', 'Marketing Emails', 'Download Reminders'].map(item => (
                            <div key={item} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{item}</span>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" name="toggle" defaultChecked className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-green-400" />
                                    <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"></label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-6 h-full flex flex-col">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-6">
                        <Shield className="w-5 h-5 text-green-500" /> Security
                    </h2>
                    <div className="space-y-6 flex-1">
                        {/* First Login Alert */}
                        {isFirstLogin && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-bold text-yellow-800 dark:text-yellow-300 mb-1">Welcome! Please change your password</p>
                                    <p className="text-yellow-700 dark:text-yellow-400">For security reasons, please change your temporary password to secure your account.</p>
                                </div>
                            </div>
                        )}

                        {/* Change Password */}
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Change Password</label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type={showNewPass ? "text" : "password"}
                                        value={passwordForm.new}
                                        onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                        placeholder="New Password"
                                        className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPass(!showNewPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showConfirmPass ? "text" : "password"}
                                        value={passwordForm.confirm}
                                        onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                        placeholder="Confirm Password"
                                        className="w-full bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg p-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-electric outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-xs text-electric font-bold hover:underline flex items-center gap-1"
                            >
                                <HelpCircle className="w-3 h-3" /> Forgot Password?
                            </button>
                        </div>

                        <hr className="border-gray-100 dark:border-white/5" />

                        {/* 2FA */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Two-Factor Authentication</span>
                                <button
                                    onClick={() => setTfaEnabled(!tfaEnabled)}
                                    className={`w-10 h-5 rounded-full flex items-center transition-colors p-1 ${tfaEnabled ? 'bg-electric' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${tfaEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Protect your account by requiring an additional code sent to your device when logging in.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 space-y-3">
                        <button
                            onClick={handleUpdatePassword}
                            className="w-full bg-electric hover:bg-electric/90 text-white font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-electric/20"
                        >
                            Save Security Settings
                        </button>
                        <button className="w-full text-center py-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
