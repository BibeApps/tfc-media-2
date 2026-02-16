import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Calendar, User, RefreshCw, Eye, Loader2, Plus, X, Send, Check, AlertCircle, FileText, Link as LinkIcon, RotateCcw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../../utils/dateFormatter';
import { useSettings } from '../../context/SettingsContext';
import { Invoice, InvoiceStatus, ServiceType, Session } from '../../types';
import { supabase } from '../../supabaseClient';
import { CreateInvoiceModal, InvoiceDetailModal, RecordPaymentModal, RefundInvoiceModal, RequestPaymentModal } from '../../components/InvoiceModals';


const Invoices: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showRequestPaymentModal, setShowRequestPaymentModal] = useState(false);

    useEffect(() => {
        fetchInvoices();

        // Set up real-time subscriptions
        const invoicesChannel = supabase
            .channel('invoices_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'invoices' },
                () => fetchInvoices()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(invoicesChannel);
        };
    }, []);

    const fetchInvoices = async () => {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    service_types:service_type_id (name, base_price),
                    sessions:session_id (name),
                    invoice_payments (amount)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedInvoices = (data || []).map((inv: any) => {
                // Calculate real total paid from payments table
                const rawSum = inv.invoice_payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
                // Ensure paid amount is never negative (handles cases where refunds exist but original payment might be missing/archived)
                const realAmountPaid = Math.max(0, rawSum);

                // Determine real status based on calculated payments
                let realStatus = inv.status;
                if (realAmountPaid >= inv.total_amount) {
                    realStatus = 'fully_paid';
                } else if (rawSum < 0) {
                    // If raw sum is negative, it implies fully refunded (or weird state), treat as pending/refunded
                    realStatus = 'refunded';
                } else if (realAmountPaid > 0) {
                    // Only set generic partial if not specifically voided/refunded
                    if (realStatus === 'pending' || realStatus === 'overdue') {
                        realStatus = 'partial_paid';
                    }
                }

                return {
                    ...inv,
                    amount_paid: realAmountPaid,
                    amount_due: inv.total_amount - realAmountPaid,
                    status: realStatus,
                    service_type: inv.service_types,
                    session: inv.sessions,
                };
            });

            setInvoices(mappedInvoices);
        } catch (err) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInvoice = async (invoiceId: string) => {
        if (!window.confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;

        try {
            const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
            if (error) throw error;
            fetchInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Failed to delete invoice');
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch =
            (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (invoice.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (invoice.client_email || '').toLowerCase().includes(searchTerm.toLowerCase());

        const currentStatus = (invoice.status || '').toLowerCase();
        const filterStatus = statusFilter.toLowerCase();

        let matchesStatus = false;
        if (filterStatus === 'all') {
            matchesStatus = true;
        } else if (filterStatus === 'pending') {
            // Show pending AND partial_paid under "Pending" tab
            matchesStatus = currentStatus === 'pending' || currentStatus === 'partial_paid';
        } else if (filterStatus === 'partial_paid') {
            // Show explicit partial_paid OR pending invoices that actually have payments
            matchesStatus = currentStatus === 'partial_paid' || (currentStatus === 'pending' && Number(invoice.amount_paid) > 0);
        } else {
            matchesStatus = currentStatus === filterStatus;
        }

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: InvoiceStatus) => {
        switch (status) {
            case 'fully_paid':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
            case 'partial_paid':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
            case 'overdue':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            case 'voided':
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
            case 'refunded':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
        }
    };

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.amount_due, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Management</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Create Invoice
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoices</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
                        </div>
                        <FileText className="w-8 h-8 text-electric" />
                    </div>
                </div>
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoiced</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalInvoiced.toFixed(2)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Collected</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalPaid.toFixed(2)}</p>
                        </div>
                        <Check className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">${totalOutstanding.toFixed(2)}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by invoice number, client name, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'pending', 'partial_paid', 'fully_paid', 'overdue', 'refunded'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${statusFilter === status
                                ? 'bg-electric text-white'
                                : 'bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 hover:border-electric/50'
                                }`}
                        >
                            {status === 'all' ? 'All' : status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoices List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No invoices found
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredInvoices.map((invoice) => (
                        <motion.div
                            key={invoice.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 hover:border-electric/50 transition-all"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{invoice.invoice_number}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{invoice.title}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{invoice.client_name}</span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-sm text-gray-500">{invoice.client_email}</span>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(invoice.status)}`}>
                                                {invoice.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm pt-2">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(invoice.issued_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <DollarSign className="w-4 h-4" />
                                                <span className="font-bold">${invoice.total_amount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                <Check className="w-4 h-4" />
                                                <span>Paid: ${invoice.amount_paid.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Due: ${invoice.amount_due.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-white/5 flex-wrap">
                                    <button
                                        onClick={() => setSelectedInvoice(invoice)}
                                        className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View
                                    </button>

                                    {invoice.status !== 'fully_paid' && invoice.status !== 'voided' && invoice.status !== 'refunded' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setSelectedInvoice(invoice);
                                                    setShowRequestPaymentModal(true);
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 border border-electric/30 text-electric hover:bg-electric/5 rounded-lg text-sm font-bold transition-colors shadow-sm ml-auto sm:ml-0"
                                            >
                                                <Send className="w-4 h-4" />
                                                Request Pay
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedInvoice(invoice);
                                                    setShowPaymentModal(true);
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 border border-green-200 dark:border-green-900/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                <DollarSign className="w-4 h-4" />
                                                Record
                                            </button>
                                        </>
                                    )}

                                    <div className="flex items-center gap-2 ml-auto">
                                        {invoice.amount_paid > 0 && invoice.status !== 'voided' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedInvoice(invoice);
                                                    setShowRefundModal(true);
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Refund"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteInvoice(invoice.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete Invoice"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Invoice Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateInvoiceModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            setShowCreateModal(false);
                            fetchInvoices();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Invoice Detail Modal */}
            <AnimatePresence>
                {selectedInvoice && !showPaymentModal && (
                    <InvoiceDetailModal
                        invoice={selectedInvoice}
                        onClose={() => setSelectedInvoice(null)}
                        onRefresh={fetchInvoices}
                    />
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && selectedInvoice && (
                    <RecordPaymentModal
                        invoice={selectedInvoice}
                        onClose={() => {
                            setShowPaymentModal(false);
                            setSelectedInvoice(null);
                        }}
                        onSuccess={() => {
                            setShowPaymentModal(false);
                            setSelectedInvoice(null);
                            fetchInvoices();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Refund Modal */}
            <AnimatePresence>
                {showRequestPaymentModal && selectedInvoice && (
                    <RequestPaymentModal
                        invoice={selectedInvoice}
                        onClose={() => {
                            setShowRequestPaymentModal(false);
                            setSelectedInvoice(null);
                        }}
                    />
                )}

                {showRefundModal && selectedInvoice && (
                    <RefundInvoiceModal
                        invoice={selectedInvoice}
                        onClose={() => {
                            setShowRefundModal(false);
                            setSelectedInvoice(null);
                        }}
                        onSuccess={() => {
                            setShowRefundModal(false);
                            setSelectedInvoice(null);
                            fetchInvoices();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Invoices;
