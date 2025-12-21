import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Calendar, User, RefreshCw, Eye, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalOrder, OrderItem } from '../../types';
import { supabase } from '../../supabaseClient';

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
                date: new Date(order.created_at).toISOString().split('T')[0],
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
