
import React, { useState } from 'react';
import { 
  Search, HelpCircle, Shield, Lock, CreditCard, Users, 
  FileText, MessageSquare, ChevronDown, ChevronUp, Mail, 
  ExternalLink, ArrowRight, CheckCircle2, AlertTriangle, Book, X, Loader2
} from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';

export const HelpPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Category Filtering State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Quick Link Dialog State
  const [legalDialog, setLegalDialog] = useState<{open: boolean, title: string, content: string}>({
    open: false, title: '', content: ''
  });

  const categories = [
    { id: 'privacy', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Privacy & Security', desc: 'Control who sees your content and secure your account.' },
    { id: 'account', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Account Settings', desc: 'Manage your personal details, email, and preferences.' },
    { id: 'billing', icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50', title: 'Billing & Payments', desc: 'Issues with ads, subscriptions, or payment methods.' },
    { id: 'login', icon: Lock, color: 'text-rose-500', bg: 'bg-rose-50', title: 'Login & Password', desc: 'Fix login issues and reset your password.' },
    { id: 'policies', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Policies & Reporting', desc: 'Understand our community standards and report abuse.' },
    { id: 'general', icon: MessageSquare, color: 'text-cyan-500', bg: 'bg-cyan-50', title: 'Something Else', desc: 'General inquiries and feedback.' },
  ];

  const faqs = [
    {
      id: 'faq-1',
      category: 'login',
      question: 'How do I change my password?',
      answer: 'To change your password, go to Settings > Security > Change Password. You will need to enter your current password and then your new one. If you have forgotten your password, use the "Forgot Password" link on the login page.'
    },
    {
      id: 'faq-2',
      category: 'privacy',
      question: 'Can I see who viewed my profile?',
      answer: 'No, Synapse does not let you track who views your profile. Third-party apps also cannot provide this functionality. If you come across an app that claims to offer this ability, please report it.'
    },
    {
      id: 'faq-3',
      category: 'account',
      question: 'How do I deactivate my account?',
      answer: 'You can temporarily deactivate or permanently delete your account in Settings > Account > Danger Zone. Deactivating hides your profile, while deleting permanently removes all your data after a grace period.'
    },
    {
      id: 'faq-4',
      category: 'policies',
      question: 'Why was my content removed?',
      answer: 'We remove content that violates our Community Standards. This includes hate speech, violence, nudity, and spam. If you believe this was a mistake, you can appeal the decision through your Support Inbox.'
    },
    {
      id: 'faq-5',
      category: 'billing',
      question: 'How do I manage my ad preferences?',
      answer: 'You can manage how ads are shown to you by navigating to Settings > Privacy. We do not sell your personal data to advertisers.'
    },
    {
      id: 'faq-6',
      category: 'general',
      question: 'How do I report a bug?',
      answer: 'If you encounter a technical issue, please use the "Report a problem" feature in the main menu or use the contact form on this page with the subject "Bug Report".'
    }
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject || !contactMessage) {
      toast("Please fill in all fields", "error");
      return;
    }
    
    if (!user) {
        toast("You must be logged in to contact support.", "error");
        return;
    }

    setIsSubmitting(true);
    
    try {
        await addDoc(collection(db, 'support_tickets'), {
            subject: contactSubject,
            message: contactMessage,
            userUid: user.uid,
            userEmail: user.email,
            userName: userProfile?.displayName,
            status: 'new',
            timestamp: serverTimestamp()
        });
        
        setContactSubject('');
        setContactMessage('');
        toast("Request submitted. We'll get back to you via email.", "success");
    } catch (error) {
        console.error("Error submitting ticket:", error);
        toast("Failed to submit request. Please try again later.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const openQuickLink = (title: string, content: string) => {
      setLegalDialog({ open: true, title, content });
  };

  const filteredFaqs = faqs.filter(f => {
    const matchesSearch = f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? f.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-[1000px] mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-synapse-900 to-slate-900 text-white shadow-2xl mb-12 border border-white/10">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
         <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-synapse-500/30 rounded-full blur-3xl"></div>
         <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>

         <div className="relative z-10 p-10 md:p-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-semibold tracking-wide uppercase text-indigo-100 shadow-sm">
               <HelpCircle className="w-4 h-4 text-cyan-300" /> Synapse Support
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
               How can we help you?
            </h1>
            
            <div className="max-w-xl mx-auto relative">
               <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search help articles..." 
                  className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/95 backdrop-blur-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-synapse-500/30 transition-all shadow-lg text-lg font-medium"
               />
            </div>
         </div>
      </div>

      {/* Categories Grid */}
      <div className="mb-16">
         <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-2xl font-bold text-slate-900">Browse by Topic</h2>
            {selectedCategory && (
                <Button 
                    variant="ghost" 
                    onClick={() => setSelectedCategory(null)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
                >
                    <X className="w-4 h-4" /> Clear Filter
                </Button>
            )}
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, i) => (
               <Card 
                 key={i} 
                 onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                 className={cn(
                    "p-6 transition-all duration-300 border-slate-200 group cursor-pointer hover:-translate-y-1",
                    selectedCategory === cat.id ? "ring-2 ring-synapse-500 shadow-md bg-synapse-50/30" : "hover:shadow-lg"
                 )}
               >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors", cat.bg)}>
                     <cat.icon className={cn("w-6 h-6", cat.color)} />
                  </div>
                  <h3 className={cn("text-lg font-bold text-slate-900 mb-2 transition-colors", selectedCategory === cat.id ? "text-synapse-700" : "group-hover:text-synapse-600")}>{cat.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{cat.desc}</p>
               </Card>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
         
         {/* FAQs */}
         <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
               <Book className="w-6 h-6 text-synapse-500" /> 
               {selectedCategory 
                 ? `FAQs for ${categories.find(c => c.id === selectedCategory)?.title}` 
                 : 'Frequently Asked Questions'}
            </h2>
            <div className="space-y-4">
               {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq) => (
                     <div key={faq.id} className="border border-slate-200 rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:border-synapse-200">
                        <button 
                           onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                           className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                           {faq.question}
                           {expandedFaq === faq.id ? <ChevronUp className="w-5 h-5 text-synapse-500" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div 
                           className={cn(
                              "overflow-hidden transition-all duration-300 ease-in-out bg-slate-50/50",
                              expandedFaq === faq.id ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                           )}
                        >
                           <p className="p-5 pt-2 text-slate-600 leading-relaxed text-[15px]">
                              {faq.answer}
                           </p>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                     <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                     </div>
                     <p className="text-slate-500 font-medium">No articles found matching your criteria</p>
                     {selectedCategory && (
                        <Button variant="link" onClick={() => setSelectedCategory(null)} className="text-synapse-600 mt-2">
                            View all topics
                        </Button>
                     )}
                  </div>
               )}
            </div>
         </div>

         {/* Contact / Sidebar */}
         <div className="space-y-6">
            <Card className="p-6 bg-indigo-900 text-white border-none shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                     <Mail className="w-5 h-5" /> Still need help?
                  </h3>
                  <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                     Our support team is available <span className="font-bold text-white">Monday to Friday, 9am - 5pm</span> to assist you.
                  </p>
                  
                  <form onSubmit={handleContactSubmit} className="space-y-3">
                     <input 
                        placeholder="Subject" 
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-indigo-200/70 focus:outline-none focus:bg-white/20 transition-all"
                     />
                     <textarea 
                        placeholder="Describe your issue..." 
                        rows={3}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-indigo-200/70 focus:outline-none focus:bg-white/20 transition-all resize-none"
                     />
                     <Button 
                        disabled={isSubmitting}
                        className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl"
                     >
                        {isSubmitting ? <span className="flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</span> : "Contact Support"}
                     </Button>
                  </form>
               </div>
            </Card>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
               <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Quick Links</h4>
               <ul className="space-y-2">
                  <li>
                     <button 
                        onClick={() => openQuickLink("Community Guidelines", "Synapse is a community of professionals. Please be respectful, do not spam, and ensure all content is appropriate for a general audience. Hate speech, violence, and illegal content are strictly prohibited.")}
                        className="flex items-center gap-2 text-sm text-synapse-600 hover:underline font-medium w-full text-left"
                     >
                        <ExternalLink className="w-3.5 h-3.5" /> Community Guidelines
                     </button>
                  </li>
                  <li>
                     <button 
                        onClick={() => openQuickLink("Safety Center", "Your safety is our priority. Use a strong, unique password and never share your login credentials. Enable login alerts in Settings to be notified of unrecognized devices. Report suspicious activity immediately via the 'Report' button.")}
                        className="flex items-center gap-2 text-sm text-synapse-600 hover:underline font-medium w-full text-left"
                     >
                        <ExternalLink className="w-3.5 h-3.5" /> Safety Center
                     </button>
                  </li>
                  <li>
                     <button 
                        onClick={() => openQuickLink("Data Policy", "We value your privacy. Synapse does not sell your personal data. We use your data to improve the platform and show relevant content. You can download your data archive from Settings.")}
                        className="flex items-center gap-2 text-sm text-synapse-600 hover:underline font-medium w-full text-left"
                     >
                        <ExternalLink className="w-3.5 h-3.5" /> Data Policy
                     </button>
                  </li>
               </ul>
            </div>
         </div>

      </div>

      {/* Quick Link Dialog */}
      <Dialog open={legalDialog.open} onOpenChange={(open) => setLegalDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>{legalDialog.title}</DialogTitle>
                <DialogDescription>
                    Official Synapse Policy
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-slate-700 leading-relaxed">
                {legalDialog.content}
            </div>
            <DialogFooter>
                <Button onClick={() => setLegalDialog(prev => ({ ...prev, open: false }))}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
