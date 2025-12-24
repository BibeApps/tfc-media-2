
import React from 'react';
import { Camera, Download, MessageCircle, DollarSign, Calendar, ShoppingBag, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; link?: string }> = ({ title, value, icon, link }) => {
    const Content = () => (
        <div className="bg-white dark:bg-charcoal p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">{value}</h3>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-obsidian rounded-lg text-electric">
                    {icon}
                </div>
            </div>
            {link && (
                <div className="flex items-center text-sm font-bold text-electric mt-2">
                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                </div>
            )}
        </div>
    );

    return link ? <Link to={link} className="block h-full"><Content /></Link> : <Content />;
};

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { projects } = useProjects();
    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'not_started');
    const recentProjects = [...projects].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()).slice(0, 2);

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-electric to-cyber rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-heading font-bold mb-2">Welcome back, {user?.name || 'User'}!</h1>
                    <p className="opacity-90 max-w-xl">
                        You have {activeProjects.length} active projects and 5 new photos ready for download. Check your latest gallery updates below.
                    </p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-12"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Projects" value={activeProjects.length} icon={<Camera className="w-6 h-6" />} link="/portal/projects" />
                <StatCard title="Available Downloads" value={14} icon={<Download className="w-6 h-6" />} link="/portal/downloads" />
                <StatCard title="Messages" value="3 New" icon={<MessageCircle className="w-6 h-6" />} />
                <StatCard title="Total Spent" value="$2,450" icon={<DollarSign className="w-6 h-6" />} link="/portal/purchases" />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Recent Projects */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Projects</h2>
                        <Link to="/portal/projects" className="text-sm font-bold text-electric hover:underline">View All</Link>
                    </div>

                    {recentProjects.map(project => (
                        <div key={project.id} className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-black rounded-lg overflow-hidden">
                                        <img src={project.coverImage} className="w-full h-full object-cover" alt="Project" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{project.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{project.serviceType} • {project.eventDate}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold self-start md:self-center uppercase tracking-wide
                            ${project.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                        project.status === 'completed' || project.status === 'uploaded' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                                    }`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            </div>
                            {project.status === 'in_progress' && (
                                <div className="p-6 bg-gray-50 dark:bg-obsidian/50">
                                    <div className="flex justify-between text-sm mb-2 text-gray-600 dark:text-gray-400">
                                        <span>Progress</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-electric rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3">Current Step: {project.currentStep}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Link to="/book" className="p-4 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 hover:border-electric transition-colors flex items-center gap-4 shadow-sm group">
                            <div className="w-10 h-10 rounded-full bg-electric/10 text-electric flex items-center justify-center group-hover:bg-electric group-hover:text-white transition-colors">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Book Session</h4>
                                <p className="text-xs text-gray-500">Schedule a new shoot</p>
                            </div>
                        </Link>

                        <Link to="/gallery" className="p-4 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 hover:border-cyber transition-colors flex items-center gap-4 shadow-sm group">
                            <div className="w-10 h-10 rounded-full bg-cyber/10 text-cyber flex items-center justify-center group-hover:bg-cyber group-hover:text-white transition-colors">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Browse Gallery</h4>
                                <p className="text-xs text-gray-500">Shop photos & videos</p>
                            </div>
                        </Link>

                        <Link to="/portal/downloads" className="p-4 bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 hover:border-green-500 transition-colors flex items-center gap-4 shadow-sm group">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                                <Heart className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Favorites</h4>
                                <p className="text-xs text-gray-500">View saved items</p>
                            </div>
                        </Link>
                    </div>

                    <div className="bg-gray-900 dark:bg-white/5 rounded-xl p-6 text-white mt-6">
                        <h4 className="font-bold mb-2">Need Help?</h4>
                        <p className="text-sm text-gray-400 mb-4">Our support team is available 24/7 to assist you.</p>
                        <button className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors">Contact Support</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
