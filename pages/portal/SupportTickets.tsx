import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Loader2, X, Send } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { formatDateTime } from '../../utils/dateUtils';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { SupportModal } from '../../components/SupportModal';

interface SupportTicket {
    id: string;
    ticket_number: string;
    user_id: string | null;
    name: string;
    email: string;
    subject: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'new' | 'in-progress' | 'resolved';
    is_read: boolean;
    is_reopened: boolean;
    admin_response: string | null;
    responded_by: string | null;
    responded_at: string | null;
    created_at: string;
    updated_at: string;
}

const SupportTickets: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [reopening, setReopening] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [reopenMessage, setReopenMessage] = useState('');

    useEffect(() => {
        fetchTickets();

        // Set up real-time subscription
        const channel = supabase
            .channel('client_support_tickets_changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'support_tickets',
                    filter: `user_id=eq.${user?.id}`
                },
                () => fetchTickets()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const reopenTicket = async () => {
        if (!selectedTicket || !reopenMessage.trim()) return;

        setReopening(true);
        try {
            // Append reopen message to original message
            const updatedMessage = `${selectedTicket.message}\n\n--- TICKET REOPENED ${new Date().toLocaleString()} ---\n${reopenMessage}`;

            const { error } = await supabase
                .from('support_tickets')
                .update({
                    is_reopened: true,
                    status: 'in-progress',
                    message: updatedMessage
                })
                .eq('id', selectedTicket.id);

            if (error) throw error;

            // Send email notification to support team
            try {
                await supabase.functions.invoke('send-support-email', {
                    body: {
                        ticketNumber: selectedTicket.ticket_number,
                        name: selectedTicket.name,
                        email: selectedTicket.email,
                        subject: selectedTicket.subject,
                        message: updatedMessage,
                        priority: selectedTicket.priority,
                        isReopened: true
                    }
                });
            } catch (emailError) {
                console.error('Failed to send reopen notification email:', emailError);
                // Don't fail the reopen if email fails
            }

            setReopenMessage('');
            await fetchTickets();
            setSelectedTicket(null);
        } catch (err) {
            console.error('Error reopening ticket:', err);
            alert('Failed to reopen ticket');
        } finally {
            setReopening(false);
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'in-progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'text-red-500';
            case 'high': return 'text-orange-500';
            case 'medium': return 'text-blue-500';
            case 'low': return 'text-green-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-electric/10 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-electric" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">
                                My Support Tickets
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                View and manage your support requests
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSupportModalOpen(true)}
                        className="px-6 py-3 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold shadow-lg shadow-electric/20 transition-all flex items-center gap-2"
                    >
                        <MessageSquare className="w-5 h-5" />
                        Contact Support
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-electric mb-4" />
                        <p className="text-gray-500">Loading tickets...</p>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500">No tickets found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Ticket # / Subject
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Priority
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                {filteredTickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                        #{ticket.ticket_number}
                                                    </span>
                                                    {ticket.admin_response && !ticket.is_reopened && (
                                                        <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full">
                                                            RESPONDED
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {ticket.subject}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`font-bold capitalize ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusColor(ticket.status)}`}>
                                                {ticket.status.replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDateTime(ticket.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Ticket Detail Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-charcoal w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-charcoal z-10">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Ticket #{selectedTicket.ticket_number}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Submitted {formatDateTime(selectedTicket.created_at)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Status and Priority */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Status
                                        </label>
                                        <div className={`px-4 py-2 rounded-lg border font-bold capitalize ${getStatusColor(selectedTicket.status)}`}>
                                            {selectedTicket.status.replace('-', ' ')}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Priority
                                        </label>
                                        <div className={`px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 font-bold capitalize ${getPriorityColor(selectedTicket.priority)}`}>
                                            {selectedTicket.priority}
                                        </div>
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Subject</h4>
                                    <p className="text-gray-900 dark:text-white">{selectedTicket.subject}</p>
                                </div>

                                {/* Message */}
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Your Message</h4>
                                    <div className="bg-gray-50 dark:bg-obsidian p-4 rounded-lg whitespace-pre-wrap text-gray-900 dark:text-white">
                                        {selectedTicket.message}
                                    </div>
                                </div>

                                {/* Admin Response */}
                                {selectedTicket.admin_response && (
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">Support Team Response</h4>
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 p-4 rounded-lg whitespace-pre-wrap text-gray-900 dark:text-white">
                                            {selectedTicket.admin_response}
                                        </div>
                                        {selectedTicket.responded_at && (
                                            <p className="text-sm text-gray-500 mt-2">
                                                Responded on {formatDateTime(selectedTicket.responded_at)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Reopen Button */}
                                {selectedTicket.status === 'resolved' && !selectedTicket.is_reopened && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                                            Reopen This Ticket
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            Need further assistance? Please explain why you're reopening this ticket:
                                        </p>
                                        <textarea
                                            value={reopenMessage}
                                            onChange={(e) => setReopenMessage(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-3"
                                            placeholder="Describe the issue or why you need to reopen this ticket..."
                                        />
                                        <button
                                            onClick={reopenTicket}
                                            disabled={!reopenMessage.trim() || reopening}
                                            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {reopening ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Reopening...</>
                                            ) : (
                                                <>🔄 Reopen Ticket</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
        </div>
    );
};

export default SupportTickets;
