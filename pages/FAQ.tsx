import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow"
  >
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-start gap-3">
      <HelpCircle className="w-6 h-6 text-electric flex-shrink-0 mt-1" />
      {question}
    </h3>
    <p className="text-gray-600 dark:text-gray-300 leading-relaxed pl-9 whitespace-pre-line">
      {answer}
    </p>
  </motion.div>
);

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "What services does TFC Media offer?",
      answer: "We provide high quality photography, videography, event coverage, graphic design, and digital media content. We also offer custom branding services, media packs, and downloadable content."
    },
    {
      question: "How do I book a session or service?",
      answer: "You can book directly through our online booking system. Simply choose the service you need, select a date and time, and submit your information. You’ll receive an instant confirmation email."
    },
    {
      question: "Do you require a deposit?",
      answer: "Yes. A deposit is required to secure your booking. The remaining balance can be paid on or before the service date."
    },
    {
      question: "What types of events do you cover?",
      answer: "We cover weddings, parties, concerts, corporate events, festivals, birthdays, and more. If your event isn’t listed, feel free to reach out we handle custom requests as well."
    },
    {
      question: "What is your turnaround time for photos and videos?",
      answer: "Turnaround time varies by project:\n\nStandard photography: 2-5 business days\nEvent coverage: 5–10 business days\nVideography: 5-7 business days depending on project complexity\n\nRush delivery options are available."
    },
    {
      question: "How do I receive my final content?",
      answer: "Final files are delivered digitally through a private link. Purchased digital content will be delivered without watermarks once payment is completed."
    },
    {
      question: "Are the previews in your store watermarked?",
      answer: "Yes. All preview images and videos in our shop are watermarked for protection.\nOnce purchased, clients receive a high resolution, watermark-free version."
    },
    {
      question: "Can I request revisions?",
      answer: "Yes. Most services include a set number of revisions. Additional revisions can be added for a small fee."
    },
    {
      question: "Do you travel for shoots or events?",
      answer: "Absolutely. Travel is available both locally and out of state. Additional travel fees may apply depending on location."
    },
    {
      question: "Do you offer custom packages?",
      answer: "Yes. If you don’t see a package that fits your needs, we can build a custom package based on your budget and goals."
    }
  ];

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Common questions about our services, galleries, and booking process.
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;