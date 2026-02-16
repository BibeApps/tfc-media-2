import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

interface TOTPEnrollmentProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TOTPEnrollment: React.FC<TOTPEnrollmentProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'setup' | 'verify'>('setup');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [factorId, setFactorId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const startEnrollment = async () => {
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Authenticator App'
            });

            if (error) throw error;

            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
            setFactorId(data.id);
            setStep('verify');
        } catch (err: any) {
            setError(err.message || 'Failed to start enrollment');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: factorId,
                code: verificationCode
            });

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setStep('setup');
        setQrCode('');
        setSecret('');
        setFactorId('');
        setVerificationCode('');
        setError('');
        onClose();
    };

    React.useEffect(() => {
        if (isOpen && step === 'setup') {
            startEnrollment();
        }
    }, [isOpen]);

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
                                        Enable 2FA
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {step === 'setup' ? 'Setting up...' : 'Scan QR code'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {loading && step === 'setup' ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-electric mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">Setting up 2FA...</p>
                                </div>
                            ) : step === 'verify' ? (
                                <div className="space-y-6">
                                    {/* QR Code */}
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 dark:border-white/10 flex justify-center">
                                        {qrCode && <QRCodeSVG value={qrCode} size={200} />}
                                    </div>

                                    {/* Instructions */}
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <strong>Step 2:</strong> Or manually enter this code:
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-obsidian rounded-lg text-sm font-mono">
                                                {secret}
                                            </code>
                                            <button
                                                onClick={copySecret}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                {copied ? (
                                                    <Check className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <Copy className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Verification Code Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Enter 6-digit code from your app
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-obsidian text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-electric"
                                            placeholder="000000"
                                            autoFocus
                                        />
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-3 rounded-lg">
                                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleClose}
                                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={verifyAndEnable}
                                            disabled={loading || verificationCode.length !== 6}
                                            className="flex-1 px-4 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold shadow-lg shadow-electric/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Verifying...
                                                </>
                                            ) : (
                                                'Enable 2FA'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TOTPEnrollment;
