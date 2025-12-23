import React, { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Globe, Clock, Mail, MessageSquare, Bell, Upload, Image as ImageIcon, X, Calendar, CreditCard, Image } from 'lucide-react';
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

    // Booking Settings
    default_booking_duration: number;
    booking_buffer_time: number;
    advance_booking_limit: number;
    cancellation_policy: string | null;
    deposit_percentage: number;
    auto_confirm_bookings: boolean;
    send_booking_reminders: boolean;
    reminder_24h: boolean;
    reminder_1week: boolean;

    // Payment Settings
    stripe_publishable_key: string | null;
    stripe_secret_key: string | null;
    stripe_test_mode: boolean;
    currency: string;
    tax_rate: number;
    convenience_fee_rate: number;
    accept_credit_cards: boolean;
    accept_paypal: boolean;
    accept_deposits: boolean;
    refund_policy: string | null;

    // Gallery Settings
    max_file_size_mb: number;
    allowed_file_types: string[];
    image_quality: number;
    auto_generate_thumbnails: boolean;
    enable_watermark: boolean;
    watermark_text: string | null;
    watermark_opacity: number;
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

type TabType = 'general' | 'notifications' | 'booking' | 'payment' | 'gallery';

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

                    // Booking defaults
                    default_booking_duration: 120,
                    booking_buffer_time: 30,
                    advance_booking_limit: 90,
                    cancellation_policy: null,
                    deposit_percentage: 25.00,
                    auto_confirm_bookings: false,
                    send_booking_reminders: true,
                    reminder_24h: true,
                    reminder_1week: true,

                    // Payment defaults
                    stripe_publishable_key: null,
                    stripe_secret_key: null,
                    stripe_test_mode: true,
                    currency: 'USD',
                    tax_rate: 0.00,
                    convenience_fee_rate: 0.00,
                    accept_credit_cards: true,
                    accept_paypal: false,
                    accept_deposits: true,
                    refund_policy: null,

                    // Gallery defaults
                    max_file_size_mb: 10,
                    allowed_file_types: ['jpg', 'jpeg', 'png', 'webp'],
                    image_quality: 85,
                    auto_generate_thumbnails: true,
                    enable_watermark: false,
                    watermark_text: null,
                    watermark_opacity: 0.50,
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

            // Save site settings (General, Booking, Payment, Gallery tabs all use siteSettings)
            if (['general', 'booking', 'payment', 'gallery'].includes(activeTab) && siteSettings) {
                // Check if this is an existing record (has a valid UUID)
                const isExistingRecord = siteSettings.id && siteSettings.id.length > 0;

                if (isExistingRecord) {
                    // Update existing record
                    const { error } = await supabase
                        .from('site_settings')
                        .update(siteSettings)
                        .eq('id', siteSettings.id);
                    if (error) throw error;
                } else {
                    // Insert new record - remove id field to let database generate it
                    const { id, ...settingsWithoutId } = siteSettings;
                    const { data, error } = await supabase
                        .from('site_settings')
                        .insert([settingsWithoutId])
                        .select()
                        .single();
                    if (error) throw error;
                    if (data) setSiteSettings(data);
                }
            }

            // Save notification settings
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
                    <button
                        onClick={() => setActiveTab('booking')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-colors ${activeTab === 'booking'
                            ? 'border-electric text-electric'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <Calendar className="w-5 h-5" />
                        Booking
                    </button>
                    <button
                        onClick={() => setActiveTab('payment')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-colors ${activeTab === 'payment'
                            ? 'border-electric text-electric'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <CreditCard className="w-5 h-5" />
                        Payment
                    </button>
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-colors ${activeTab === 'gallery'
                            ? 'border-electric text-electric'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <Image className="w-5 h-5" />
                        Gallery
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

                                {/* Company Logo Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Company Logo
                                    </label>
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${dragActive
                                            ? 'border-electric bg-electric/5'
                                            : 'border-gray-300 dark:border-white/20 hover:border-electric'
                                            }`}
                                    >
                                        {(logoPreview || siteSettings.company_logo_url) ? (
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={logoPreview || siteSettings.company_logo_url || ''}
                                                    alt="Company Logo"
                                                    className="w-32 h-32 object-contain rounded-lg border border-gray-200 dark:border-white/10"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                        Logo uploaded successfully
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setSiteSettings({ ...siteSettings, company_logo_url: null });
                                                            setLogoPreview(null);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Remove Logo
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="flex justify-center mb-3">
                                                    <div className="p-3 bg-electric/10 rounded-lg">
                                                        <ImageIcon className="w-8 h-8 text-electric" />
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    Drag and drop your logo here, or
                                                </p>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            handleLogoUpload(e.target.files[0]);
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="logo-upload"
                                                />
                                                <label
                                                    htmlFor="logo-upload"
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

                {activeTab === 'booking' && siteSettings && (
                    <div className="space-y-6">
                        {/* General Booking Configuration */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Calendar className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Booking Configuration</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Set default booking parameters</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Default Duration (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min="15"
                                        max="480"
                                        value={siteSettings.default_booking_duration}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, default_booking_duration: parseInt(e.target.value) || 120 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Buffer Time (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={siteSettings.booking_buffer_time}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, booking_buffer_time: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Advance Booking Limit (days)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={siteSettings.advance_booking_limit}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, advance_booking_limit: parseInt(e.target.value) || 90 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Deposit Percentage (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={siteSettings.deposit_percentage}
                                    onChange={(e) => setSiteSettings({ ...siteSettings, deposit_percentage: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Policies */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Bell className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Policies & Automation</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure booking policies</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Cancellation Policy
                                    </label>
                                    <textarea
                                        value={siteSettings.cancellation_policy || ''}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, cancellation_policy: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white resize-none"
                                        placeholder="Describe your cancellation policy..."
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Auto-Confirm Bookings</label>
                                        <p className="text-xs text-gray-500">Automatically confirm new bookings without manual approval</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={siteSettings.auto_confirm_bookings}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, auto_confirm_bookings: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reminders */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Mail className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Booking Reminders</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure automatic reminders</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Enable Reminders</label>
                                        <p className="text-xs text-gray-500">Send automated booking reminders to clients</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={siteSettings.send_booking_reminders}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, send_booking_reminders: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>

                                {siteSettings.send_booking_reminders && (
                                    <div className="pl-4 space-y-3">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={siteSettings.reminder_24h}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, reminder_24h: e.target.checked })}
                                                className="w-4 h-4 text-electric rounded focus:ring-electric"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">24-hour reminder</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={siteSettings.reminder_1week}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, reminder_1week: e.target.checked })}
                                                className="w-4 h-4 text-electric rounded focus:ring-electric"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1-week reminder</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payment' && siteSettings && (
                    <div className="space-y-6">
                        {/* Stripe Configuration */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Stripe Configuration</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure payment processing</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Publishable Key
                                    </label>
                                    <input
                                        type="text"
                                        value={siteSettings.stripe_publishable_key || ''}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, stripe_publishable_key: e.target.value })}
                                        placeholder="pk_live_..."
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Secret Key
                                    </label>
                                    <input
                                        type="password"
                                        value={siteSettings.stripe_secret_key || ''}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, stripe_secret_key: e.target.value })}
                                        placeholder="sk_live_..."
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white font-mono text-sm"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Test Mode</label>
                                        <p className="text-xs text-gray-500">Use Stripe test keys for development</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {siteSettings.stripe_test_mode && (
                                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-bold rounded">TEST</span>
                                        )}
                                        <input
                                            type="checkbox"
                                            checked={siteSettings.stripe_test_mode}
                                            onChange={(e) => setSiteSettings({ ...siteSettings, stripe_test_mode: e.target.checked })}
                                            className="w-5 h-5 text-electric rounded focus:ring-electric"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Configuration */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Pricing & Fees</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure pricing parameters</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Currency
                                    </label>
                                    <select
                                        value={siteSettings.currency}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, currency: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    >
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="CAD">CAD - Canadian Dollar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Tax Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={siteSettings.tax_rate}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, tax_rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Convenience Fee (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={siteSettings.convenience_fee_rate}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, convenience_fee_rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Options */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Payment Options</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Enable payment methods</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Accept Credit Cards</label>
                                    <input
                                        type="checkbox"
                                        checked={siteSettings.accept_credit_cards}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, accept_credit_cards: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Accept PayPal</label>
                                    <input
                                        type="checkbox"
                                        checked={siteSettings.accept_paypal}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, accept_paypal: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Accept Deposits</label>
                                    <input
                                        type="checkbox"
                                        checked={siteSettings.accept_deposits}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, accept_deposits: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Refund Policy */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Bell className="w-6 h-6 text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Refund Policy</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Define your refund terms</p>
                                </div>
                            </div>

                            <textarea
                                value={siteSettings.refund_policy || ''}
                                onChange={(e) => setSiteSettings({ ...siteSettings, refund_policy: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white resize-none"
                                placeholder="Describe your refund policy..."
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'gallery' && siteSettings && (
                    <div className="space-y-6">
                        {/* Upload Limits */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Upload className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Upload Limits</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure file upload restrictions</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Max File Size (MB): {siteSettings.max_file_size_mb}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        value={siteSettings.max_file_size_mb}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, max_file_size_mb: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                        Allowed File Types
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].map((type) => (
                                            <label key={type} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-obsidian rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-obsidian/80">
                                                <input
                                                    type="checkbox"
                                                    checked={siteSettings.allowed_file_types.includes(type)}
                                                    onChange={(e) => {
                                                        const types = e.target.checked
                                                            ? [...siteSettings.allowed_file_types, type]
                                                            : siteSettings.allowed_file_types.filter(t => t !== type);
                                                        setSiteSettings({ ...siteSettings, allowed_file_types: types });
                                                    }}
                                                    className="w-4 h-4 text-electric rounded focus:ring-electric"
                                                />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Image Processing */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Image className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Image Processing</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure image optimization</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Image Quality: {siteSettings.image_quality}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={siteSettings.image_quality}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, image_quality: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Auto-Generate Thumbnails</label>
                                        <p className="text-xs text-gray-500">Automatically create thumbnail versions</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={siteSettings.auto_generate_thumbnails}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, auto_generate_thumbnails: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Watermark */}
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <ImageIcon className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Watermark Settings</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Add watermark to images</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Enable Watermark</label>
                                    <input
                                        type="checkbox"
                                        checked={siteSettings.enable_watermark}
                                        onChange={(e) => setSiteSettings({ ...siteSettings, enable_watermark: e.target.checked })}
                                        className="w-5 h-5 text-electric rounded focus:ring-electric"
                                    />
                                </div>

                                {siteSettings.enable_watermark && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                Watermark Text
                                            </label>
                                            <input
                                                type="text"
                                                value={siteSettings.watermark_text || ''}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, watermark_text: e.target.value })}
                                                placeholder="© TFC Media"
                                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                Opacity: {Math.round(siteSettings.watermark_opacity * 100)}%
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={siteSettings.watermark_opacity}
                                                onChange={(e) => setSiteSettings({ ...siteSettings, watermark_opacity: parseFloat(e.target.value) })}
                                                className="w-full"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Settings;
