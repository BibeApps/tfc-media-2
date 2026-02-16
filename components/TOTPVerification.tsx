import React, { useState } from 'react';
import { Shield, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

interface TOTPVerificationProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onCancel: () => void;
}

const TOTPVerification: React.FC<TOTPVerificationProps> = ({ isOpen, onClose, onSuccess, onCancel }) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Get all MFA factors
            const { data: factors } = await supabase.auth.mfa.listFactors();

            if (!factors?.totp || factors.totp.length === 0) {
                throw new Error('No TOTP factor found');
            }

            const factorId = factors.totp[0].id;

            // Create a challenge
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId
            });

            if (challengeError) throw challengeError;

            // Verify the code
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: verificationCode
            });

            if (verifyError) throw verifyError;

            // Success!
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('TOTP verification error:', err);
            setError(err.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setVerificationCode('');
        setError('');
        onClose();
    };

    const handleCancelLogin = () => {
        handleClose();
        onCancel();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-charcoal w-full max-w-md rounded-xl shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-electric/10 rounded-lg flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-electric" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Two-Factor Authentication
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Enter code from your authenticator app
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCancelLogin}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Instructions */}
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Open your authenticator app and enter the 6-digit code to complete login.
                            </p>

                            {/* Verification Code Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && verificationCode.length === 6) {
                                            handleVerify();
                                        }
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-obsidian text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-electric"
                                    placeholder="000000"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-3 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelLogin}
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerify}
                                    disabled={loading || verificationCode.length !== 6}
                                    className="flex-1 px-4 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold shadow-lg shadow-electric/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        'Verify & Login'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TOTPVerification;
