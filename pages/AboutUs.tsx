import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { TeamMember } from '../types';
import { supabase, isConfigured } from '../supabaseClient';

const AboutUs: React.FC = () => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const fetchTeamMembers = async () => {
        if (!isConfigured) {
            console.warn('Supabase not configured. Using empty team data.');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('display_order');

            if (error) throw error;
            setTeamMembers(data || []);
        } catch (err) {
            console.error('Error fetching team members:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <div className="bg-white dark:bg-charcoal pt-32 pb-16 px-4 border-b border-gray-200 dark:border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-heading font-bold text-4xl md:text-6xl mb-6 text-gray-900 dark:text-white"
                    >
                        About TFC Media
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed"
                    >
                        Capturing life's most precious moments with creativity, passion, and professionalism.
                    </motion.p>
                </div>
            </div>

            {/* Our Story Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="font-heading font-bold text-3xl md:text-4xl mb-6 text-gray-900 dark:text-white">
                            Our Story
                        </h2>
                        <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p>
                                TFC Media was founded with a simple mission: to tell stories that matter. We believe that every moment,
                                every emotion, and every celebration deserves to be captured with artistry and authenticity.
                            </p>
                            <p>
                                With years of experience in photography and videography, our team has had the privilege of documenting
                                countless weddings, corporate events, and special occasions. Each project is approached with fresh eyes
                                and a commitment to excellence.
                            </p>
                            <p>
                                We don't just take photos or record videos—we create timeless memories that you'll treasure for
                                generations to come.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative h-96 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        <img
                            src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80"
                            alt="TFC Media Team"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </motion.div>
                </div>
            </div>

            {/* Our Values Section */}
            <div className="bg-gray-50 dark:bg-obsidian py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4 text-gray-900 dark:text-white">
                            Our Values
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            The principles that guide everything we do
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                title: 'Creativity',
                                description: 'We approach every project with fresh perspectives and innovative ideas.',
                                icon: '🎨',
                            },
                            {
                                title: 'Quality',
                                description: 'Excellence is not an option—it\'s our standard in every frame we capture.',
                                icon: '⭐',
                            },
                            {
                                title: 'Trust',
                                description: 'Building lasting relationships through reliability and professionalism.',
                                icon: '🤝',
                            },
                        ].map((value, index) => (
                            <motion.div
                                key={value.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white dark:bg-charcoal rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-white/5"
                            >
                                <div className="text-4xl mb-4">{value.icon}</div>
                                <h3 className="font-bold text-xl mb-3 text-gray-900 dark:text-white">{value.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Meet the Team Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4 text-gray-900 dark:text-white">
                        Meet the Team
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        The talented individuals behind every perfect shot
                    </p>
                </motion.div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-10 h-10 animate-spin text-electric" />
                    </div>
                ) : teamMembers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        Team information coming soon
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {teamMembers.map((member, index) => (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 shadow-lg">
                                    <img
                                        src={member.image_url}
                                        alt={member.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">{member.name}</h3>
                                <p className="text-electric font-medium mb-2">{member.title}</p>
                                {member.bio && (
                                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
                                        {member.bio}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Contact CTA Section */}
            <div className="bg-electric/10 dark:bg-electric/5 py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="font-heading font-bold text-3xl md:text-4xl mb-6 text-gray-900 dark:text-white">
                            Let's Create Something Amazing
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                            Ready to capture your special moments? Get in touch with us today.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5" />
                                <span>Support@tfcmediagroup.com</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
