import React, { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Globe, Clock, Mail, MessageSquare, Bell, Upload, Image as ImageIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

interface SiteSettings {
    id: string;
    company_name: string;
    company_logo_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    business_address: string | null;
    timezone: string;
    site_title: string;
    site_description: string;
    meta_keywords: string[];
    facebook_url: string | null;
    instagram_url: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    business_hours: any;
}

interface NotificationSettings {
    id: string;
    email_enabled: boolean;
    email_from_name: string;
    email_from_address: string;
    sms_enabled: boolean;
    twilio_account_sid: string;
    twilio_auth_token: string;
    twilio_phone_number: string;
    notifications: {
        [key: string]: {
            email: boolean;
            sms: boolean;
            recipients: string[];
        };
    };
}

type TabType = 'general' | 'notifications';

const TIMEZONES = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
];

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);

            // Fetch site settings
            const { data: siteData, error: siteError } = await supabase
                .from('site_settings')
                .select('*')
                .single();

            if (siteError && siteError.code !== 'PGRST116') throw siteError;

            if (siteData) {
                setSiteSettings(siteData);
            } else {
                // Create default settings
                setSiteSettings({
                    id: '',
                    company_name: 'TFC Media',
                    company_logo_url: null,
                    contact_email: 'contact@tfcmediagroup.com',
                    contact_phone: '',
                    business_address: '',
                    timezone: 'America/New_York',
                    site_title: 'TFC Media - Professional Photography & Videography',
                    site_description: 'Capturing your special moments with professional photography and videography services',
                    meta_keywords: ['photography', 'videography', 'events', 'weddings'],
                    facebook_url: null,
                    instagram_url: null,
                    twitter_url: null,
                    linkedin_url: null,
                    business_hours: {},
                });
            }

            // Fetch notification settings
            const { data: notifData, error: notifError } = await supabase
                .from('notification_settings')
                .select('*')
                .single();

            if (notifError && notifError.code !== 'PGRST116') throw notifError;

            if (notifData) {
                setNotificationSettings(notifData);
            } else {
                setNotificationSettings({
                    id: '',
                    email_enabled: true,
                    email_from_name: 'TFC Media',
                    email_from_address: 'noreply@tfcmediagroup.com',
                    sms_enabled: false,
                    twilio_account_sid: '',
                    twilio_auth_token: '',
                    twilio_phone_number: '',
                    notifications: {
                        order_placed: { email: true, sms: false, recipients: ['client'] },
                        booking_created: { email: true, sms: false, recipients: ['admin'] },
                        order_completed: { email: true, sms: false, recipients: ['client'] },
                        booking_confirmed: { email: true, sms: false, recipients: ['client'] },
                        project_created: { email: true, sms: false, recipients: ['client'] },
                        project_updated: { email: true, sms: false, recipients: ['client'] },
                    },
                });
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (file: File) => {
        if (!siteSettings) return;

        try {
            setUploading(true);

            // Validate file
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload a PNG, JPG, or WebP image');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('thumbnails')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(filePath);

            // Update settings
            setSiteSettings({ ...siteSettings, company_logo_url: publicUrl });
            setLogoPreview(publicUrl);

        } catch (err) {
            console.error('Error uploading logo:', err);
            alert('Failed to upload logo');
        } finally {
            setUploading(false);
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleLogoUpload(e.dataTransfer.files[0]);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            if (activeTab === 'general' && siteSettings) {
                if (siteSettings.id) {
                    const { error } = await supabase
                        .from('site_settings')
                        .update(siteSettings)
                        .eq('id', siteSettings.id);
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase
                        .from('site_settings')
                        .insert([siteSettings])
                        .select()
                        .single();
                    if (error) throw error;
                    if (data) setSiteSettings(data);
                }
            }

            if (activeTab === 'notifications' && notificationSettings) {
                if (notificationSettings.id) {
                    const { error } = await supabase
                        .from('notification_settings')
                        .update(notificationSettings)
                        .eq('id', notificationSettings.id);
                    if (error) throw error;
                } else {
                    const { data, error } = await supabase
                        .from('notification_settings')
                        .insert([notificationSettings])
                        .select()
                        .single();
                    if (error) throw error;
                    if (data) setNotificationSettings(data);
                }
            }

            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your application settings</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Settings
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-white/10">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-colors ${activeTab === 'general'
                            ? 'border-electric text-electric'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <Building2 className="w-5 h-5" />
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-colors ${activeTab === 'notifications'
                            ? 'border-electric text-electric'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <Bell className="w-5 h-5" />
                        Notifications
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === 'general' && siteSettings && (
                    <div className="space-y-6">
                        {/* Company Information */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-electric/10 rounded-lg">
                                    <Building2 className="w-6 h-6 text-electric" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Company Information</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Basic company details</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={siteSettings.company_name}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, company_name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="TFC Media"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Contact Email
                                        </label>
                                        <input
                                            type="email"
                                            value={siteSettings.contact_email || ''}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="contact@tfcmediagroup.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Contact Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={siteSettings.contact_phone || ''}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, contact_phone: formatPhoneNumber(e.target.value) })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Business Address
                                    </label>
                                    <textarea
                                        value={siteSettings.business_address || ''}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, business_address: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white resize-none"
                                        placeholder="123 Main St, City, State 12345"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Timezone
                                    </label>
                                    <select
                                        value={siteSettings.timezone}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, timezone: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    >
                                        {TIMEZONES.map((tz) => (
                                            <option key={tz} value={tz}>
                                                {tz.replace('_', ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Website Settings */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Globe className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Website Settings</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">SEO and site information</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Site Title
                                    </label>
                                    <input
                                        type="text"
                                        value={siteSettings.site_title}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, site_title: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="TFC Media - Professional Photography & Videography"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Site Description
                                    </label>
                                    <textarea
                                        value={siteSettings.site_description}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, site_description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white resize-none"
                                        placeholder="Capturing your special moments..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Meta Keywords (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={siteSettings.meta_keywords?.join(', ') || ''}
                                        onChange={(e) => setSiteSettings({
                                            ...siteSettings,
                                            meta_keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                                        })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        placeholder="photography, videography, events, weddings"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Facebook URL
                                        </label>
                                        <input
                                            type="url"
                                            value={siteSettings.facebook_url || ''}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, facebook_url: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="https://facebook.com/tfcmedia"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Instagram URL
                                        </label>
                                        <input
                                            type="url"
                                            value={siteSettings.instagram_url || ''}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, instagram_url: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="https://instagram.com/tfcmedia"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Twitter URL
                                        </label>
                                        <input
                                            type="url"
                                            value={siteSettings.twitter_url || ''}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, twitter_url: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="https://twitter.com/tfcmedia"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            LinkedIn URL
                                        </label>
                                        <input
                                            type="url"
                                            value={siteSettings.linkedin_url || ''}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, linkedin_url: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            placeholder="https://linkedin.com/company/tfcmedia"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && notificationSettings && (
                    <div className="space-y-6">
                        {/* Email Settings */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Mail className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Email Notifications</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure Resend email settings</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Enable Email Notifications</label>
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.email_enabled}
                                        onChange={(e) => setNotificationSettings({ ...notificationSettings, email_enabled: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">From Name</label>
                                        <input
                                            type="text"
                                            value={notificationSettings.email_from_name}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, email_from_name: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">From Address</label>
                                        <input
                                            type="email"
                                            value={notificationSettings.email_from_address}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, email_from_address: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SMS Settings */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <MessageSquare className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">SMS Notifications</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure Twilio SMS settings</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Enable SMS Notifications</label>
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.sms_enabled}
                                        onChange={(e) => setNotificationSettings({ ...notificationSettings, sms_enabled: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Twilio Account SID</label>
                                        <input
                                            type="text"
                                            value={notificationSettings.twilio_account_sid}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, twilio_account_sid: e.target.value })}
                                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Twilio Auth Token</label>
                                        <input
                                            type="password"
                                            value={notificationSettings.twilio_auth_token}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, twilio_auth_token: e.target.value })}
                                            placeholder="••••••••••••••••••••••••••••••••"
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Twilio Phone Number</label>
                                        <input
                                            type="tel"
                                            value={notificationSettings.twilio_phone_number}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, twilio_phone_number: formatPhoneNumber(e.target.value) })}
                                            placeholder="+1234567890"
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notification Events */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-electric/10 rounded-lg">
                                    <Bell className="w-6 h-6 text-electric" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Notification Events</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure which events trigger notifications</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(notificationSettings.notifications).map(([event, config]) => (
                                    <div key={event} className="p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 capitalize">
                                            {event.replace(/_/g, ' ')}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={config.email}
                                                    onChange={(e) => setNotificationSettings({
                                                        ...notificationSettings,
                                                        notifications: {
                                                            ...notificationSettings.notifications,
                                                            [event]: { ...config, email: e.target.checked }
                                                        }
                                                    })}
                                                    className="w-4 h-4 text-electric rounded focus:ring-electric"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={config.sms}
                                                    onChange={(e) => setNotificationSettings({
                                                        ...notificationSettings,
                                                        notifications: {
                                                            ...notificationSettings.notifications,
                                                            [event]: { ...config, sms: e.target.checked }
                                                        }
                                                    })}
                                                    className="w-4 h-4 text-electric rounded focus:ring-electric"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">SMS</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Settings;
