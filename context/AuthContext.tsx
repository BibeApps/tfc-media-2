
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClientUser } from '../types';
import { supabase, isConfigured } from '../supabaseClient';

interface AuthContextType {
  user: ClientUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; requiresPasswordChange?: boolean }>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (id: string, updates: Partial<ClientUser>) => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo mode is ONLY available in development builds
const IS_DEV = import.meta.env.DEV;

const DEMO_ADMIN: ClientUser = {
  id: 'demo-admin',
  name: 'Admin User',
  email: 'admin@tfcmedia.com',
  role: 'admin',
  accountType: 'vip',
  status: 'active',
  avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0EA5E9&color=fff',
  totalSpent: 0,
  memberSince: new Date().toISOString()
};

const DEMO_CLIENT: ClientUser = {
  id: 'demo-client',
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  role: 'client',
  company: 'Creative Co.',
  accountType: 'customer',
  status: 'active',
  avatar: 'https://ui-avatars.com/api/?name=Alex+Doe&background=A855F7&color=fff',
  totalSpent: 1250,
  memberSince: '2023-05-15'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to map DB result to ClientUser type
  const mapUser = (data: any): ClientUser => ({
    id: data.id,
    email: data.email,
    name: data.name,
    company: data.company,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random`,
    role: data.role as 'admin' | 'client',
    accountType: (data.account_type as any) || 'customer',
    status: data.status || 'active', // Use status from DB, default to active if missing
    totalSpent: data.total_spent || 0,
    memberSince: data.member_since,
    // Notification preferences
    notification_project_updates: data.notification_project_updates ?? true,
    notification_messages: data.notification_messages ?? true,
    notification_marketing: data.notification_marketing ?? true,
    notification_downloads: data.notification_downloads ?? true,
  });

  const checkSession = async () => {
    // 1. Check for Demo Sessions (ONLY in development mode)
    if (IS_DEV) {
      const storedDemoId = localStorage.getItem('tfc_demo_user_id');
      if (storedDemoId === 'demo-admin') {
        setUser(DEMO_ADMIN);
        setLoading(false);
        return;
      }
      if (storedDemoId === 'demo-client') {
        setUser(DEMO_CLIENT);
        setLoading(false);
        return;
      }
    }

    // 2. Check Real Supabase Session
    if (isConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
          // Fetch profile details
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && !error) {
            setUser(mapUser(profile));
          } else {
            // Fallback if profile missing but auth exists
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata.name || 'User',
              role: session.user.user_metadata.role || 'client',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email || '')}`,
              company: '',
              accountType: 'customer',
              status: 'active',
              totalSpent: 0,
              memberSince: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        // Only clear if we aren't using a demo user
        if (!localStorage.getItem('tfc_demo_user_id')) {
          setUser(null);
        }
      } else {
        // Reload profile on auth state change (like sign in)
        checkSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim();

    // 1. Check Demo Credentials (ONLY in development mode)
    if (IS_DEV) {
      if (cleanEmail === 'admin@tfcmedia.com' && password === 'admin') {
        setUser(DEMO_ADMIN);
        localStorage.setItem('tfc_demo_user_id', 'demo-admin');
        return { success: true };
      }

      if (cleanEmail === 'alex.doe@example.com' && password === 'client') {
        setUser(DEMO_CLIENT);
        localStorage.setItem('tfc_demo_user_id', 'demo-client');
        return { success: true };
      }
    }

    // 2. Attempt Supabase Auth Login
    if (isConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          return { success: false, message: error.message };
        }

        // Fetch user profile to check status
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile && !profileError) {
            const isOnboarding = profile.status === 'onboarding';

            // Update status to active if this is first login
            if (isOnboarding) {
              await supabase
                .from('profiles')
                .update({ status: 'active' })
                .eq('id', data.user.id);
            }

            // Clear demo flag if real login successful
            localStorage.removeItem('tfc_demo_user_id');
            return { success: true, requiresPasswordChange: isOnboarding };
          }
        }

        // Clear demo flag if real login successful
        localStorage.removeItem('tfc_demo_user_id');
        return { success: true };

      } catch (err: any) {
        console.warn("Login failed:", err);
        return { success: false, message: err.message || 'Login failed.' };
      }
    }

    return { success: false, message: 'Database not configured.' };
  };



  const logout = async () => {
    localStorage.removeItem('tfc_demo_user_id');
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {


    if (isConfigured) {
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/#/reset-password',
        });

        if (error) throw error;
        return { success: true, message: 'Reset instructions sent to email.' };
      } catch (err: any) {
        console.error('Password reset error:', err);
        return { success: false, message: err.message || 'Failed to send reset email.' };
      }
    }
    return { success: false, message: 'Database not configured.' };
  };

  const resetPassword = async (email: string, newPassword: string) => {
    if (IS_DEV && (email === 'admin@tfcmedia.com' || email === 'alex.doe@example.com')) {
      return { success: true, message: 'Password updated successfully.' };
    }

    if (isConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { success: true, message: 'Password updated successfully.' };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to update password.' };
      }
    }
    return { success: false, message: 'Database not configured.' };
  };

  const updateProfile = async (id: string, updates: Partial<ClientUser>) => {
    // Handling Demo Mode (dev only)
    if (IS_DEV && (id === 'demo-admin' || id === 'demo-client')) {
      setUser(prev => prev ? ({ ...prev, ...updates }) : null);
      return { success: true, message: "Profile updated (Demo Mode)" };
    }

    if (isConfigured) {
      try {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.company) dbUpdates.company = updates.company;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.address) dbUpdates.address = updates.address;
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.state !== undefined) dbUpdates.state = updates.state;
        if (updates.zip !== undefined) dbUpdates.zip = updates.zip;
        // Notification preferences
        if (updates.notification_project_updates !== undefined) dbUpdates.notification_project_updates = updates.notification_project_updates;
        if (updates.notification_messages !== undefined) dbUpdates.notification_messages = updates.notification_messages;
        if (updates.notification_marketing !== undefined) dbUpdates.notification_marketing = updates.notification_marketing;
        if (updates.notification_downloads !== undefined) dbUpdates.notification_downloads = updates.notification_downloads;

        const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);

        if (error) throw error;

        setUser(prev => prev ? ({ ...prev, ...updates }) : null);
        return { success: true, message: "Profile updated successfully." };
      } catch (err: any) {
        console.error("Update profile error:", err);
        return { success: false, message: err.message };
      }
    }
    return { success: false, message: 'Database not configured.' };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, requestPasswordReset, resetPassword, updateProfile, isAuthenticated: !!user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
