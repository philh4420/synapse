
import React from 'react';
import { Users, Bookmark, Calendar, Clock, ChevronDown, Settings, Flag, CreditCard, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { Separator } from './ui/Separator';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, userProfile } = useAuth();

  const shortcuts = [
    { icon: Users, label: 'Friends', id: 'friends', color: 'text-cyan-500', bg: 'bg-cyan-50 group-hover:bg-cyan-100' },
    { icon: Clock, label: 'Memories', id: 'memories', color: 'text-blue-500', bg: 'bg-blue-50 group-hover:bg-blue-100' },
    { icon: Bookmark, label: 'Saved', id: 'bookmarks', color: 'text-purple-500', bg: 'bg-purple-50 group-hover:bg-purple-100' },
    { icon: Flag, label: 'Pages', id: 'pages', color: 'text-orange-500', bg: 'bg-orange-50 group-hover:bg-orange-100' },
    { icon: Calendar, label: 'Events', id: 'events', color: 'text-red-500', bg: 'bg-red-50 group-hover:bg-red-100' },
    { icon: CreditCard, label: 'Orders & Payments', id: 'orders', color: 'text-emerald-600', bg: 'bg-emerald-50 group-hover:bg-emerald-100' },
  ];

  const MenuItem = ({ icon: Icon, label, onClick, active, color, bg }: any) => (
     <li 
       onClick={onClick}
       className={cn(
         "group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-300 border border-transparent",
         active 
           ? "bg-white shadow-md shadow-slate-200/50 border-slate-100 scale-[1.02]" 
           : "hover:bg-white/60 hover:shadow-sm hover:border-white/50 hover:scale-[1.01]"
       )}
     >
        {color ? (
           <div className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300", bg)}>
              <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", color)} />
           </div>
        ) : (
           <Icon className="w-8 h-8 text-blue-500" />
        )}
        <span className={cn(
           "font-semibold text-[15px] transition-colors", 
           active ? "text-synapse-700" : "text-slate-700 group-hover:text-slate-900"
        )}>
           {label}
        </span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-synapse-500" />}
     </li>
  );

  return (
    <div className="hidden lg:block w-[280px] xl:w-[360px] h-[calc(100vh-90px)] overflow-y-auto fixed left-0 top-[5.5rem] p-4 hide-scrollbar">
      
      {/* Profile Card */}
      <div 
         onClick={() => setActiveTab('profile')}
         className="mb-4 flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 bg-white/40 hover:bg-white border border-transparent hover:border-white/60 shadow-sm hover:shadow-md group"
      >
        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform">
           <AvatarImage src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} />
           <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
           <span className="font-bold text-slate-900 text-[15px] group-hover:text-synapse-700 transition-colors">{userProfile?.displayName}</span>
           <span className="text-xs text-slate-500">View Profile</span>
        </div>
      </div>

      <ul className="space-y-1.5 mb-6">
        {shortcuts.map((item) => (
           <MenuItem 
             key={item.label}
             icon={item.icon} 
             label={item.label}
             active={activeTab === item.id}
             color={item.color}
             bg={item.bg}
             onClick={() => item.id && setActiveTab(item.id)}
           />
        ))}
         <li className="flex items-center gap-3 p-2.5 hover:bg-white/50 rounded-xl cursor-pointer transition-colors group">
              <div className="w-9 h-9 bg-slate-200 group-hover:bg-slate-300 rounded-full flex items-center justify-center transition-colors">
                  <ChevronDown className="w-5 h-5 text-slate-700" />
              </div>
              <span className="font-semibold text-slate-700 text-[15px]">See more</span>
           </li>
      </ul>
      
      <Separator className="my-4 bg-slate-200/60" />
      
      <div className="pt-2">
         <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-slate-500 font-bold text-[17px]">Your Shortcuts</h3>
            <button className="text-synapse-600 hover:bg-synapse-50 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-sm">Edit</button>
         </div>
         
         <div className="space-y-1">
            {/* Placeholder Shortcuts */}
            <div className="flex items-center gap-3 p-2 hover:bg-white/60 rounded-xl cursor-pointer transition-colors group">
               <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                  <LayoutGrid className="w-5 h-5" />
               </div>
               <span className="font-medium text-slate-700 text-[15px]">Design Community</span>
            </div>
            
             <div className="px-2 py-4 text-sm text-slate-400 italic">
                <p>Join groups to see more shortcuts.</p>
             </div>
         </div>
      </div>
      
      <div className="mt-auto pt-8 px-2">
         <p className="text-xs text-slate-400 leading-relaxed">
            Privacy  · Terms  · Advertising  · Ad Choices <br/>
            Cookies  ·   Synapse © 2026
         </p>
      </div>
    </div>
  );
};
