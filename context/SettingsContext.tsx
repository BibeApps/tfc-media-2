import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isConfigured } from '../supabaseClient';

interface SiteSettings {
    id: string;
    company_name: string;
    company_logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    business_address?: string;
    timezone?: string;
    site_title?: string;
    site_description?: string;
    facebook_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    linkedin_url?: string;
}

interface SettingsContextType {
    settings: SiteSettings | null;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SiteSettings = {
    id: 'default',
    company_name: 'TFC Media',
    contact_email: 'contact@tfcmediagroup.com',
    contact_phone: '(555) 123-4567',
    business_address: '123 Creative Studio Blvd, Los Angeles, CA 90012'
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SiteSettings | null>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        if (!isConfigured) {
            setSettings(DEFAULT_SETTINGS);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setSettings(data);
            } else {
                setSettings(DEFAULT_SETTINGS);
            }
        } catch (err) {
            console.error('Error fetching site settings:', err);
            setSettings(DEFAULT_SETTINGS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const refreshSettings = async () => {
        setLoading(true);
        await fetchSettings();
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
};
