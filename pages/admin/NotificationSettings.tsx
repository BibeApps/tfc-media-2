import React, { useState, useEffect } from 'react';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { Save, Loader2, Mail, MessageSquare, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';

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

const Notifications: React.FC = () => {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notification_settings')
                .select('*')
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (err) {
            console.error('Error fetching settings:', err);
            // Create default settings if none exist
            setSettings({
                id: '',
                email_enabled: true,
                email_from_name: 'TFC Media',
                email_from_address: 'notifications@tfcmedia.com',
                sms_enabled: false,
                twilio_account_sid: '',
                twilio_auth_token: '',
                twilio_phone_number: '',
                notifications: {
                    order_placed: { email: true, sms: false, recipients: ['client'] },
                    booking_created: { email: true, sms: false, recipients: ['admin'] },
                    order_completed: { email: true, sms: false, recipients: ['client'] },
                    booking_confirmed: { email: true, sms: false, recipients: ['client'] },
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        try {
            setSaving(true);

            if (settings.id) {
                const { error } = await supabase
                    .from('notification_settings')
                    .update(settings)
                    .eq('id', settings.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('notification_settings')
                    .insert([settings]);

                if (error) throw error;
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

    if (!settings) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400">Configure email and SMS notifications</p>
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
                            checked={settings.email_enabled}
                            onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })}
                            className="w-5 h-5 text-electric rounded focus:ring-electric"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">From Name</label>
                            <input
                                type="text"
                                value={settings.email_from_name}
                                onChange={(e) => setSettings({ ...settings, email_from_name: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">From Address</label>
                            <input
                                type="email"
                                value={settings.email_from_address}
                                onChange={(e) => setSettings({ ...settings, email_from_address: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
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
                            checked={settings.sms_enabled}
                            onChange={(e) => setSettings({ ...settings, sms_enabled: e.target.checked })}
                            className="w-5 h-5 text-electric rounded focus:ring-electric"
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Twilio Account SID</label>
                            <input
                                type="text"
                                value={settings.twilio_account_sid}
                                onChange={(e) => setSettings({ ...settings, twilio_account_sid: e.target.value })}
                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Twilio Auth Token</label>
                            <input
                                type="password"
                                value={settings.twilio_auth_token}
                                onChange={(e) => setSettings({ ...settings, twilio_auth_token: e.target.value })}
                                placeholder="••••••••••••••••••••••••••••••••"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Twilio Phone Number</label>
                            <input
                                type="tel"
                                value={settings.twilio_phone_number}
                                onChange={(e) => setSettings({ ...settings, twilio_phone_number: formatPhoneNumber(e.target.value) })}
                                placeholder="+1234567890"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
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
                    {Object.entries(settings.notifications).map(([event, config]) => (
                        <div key={event} className="p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                            <h4 className="font-bold text-gray-900 dark:text-white mb-3 capitalize">
                                {event.replace(/_/g, ' ')}
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={config.email}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            notifications: {
                                                ...settings.notifications,
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
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            notifications: {
                                                ...settings.notifications,
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
    );
};

export default Notifications;
