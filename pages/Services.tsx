import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Video, Calendar, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const ServiceSection: React.FC<{
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  image: string;
  features: string[];
  reversed?: boolean;
}> = ({ id, title, icon, description, image, features, reversed = false }) => (
  <section id={id} className="py-24 scroll-mt-20">
    <div className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}>
      {/* Image Side */}
      <motion.div 
        initial={{ opacity: 0, x: reversed ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full lg:w-1/2"
      >
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl group">
          <div className="absolute inset-0 bg-electric/10 dark:bg-electric/20 mix-blend-overlay z-10"></div>
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          {/* Decorative elements */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-electric/20 rounded-full blur-3xl"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyber/20 rounded-full blur-3xl"></div>
        </div>
      </motion.div>

      {/* Content Side */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full lg:w-1/2 space-y-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric/10 text-electric font-bold text-sm uppercase tracking-wider">
          {icon} {title}
        </div>
        
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-white leading-tight">
          {title} Services
        </h2>
        
        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>

        <ul className="space-y-4">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
              <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="pt-4">
          <Link 
            to="/book" 
            className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            Book {title} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

const Services: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-charcoal pt-32 pb-16 px-4 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-heading font-bold text-gray-900 dark:text-white mb-6">Our Services</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Professional media solutions tailored to your unique needs. We bring your vision to life with precision and creativity.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ServiceSection
          id="photography"
          title="Photography"
          icon={<Camera className="w-4 h-4" />}
          description="Capture the essence of the moment with our premium photography services. From high-fashion editorial shoots to intimate portraits, we use industry-leading equipment and lighting techniques to deliver stunning visual assets."
          image="https://picsum.photos/seed/photo_service/800/600"
          features={[
            "High-resolution image delivery",
            "Professional retouching and color grading",
            "On-location or studio sessions",
            "Commercial rights included for brand shoots"
          ]}
        />

        <ServiceSection
          id="videography"
          title="Videography"
          icon={<Video className="w-4 h-4" />}
          description="Tell your story through motion. Our videography team specializes in cinematic production, offering everything from commercial advertisements to music videos and documentary-style storytelling."
          image="https://picsum.photos/seed/video_service/800/600"
          features={[
            "4K/6K Cinema camera production",
            "Professional audio recording & sound design",
            "Aerial drone cinematography",
            "Full post-production editing suite"
          ]}
          reversed
        />

        <ServiceSection
          id="event-coverage"
          title="Event Coverage"
          icon={<Calendar className="w-4 h-4" />}
          description="Don't let a single moment slip away. We provide comprehensive coverage for corporate events, weddings, festivals, and private parties. Our discreet team ensures every highlight is captured without disrupting the flow of your event."
          image="https://picsum.photos/seed/event_service/800/600"
          features={[
            "Multi-camera setup",
            "Same-day edit options for social media",
            "Full event archival footage",
            "Highlight reel creation"
          ]}
        />
      </div>
      
      {/* CTA Section */}
      <section className="bg-electric/10 dark:bg-electric/5 py-20 mt-12">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Ready to start your project?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            Contact us today to discuss your specific requirements and get a custom quote.
          </p>
          <Link 
            to="/book" 
            className="inline-block bg-electric hover:bg-electric/90 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg shadow-electric/25 transition-all hover:-translate-y-1"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Services;
