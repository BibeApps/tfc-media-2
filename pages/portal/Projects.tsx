
import React, { useState } from 'react';
import { Calendar, X, Camera, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalProject, ProjectStatus } from '../../types';
import { useProjects } from '../../context/ProjectContext';

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
    const styles = {
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
        completed: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
        uploaded: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
        not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
    };
    
    const labels = {
        in_progress: 'In Progress',
        completed: 'Completed',
        uploaded: 'Uploaded',
        not_started: 'Pending',
    };
    
    const className = styles[status] || styles.not_started;
    
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${className}`}>
            {labels[status]}
        </span>
    );
};

const ProjectDetailsModal: React.FC<{ project: PortalProject; onClose: () => void }> = ({ project, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-charcoal w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="relative h-48 flex-shrink-0">
          <img src={project.coverImage} className="w-full h-full object-cover" alt={project.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-90" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors backdrop-blur-md">
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-6 left-6 text-white">
            <StatusBadge status={project.status} />
            <h2 className="text-3xl font-heading font-bold mt-2 text-white">{project.name}</h2>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {/* Progress Section */}
          <div className="mb-8 bg-gray-50 dark:bg-white/5 p-5 rounded-xl border border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-end mb-2">
               <div>
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Current Phase</h4>
                  <p className="text-xl font-bold text-electric">{project.currentStep}</p>
               </div>
               <span className="text-2xl font-bold text-gray-900 dark:text-white">{project.progress}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-black/40 rounded-full overflow-hidden">
               <div className="h-full bg-electric transition-all duration-1000 ease-out" style={{ width: `${project.progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-3 text-right">
                {project.progress === 100 ? 'Project Completed' : 'Estimated completion based on current workflow'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
             <div>
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">Project Info</h4>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                       <div className="p-2 bg-electric/10 rounded-lg text-electric flex-shrink-0"><Calendar className="w-5 h-5" /></div>
                       <div>
                          <p className="text-xs text-gray-500 mb-0.5">Event Date</p>
                          <p className="font-bold text-gray-900 dark:text-white">{project.eventDate}</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 flex-shrink-0"><Camera className="w-5 h-5" /></div>
                       <div>
                          <p className="text-xs text-gray-500 mb-0.5">Service Type</p>
                          <p className="font-bold text-gray-900 dark:text-white">{project.serviceType}</p>
                       </div>
                    </div>
                </div>
             </div>

             <div>
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">Management Team</h4>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shadow-inner">
                          {project.manager.charAt(0)}
                       </div>
                       <div>
                          <p className="text-xs text-gray-500 mb-0.5">Project Manager</p>
                          <p className="font-bold text-gray-900 dark:text-white">{project.manager}</p>
                       </div>
                    </div>
                    <a href={`mailto:support@tfcmedia.com?subject=Question regarding Project: ${project.name}`} className="flex items-center gap-2 text-electric text-sm font-bold hover:underline mt-2 p-2 hover:bg-electric/5 rounded-lg transition-colors w-fit">
                        <Mail className="w-4 h-4" /> Contact Manager
                    </a>
                </div>
             </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-obsidian/50 flex justify-end">
           <button onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg font-bold text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 transition-colors shadow-sm">
              Close Details
           </button>
        </div>
      </motion.div>
    </div>
  );
}

const ProjectCard: React.FC<{ project: PortalProject; onViewDetails: () => void }> = ({ project, onViewDetails }) => (
  <div className="bg-white dark:bg-charcoal rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col h-full hover:border-electric/50">
      {/* Image Header */}
      <div className="h-40 relative overflow-hidden">
         <img 
            src={project.coverImage} 
            alt={project.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
         <div className="absolute bottom-3 left-4 right-4">
             <p className="text-xs text-electric font-bold uppercase tracking-wider mb-1">{project.serviceType}</p>
             <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">{project.name}</h3>
         </div>
         <div className="absolute top-3 right-3">
             <StatusBadge status={project.status} />
         </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
         <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
             <Calendar className="w-3.5 h-3.5" />
             <span>{project.eventDate}</span>
             <span className="mx-1">•</span>
             <span>{project.manager}</span>
         </div>

         <div className="space-y-2 mt-auto">
             <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
                 <span>{project.currentStep}</span>
                 <span>{project.progress}%</span>
             </div>
             <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                 <div 
                    className={`h-full rounded-full transition-all duration-1000 ${['completed', 'uploaded'].includes(project.status) ? 'bg-green-500' : 'bg-electric'}`} 
                    style={{ width: `${project.progress}%` }}
                 ></div>
             </div>
         </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-obsidian/30">
          <button 
            onClick={onViewDetails}
            className="w-full flex items-center justify-center py-2.5 rounded-lg bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5 transition-colors shadow-sm hover:shadow"
          >
              View Details
          </button>
      </div>
  </div>
);

const Projects: React.FC = () => {
  const { projects } = useProjects();
  const [filter, setFilter] = useState('All Projects');
  const [selectedProject, setSelectedProject] = useState<PortalProject | null>(null);

  const filteredProjects = projects.filter(project => {
      if (filter === 'All Projects') return true;
      if (filter === 'Active') return project.status === 'in_progress';
      if (filter === 'Completed') return ['completed', 'uploaded'].includes(project.status);
      if (filter === 'Upcoming') return project.status === 'not_started';
      return true;
  });

  return (
    <div className="space-y-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Projects</h1>
            <Link to="/book" className="bg-gray-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center">
                + New Booking
            </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
            {['All Projects', 'Active', 'Completed', 'Upcoming'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                        filter === tab 
                        ? 'bg-electric text-white shadow-lg shadow-electric/25' 
                        : 'bg-white dark:bg-charcoal text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map(project => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onViewDetails={() => setSelectedProject(project)}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-white dark:bg-charcoal rounded-2xl border border-gray-200 dark:border-white/5 border-dashed">
                <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No projects found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {filter === 'All Projects' ? "You haven't booked any projects yet." : `You have no ${filter.toLowerCase()} projects.`}
                </p>
            </div>
        )}

        <AnimatePresence>
            {selectedProject && (
                <ProjectDetailsModal 
                    project={selectedProject} 
                    onClose={() => setSelectedProject(null)} 
                />
            )}
        </AnimatePresence>
    </div>
  );
};

export default Projects;
