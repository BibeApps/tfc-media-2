import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Calendar,
    Image,
    ShoppingBag,
    Users,
    Ban,
    FolderOpen,
    Upload,
    ArrowRight,
    Edit,
    Briefcase,
    Shield,
    Mail,
    Settings,
    FileText,
    ImageIcon,
    MessageSquare
} from 'lucide-react';

const AdminHome: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const adminPages = [
        {
            title: 'Gallery Manager',
            description: 'Upload media to event galleries',
            icon: FolderOpen,
            path: '/admin/gallery',
            color: 'from-blue-500 to-cyan-500',
        },
        {
            title: 'Gallery Editor',
            description: 'Manage gallery names and types',
            icon: Edit,
            path: '/admin/gallery-edit',
            color: 'from-pink-500 to-rose-500',
        },
        {
            title: 'Bookings',
            description: 'View and manage client bookings',
            icon: Calendar,
            path: '/admin/bookings',
            color: 'from-purple-500 to-violet-500',
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
        {
            title: 'Service Types',
            description: 'Manage services and pricing',
            icon: Briefcase,
            path: '/admin/service-types',
            color: 'from-cyan-500 to-blue-500',
        },
        {
            title: 'Clients',
            description: 'View and manage client database',
            icon: Users,
            path: '/admin/clients',
            color: 'from-indigo-500 to-purple-500',
        },
        {
            title: 'Projects',
            description: 'Manage client deliverables',
            icon: FileText,
            path: '/admin/projects',
            color: 'from-orange-500 to-amber-500',
        },
        {
            title: 'Portfolio',
            description: 'Update your portfolio content',
            icon: Image,
            path: '/admin/portfolio',
            color: 'from-yellow-500 to-orange-500',
        },
        {
            title: 'Team',
            description: 'Manage team members and roles',
            icon: Shield,
            path: '/admin/team',
            color: 'from-teal-500 to-emerald-500',
        },
        {
            title: 'Support Tickets',
            description: 'Manage client support requests',
            icon: MessageSquare,
            path: '/admin/support',
            color: 'from-blue-500 to-indigo-500',
        },
        {
            title: 'Settings',
            description: 'Global system configuration',
            icon: Settings,
            path: '/admin/settings',
            color: 'from-gray-500 to-gray-700',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-obsidian py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                    <div className="bg-gradient-to-r from-electric to-blue-600 rounded-2xl p-8 text-white shadow-xl shadow-electric/20 mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Welcome Back, {user?.name || 'Admin'}!
                        </h1>
                        <p className="text-blue-100 text-lg">
                            Here's what's happening with your business today
                        </p>
                    </div>
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
