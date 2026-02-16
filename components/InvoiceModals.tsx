import React, { useState, useEffect } from 'react';
import { X, Send, DollarSign, Calendar, User, FileText, Link as LinkIcon, Loader2, Copy, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Invoice, ServiceType, Session, InvoicePayment } from '../types';
import { supabase } from '../supabaseClient';
import { formatDate } from '../utils/dateFormatter';
import { useSettings } from '../context/SettingsContext';
import { sendInvoiceEmail, sendPaymentConfirmationEmail, sendPaymentRequestEmail } from '../services/invoiceEmailService';


// Create Invoice Modal
export const CreateInvoiceModal: React.FC<{
    onClose: () => void;
    onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);

    const [formData, setFormData] = useState({
        client_email: '',
        client_name: '',
        title: '',
        notes: '',
        service_type_id: '',
        service_price: 0,
        payment_type: 'full' as 'full' | 'partial',
        partial_amount: 0,
        session_id: '',
        due_date: '',
    });

    useEffect(() => {
        fetchServiceTypes();
        fetchSessions();
    }, []);

    const fetchServiceTypes = async () => {
        const { data } = await supabase
            .from('service_types')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (data) setServiceTypes(data);
    };

    const fetchSessions = async () => {
        const { data } = await supabase
            .from('sessions')
            .select('id, name, date')
            .eq('archived', false)
            .is('invoice_id', null)
            .order('created_at', { ascending: false });

        if (data) setSessions(data);
    };

    const handleServiceTypeChange = (serviceTypeId: string) => {
        const service = serviceTypes.find(s => s.id === serviceTypeId);
        setFormData({
            ...formData,
            service_type_id: serviceTypeId,
            service_price: service?.base_price || 0,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Generate invoice number and payment token
            const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
            const { data: paymentToken } = await supabase.rpc('generate_payment_token');

            const totalAmount = formData.service_price;
            const amountDue = formData.payment_type === 'full'
                ? totalAmount
                : formData.partial_amount;

            const { data: newInvoice, error } = await supabase.from('invoices').insert({
                invoice_number: invoiceNumber,
                client_email: formData.client_email,
                client_name: formData.client_name,
                title: formData.title,
                notes: formData.notes || null,
                service_type_id: formData.service_type_id || null,
                service_price: formData.service_price,
                payment_type: formData.payment_type,
                total_amount: totalAmount,
                amount_paid: 0,
                amount_due: amountDue,
                status: 'pending',
                payment_token: paymentToken,
                session_id: formData.session_id || null,
                due_date: formData.due_date || null,
            }).select().single();

            if (error) throw error;

            // Send email to client - URL encode the token to handle special characters
            const paymentLink = `${window.location.origin}/#/pay/${encodeURIComponent(paymentToken)}`;

            console.log('🚀 Attempting to send invoice email...');
            const emailSent = await sendInvoiceEmail({
                invoice: newInvoice,
                paymentLink: paymentLink,
            });

            if (emailSent) {
                alert(`✅ Invoice ${invoiceNumber} created successfully!\n\n📧 Email sent to ${formData.client_email}`);
            } else {
                alert(`✅ Invoice ${invoiceNumber} created successfully!\n\n⚠️ Email failed to send. Check browser console for details.`);
            }

            onSuccess();
        } catch (err) {
            console.error('Error creating invoice:', err);
            alert('❌ Failed to create invoice. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Create Invoice</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bill your client upfront or with partial payment</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    {/* Client Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Client Information</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Client Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.client_email}
                                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                placeholder="client@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Client Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                placeholder="John Smith"
                            />
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Invoice Details</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Title/Summary <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                placeholder="Smith Wedding Photography Package"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Service Type
                            </label>
                            <select
                                value={formData.service_type_id}
                                onChange={(e) => handleServiceTypeChange(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            >
                                <option value="">Select a service type...</option>
                                {serviceTypes.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - ${service.base_price.toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Service Price <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.service_price}
                                    onChange={(e) => setFormData({ ...formData, service_price: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                    placeholder="2500.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                placeholder="Includes 8 hours coverage, 2 photographers..."
                            />
                        </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Payment Terms</h3>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <input
                                    type="radio"
                                    name="payment_type"
                                    value="full"
                                    checked={formData.payment_type === 'full'}
                                    onChange={(e) => setFormData({ ...formData, payment_type: 'full' })}
                                    className="w-4 h-4 text-electric"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">Full Payment</p>
                                    <p className="text-sm text-gray-500">Client pays entire amount upfront (${formData.service_price.toFixed(2)})</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <input
                                    type="radio"
                                    name="payment_type"
                                    value="partial"
                                    checked={formData.payment_type === 'partial'}
                                    onChange={(e) => setFormData({ ...formData, payment_type: 'partial' })}
                                    className="w-4 h-4 text-electric"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">Partial Payment</p>
                                    <p className="text-sm text-gray-500">Client pays partial amount now, rest later</p>
                                </div>
                            </label>

                            {formData.payment_type === 'partial' && (
                                <div className="ml-7 mt-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Initial Amount Due <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="number"
                                            required={formData.payment_type === 'partial'}
                                            min="0"
                                            max={formData.service_price}
                                            step="0.01"
                                            value={formData.partial_amount}
                                            onChange={(e) => setFormData({ ...formData, partial_amount: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                            placeholder="1250.00"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Remaining: ${(formData.service_price - formData.partial_amount).toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Link to Gallery */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Link to Gallery (Optional)</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Gallery Session
                            </label>
                            <select
                                value={formData.session_id}
                                onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            >
                                <option value="">No gallery session</option>
                                {sessions.map(session => (
                                    <option key={session.id} value={session.id}>
                                        {session.name} - {formatDate(session.date)}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Linking controls download permissions based on payment status
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Create & Send Invoice
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Invoice Detail Modal
export const InvoiceDetailModal: React.FC<{
    invoice: Invoice;
    onClose: () => void;
    onRefresh: () => void;
}> = ({ invoice, onClose, onRefresh }) => {
    const { settings } = useSettings();
    const [payments, setPayments] = useState<InvoicePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, [invoice.id]);

    const fetchPayments = async () => {
        try {
            const { data, error } = await supabase
                .from('invoice_payments')
                .select('*')
                .eq('invoice_id', invoice.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
        }
    };

    const copyPaymentLink = () => {
        const link = `${window.location.origin}/pay/${invoice.payment_token}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'fully_paid':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
            case 'partial_paid':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
            case 'overdue':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Invoice Details</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoice.invoice_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Status */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-obsidian rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(invoice.status)}`}>
                            {invoice.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                    </div>

                    {/* Client Info */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Client</h3>
                        <div className="p-4 bg-gray-50 dark:bg-obsidian rounded-lg space-y-2">
                            <p className="font-medium text-gray-900 dark:text-white">{invoice.client_name}</p>
                            <p className="text-sm text-gray-500">{invoice.client_email}</p>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Details</h3>
                        <div className="p-4 bg-gray-50 dark:bg-obsidian rounded-lg space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Title</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{invoice.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Issued</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(invoice.issued_at)}</span>
                            </div>
                            {invoice.due_date && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Due Date</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(invoice.due_date)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Amount Breakdown */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</h3>
                        <div className="p-4 bg-gray-50 dark:bg-obsidian rounded-lg space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">${invoice.total_amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span className="text-sm">Paid</span>
                                <span className="text-sm font-medium">-${invoice.amount_paid.toFixed(2)}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex justify-between">
                                <span className="font-bold text-gray-900 dark:text-white">Balance Due</span>
                                <span className="font-bold text-electric">${invoice.amount_due.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment History */}
                    {payments.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Payment History</h3>
                            <div className="space-y-2">
                                {payments.map(payment => (
                                    <div key={payment.id} className="p-3 bg-gray-50 dark:bg-obsidian rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">${payment.amount.toFixed(2)}</p>
                                            <p className="text-xs text-gray-500">{formatDate(payment.created_at)} • {payment.payment_method || 'Manual'}</p>
                                        </div>
                                        {payment.notes && (
                                            <p className="text-xs text-gray-500 italic">{payment.notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment Link */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Payment Link</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/pay/${invoice.payment_token}`}
                                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                            <button
                                onClick={copyPaymentLink}
                                className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-medium transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Linked Session */}
                    {invoice.session && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                <LinkIcon className="w-4 h-4" />
                                <span className="text-sm font-medium">Linked to: {invoice.session.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-charcoal flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-electric hover:bg-electric/90 text-white font-bold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// Request Payment Modal
export const RequestPaymentModal: React.FC<{
    invoice: Invoice;
    onClose: () => void;
}> = ({ invoice, onClose }) => {
    const [amountType, setAmountType] = useState<'full' | 'custom'>('full');
    const [customAmount, setCustomAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const getLink = () => {
        const baseUrl = `${window.location.origin}/#/pay/${invoice.payment_token}`;
        if (amountType === 'full') return baseUrl;
        return `${baseUrl}?amount=${customAmount}`;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(getLink());
        alert('Payment link copied to clipboard!');
    };

    const handleSendEmail = async () => {
        const amount = amountType === 'full' ? invoice.amount_due : parseFloat(customAmount);

        if (isNaN(amount) || amount <= 0 || amount > invoice.amount_due) {
            alert('Please enter a valid amount not exceeding the balance due.');
            return;
        }

        setLoading(true);
        const link = getLink();

        const sent = await sendPaymentRequestEmail({
            invoice,
            amountRequested: amount,
            paymentLink: link
        });

        if (sent) {
            alert('Payment request sent successfully!');
            onClose();
        } else {
            alert('Failed to send email. You can copy the link manually.');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Request Payment</h2>
                        <p className="text-sm text-gray-500 mt-1">{invoice.invoice_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-electric bg-electric/5">
                            <input
                                type="radio"
                                name="amountType"
                                checked={amountType === 'full'}
                                onChange={() => setAmountType('full')}
                                className="w-5 h-5 text-electric"
                            />
                            <div>
                                <span className="block font-medium text-gray-900 dark:text-white">Full Remaining Balance</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">${invoice.amount_due.toFixed(2)}</span>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${amountType === 'custom' ? 'border-electric bg-electric/5' : 'border-gray-200 dark:border-white/10'}`}>
                            <input
                                type="radio"
                                name="amountType"
                                checked={amountType === 'custom'}
                                onChange={() => setAmountType('custom')}
                                className="w-5 h-5 text-electric"
                            />
                            <div className="flex-1">
                                <span className="block font-medium text-gray-900 dark:text-white">Custom Amount (Installment)</span>
                                {amountType === 'custom' && (
                                    <div className="mt-2 relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCopyLink}
                            className="flex-1 px-4 py-3 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <Copy className="w-5 h-5" />
                            Copy Link
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-electric hover:bg-electric/90 text-white rounded-xl font-bold shadow-lg shadow-electric/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            Send Email
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Record Payment Modal
export const RecordPaymentModal: React.FC<{
    invoice: Invoice;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ invoice, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState(invoice.amount_due);
    const [paymentMethod, setPaymentMethod] = useState('stripe');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Record payment
            const { data: newPayment, error: paymentError } = await supabase.from('invoice_payments').insert({
                invoice_id: invoice.id,
                amount: amount,
                payment_method: paymentMethod,
                notes: notes || null,
            }).select().single();

            if (paymentError) throw paymentError;

            // Update invoice
            const newAmountPaid = invoice.amount_paid + amount;
            const newAmountDue = invoice.total_amount - newAmountPaid;
            const newStatus = newAmountDue <= 0 ? 'fully_paid' : 'partial_paid';

            const { data: updatedInvoice, error: updateError } = await supabase.from('invoices').update({
                amount_paid: newAmountPaid,
                amount_due: newAmountDue,
                status: newStatus,
                paid_at: newStatus === 'fully_paid' ? new Date().toISOString() : null,
            }).eq('id', invoice.id).select().single();

            if (updateError) throw updateError;

            // Send payment confirmation email
            const emailSent = await sendPaymentConfirmationEmail({
                invoice: updatedInvoice,
                payment: newPayment,
            });

            if (emailSent) {
                alert('Payment recorded and confirmation email sent to client!');
            } else {
                alert('Payment recorded successfully! (Email not sent - check Resend configuration)');
            }

            onSuccess();
        } catch (err) {
            console.error('Error recording payment:', err);
            alert('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10">
                    <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Record Payment</h2>
                    <p className="text-sm text-gray-500 mt-1">{invoice.invoice_number}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-obsidian rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                            <span className="font-medium text-gray-900 dark:text-white">${invoice.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Already Paid</span>
                            <span className="font-medium text-green-600 dark:text-green-400">${invoice.amount_paid.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-white/10 flex justify-between">
                            <span className="font-bold text-gray-900 dark:text-white">Remaining</span>
                            <span className="font-bold text-electric">${invoice.amount_due.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Payment Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                required
                                min="0.01"
                                max={invoice.amount_due}
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        >
                            <option value="stripe">Stripe</option>
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                            placeholder="Payment reference or additional details..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Recording...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Record Payment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Refund Invoice Modal
export const RefundInvoiceModal: React.FC<{
    invoice: Invoice;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ invoice, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [refundAmount, setRefundAmount] = useState(invoice.amount_paid);
    const [reason, setReason] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (refundAmount <= 0 || refundAmount > invoice.amount_paid) {
            alert('Invalid refund amount');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('process-invoice-refund', {
                body: {
                    invoiceId: invoice.id,
                    amount: refundAmount,
                    reason: reason || 'Refund requested'
                }
            });

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.error || 'Refund failed');
            }

            alert(`✅ Refund of $${refundAmount.toFixed(2)} processed successfully!`);
            onSuccess();
        } catch (err: any) {
            console.error('Error processing refund:', err);
            alert(`❌ Failed to process refund: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Process Refund</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoice.invoice_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Refund Info */}
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-yellow-900 dark:text-yellow-200">
                                    Refund Information
                                </p>
                                <p className="text-yellow-700 dark:text-yellow-300">
                                    Total Paid: <span className="font-bold">${invoice.amount_paid.toFixed(2)}</span>
                                </p>
                                <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                                    This will process a refund via Stripe and update the invoice status.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Refund Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Refund Amount *
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={invoice.amount_paid}
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-obsidian border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Maximum: ${invoice.amount_paid.toFixed(2)}
                        </p>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Enter reason for refund..."
                            className="w-full px-4 py-3 bg-white dark:bg-obsidian border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-obsidian text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <DollarSign className="w-5 h-5" />
                                    Process Refund
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

