
import React, { useState } from 'react';
import { 
  Shield, FileText, Cookie, Megaphone, Scale, 
  ChevronRight, ArrowLeft, Lock, Globe 
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

type Section = 'privacy' | 'terms' | 'advertising' | 'cookies' | 'ad_choices';

export const LegalPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('privacy');

  const MenuLink = ({ id, label, icon: Icon }: { id: Section, label: string, icon: any }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 text-left mb-1",
        activeSection === id 
          ? "bg-slate-900 text-white shadow-md" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className={cn("w-5 h-5", activeSection === id ? "text-white" : "text-slate-400")} />
      {label}
      {activeSection === id && <ChevronRight className="w-4 h-4 ml-auto text-white/50" />}
    </button>
  );

  return (
    <div className="max-w-[1200px] mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="mb-8 px-4 md:px-0">
         <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Legal & Information</h1>
         <p className="text-slate-500 text-lg">Transparency regarding how Synapse operates and protects you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
         
         {/* Sidebar Navigation */}
         <div className="space-y-6">
            <Card className="p-3 border-slate-200 bg-white shadow-sm sticky top-24">
               <div className="px-4 py-2 mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documents</span>
               </div>
               <nav>
                  <MenuLink id="privacy" label="Privacy Policy" icon={Lock} />
                  <MenuLink id="terms" label="Terms of Service" icon={FileText} />
                  <MenuLink id="cookies" label="Cookie Policy" icon={Cookie} />
                  <div className="my-2 border-t border-slate-100" />
                  <div className="px-4 py-2 mb-1">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business</span>
                  </div>
                  <MenuLink id="advertising" label="Advertising" icon={Megaphone} />
                  <MenuLink id="ad_choices" label="Ad Choices" icon={Scale} />
               </nav>
            </Card>

            <div className="px-4 text-xs text-slate-400 leading-relaxed">
               <p>Last updated: October 24, 2026</p>
               <p className="mt-2">Synapse Inc.<br/>123 Innovation Dr.<br/>San Francisco, CA 94103</p>
            </div>
         </div>

         {/* Content Area */}
         <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 md:p-12 min-h-[600px]">
            
            {activeSection === 'privacy' && (
               <div className="space-y-8 animate-in fade-in">
                  <div>
                     <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                        <Lock className="w-8 h-8" />
                     </div>
                     <h2 className="text-3xl font-black text-slate-900 mb-6">Privacy Policy</h2>
                     <p className="text-slate-600 leading-relaxed text-lg">
                        At Synapse, we believe privacy is a fundamental human right. This policy outlines exactly what data we collect, why we collect it, and how you can control it.
                     </p>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-6">
                     <SectionTitle title="1. Information We Collect" />
                     <p className="text-slate-600 leading-relaxed">
                        We collect information you provide directly to us, such as when you create an account, post content, or communicate with others. This includes your name, email address, bio, and any media you upload.
                     </p>
                     <ul className="list-disc pl-5 space-y-2 text-slate-600">
                        <li><strong>Account Information:</strong> Name, email, password, and date of birth.</li>
                        <li><strong>Content:</strong> Photos, videos, posts, and comments you create.</li>
                        <li><strong>Connections:</strong> Information about friends and groups you join.</li>
                     </ul>

                     <SectionTitle title="2. How We Use Your Information" />
                     <p className="text-slate-600 leading-relaxed">
                        We use your data to provide, maintain, and improve our services. This includes personalizing your feed, suggesting friends, and displaying relevant advertisements (which keeps Synapse free).
                     </p>

                     <SectionTitle title="3. Data Sharing" />
                     <p className="text-slate-600 leading-relaxed">
                        We do not sell your personal data to third parties. We may share data with service providers who help us operate our infrastructure (e.g., cloud hosting), but they are bound by strict confidentiality agreements.
                     </p>
                  </div>
               </div>
            )}

            {activeSection === 'terms' && (
               <div className="space-y-8 animate-in fade-in">
                  <div>
                     <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                        <FileText className="w-8 h-8" />
                     </div>
                     <h2 className="text-3xl font-black text-slate-900 mb-6">Terms of Service</h2>
                     <p className="text-slate-600 leading-relaxed text-lg">
                        Welcome to Synapse. By using our platform, you agree to these terms. We've tried to keep them readable and fair.
                     </p>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-6">
                     <SectionTitle title="1. Your Commitments" />
                     <p className="text-slate-600 leading-relaxed">
                        To ensure a safe environment, you must:
                     </p>
                     <ul className="list-disc pl-5 space-y-2 text-slate-600">
                        <li>Be at least 13 years old.</li>
                        <li>Not engage in bullying, harassment, or hate speech.</li>
                        <li>Use your real name or a name you use in everyday life.</li>
                        <li>Not use Synapse for illegal activities.</li>
                     </ul>

                     <SectionTitle title="2. Content Ownership" />
                     <p className="text-slate-600 leading-relaxed">
                        You own all of the content and information you post on Synapse. You grant us a non-exclusive, transferable, sub-licensable, royalty-free, and worldwide license to host, use, distribute, modify, run, copy, publicly perform or display, translate, and create derivative works of your content.
                     </p>

                     <SectionTitle title="3. Account Termination" />
                     <p className="text-slate-600 leading-relaxed">
                        We may suspend or permanently disable your account if you violate our Terms or Policies. You can delete your account at any time via Settings.
                     </p>
                  </div>
               </div>
            )}

            {activeSection === 'cookies' && (
               <div className="space-y-8 animate-in fade-in">
                  <div>
                     <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 text-orange-600">
                        <Cookie className="w-8 h-8" />
                     </div>
                     <h2 className="text-3xl font-black text-slate-900 mb-6">Cookie Policy</h2>
                     <p className="text-slate-600 leading-relaxed text-lg">
                        Cookies help us deliver the best experience. Here's how we use them.
                     </p>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-6">
                     <SectionTitle title="What are Cookies?" />
                     <p className="text-slate-600 leading-relaxed">
                        Cookies are small text files placed on your device to store data that can be recalled by a web server in the domain that placed the cookie. We use cookies and similar technologies for storing and honoring your preferences and settings, enabling you to sign-in, providing interest-based advertising, combating fraud, analyzing how our products perform, and fulfilling other legitimate purposes.
                     </p>

                     <SectionTitle title="Types of Cookies We Use" />
                     <div className="grid gap-4">
                        <div className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                           <h4 className="font-bold text-slate-900">Essential Cookies</h4>
                           <p className="text-sm text-slate-600 mt-1">Required for basic site functionality like logging in and security.</p>
                        </div>
                        <div className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                           <h4 className="font-bold text-slate-900">Analytics Cookies</h4>
                           <p className="text-sm text-slate-600 mt-1">Help us understand how visitors interact with the site.</p>
                        </div>
                        <div className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                           <h4 className="font-bold text-slate-900">Advertising Cookies</h4>
                           <p className="text-sm text-slate-600 mt-1">Used to show you ads that are relevant to your interests.</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeSection === 'advertising' && (
               <div className="space-y-8 animate-in fade-in">
                  <div>
                     <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                        <Megaphone className="w-8 h-8" />
                     </div>
                     <h2 className="text-3xl font-black text-slate-900 mb-6">Advertising on Synapse</h2>
                     <p className="text-slate-600 leading-relaxed text-lg">
                        Advertising allows us to keep Synapse free for everyone. We strive to show ads that are relevant and safe.
                     </p>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-6">
                     <SectionTitle title="How Ads Work" />
                     <p className="text-slate-600 leading-relaxed">
                        Advertisers bid to show ads to audiences based on demographics and interests. We do not sell your personal information to advertisers. Instead, we allow advertisers to tell us who they want to reach, and we display the ads to users who fit that description.
                     </p>

                     <SectionTitle title="Your Controls" />
                     <p className="text-slate-600 leading-relaxed">
                        You can manage the topics you see ads about in your Privacy Center. You can also hide specific ads or advertisers that you do not want to see.
                     </p>
                  </div>
               </div>
            )}

            {activeSection === 'ad_choices' && (
               <div className="space-y-8 animate-in fade-in">
                  <div>
                     <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mb-6 text-cyan-600">
                        <Scale className="w-8 h-8" />
                     </div>
                     <h2 className="text-3xl font-black text-slate-900 mb-6">Ad Choices</h2>
                     <p className="text-slate-600 leading-relaxed text-lg">
                        You have control over how data is used to show you ads off of Synapse.
                     </p>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-6">
                     <p className="text-slate-600 leading-relaxed">
                        Synapse participates in industry self-regulatory programs for online behavioral advertising. You can opt out of seeing interest-based ads from participating companies through the Digital Advertising Alliance or similar organizations.
                     </p>
                     
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                        <h4 className="font-bold text-slate-900 mb-2">Manage Your Preferences</h4>
                        <p className="text-slate-600 mb-4 text-sm">Review your ad topic preferences directly on Synapse.</p>
                        <Button variant="default" className="bg-slate-900 text-white rounded-xl font-bold">
                           Go to Ad Preferences
                        </Button>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
   <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
);
