
import React from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Camera, 
  ShoppingBag, 
  Download, 
  Settings, 
  LogOut,
  HelpCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const PortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/portal', icon: LayoutDashboard, exact: true },
    { name: 'My Projects', path: '/portal/projects', icon: Camera },
    { name: 'Purchases', path: '/portal/purchases', icon: ShoppingBag },
    { name: 'Downloads', path: '/portal/downloads', icon: Download },
    { name: 'Settings', path: '/portal/settings', icon: Settings },
  ];

  if (!user) return null; // Should be handled by ProtectedRoute, but safe check

  return (
    <div className="min-h-screen pt-4 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden sticky top-24">
              
              {/* User Profile Snippet */}
              <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-electric to-cyber p-0.5">
                  <img 
                    src={user.avatar} 
                    alt="User" 
                    className="w-full h-full rounded-full object-cover border-2 border-white dark:border-charcoal"
                  />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{user.name}</h3>
                  {user.accountType === 'vip' && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                        VIP Member
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-electric/10 text-electric' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>

              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-200 dark:border-white/5 mt-4 space-y-1">
                 <NavLink
                    to="/faq"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <HelpCircle className="w-5 h-5" />
                    Help & Support
                  </NavLink>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.3 }}
             >
               <Outlet />
             </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PortalLayout;
