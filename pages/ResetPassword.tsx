
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const { resetPassword } = useAuth();
    const hasProcessedToken = useRef(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validatingToken, setValidatingToken] = useState(true);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Prevent double execution in React Strict Mode
        if (hasProcessedToken.current) return;
        hasProcessedToken.current = true;

        const checkRecoveryToken = async () => {
            try {
                // Handle double hash: #/reset-password#access_token=...
                // We need to get everything after the second #
                const hash = window.location.hash;
                const secondHashIndex = hash.indexOf('#', 1); // Find second # (skip first one)

                let hashParams: URLSearchParams;
                if (secondHashIndex !== -1) {
                    // Extract params after second hash
                    const paramsString = hash.substring(secondHashIndex + 1);
                    hashParams = new URLSearchParams(paramsString);
                } else {
                    // No second hash, parse normally
                    hashParams = new URLSearchParams(hash.substring(1));
                }

                const accessToken = hashParams.get('access_token');
                const type = hashParams.get('type');

                if (type === 'recovery' && accessToken) {
                    // Set the session using the access token and refresh token from URL
                    const refreshToken = hashParams.get('refresh_token');

                    if (refreshToken) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });

                        if (error) {
                            console.error('Session error:', error);
                            setStatus('error');
                            setMessage('Invalid or expired reset link. Please request a new one.');
                            setValidatingToken(false);
                            return;
                        }

                        if (data.session?.user?.email) {
                            setEmail(data.session.user.email);
                            setValidatingToken(false);
                        } else {
                            setStatus('error');
                            setMessage('Invalid reset link. Missing user information.');
                            setValidatingToken(false);
                        }
                    } else {
                        setStatus('error');
                        setMessage('Invalid reset link. Missing refresh token.');
                        setValidatingToken(false);
                    }
                } else {
                    // Check if there's an error in the URL
                    const error = hashParams.get('error');
                    const errorDescription = hashParams.get('error_description');

                    if (error) {
                        setStatus('error');
                        if (error === 'access_denied' && errorDescription?.includes('expired')) {
                            setMessage('This reset link has expired. Please request a new password reset.');
                        } else {
                            setMessage(errorDescription || 'Invalid reset link.');
                        }
                    } else {
                        setStatus('error');
                        setMessage('Invalid reset link. Please request a new password reset.');
                    }
                    setValidatingToken(false);
                }
            } catch (err) {
                console.error('Error checking recovery token:', err);
                setStatus('error');
                setMessage('An error occurred. Please try again.');
                setValidatingToken(false);
            }
        };

        checkRecoveryToken();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const result = await resetPassword(email, password);
            if (result.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setMessage(result.message || 'Failed to reset password.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen py-24 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl text-center"
                >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 mb-6">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white mb-4">Password Reset!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Your password has been successfully updated. You can now log in with your new credentials.
                    </p>
                    <Link
                        to="/login"
                        className="w-full flex justify-center py-3 px-4 rounded-lg bg-electric text-white font-bold hover:bg-electric/90 shadow-lg shadow-electric/20 transition-all"
                    >
                        Go to Login
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-24 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl"
            >
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-electric/10 rounded-xl flex items-center justify-center text-electric mb-4">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">Reset Password</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Enter your new password for <span className="font-bold">{email}</span>
                    </p>
                </div>

                {validatingToken ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Validating reset link...</p>
                    </div>
                ) : status === 'error' ? (
                    <div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
                        </div>
                        <div className="mt-6 text-center">
                            <Link
                                to="/forgot-password"
                                className="text-sm font-bold text-electric hover:text-electric/80 transition-colors"
                            >
                                Request a new password reset link
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-white/10 rounded-lg leading-5 bg-white dark:bg-obsidian text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric focus:border-electric sm:text-sm transition-colors"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-white/10 rounded-lg leading-5 bg-white dark:bg-obsidian text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric focus:border-electric sm:text-sm transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-electric hover:bg-electric/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric transition-colors shadow-lg shadow-electric/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                            {!loading && (
                                <span className="absolute right-0 inset-y-0 flex items-center pr-3">
                                    <ArrowRight className="h-5 w-5 text-electric-200 group-hover:text-electric-100" />
                                </span>
                            )}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default ResetPassword;