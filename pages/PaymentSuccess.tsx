import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Home, FileText } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const invoiceNumber = searchParams.get('invoice');
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        // Countdown timer
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-obsidian dark:to-charcoal flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-charcoal rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
            >
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="mb-6"
                >
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                </motion.div>

                {/* Success Message */}
                <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white mb-2">
                    Payment Successful!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Thank you for your payment.
                </p>

                {/* Invoice Number */}
                {invoiceNumber && (
                    <div className="bg-gray-50 dark:bg-obsidian rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs font-medium">Invoice Number</span>
                        </div>
                        <p className="text-lg font-bold text-electric">
                            {invoiceNumber}
                        </p>
                    </div>
                )}

                {/* Confirmation Message */}
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        📧 A confirmation email has been sent to your email address with your receipt and invoice details.
                    </p>
                </div>

                {/* Next Steps */}
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-2">
                        ✅ What happens next?
                    </p>
                    <ul className="text-xs text-green-700 dark:text-green-400 text-left space-y-1">
                        <li>• Your payment has been processed successfully</li>
                        <li>• You'll receive a receipt via email shortly</li>
                        <li>• If a project was created, you'll get portal access</li>
                        <li>• Check your email for login credentials (if new user)</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        Go to Home
                    </button>

                    {/* Auto-redirect notice */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Redirecting to home in {countdown} seconds...
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default PaymentSuccess;
