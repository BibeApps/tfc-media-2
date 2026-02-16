import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, CreditCard, Calendar, FileText, DollarSign, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Invoice } from '../types';
import { formatDate } from '../utils/dateFormatter';

// Validates that a payment token is well-formed: alphanumeric, hyphens, underscores, 20-200 chars
const isValidPaymentToken = (token: string): boolean => {
    const tokenRegex = /^[a-zA-Z0-9\-_]{20,200}$/;
    return tokenRegex.test(token);
};

const PayInvoice: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [isPartialRequest, setIsPartialRequest] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('No payment token provided');
            setLoading(false);
            return;
        }
        if (!isValidPaymentToken(token)) {
            setError('Invalid payment token format');
            setLoading(false);
            return;
        }
        fetchInvoice();
    }, [token, location]);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    service_type:service_types(name, description)
                `)
                .eq('payment_token', token)
                .single();

            if (fetchError) throw fetchError;

            if (!data) {
                setError('Invoice not found');
                return;
            }

            // Check if already paid
            if (data.status === 'fully_paid') {
                setError('This invoice has already been paid in full');
                return;
            }

            setInvoice(data);

            // Determine payment amount from URL query param
            const queryParams = new URLSearchParams(location.search);
            const requestedAmount = parseFloat(queryParams.get('amount') || '0');

            if (requestedAmount > 0 && requestedAmount <= data.amount_due) {
                setPaymentAmount(requestedAmount);
                setIsPartialRequest(true);
            } else {
                setPaymentAmount(data.amount_due);
                setIsPartialRequest(false);
            }

        } catch (err: any) {
            console.error('Error fetching invoice:', err);
            setError(err.message || 'Failed to load invoice');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!invoice) return;

        try {
            setProcessing(true);
            setError(null);

            // Create Stripe checkout session for invoice
            // Uses paymentAmount which might be less than amount_due
            const { data, error: sessionError } = await supabase.functions.invoke('create-invoice-checkout', {
                body: {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoice_number,
                    amount: paymentAmount, // Use the determined amount
                    clientEmail: invoice.client_email,
                    clientName: invoice.client_name,
                    title: invoice.title,
                    successUrl: `${window.location.origin}/#/payment-success?invoice=${invoice.invoice_number}`,
                    cancelUrl: window.location.href, // Reload current page on cancel
                },
            });

            if (sessionError) throw sessionError;

            if (!data?.url) {
                throw new Error('No checkout URL returned');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url;
        } catch (err: any) {
            console.error('Error creating checkout session:', err);
            setError(err.message || 'Failed to initiate payment');
            setProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'fully_paid':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
            case 'partial_paid':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
            case 'overdue':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default:
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-obsidian flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-electric" />
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-obsidian flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-charcoal rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unavailable</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Invoice not found'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-obsidian py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto"
            >
                <div className="bg-white dark:bg-charcoal rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-white/10">
                    {/* Header */}
                    <div className="bg-electric p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h1 className="text-3xl font-heading font-bold mb-2">Invoice {invoice.invoice_number}</h1>
                            <p className="opacity-90">Issued on {formatDate(invoice.created_at)}</p>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    </div>

                    <div className="p-8">
                        {/* Status Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                            <div className={`px-4 py-2 rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                                {invoice.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Due</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">${invoice.total_amount.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Client Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200 dark:border-white/10">
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
                                <p className="text-lg font-medium text-gray-900 dark:text-white">{invoice.client_name}</p>
                                <p className="text-gray-600 dark:text-gray-400">{invoice.client_email}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">For Services</h3>
                                <p className="text-lg font-medium text-gray-900 dark:text-white">{invoice.service_type?.name || 'Photography Services'}</p>
                                <p className="text-gray-600 dark:text-gray-400">{invoice.title}</p>
                            </div>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-gray-50 dark:bg-obsidian rounded-xl p-6 mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                <span className="font-medium text-gray-900 dark:text-white">${invoice.total_amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 text-green-600 dark:text-green-400">
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Paid to Date
                                </span>
                                <span className="font-medium">-${invoice.amount_paid.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-gray-200 dark:border-white/10 my-4" />
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-900 dark:text-white text-lg">Remaining Balance</span>
                                <span className="font-bold text-gray-900 dark:text-white text-lg">${invoice.amount_due.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Request Display */}
                        {isPartialRequest && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-6 mb-8">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white">Partial Payment Request</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">You are requesting to pay an installment</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Payment Amount</p>
                                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">${paymentAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payment Action */}
                        <div className="text-center">
                            <button
                                onClick={handlePayment}
                                disabled={processing}
                                className="w-full sm:w-auto min-w-[300px] px-8 py-4 bg-electric hover:bg-electric/90 text-white rounded-xl font-bold text-lg shadow-lg shadow-electric/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-6 h-6" />
                                        Pay ${paymentAmount.toFixed(2)} Now
                                    </>
                                )}
                            </button>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                Secure SSL Payment via Stripe
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PayInvoice;
