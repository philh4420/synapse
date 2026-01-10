
import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Feed } from '../components/Feed';
import { RightPanel } from '../components/RightPanel';
import { AdminPanel } from '../components/AdminPanel';
import { Profile } from '../components/Profile';
import { FriendsPage } from '../components/FriendsPage';
import { MemoriesPage } from '../components/MemoriesPage';
import { SavedPage } from '../components/SavedPage';
import { Pages } from '../components/Pages';
import { Events } from '../components/Events';
import { SettingsPage } from '../components/SettingsPage';
import { HelpPage } from '../components/HelpPage';
import { DisplayPage } from '../components/DisplayPage';
import { CommunitiesPage } from '../components/CommunitiesPage';
import { LegalPage } from '../components/LegalPage'; // Import new page
import { Header } from '../components/Header';
import { Messenger } from '../components/Messenger';
import { Menu, X, Megaphone, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SiteSettings } from '../types';

export const HomePage: React.FC = () => {
  // Initialize state from localStorage if available
  const [activeTabString, setActiveTab] = useState(() => {
    return localStorage.getItem('synapse_active_tab') || 'feed';
  });
  
  // Parse tab and section if applicable (e.g. "legal:privacy")
  const activeTab = activeTabString.split(':')[0];
  const activeSection = activeTabString.split(':')[1];

  const [viewedProfileUid, setViewedProfileUid] = useState<string | null>(() => {
    const stored = localStorage.getItem('synapse_viewed_profile');
    return stored === 'null' || !stored ? null : stored;
  });

  const [viewedCommunityId, setViewedCommunityId] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userProfile } = useAuth();
  const [announcement, setAnnouncement] = useState<SiteSettings['announcement']>(undefined);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('synapse_active_tab', activeTabString);
  }, [activeTabString]);

  useEffect(() => {
    if (viewedProfileUid) {
      localStorage.setItem('synapse_viewed_profile', viewedProfileUid);
    } else {
      localStorage.removeItem('synapse_viewed_profile');
    }
  }, [viewedProfileUid]);

  // Listen for Global Announcements
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteSettings;
        setAnnouncement(data.announcement);
      }
    });
    return () => unsub();
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      // If manually clicking profile tab (e.g. from nav), reset to own profile
      setViewedProfileUid(null);
    }
    if (tab !== 'communities') {
       setViewedCommunityId(null);
    }
  };

  const handleViewProfile = (uid: string) => {
    setViewedProfileUid(uid);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewCommunity = (id: string | null) => {
     setViewedCommunityId(id);
     setActiveTab('communities');
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed />;
      case 'profile':
        return <Profile targetUid={viewedProfileUid} onViewProfile={handleViewProfile} onNavigate={handleTabChange} />;
      case 'friends':
        return <FriendsPage onViewProfile={handleViewProfile} />;
      case 'memories':
        return <MemoriesPage />;
      case 'bookmarks':
        return <SavedPage />;
      case 'pages':
        return <Pages />;
      case 'events':
        return <Events />;
      case 'communities':
        return <CommunitiesPage viewedCommunityId={viewedCommunityId} onViewCommunity={handleViewCommunity} />;
      case 'settings':
        return <SettingsPage />;
      case 'legal':
        return <LegalPage initialSection={activeSection} />;
      case 'help':
        return <HelpPage />;
      case 'display':
        return <DisplayPage />;
      case 'admin':
        return <AdminPanel />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
             <div className="w-24 h-24 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-sm border border-white">
               <span className="text-4xl">🚧</span>
             </div>
             <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Coming Soon</h2>
             <p className="text-slate-500 text-center max-w-md text-lg">
               The <span className="font-bold text-synapse-600 capitalize">{activeTab}</span> experience is currently being crafted for the 2026 release.
             </p>
          </div>
        );
    }
  };

  // Wide layout for most pages except Feed
  const isWidePage = activeTab === 'friends' || activeTab === 'admin' || activeTab === 'profile' || activeTab === 'memories' || activeTab === 'bookmarks' || activeTab === 'pages' || activeTab === 'events' || activeTab === 'communities' || activeTab === 'settings' || activeTab === 'help' || activeTab === 'display' || activeTab === 'privacy' || activeTab === 'legal';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 relative selection:bg-synapse-200 selection:text-synapse-900 transition-colors duration-300">
      
      {/* 2026 Subtle Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 dark:bg-purple-900/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 dark:bg-blue-900/10 rounded-full blur-[120px]" />
         <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-200/20 dark:bg-cyan-900/10 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative z-10">
        <Header activeTab={activeTab} setActiveTab={handleTabChange} />

        {/* Global Announcement Banner */}
        {announcement?.enabled && (
          <div className="fixed top-[4.5rem] lg:top-24 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-2 duration-500">
             <div className={cn(
               "pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-white/20 text-white max-w-2xl w-full",
               announcement.type === 'error' ? "bg-rose-600/95" : 
               announcement.type === 'warning' ? "bg-amber-500/95" : 
               "bg-synapse-600/95"
             )}>
                <div className="bg-white/20 p-1.5 rounded-full shrink-0">
                   {announcement.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
                    announcement.type === 'warning' ? <Megaphone className="w-5 h-5" /> : 
                    <Info className="w-5 h-5" />}
                </div>
                <p className="font-medium text-[15px] flex-1">{announcement.message}</p>
             </div>
          </div>
        )}

        {/* Increased top padding (pt-24) to account for the floating header island */}
        <div className={cn("pt-24 flex justify-between min-h-screen", announcement?.enabled ? "pt-40 lg:pt-44" : "pt-24")}>
          
          {/* Left Sidebar */}
          <div className="hidden lg:block w-[280px] xl:w-[360px] flex-shrink-0 z-20">
            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} onViewCommunity={handleViewCommunity} />
          </div>

          {/* Center Content */}
          <div className={cn(
            "flex-1 w-full mx-auto py-6 transition-all duration-300 min-w-0 z-10",
            isWidePage ? "px-2 md:px-4 max-w-[1600px]" : "max-w-[740px] lg:px-8"
          )}>
            {renderContent()}
          </div>

          {/* Right Panel - Always visible on LG screens and up to mimic Facebook */}
          <div className="hidden lg:block w-[280px] xl:w-[360px] flex-shrink-0 z-20">
            <RightPanel />
          </div>

        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl pt-24 px-6 lg:hidden animate-in fade-in slide-in-from-bottom-10">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full dark:text-slate-200"
            >
              <X />
            </button>
            <div className="space-y-4">
              {['Feed', 'Friends', 'Pages', 'Events', 'Watch', 'Communities', 'Profile'].map((item) => (
                <button 
                  key={item}
                  onClick={() => { 
                     handleTabChange(item.toLowerCase() === 'watch' ? 'videos' : item.toLowerCase()); 
                     setMobileMenuOpen(false); 
                  }}
                  className="block w-full text-left text-2xl font-bold text-slate-800 dark:text-slate-100 py-4 border-b border-slate-100 dark:border-slate-800 hover:text-synapse-600 transition-colors"
                >
                  {item}
                </button>
              ))}
              <button 
                  onClick={() => { handleTabChange('admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left text-2xl font-black text-synapse-600 py-4 border-b border-slate-100 dark:border-slate-800"
              >
                Admin Panel
              </button>
            </div>
          </div>
        )}

        {/* Global Messenger Widget */}
        <Messenger />
      </div>
    </div>
  );
};
