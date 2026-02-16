import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Parse the hash fragment for tokens
                // Handle double hash: #/auth/callback#access_token=...
                const hash = window.location.hash;
                const secondHashIndex = hash.indexOf('#', 1);
                const tokenHash = secondHashIndex > 0 ? hash.substring(secondHashIndex + 1) : hash.substring(1);

                const hashParams = new URLSearchParams(tokenHash);
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                // If we have tokens in the URL, set the session
                if (accessToken && refreshToken) {
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (setSessionError) throw setSessionError;
                }

                // Now get the session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;

                if (session?.user) {
                    // Check if profile exists
                    let { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError && profileError.code !== 'PGRST116') {
                        throw profileError;
                    }

                    // If no profile exists, create one
                    if (!profile) {
                        const { error: insertError } = await supabase
                            .from('profiles')
                            .insert([{
                                id: session.user.id,
                                email: session.user.email,
                                name: session.user.user_metadata.full_name || session.user.email?.split('@')[0],
                                avatar: session.user.user_metadata.avatar_url || session.user.user_metadata.picture,
                                role: 'client',
                                oauth_provider: session.user.app_metadata.provider
                            }]);

                        if (insertError) throw insertError;

                        // Fetch the newly created profile
                        const { data: newProfile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();

                        profile = newProfile;
                    }

                    // Redirect based on role using hash navigation
                    const redirectPath = profile?.role === 'admin' ? '#/admin' : '#/portal';
                    window.location.hash = redirectPath;
                } else {
                    // No session, redirect to login
                    window.location.hash = '#/login';
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
                window.location.hash = '#/login?error=oauth_failed';
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-obsidian">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-electric mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Completing sign in...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
