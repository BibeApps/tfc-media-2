import React, { useState, useEffect } from 'react';
import { MessageSquare, Filter, Search, Trash2, CheckCircle, Clock, AlertCircle, Send, Loader2, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { formatDateTime } from '../../utils/dateUtils';
import { AnimatePresence, motion } from 'framer-motion';

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
    is_read: boolean; // Tracks if admin has viewed the ticket
    admin_response: string | null;
    responded_by: string | null;
    responded_at: string | null;
    created_at: string;
    updated_at: string;
}

const Support: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [responseText, setResponseText] = useState('');
    const [responding, setResponding] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setTickets(data || []);

            // Count unread tickets (is_read = false)
            const unreadCount = (data || []).filter(t => !t.is_read).length;
            setUnreadCount(unreadCount);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateTicketStatus = async (ticketId: string, newStatus: string) => {
        try {
            // Get ticket details before updating
            const ticket = tickets.find(t => t.id === ticketId);
            if (!ticket) return;

            const { error } = await supabase
                .from('support_tickets')
                .update({ status: newStatus })
                .eq('id', ticketId);

            if (error) throw error;

            // Send status update email to client
            try {
                await supabase.functions.invoke('send-support-status-email', {
                    body: {
                        ticketNumber: ticket.ticket_number,
                        name: ticket.name,
                        email: ticket.email,
                        subject: ticket.subject,
                        status: newStatus,
                        adminResponse: ticket.admin_response || null
                    }
                });
            } catch (emailError) {
                console.error('Failed to send status update email:', emailError);
            }

            await fetchTickets();
        } catch (err) {
            console.error('Error updating ticket status:', err);
            alert('Failed to update ticket status');
        }
    };

    const deleteTicket = async (ticketId: string) => {
        if (!window.confirm('Are you sure you want to delete this ticket?')) return;

        try {
            const { error } = await supabase
                .from('support_tickets')
                .delete()
                .eq('id', ticketId);

            if (error) throw error;
            await fetchTickets();
            setSelectedTicket(null);
        } catch (err) {
            console.error('Error deleting ticket:', err);
            alert('Failed to delete ticket');
        }
    };

    const markAsRead = async (ticket: SupportTicket) => {
        // Only mark as read if it's currently unread
        if (!ticket.is_read) {
            try {
                const { error } = await supabase
                    .from('support_tickets')
                    .update({ is_read: true })
                    .eq('id', ticket.id);

                if (error) throw error;

                // Update local state
                const updatedTickets = tickets.map(t =>
                    t.id === ticket.id ? { ...t, is_read: true } : t
                );
                setTickets(updatedTickets);

                // Recalculate unread count
                const newUnreadCount = updatedTickets.filter(t => !t.is_read).length;
                setUnreadCount(newUnreadCount);
            } catch (err) {
                console.error('Error marking ticket as read:', err);
            }
        }

        // Open the ticket modal
        setSelectedTicket(ticket);
    };

    const submitResponse = async () => {
        if (!selectedTicket || !responseText.trim()) return;

        setResponding(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({
                    admin_response: responseText,
                    status: 'resolved',
                    responded_at: new Date().toISOString()
                })
                .eq('id', selectedTicket.id);

            if (error) throw error;

            // TODO: Send email to user with response
            // Call Edge Function to send status update email to client
            try {
                await supabase.functions.invoke('send-support-status-email', {
                    body: {
                        ticketNumber: selectedTicket.ticket_number,
                        name: selectedTicket.name,
                        email: selectedTicket.email,
                        subject: selectedTicket.subject,
                        status: 'resolved',
                        adminResponse: responseText
                    }
                });
            } catch (emailError) {
                console.error('Failed to send status update email:', emailError);
                // Don't fail the update if email fails
            }

            setResponseText('');
            setSelectedTicket(null);
            await fetchTickets(); // Refresh the list to show updated status
        } catch (err) {
            console.error('Error submitting response:', err);
            alert('Failed to submit response');
        } finally {
            setResponding(false);
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'in-progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'closed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
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
        <div className="p-8">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-electric/10 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-electric" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">
                                Support Tickets
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Manage customer support requests
                            </p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <span className="text-red-500 font-bold">{unreadCount} New Ticket{unreadCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                    >
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
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
                                        Ticket #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Subject
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
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                {filteredTickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        onClick={() => markAsRead(ticket)}
                                        className={`cursor-pointer transition-colors ${!ticket.is_read
                                            ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {!ticket.is_read && (
                                                    <span className="flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-electric opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-electric"></span>
                                                    </span>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-mono ${!ticket.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                            #{ticket.ticket_number}
                                                        </span>
                                                        {!ticket.is_read && (
                                                            <span className="px-2 py-0.5 text-xs font-bold bg-electric text-white rounded-full">
                                                                UNREAD
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-sm ${!ticket.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        {ticket.subject}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-sm ${!ticket.is_read ? 'font-semibold' : ''}`}>
                                                {ticket.name}
                                            </div>
                                            <div className="text-xs text-gray-500">{ticket.email}</div>
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTicket(ticket.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete Ticket"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
                                        <select
                                            value={selectedTicket.status}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value;
                                                await updateTicketStatus(selectedTicket.id, newStatus);
                                                // Update the selected ticket to reflect the change immediately
                                                setSelectedTicket({ ...selectedTicket, status: newStatus as any });
                                            }}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric"
                                        >
                                            <option value="new">New</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
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

                                {/* Customer Info */}
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Customer Information</h4>
                                    <div className="bg-gray-50 dark:bg-obsidian p-4 rounded-lg">
                                        <p className="text-gray-900 dark:text-white"><strong>Name:</strong> {selectedTicket.name}</p>
                                        <p className="text-gray-900 dark:text-white"><strong>Email:</strong> {selectedTicket.email}</p>
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Subject</h4>
                                    <p className="text-gray-900 dark:text-white">{selectedTicket.subject}</p>
                                </div>

                                {/* Message */}
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Message</h4>
                                    <div className="bg-gray-50 dark:bg-obsidian p-4 rounded-lg whitespace-pre-wrap text-gray-900 dark:text-white">
                                        {selectedTicket.message}
                                    </div>
                                </div>

                                {/* Admin Response */}
                                {selectedTicket.admin_response ? (
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">Admin Response</h4>
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 p-4 rounded-lg whitespace-pre-wrap text-gray-900 dark:text-white">
                                            {selectedTicket.admin_response}
                                        </div>
                                        {selectedTicket.responded_at && (
                                            <p className="text-sm text-gray-500 mt-2">
                                                Responded on {formatDateTime(selectedTicket.responded_at)}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">Add Response</h4>
                                        <textarea
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-obsidian border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric resize-none"
                                            placeholder="Type your response to the customer..."
                                        />
                                        <button
                                            onClick={submitResponse}
                                            disabled={!responseText.trim() || responding}
                                            className="mt-3 px-6 py-2 bg-electric hover:bg-electric/90 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-electric/20 transition-all disabled:opacity-50"
                                        >
                                            {responding ? (
                                                <>Sending <Loader2 className="w-4 h-4 animate-spin" /></>
                                            ) : (
                                                <>Send Response <Send className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Support;
