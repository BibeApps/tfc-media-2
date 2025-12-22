import React from 'react';
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
    Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { path: '/admin/gallery', icon: FolderOpen, label: 'Gallery Manager' },
        { path: '/admin/gallery-edit', icon: Edit2, label: 'Gallery Editor' },
        { path: '/admin/bookings', icon: Calendar, label: 'Bookings' },
        { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
        { path: '/admin/blackout-dates', icon: Ban, label: 'Blackout Dates' },
        { path: '/admin/service-types', icon: Briefcase, label: 'Service Types' },
        { path: '/admin/clients', icon: Users, label: 'Clients' },
        { path: '/admin/portfolio', icon: Image, label: 'Portfolio' },
        { path: '/admin/team', icon: UserCircle, label: 'Team' },
        { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-obsidian overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-charcoal border-r border-gray-200 dark:border-white/10 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric to-blue-600 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white">Admin Panel</h2>
                            <p className="text-xs text-gray-500">{user?.email}</p>
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
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-electric text-white shadow-lg shadow-electric/20'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
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
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
