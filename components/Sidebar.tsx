
import React, { useEffect, useState } from 'react';
import { Users, Bookmark, Calendar, Clock, ChevronDown, Flag, LayoutGrid, Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { Separator } from './ui/Separator';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Community } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onViewCommunity?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onViewCommunity }) => {
  const { user, userProfile } = useAuth();
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);

  // Fetch real-time user communities
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'communities'), where('members', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comms = (snapshot as any).docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Community[];
      setUserCommunities(comms);
    });
    return () => unsubscribe();
  }, [user]);

  const shortcuts = [
    { icon: Users, label: 'Friends', id: 'friends', color: 'text-cyan-500', bg: 'bg-cyan-50 group-hover:bg-cyan-100' },
    { icon: Clock, label: 'Memories', id: 'memories', color: 'text-blue-500', bg: 'bg-blue-50 group-hover:bg-blue-100' },
    { icon: Bookmark, label: 'Saved', id: 'bookmarks', color: 'text-purple-500', bg: 'bg-purple-50 group-hover:bg-purple-100' },
    { icon: Flag, label: 'Pages', id: 'pages', color: 'text-orange-500', bg: 'bg-orange-50 group-hover:bg-orange-100' },
    { icon: Calendar, label: 'Events', id: 'events', color: 'text-red-500', bg: 'bg-red-50 group-hover:bg-red-100' },
    { icon: LayoutGrid, label: 'Groups', id: 'communities', color: 'text-indigo-500', bg: 'bg-indigo-50 group-hover:bg-indigo-100' },
    { icon: ShieldCheck, label: 'Privacy Center', id: 'privacy', color: 'text-emerald-500', bg: 'bg-emerald-50 group-hover:bg-emerald-100' },
  ];

  const MenuItem = ({ icon: Icon, label, onClick, active, color, bg, image }: any) => (
     <li 
       onClick={onClick}
       className={cn(
         "group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-300 border border-transparent",
         active 
           ? "bg-white shadow-md shadow-slate-200/50 border-slate-100 scale-[1.02]" 
           : "hover:bg-white/60 hover:shadow-sm hover:border-white/50 hover:scale-[1.01]"
       )}
     >
        {image ? (
           <img src={image} className="w-9 h-9 rounded-xl object-cover shadow-sm" alt="" />
        ) : color ? (
           <div className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300", bg)}>
              <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", color)} />
           </div>
        ) : (
           <Icon className="w-8 h-8 text-blue-500" />
        )}
        <span className={cn(
           "font-semibold text-[15px] truncate flex-1 transition-colors", 
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
            {userCommunities.length > 0 ? (
               userCommunities.map(comm => (
                  <MenuItem 
                     key={comm.id}
                     label={comm.name}
                     image={comm.coverURL}
                     onClick={() => {
                        setActiveTab('communities');
                        if (onViewCommunity) onViewCommunity(comm.id);
                     }}
                  />
               ))
            ) : (
               <div className="px-2 py-4 text-sm text-slate-400 italic">
                  <p>Join groups to see shortcuts here.</p>
               </div>
            )}
         </div>
      </div>
      
      <div className="mt-auto pt-8 px-2">
         <div className="flex flex-wrap gap-x-1.5 gap-y-1 text-xs text-slate-400 leading-relaxed font-medium">
            <button onClick={() => setActiveTab('legal')} className="hover:underline hover:text-slate-600">Privacy</button> · 
            <button onClick={() => setActiveTab('legal')} className="hover:underline hover:text-slate-600">Terms</button> · 
            <button onClick={() => setActiveTab('legal')} className="hover:underline hover:text-slate-600">Advertising</button> · 
            <button onClick={() => setActiveTab('legal')} className="hover:underline hover:text-slate-600">Ad Choices</button> · 
            <button onClick={() => setActiveTab('legal')} className="hover:underline hover:text-slate-600">Cookies</button>
         </div>
         <p className="text-xs text-slate-400 mt-2">
            Synapse © 2026
         </p>
      </div>
    </div>
  );
};
