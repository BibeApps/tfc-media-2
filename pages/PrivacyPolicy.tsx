import React from 'react';
import { Lock, Shield, Eye, Mail } from 'lucide-react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
    <div className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm space-y-4">
      {children}
    </div>
  </div>
);

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
      <div className="max-w-4xl mx-auto bg-white dark:bg-charcoal rounded-2xl border border-gray-200 dark:border-white/5 p-8 md:p-12 shadow-sm">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-electric/10 rounded-xl mb-6 text-electric">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Last Updated: October 26, 2024</p>
        </div>

        <Section title="1. Introduction">
          <p>
            At TFC Media ("we," "our," or "us"), we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site, such as online chat and message boards.</li>
            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</li>
            <li><strong>Financial Data:</strong> Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Site. We store only very limited, if any, financial information that we collect. Otherwise, all financial information is stored by our payment processor, Stripe.</li>
          </ul>
        </Section>

        <Section title="3. Use of Your Information">
          <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Create and manage your account.</li>
            <li>Process your payments and refunds.</li>
            <li>Email you regarding your account or order.</li>
            <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site.</li>
            <li>Generate a personal profile about you to make future visits to the Site more personalized.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
          </ul>
        </Section>

        <Section title="4. Disclosure of Your Information">
          <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
            <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
          </ul>
        </Section>

        <Section title="5. Security of Your Information">
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contact Us</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            If you have questions or comments about this Privacy Policy, please contact us at:
          </p>
          <div className="flex items-center gap-2 text-electric">
            <Mail className="w-4 h-4" />
            <a href="mailto:privacy@tfcmedia.com" className="hover:underline">privacy@tfcmedia.com</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;