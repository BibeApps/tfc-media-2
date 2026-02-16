import { createClient } from '@supabase/supabase-js';

// This file should ONLY be used in secure server-side contexts
// For Vite apps, this means it should be called from a backend API
// DO NOT import this in client-side code

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase service role credentials');
}

// Create a Supabase client with the service role key
// This client bypasses Row Level Security (RLS) policies
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Delete a user from both Supabase Auth and the profiles table
 * @param userId - The user's UUID
 * @returns Promise with success status and optional error message
 */
export async function deleteUserCompletely(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete from Supabase Auth (this should cascade to profiles if configured)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            throw authError;
        }

        // Also explicitly delete from profiles table as a fallback
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.warn('Profile deletion warning:', profileError);
            // Don't throw here since auth deletion succeeded
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message || 'Failed to delete user' };
    }
}
