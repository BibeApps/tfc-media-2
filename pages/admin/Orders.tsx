import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Calendar, User, RefreshCw, Eye, Loader2, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalOrder, OrderItem } from '../../types';
import { supabase } from '../../supabaseClient';
import { formatDate } from '../../utils/dateUtils';

const Orders: React.FC = () => {
    const [orders, setOrders] = useState<PortalOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<PortalOrder | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
          *,
          profiles:client_id (name, email)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedOrders = (data || []).map((order: any) => ({
                id: order.id,
                client_id: order.client_id,
                orderNumber: order.order_number,
                date: formatDate(order.created_at),
                total: order.total_amount,
                items: 0, // Will be fetched separately if needed
                status: order.status,
                stripe_session_id: order.stripe_session_id,
                stripe_payment_intent_id: order.stripe_payment_intent_id,
                amount_refunded: order.amount_refunded || 0,
                currency: order.currency || 'usd',
                refund_reason: order.refund_reason,
                refunded_at: order.refunded_at,
                created_at: order.created_at,
                updated_at: order.updated_at,
                clientName: order.profiles?.name || 'Unknown',
                clientEmail: order.profiles?.email || '',
            }));

            setOrders(mappedOrders);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const processRefund = async (orderId: string, reason: string) => {
        try {
            // In production, you'd call Stripe API to process refund
            // For now, just update the database
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'refunded',
                    refund_reason: reason,
                    refunded_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            if (error) throw error;

            fetchOrders();
            setShowRefundModal(false);
            setSelectedOrder(null);
        } catch (err) {
            console.error('Error processing refund:', err);
            alert('Failed to process refund');
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
            case 'refunded':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
        }
    };

    const totalRevenue = orders
        .filter(o => o.status === 'completed' || o.status === 'paid')
        .reduce((sum, o) => sum + o.total, 0);

    const totalRefunded = orders
        .filter(o => o.status === 'refunded')
        .reduce((sum, o) => sum + o.total, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Management</h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
                        </div>
                        <Download className="w-8 h-8 text-electric" />
                    </div>
                </div>
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalRevenue.toFixed(2)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Refunded</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">${totalRefunded.toFixed(2)}</p>
                        </div>
                        <RefreshCw className="w-8 h-8 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by order number, client name, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'pending', 'completed', 'refunded'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === status
                                ? 'bg-electric text-white'
                                : 'bg-white dark:bg-charcoal border border-gray-200 dark:border-white/10 hover:border-electric/50'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Download className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No orders found
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 hover:border-electric/50 transition-all"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">#{order.orderNumber}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{order.clientName}</span>
                                                <span className="text-gray-400">•</span>
                                                <span className="text-sm text-gray-500">{order.clientEmail}</span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Calendar className="w-4 h-4" />
                                            <span>{order.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <DollarSign className="w-4 h-4" />
                                            <span className="font-bold">${order.total.toFixed(2)}</span>
                                        </div>
                                        {order.amount_refunded > 0 && (
                                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                                <RefreshCw className="w-4 h-4" />
                                                <span>Refunded: ${order.amount_refunded.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {order.refund_reason && (
                                        <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
                                            <p className="text-sm text-red-700 dark:text-red-400">
                                                <span className="font-bold">Refund Reason:</span> {order.refund_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View
                                    </button>
                                    {(order.status === 'completed' || order.status === 'paid') && (
                                        <button
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowRefundModal(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Refund
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Order Detail Modal */}
            <AnimatePresence>
                {selectedOrder && !showRefundModal && (
                    <OrderDetailModal
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                    />
                )}
            </AnimatePresence>

            {/* Refund Modal */}
            <AnimatePresence>
                {showRefundModal && selectedOrder && (
                    <RefundModal
                        order={selectedOrder}
                        onClose={() => {
                            setShowRefundModal(false);
                            setSelectedOrder(null);
                        }}
                        onRefund={processRefund}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Order Detail Modal Component
const OrderDetailModal: React.FC<{
    order: PortalOrder;
    onClose: () => void;
}> = ({ order, onClose }) => {
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderItems();
    }, [order.id]);

    const fetchOrderItems = async () => {
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select(`
                    *,
                    gallery_items (
                        title,
                        type
                    )
                `)
                .eq('order_id', order.id);

            if (error) throw error;
            setOrderItems(data || []);
        } catch (err) {
            console.error('Error fetching order items:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
            case 'refunded':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-backdrop, #invoice-backdrop * {
            visibility: visible;
          }
          #invoice-backdrop {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          table, th, td {
            border-color: #d1d5db !important;
          }
        }
      `}</style>
            <motion.div
                id="invoice-backdrop"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:static print:border-none print:overflow-visible"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start no-print">
                    <div>
                        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Order Details</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">#{order.orderNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="hidden print:block p-6 border-b border-gray-200 mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">ORDER DETAILS</h1>
                            <p className="text-sm text-gray-600">#{order.orderNumber}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-800">TFC Media</h2>
                            <p className="text-sm text-gray-500">123 Creative Studio Blvd, Los Angeles, CA 90012</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto space-y-8 bg-gray-50/50 dark:bg-obsidian/50 print:bg-white print:p-6 print:overflow-visible">
                    <div className="flex justify-between items-center print:border-b print:pb-6">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Order Date</p>
                            <p className="font-medium text-gray-900 dark:text-white">{order.date}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)} uppercase tracking-wide`}>
                                {order.status}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 p-6 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 print:border-0 print:p-0 print:gap-4">
                        <div className="print:hidden">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">From</h4>
                            <p className="font-bold text-gray-900 dark:text-white mb-1">TFC Media</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">123 Creative Studio Blvd, Los Angeles, CA 90012</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bill To</h4>
                            <p className="font-bold text-gray-900 dark:text-white mb-1">{order.clientName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{order.clientEmail}</p>
                        </div>
                    </div>

                    {order.stripe_payment_intent_id && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg print:bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Method</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Card Payment</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transaction ID</p>
                                    <p className="text-sm font-mono text-gray-900 dark:text-white">{order.stripe_payment_intent_id.substring(0, 20)}...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="print:mt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Order Items</h4>
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden print:border print:rounded-none">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-electric" />
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 font-medium print:bg-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">Item</th>
                                            <th className="px-6 py-3 text-center">Type</th>
                                            <th className="px-6 py-3 text-right">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                        {orderItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 text-gray-900 dark:text-white">
                                                    {item.gallery_items?.title || `Item ${index + 1}`}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.gallery_items?.type === 'photo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'}`}>
                                                        {item.gallery_items?.type || 'media'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-900 dark:text-white">${item.price.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-white/5 font-bold print:bg-gray-100">
                                        <tr>
                                            <td colSpan={2} className="px-6 py-4 text-gray-900 dark:text-white text-right">Total</td>
                                            <td className="px-6 py-4 text-right text-electric text-lg print:text-black">${order.total.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>

                    {order.refund_reason && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">Refund Information</p>
                            <p className="text-sm text-red-700 dark:text-red-400">
                                <span className="font-bold">Reason:</span> {order.refund_reason}
                            </p>
                            {order.refunded_at && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    <span className="font-bold">Refunded:</span> {new Date(order.refunded_at).toLocaleDateString()}
                                </p>
                            )}
                            {order.amount_refunded > 0 && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    <span className="font-bold">Amount:</span> ${order.amount_refunded.toFixed(2)}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-charcoal flex justify-end gap-3 no-print">
                    <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white font-medium transition-colors">
                        <Download className="w-4 h-4" /> Print
                    </button>
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-electric hover:bg-electric/90 text-white font-bold transition-colors">
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// Refund Modal Component
const RefundModal: React.FC<{
    order: PortalOrder;
    onClose: () => void;
    onRefund: (orderId: string, reason: string) => void;
}> = ({ order, onClose, onRefund }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (reason.trim()) {
            onRefund(order.id, reason);
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
                    <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                        Process Refund
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Order #{order.orderNumber}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                            <span className="font-bold">Warning:</span> This will refund ${order.total.toFixed(2)} to the customer via Stripe.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Refund Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            placeholder="Please provide a reason for this refund..."
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
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
                            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
                        >
                            Process Refund
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Orders;
