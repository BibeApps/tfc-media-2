import React from 'react';
import { Shield, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const LicenseCard: React.FC<{ 
  title: string; 
  price: string; 
  description: string;
  allowed: string[];
  forbidden: string[];
  recommended?: boolean;
}> = ({ title, price, description, allowed, forbidden, recommended }) => (
  <div className={`p-8 rounded-2xl border flex flex-col h-full ${recommended ? 'border-electric bg-electric/5 dark:bg-electric/10' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-charcoal'} shadow-sm relative`}>
    {recommended && (
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-electric text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
        Most Popular
      </span>
    )}
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-2xl font-heading font-bold text-electric mb-4">{price}</p>
    <p className="text-gray-600 dark:text-gray-400 text-sm mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
      {description}
    </p>

    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" /> Allowed
        </h4>
        <ul className="space-y-2">
          {allowed.map((item, idx) => (
            <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2">
              <span className="block w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {forbidden.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> Forbidden
          </h4>
          <ul className="space-y-2">
            {forbidden.map((item, idx) => (
              <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2">
                <span className="block w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
);

const Licensing: React.FC = () => {
  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-electric/10 rounded-xl mb-6 text-electric">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-6">Licensing Agreements</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Clear, transparent usage rights for all TFC Media content. Choose the license that fits your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
          <LicenseCard 
            title="Personal Use"
            price="Included"
            description="For personal purposes only. Included with standard purchase."
            allowed={[
              "Social media posts",
              "Personal prints",
              "Personal projects",
              "Event recaps"
            ]}
            forbidden={[
              "Reselling",
              "Commercial advertising",
              "Client work",
              "Brand projects"
            ]}
          />
          
          <LicenseCard 
            title="Standard Commercial"
            price="Custom Quote"
            description="For business and promotional purposes."
            allowed={[
              "Business social media",
              "Website use",
              "Marketing materials",
              "Advertisements",
              "Brand visuals"
            ]}
            forbidden={[
              "Reselling content as-is",
              "Large-scale media campaigns (TV, Film)",
              "Products for sale (merch)"
            ]}
            recommended
          />

          <LicenseCard 
            title="Extended Commercial"
            price="Custom Quote"
            description="For brands and creators needing full usage rights."
            allowed={[
              "Unlimited business use",
              "Paid advertisements",
              "Broadcast usage (TV, YouTube ads)",
              "Use in digital products",
              "Use in print products"
            ]}
            forbidden={[
              "Claiming authorship",
              "Redistributing original file as standalone product"
            ]}
          />

          <LicenseCard 
            title="Exclusive Rights"
            price="Premium"
            description="Complete exclusivity. Content removed from shop."
            allowed={[
              "Complete ownership rights",
              "Commercial campaigns",
              "Branding",
              "Unique visuals"
            ]}
            forbidden={[
              // No forbidden actions for exclusive typically, but we can list general
            ]}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/5 h-full">
                <div className="flex items-start gap-4">
                    <FileText className="w-8 h-8 text-electric flex-shrink-0 mt-1" />
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Attribution & Copyright</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                Attribution is not required for purchased content, but always appreciated. For collaborative projects, TFC Media may still display content in our portfolio unless an exclusivity contract is purchased.
                                <br/><br/>
                                All content created by TFC Media remains under TFC Media’s copyright unless the client purchases an exclusive rights license.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/5 h-full">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-8 h-8 text-electric flex-shrink-0 mt-1" />
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Watermark Policy</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                All preview content is watermarked. Watermarks are removed only after purchase or upon delivery of commissioned work.
                                <br/><br/>
                                Unauthorized removal of watermarks via software or cropping is strictly prohibited and violates our terms of service.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Licensing;