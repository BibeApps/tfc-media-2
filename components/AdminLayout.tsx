import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderOpen,
    Calendar,
    ShoppingBag,
    Ban,
    Users,
    Settings,
    LogOut,
    Sun,
    Moon,
    Upload,
    Briefcase,
    Shield,
    Bell,
    UserCircle,
    Image,
    Edit2,
    MessageSquare,
    Menu,
    X,
    FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabaseClient';

const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        fetchUnreadSupportCount();

        // Set up real-time subscription for support tickets
        const channel = supabase
            .channel('admin_support_tickets_changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'support_tickets'
                },
                (payload) => {
                    fetchUnreadSupportCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchUnreadSupportCount = async () => {
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('id', { count: 'exact' })
                .eq('is_read', false); // Count unread tickets

            if (error) throw error;

            const count = data?.length || 0;
            setUnreadSupportCount(count);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { path: '/admin/gallery', icon: FolderOpen, label: 'Gallery Manager' },
        { path: '/admin/gallery-edit', icon: Edit2, label: 'Gallery Editor' },

        { path: '/admin/bookings', icon: Calendar, label: 'Bookings' },
        { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
        { path: '/admin/invoices', icon: FileText, label: 'Invoices' },
        { path: '/admin/blackout-dates', icon: Ban, label: 'Blackout Dates' },
        { path: '/admin/service-types', icon: Briefcase, label: 'Service Types' },
        { path: '/admin/clients', icon: Users, label: 'Clients' },
        { path: '/admin/projects', icon: Briefcase, label: 'Projects' },
        { path: '/admin/portfolio', icon: Image, label: 'Portfolio' },
        { path: '/admin/team', icon: UserCircle, label: 'Team' },
        {
            path: '/admin/support',
            icon: MessageSquare,
            label: unreadSupportCount > 0 ? `${unreadSupportCount} Support Tickets` : 'Support Tickets'
        },
        { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-obsidian">
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-lg border border-gray-200 dark:border-white/10"
                >
                    {mobileMenuOpen ? (
                        <X className="w-6 h-6 text-gray-900 dark:text-white" />
                    ) : (
                        <Menu className="w-6 h-6 text-gray-900 dark:text-white" />
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex gap-8">
                    {/* Sidebar */}
                    <aside className={`
                        w-64 flex-shrink-0
                        fixed lg:static inset-y-0 left-0 z-40
                        transform transition-transform duration-300 ease-in-out
                        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    `}>
                        <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden lg:sticky lg:top-24 h-full lg:h-auto">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-white/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric to-blue-600 flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="font-bold text-gray-900 dark:text-white">Admin Panel</h2>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    {theme === 'dark' ? (
                                        <>
                                            <Sun className="w-4 h-4" />
                                            Light Mode
                                        </>
                                    ) : (
                                        <>
                                            <Moon className="w-4 h-4" />
                                            Dark Mode
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Navigation */}
                            <nav className="p-4 space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.exact}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? 'bg-electric text-white shadow-lg shadow-electric/20'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <item.icon className="w-5 h-5 flex-shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-200 dark:border-white/10">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0 w-full lg:w-auto mt-16 lg:mt-0">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
