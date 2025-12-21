import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Video, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
  return (
    <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Gradient & Pattern */}
      <div className="absolute inset-0 bg-hero-gradient opacity-100 dark:opacity-10 dark:bg-none bg-gradient-to-br from-electric to-cyber"></div>
      <div className="absolute inset-0 bg-black/40 dark:bg-transparent"></div> {/* Overlay for light mode readability on colorful gradient */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="font-heading font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight mb-6 text-white drop-shadow-lg">
            WE CAPTURE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-200 dark:from-electric dark:to-cyber">THE UNFORGETTABLE</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-100 dark:text-gray-300 max-w-2xl mx-auto mb-10 drop-shadow-md">
            Premium photography and videography for events, brands, and people who demand excellence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/gallery" 
              className="px-8 py-4 rounded-full bg-white text-obsidian font-bold text-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-xl"
            >
              Browse Galleries <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/book" 
              className="px-8 py-4 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white font-bold text-lg hover:bg-white/20 transition-colors shadow-lg"
            >
              Book a Session
            </Link>
          </div>
        </motion.div>
      </div>
      
      {/* Abstract decorations */}
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 5 }}
        className="absolute top-1/4 left-10 w-24 h-24 rounded-full bg-white/20 dark:bg-electric/20 blur-3xl"
      />
      <motion.div 
        animate={{ y: [0, 30, 0] }}
        transition={{ repeat: Infinity, duration: 7 }}
        className="absolute bottom-1/4 right-10 w-32 h-32 rounded-full bg-white/20 dark:bg-cyber/20 blur-3xl"
      />
    </section>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-8 rounded-2xl bg-white dark:bg-charcoal border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-electric/50 transition-all"
  >
    <div className="w-12 h-12 bg-gray-50 dark:bg-obsidian rounded-lg flex items-center justify-center text-electric mb-6 border border-gray-100 dark:border-white/10">
      {icon}
    </div>
    <h3 className="font-heading font-bold text-xl mb-3 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400">{desc}</p>
  </motion.div>
);

const Features: React.FC = () => {
  return (
    <section className="py-24 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<ImageIcon />} 
            title="Premium Photography" 
            desc="High-resolution imagery with professional color grading and retouching." 
          />
          <FeatureCard 
            icon={<Video />} 
            title="Cinematic Video" 
            desc="4K video production with state-of-the-art stabilization and audio." 
          />
          <FeatureCard 
            icon={<Star />} 
            title="Instant Delivery" 
            desc="AI-powered gallery system for rapid sorting and delivery to clients." 
          />
        </div>
      </div>
    </section>
  );
};

const Home: React.FC = () => {
  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
    </div>
  );
};

export default Home;