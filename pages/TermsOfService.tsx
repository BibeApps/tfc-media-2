import React from 'react';
import { FileText, AlertTriangle, Scale, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
    <div className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm space-y-4">
      {children}
    </div>
  </div>
);

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
      <div className="max-w-4xl mx-auto bg-white dark:bg-charcoal rounded-2xl border border-gray-200 dark:border-white/5 p-8 md:p-12 shadow-sm">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-electric/10 rounded-xl mb-6 text-electric">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Last Updated: October 26, 2024</p>
        </div>

        <Section title="1. Agreement to Terms">
          <p>
            These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and TFC Media ("we," "concerning your access to and use of the TFC Media website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").
          </p>
          <p>
            You agree that by accessing the Site, you have read, understood, and agreed to be bound by all of these Terms of Service. If you do not agree with all of these terms of service, then you are expressly prohibited from using the Site and you must discontinue use immediately.
          </p>
        </Section>

        <Section title="2. Intellectual Property Rights">
          <p>
            Unless otherwise indicated, the Site and its original content, features, and functionality are owned by TFC Media and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>
          <p>
            Purchasing digital content does not transfer the copyright to you. You are granted a specific license to use the content as described in our <Link to="/licensing" className="text-electric hover:underline">Licensing Agreement</Link>.
          </p>
        </Section>

        <Section title="3. User Representations">
          <p>By using the Site, you represent and warrant that:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>All registration information you submit will be true, accurate, current, and complete.</li>
            <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
            <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
            <li>You will not use the Site for any illegal or unauthorized purpose.</li>
          </ul>
        </Section>

        <Section title="4. Booking and Payments">
          <p>
            <strong>Deposits:</strong> A non-refundable deposit is required to secure any booking date. The amount will be specified at the time of booking.
          </p>
          <p>
            <strong>Digital Products:</strong> All sales of digital products (photos, videos, presets) are final. Due to the nature of digital downloads, we generally do not offer refunds once a file has been downloaded.
          </p>
          <p>
            <strong>Cancellations:</strong> Booking cancellations made less than 48 hours before the scheduled session may be subject to a cancellation fee.
          </p>
        </Section>

        <Section title="5. Prohibited Activities">
          <p>
            You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us. Prohibited activities include:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Systematically retrieving data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
            <li>Circumventing, disabling, or otherwise interfering with security-related features of the Site.</li>
            <li>Removing any watermarks from preview images using software or other means without purchasing a license.</li>
          </ul>
        </Section>

        <Section title="6. Limitation of Liability">
          <p>
            In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the site, even if we have been advised of the possibility of such damages.
          </p>
        </Section>

        <Section title="7. Contact Us">
          <p>
            In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:
          </p>
          <div className="mt-4 font-bold text-gray-900 dark:text-white">
            TFC Media Support<br/>
            <a href="mailto:support@tfcmedia.com" className="text-electric font-normal hover:underline">support@tfcmedia.com</a>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default TermsOfService;