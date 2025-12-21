import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Calendar,
    Image,
    ShoppingBag,
    Users,
    Ban,
    FolderOpen,
    Upload,
    ArrowRight
} from 'lucide-react';

const AdminHome: React.FC = () => {
    const navigate = useNavigate();

    const adminPages = [
        {
            title: 'Event Management',
            description: 'Manage event categories and events',
            icon: FolderOpen,
            path: '/admin/events',
            color: 'from-blue-500 to-cyan-500',
        },
        {
            title: 'Bookings',
            description: 'View and manage client bookings',
            icon: Calendar,
            path: '/admin/bookings',
            color: 'from-purple-500 to-pink-500',
        },
        {
            title: 'Orders',
            description: 'Manage orders and process refunds',
            icon: ShoppingBag,
            path: '/admin/orders',
            color: 'from-green-500 to-emerald-500',
        },
        {
            title: 'Blackout Dates',
            description: 'Set unavailable dates and times',
            icon: Ban,
            path: '/admin/blackout-dates',
            color: 'from-red-500 to-orange-500',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-obsidian py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mb-4">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Select a section to manage
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {adminPages.map((page, index) => {
                        const Icon = page.icon;
                        return (
                            <motion.div
                                key={page.path}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => navigate(page.path)}
                                className="group cursor-pointer"
                            >
                                <div className="bg-white dark:bg-charcoal rounded-2xl p-6 border border-gray-200 dark:border-white/10 hover:border-electric/50 transition-all hover:shadow-xl hover:shadow-electric/10">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${page.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {page.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                        {page.description}
                                    </p>
                                    <div className="flex items-center text-electric font-bold text-sm group-hover:gap-2 transition-all">
                                        Open
                                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        More admin features coming soon
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;
