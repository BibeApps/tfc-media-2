import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Project } from '../types';
import { supabase, isConfigured } from '../supabaseClient';
import { PORTFOLIO_ITEMS } from '../constants';

const Portfolio: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    if (!isConfigured) {
      console.warn('Supabase not configured. Using mock data for Portfolio.');
      setProjects(PORTFOLIO_ITEMS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('portfolio_projects')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setProjects(data.map((p: any) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          image: p.image_url,
          description: p.description,
          tags: p.tags || []
        })));
      } else {
        setProjects([]);
      }
    } catch (err: any) {
      console.error('Error fetching portfolio:', err.message || err);
      // Fallback to mock data on error so the page isn't empty
      setProjects(PORTFOLIO_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedId);

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="font-heading font-bold text-4xl md:text-5xl mb-4 text-gray-900 dark:text-white">Selected Works</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">A curation of our finest moments in photography and videography.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-electric" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              layoutId={project.id}
              onClick={() => setSelectedId(project.id)}
              className="group relative cursor-pointer aspect-[4/5] rounded-xl overflow-hidden bg-white dark:bg-charcoal shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-white/5"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src={project.image}
                alt={project.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 dark:opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

              <div className="absolute bottom-0 left-0 p-6 w-full">
                <span className="text-electric text-xs font-bold uppercase tracking-wider mb-2 block">{project.category}</span>
                <h3 className="text-2xl font-heading font-bold text-white">{project.title}</h3>
              </div>
            </motion.div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-center text-gray-500">
              No portfolio items found.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedId && selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="absolute inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-sm"
            />

            <motion.div
              layoutId={selectedId}
              className="relative w-full max-w-4xl bg-white dark:bg-charcoal rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full hover:bg-white text-white hover:text-black transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="md:w-2/3 h-64 md:h-auto bg-gray-100 dark:bg-black relative">
                <img
                  src={selectedProject.image}
                  alt={selectedProject.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="md:w-1/3 p-8 flex flex-col overflow-y-auto">
                <span className="text-electric text-sm font-bold uppercase tracking-wider mb-2">{selectedProject.category}</span>
                <h2 className="text-3xl font-heading font-bold mb-4 text-gray-900 dark:text-white">{selectedProject.title}</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{selectedProject.description}</p>

                <div className="mt-auto">
                  <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Portfolio;