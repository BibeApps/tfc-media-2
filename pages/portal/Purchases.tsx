import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Calendar, Search, X, Printer, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalOrder } from '../../types';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { formatDate } from '../../utils/dateUtils';

const InvoiceModal: React.FC<{ order: PortalOrder; onClose: () => void }> = ({ order, onClose }) => {
    const { settings } = useSettings();
    const { user } = useAuth();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:block print:h-auto print:p-0 print:z-[9999] print:overflow-visible">
            <style>{`
        @media print {
          /* Hide everything except invoice */
          body > * { visibility: hidden; }
          #invoice-backdrop, #invoice-backdrop * { visibility: visible; }
          
          /* Force white background and black text */
          body { 
            background: white !important; 
            margin: 0; 
            padding: 0; 
          }
          
          /* Force all elements to have white background and black text */
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color: black !important; 
            background-color: white !important;
            border-color: #e5e7eb !important;
          }
          
          /* Specific overrides for table headers and footers */
          thead, tfoot {
            background-color: #f9fafb !important;
          }
          
          /* Status badge */
          .status-badge {
            background-color: #d1fae5 !important;
            color: #065f46 !important;
            border: 1px solid #6ee7b7 !important;
          }
          
          /* Hide print buttons and close buttons */
          .no-print { 
            display: none !important; 
          }
          
          /* Ensure borders are visible */
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
                        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Invoice</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">#{order.orderNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>


                <div className="hidden print:block p-6 border-b border-gray-200 mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">INVOICE</h1>
                            <p className="text-sm text-gray-600">#{order.orderNumber}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-800">{settings?.company_name || 'TFC Media'}</h2>
                            <p className="text-sm text-gray-500">{settings?.business_address || '123 Creative Studio Blvd, Los Angeles, CA 90012'}</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto space-y-8 bg-gray-50/50 dark:bg-obsidian/50 print:bg-white print:p-6 print:overflow-visible">
                    <div className="flex justify-between items-center print:border-b print:pb-6">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Issue Date</p>
                            <p className="font-medium text-gray-900 dark:text-white">{order.date}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                            <span className="status-badge px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 uppercase tracking-wide flex items-center gap-1 print:border print:border-green-200 print:bg-transparent print:text-green-800">
                                <CheckCircle className="w-3 h-3" /> {order.status}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 p-6 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 print:border-0 print:p-0 print:gap-4">
                        <div className="print:hidden">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">From</h4>
                            <p className="font-bold text-gray-900 dark:text-white mb-1">{settings?.company_name || 'TFC Media'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{settings?.business_address || '123 Creative Studio Blvd, Los Angeles, CA 90012'}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bill To</h4>
                            <p className="font-bold text-gray-900 dark:text-white mb-1">{user?.name || 'Client'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
                            {user?.address && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.address}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg print:bg-gray-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Method</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Card Payment (Mock)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transaction ID</p>
                                <p className="text-sm font-mono text-gray-900 dark:text-white">{order.orderNumber}</p>
                            </div>
                        </div>
                    </div>

                    <div className="print:mt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Order Summary</h4>
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden print:border print:rounded-none">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 font-medium print:bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                    <tr>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                                            Media Package ({order.items} items)
                                            <p className="text-xs text-gray-500 mt-0.5">Digital downloads license included</p>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 dark:text-white">${order.total.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-white/5 font-bold print:bg-gray-100">
                                    <tr>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white text-right">Total</td>
                                        <td className="px-6 py-4 text-right text-electric text-lg print:text-black">${order.total.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div >

                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-charcoal flex justify-end gap-3 no-print">
                    <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white font-medium transition-colors">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-electric hover:bg-electric/90 text-white font-bold transition-colors">
                        Close
                    </button>
                </div>
            </motion.div >
        </div >
    );
};

const Purchases: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<PortalOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<PortalOrder | null>(null);

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            // Optimized: Single query with order_items count using aggregation
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    created_at,
                    total_amount,
                    status,
                    order_items (count)
                `)
                .eq('client_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const ordersWithCounts = data.map((order: any) => ({
                    id: order.id,
                    orderNumber: order.order_number,
                    date: formatDate(order.created_at),
                    total: order.total_amount,
                    items: order.order_items?.[0]?.count || 0, // Extract count from aggregation result
                    status: order.status,
                    itemsList: [],
                    expiresAt: 'Lifetime'
                }));
                setOrders(ordersWithCounts);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order History</h1>

            <div className="bg-white dark:bg-charcoal p-4 rounded-xl border border-gray-200 dark:border-white/5 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by order number..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric" />
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No orders found.</div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 p-6 shadow-sm hover:border-electric/30 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">#{order.orderNumber}</h3>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 capitalize">
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {order.date}</span>
                                            <span>•</span>
                                            <span>{order.items} Items</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:items-end gap-1">
                                        <span className="font-heading font-bold text-xl text-gray-900 dark:text-white">${order.total.toFixed(2)}</span>
                                        <span className="text-xs font-medium text-orange-500">
                                            {order.expiresAt} Access
                                        </span>
                                    </div>

                                    <div className="flex gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-gray-200 dark:border-white/10">
                                        <button
                                            onClick={() => setSelectedInvoice(order)}
                                            className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white font-medium text-sm flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Invoice
                                        </button>
                                        <Link
                                            to={`/portal/downloads?order=${order.orderNumber}`}
                                            className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-electric hover:bg-electric/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-electric/20"
                                        >
                                            <Download className="w-4 h-4" /> Download Files
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <AnimatePresence>
                {selectedInvoice && (
                    <InvoiceModal
                        order={selectedInvoice}
                        onClose={() => setSelectedInvoice(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Purchases;