import React from 'react';
import { Users, Bookmark, Calendar, Clock, ChevronDown, Settings, Flag, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, userProfile } = useAuth();

  const shortcuts = [
    { icon: Users, label: 'Friends', id: 'friends', color: 'text-cyan-500' },
    { icon: Clock, label: 'Memories', id: 'memories', color: 'text-blue-500' },
    { icon: Bookmark, label: 'Saved', id: 'bookmarks', color: 'text-purple-500' },
    { icon: Flag, label: 'Pages', id: 'pages', color: 'text-orange-500' },
    { icon: Calendar, label: 'Events', id: 'events', color: 'text-red-500' },
    { icon: CreditCard, label: 'Orders and payments', id: 'orders', color: 'text-slate-600' },
    { icon: Settings, label: 'Settings', id: 'settings', color: 'text-slate-600' },
  ];

  return (
    <div className="hidden lg:block w-[280px] xl:w-[360px] h-[calc(100vh-56px)] overflow-y-auto fixed left-0 top-14 p-4 hover:overflow-y-auto hide-scrollbar">
      <ul className="space-y-1 mb-4">
        <li 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg cursor-pointer transition-colors"
        >
          <img 
            src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
            alt="Profile" 
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
          <span className="font-semibold text-slate-900 text-[15px]">{userProfile?.displayName}</span>
        </li>
        
        {shortcuts.map((item) => (
           <li 
             key={item.label}
             onClick={() => item.id && setActiveTab(item.id)}
             className={`flex items-center gap-3 p-3 hover:bg-black/5 rounded-lg cursor-pointer transition-colors ${activeTab === item.id ? 'bg-synapse-50' : ''}`}
           >
              <item.icon className={`w-8 h-8 ${item.color} p-0.5`} />
              <span className="font-medium text-slate-900 text-[15px]">{item.label}</span>
           </li>
        ))}
         <li className="flex items-center gap-3 p-3 hover:bg-black/5 rounded-lg cursor-pointer transition-colors">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <ChevronDown className="w-5 h-5 text-slate-600" />
              </div>
              <span className="font-medium text-slate-900 text-[15px]">See more</span>
           </li>
      </ul>
      
      {/* 
        This section used to contain dummy shortcuts. 
        It is now empty until real group functionality is implemented 
        to ensure no fake data is displayed.
      */}
      <div className="pt-4 border-t border-slate-300">
         <h3 className="text-slate-500 font-semibold text-[17px] px-2 mb-2">Your Shortcuts</h3>
         <div className="px-2 text-sm text-slate-500 italic">
            <p>Join groups to see them here.</p>
         </div>
      </div>
      
      <div className="mt-8 px-2 text-xs text-slate-400">
         <p>Privacy  · Terms  · Advertising  · Ad Choices   · Cookies  ·   More · Synapse © 2026</p>
      </div>
    </div>
  );
};