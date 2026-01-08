import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Home, Compass, Users, LayoutGrid, MessageCircle, Bell, ChevronDown, 
  Activity, Shield, Store, MonitorPlay, X, LogOut, Settings, HelpCircle, 
  Moon, MessageSquare, PlusCircle, PenTool, Flag, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { user, userProfile, logout } = useAuth();
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Menu State: 'main' | 'messenger' | 'notifications' | 'account' | null
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Refs for click outside handling
  const headerRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'videos', icon: MonitorPlay, label: 'Watch' },
    { id: 'marketplace', icon: Store, label: 'Marketplace' },
    { id: 'groups', icon: Users, label: 'Groups' },
  ];

  if (userProfile?.role === 'admin') {
      navItems.push({ id: 'admin', icon: Shield, label: 'Admin' });
  }

  // Handle click outside to close search results and menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsSearching(false);
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('displayName', '>=', searchQuery),
          where('displayName', '<=', searchQuery + '\uf8ff'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => doc.data() as UserProfile);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const toggleMenu = (menuName: string) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuName);
      setIsSearching(false); // Close search if opening a menu
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-50 flex items-center justify-between px-4 select-none" ref={headerRef}>
      
      {/* --- Left: Logo & Search --- */}
      <div className="flex items-center gap-2 z-50 relative">
        <div 
          onClick={() => setActiveTab('feed')}
          className="w-10 h-10 bg-gradient-to-br from-synapse-600 to-synapse-700 rounded-full flex items-center justify-center cursor-pointer hover:brightness-110 transition-all flex-shrink-0"
        >
           <Activity className="text-white w-6 h-6" />
        </div>
        
        {/* Search Input */}
        <div className="relative hidden xl:block ml-1">
           <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); setActiveMenu(null); }}
             onFocus={() => { setIsSearching(true); setActiveMenu(null); }}
             placeholder="Search Synapse" 
             className="bg-slate-100 rounded-full py-2.5 pl-10 pr-4 w-60 text-[15px] focus:outline-none focus:ring-1 focus:ring-synapse-500 placeholder-slate-500 text-slate-900 transition-all hover:bg-slate-200/70"
           />
           {searchQuery && (
             <button 
               onClick={() => { setSearchQuery(''); setSearchResults([]); }}
               className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
             >
               <X className="w-4 h-4" />
             </button>
           )}
        </div>

        {/* Search Results Dropdown */}
        {isSearching && searchQuery && (
          <div className="absolute top-12 left-0 w-[300px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
            {searchResults.length > 0 ? (
              searchResults.map(result => (
                <div 
                  key={result.uid}
                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                  onClick={() => {
                    // Logic to navigate to profile would go here
                    setSearchQuery('');
                    setIsSearching(false);
                  }}
                >
                  <img 
                    src={result.photoURL || `https://ui-avatars.com/api/?name=${result.displayName}`} 
                    alt={result.displayName || 'User'} 
                    className="w-9 h-9 rounded-full object-cover border border-slate-100"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{result.displayName}</p>
                    <p className="text-xs text-slate-500">User</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        <div className="xl:hidden w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center cursor-pointer transition-colors">
            <Search className="text-slate-600 w-5 h-5" />
        </div>
      </div>

      {/* --- Center: Navigation --- */}
      <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-auto h-full absolute left-0 right-0 pointer-events-none">
         <div className="flex w-full justify-center h-full pointer-events-auto gap-1 lg:gap-2">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="flex-1 flex items-center justify-center relative group h-full max-w-[110px]"
                    title={item.label}
                >
                    <div className={`w-full max-w-[110px] h-[90%] my-auto mx-1 rounded-lg flex items-center justify-center transition-colors
                        ${activeTab === item.id ? '' : 'hover:bg-slate-100'}
                    `}>
                        <item.icon 
                          className={`w-[28px] h-[28px] transition-colors duration-200
                            ${activeTab === item.id ? 'text-synapse-600 fill-synapse-600' : 'text-slate-500 group-hover:text-slate-600'}
                          `} 
                          strokeWidth={activeTab === item.id ? 2.5 : 2} 
                        />
                    </div>
                    {activeTab === item.id && (
                        <div className="absolute bottom-0 h-[3px] bg-synapse-600 w-full max-w-[110px] rounded-t-full"></div>
                    )}
                </button>
            ))}
         </div>
      </div>

      {/* --- Right: Actions & Dropdowns --- */}
      <div className="flex items-center gap-2 sm:gap-3 justify-end z-50">
        {/* User Capsule (Profile Link) */}
        <div 
          className="hidden xl:flex items-center gap-2 hover:bg-slate-100 p-1 pr-3 pl-1 rounded-full cursor-pointer transition-colors select-none" 
          onClick={() => setActiveTab('profile')}
        >
             <img 
                src={userProfile?.photoURL || user?.photoURL || ''} 
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                alt="Profile"
             />
             <span className="font-semibold text-[15px] text-slate-900">{userProfile?.displayName?.split(' ')[0]}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 relative">
          
          {/* Main Menu (Grid) */}
          <button 
             onClick={() => toggleMenu('main')}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-slate-900 ${activeMenu === 'main' ? 'bg-synapse-100 text-synapse-600' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
              <LayoutGrid className="w-5 h-5" />
          </button>

          {/* Messenger */}
          <button 
             onClick={() => toggleMenu('messenger')}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-slate-900 ${activeMenu === 'messenger' ? 'bg-synapse-100 text-synapse-600' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
              <MessageCircle className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button 
              onClick={() => toggleMenu('notifications')}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-slate-900 ${activeMenu === 'notifications' ? 'bg-synapse-100 text-synapse-600' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
              <Bell className="w-5 h-5" />
          </button>

          {/* Account Dropdown Trigger */}
          <button 
              onClick={() => toggleMenu('account')}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-slate-900 ${activeMenu === 'account' ? 'bg-synapse-100 text-synapse-600' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
              <div className="relative">
                {/* Modern FB sometimes puts the avatar here, or a Chevron. We use Chevron for clarity or Avatar if we want strict modern style. Sticking to Chevron for functional clarity since we have the capsule on the left. */}
                <ChevronDown className="w-6 h-6" />
              </div>
          </button>

          {/* --- Dropdown Menus --- */}

          {/* Main Menu Dropdown */}
          {activeMenu === 'main' && (
            <div className="absolute top-12 right-0 w-[320px] bg-slate-50 rounded-xl shadow-2xl border border-slate-200 p-4 animate-in fade-in zoom-in-95 duration-200 cursor-default">
               <h3 className="text-xl font-bold mb-4 px-2">Menu</h3>
               <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                  <div className="p-3 border-b border-slate-100">
                    <input type="text" placeholder="Search menu" className="w-full bg-slate-100 rounded-full px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div className="p-2 space-y-1">
                     <p className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">Social</p>
                     <MenuLink icon={Flag} label="Pages" sub="Discover and connect with businesses" />
                     <MenuLink icon={Users} label="Groups" sub="Connect with people who share your interests" />
                     <MenuLink icon={Star} label="Favorites" sub="View posts from your favorite people" />
                  </div>
               </div>
               <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                   <div className="p-2 space-y-1">
                      <p className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">Create</p>
                      <MenuLink icon={PenTool} label="Post" />
                      <MenuLink icon={PlusCircle} label="Story" />
                   </div>
               </div>
            </div>
          )}

          {/* Messenger Dropdown */}
          {activeMenu === 'messenger' && (
            <div className="absolute top-12 right-0 w-[360px] bg-white rounded-xl shadow-2xl border border-slate-100 p-0 flex flex-col h-[400px] animate-in fade-in zoom-in-95 duration-200 cursor-default">
               <div className="p-4 pb-2">
                 <div className="flex justify-between items-center mb-3">
                   <h3 className="text-2xl font-bold">Chats</h3>
                   <div className="flex gap-2 text-slate-500">
                      <Settings className="w-5 h-5 cursor-pointer hover:bg-slate-100 rounded-full p-0.5" />
                      <MessageSquare className="w-5 h-5 cursor-pointer hover:bg-slate-100 rounded-full p-0.5" />
                   </div>
                 </div>
                 <input className="w-full bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none placeholder-slate-500" placeholder="Search Messenger" />
               </div>
               <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                     <MessageCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-semibold">No messages yet</p>
                  <p className="text-sm mt-1">Start a conversation with your friends.</p>
               </div>
               <div className="p-3 border-t border-slate-100 text-center">
                  <a href="#" className="text-synapse-600 font-semibold text-sm hover:underline">See all in Messenger</a>
               </div>
            </div>
          )}

          {/* Notifications Dropdown */}
          {activeMenu === 'notifications' && (
            <div className="absolute top-12 right-0 w-[360px] bg-white rounded-xl shadow-2xl border border-slate-100 p-0 h-[400px] flex flex-col animate-in fade-in zoom-in-95 duration-200 cursor-default">
               <div className="p-4 pb-2 flex justify-between items-center">
                 <h3 className="text-2xl font-bold">Notifications</h3>
                 <div className="w-8 h-8 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer">
                    <MoreHorizontal className="w-5 h-5 text-slate-600" />
                 </div>
               </div>
               <div className="px-4 py-2">
                  <div className="flex gap-2">
                     <button className="bg-synapse-100 text-synapse-700 px-3 py-1.5 rounded-full text-sm font-semibold">All</button>
                     <button className="hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors">Unread</button>
                  </div>
               </div>
               <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                   <img src="https://static.xx.fbcdn.net/rsrc.php/v3/yT/r/-7HjK-b8-eF.png" alt="" className="w-24 h-24 opacity-50 mb-2 grayscale" />
                   <p className="font-medium">No notifications</p>
               </div>
            </div>
          )}

          {/* Account Dropdown */}
          {activeMenu === 'account' && (
            <div className="absolute top-12 right-0 w-[360px] bg-white rounded-xl shadow-2xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 duration-200 cursor-default">
                
                {/* Profile Card */}
                <div className="shadow-[0_2px_12px_rgba(0,0,0,0.1)] rounded-xl p-1 mb-4">
                    <div 
                      onClick={() => { setActiveTab('profile'); setActiveMenu(null); }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                         <img 
                           src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.displayName}`} 
                           className="w-10 h-10 rounded-full border border-slate-200 object-cover" 
                           alt="User"
                         />
                         <div className="flex-1">
                             <span className="font-semibold text-slate-900 block">{userProfile?.displayName}</span>
                             <span className="text-sm text-slate-500">See your profile</span>
                         </div>
                    </div>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                        <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm font-medium text-slate-600">
                            Give Feedback
                        </div>
                    </div>
                </div>

                {/* Menu Options */}
                <div className="space-y-1">
                    <MenuOption icon={Settings} label="Settings & privacy" hasSub />
                    <MenuOption icon={HelpCircle} label="Help & support" hasSub />
                    <MenuOption icon={Moon} label="Display & accessibility" hasSub />
                    <MenuOption icon={LogOut} label="Log Out" onClick={() => { logout(); setActiveMenu(null); }} />
                </div>
                
                <div className="mt-4 text-xs text-slate-400 px-2">
                   Privacy  · Terms  · Advertising  · Ad Choices   · Cookies  ·   More · Synapse © 2026
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Helper Components for Menu
const MenuOption: React.FC<{ icon: any, label: string, onClick?: () => void, hasSub?: boolean }> = ({ icon: Icon, label, onClick, hasSub }) => (
  <div 
    onClick={onClick} 
    className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors group"
  >
     <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center group-hover:bg-slate-300 transition-colors">
            <Icon className="w-5 h-5 text-slate-800" />
        </div>
        <span className="font-medium text-slate-900">{label}</span>
     </div>
     {hasSub && <ChevronDown className="-rotate-90 w-5 h-5 text-slate-400" />}
  </div>
);

const MenuLink: React.FC<{ icon: any, label: string, sub?: string }> = ({ icon: Icon, label, sub }) => (
  <div className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
      <Icon className="w-6 h-6 text-slate-700" />
      <div>
         <p className="font-medium text-slate-900 text-sm">{label}</p>
         {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
  </div>
);

// We need to import MoreHorizontal for the notifications menu
import { MoreHorizontal } from 'lucide-react';
