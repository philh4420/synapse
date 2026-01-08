
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Home, Compass, Users, LayoutGrid, MessageCircle, Bell, ChevronDown, 
  Activity, Shield, Store, MonitorPlay, X, LogOut, Settings, HelpCircle, 
  Moon, MessageSquare, PlusCircle, PenTool, Flag, Star, MoreHorizontal, Menu, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, limit, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, Notification } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Shadcn Components
import { Button } from './ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from './ui/DropdownMenu';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger, 
} from './ui/Popover';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger, 
} from './ui/Tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from './ui/Sheet';

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
  const searchRef = useRef<HTMLDivElement>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Handle click outside for search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time Notifications Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Notification[];
      
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notif: Notification) => {
    if (notif.read) return;
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    } catch (e) {
      console.error("Error marking read", e);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    unread.forEach(n => markAsRead(n));
  };

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

  const NotificationItem = ({ notif }: { notif: Notification }) => {
    let message = '';
    let icon = null;

    switch (notif.type) {
      case 'like':
        message = 'liked your post';
        icon = <div className="absolute -bottom-1 -right-1 bg-synapse-600 rounded-full p-1 border-2 border-white"><Activity className="w-3 h-3 text-white fill-current" /></div>;
        break;
      case 'comment':
        message = 'commented on your post';
        icon = <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white"><MessageCircle className="w-3 h-3 text-white fill-current" /></div>;
        break;
      case 'follow':
        message = 'started following you';
        break;
      default:
        message = 'interacted with your content';
    }

    return (
      <div 
        onClick={() => { markAsRead(notif); setActiveTab('feed'); }}
        className={cn(
          "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors relative",
          notif.read ? "hover:bg-slate-50" : "bg-blue-50/50 hover:bg-blue-50"
        )}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="w-14 h-14 border border-slate-200">
            <AvatarImage src={notif.sender.photoURL} />
            <AvatarFallback>{notif.sender.displayName[0]}</AvatarFallback>
          </Avatar>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
           <p className="text-[15px] leading-snug text-slate-900">
             <span className="font-bold">{notif.sender.displayName}</span> {message}
             {notif.previewText && <span className="text-slate-500 font-normal"> "{notif.previewText}"</span>}
           </p>
           <p className={cn("text-xs mt-1 font-medium", notif.read ? "text-slate-500" : "text-synapse-600")}>
             {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
           </p>
        </div>
        {!notif.read && (
          <div className="w-3 h-3 bg-synapse-600 rounded-full absolute right-2 top-1/2 -translate-y-1/2" />
        )}
      </div>
    );
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-50 flex items-center justify-between px-4 select-none">
      
      {/* --- Left: Logo & Search --- */}
      <div className="flex items-center gap-2 z-50 relative">
        <div 
          onClick={() => setActiveTab('feed')}
          className="w-10 h-10 bg-gradient-to-br from-synapse-600 to-synapse-700 rounded-full flex items-center justify-center cursor-pointer hover:brightness-110 transition-all flex-shrink-0"
        >
           <Activity className="text-white w-6 h-6" />
        </div>
        
        {/* Search Input */}
        <div className="relative hidden xl:block ml-1" ref={searchRef}>
           <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
             onFocus={() => setIsSearching(true)}
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

           {/* Search Results Dropdown */}
            {isSearching && searchQuery && (
              <div className="absolute top-12 left-0 w-[300px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                {searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div 
                      key={result.uid}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearching(false);
                      }}
                    >
                      <Avatar className="w-9 h-9 border border-slate-100">
                        <AvatarImage src={result.photoURL || `https://ui-avatars.com/api/?name=${result.displayName}`} />
                        <AvatarFallback>{result.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
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
        </div>

        <Button variant="ghost" size="icon" className="xl:hidden rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
            <Search className="w-5 h-5" />
        </Button>
      </div>

      {/* --- Center: Navigation --- */}
      <TooltipProvider delayDuration={0}>
      <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-auto h-full absolute left-0 right-0 pointer-events-none">
         <div className="flex w-full justify-center h-full pointer-events-auto gap-1 lg:gap-2">
            {navItems.map(item => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                        onClick={() => setActiveTab(item.id)}
                        className="flex-1 flex items-center justify-center relative group h-full max-w-[110px]"
                    >
                        <div className={cn(
                            "w-full max-w-[110px] h-[90%] my-auto mx-1 rounded-lg flex items-center justify-center transition-colors",
                            activeTab === item.id ? '' : 'hover:bg-slate-100'
                        )}>
                            <item.icon 
                              className={cn(
                                "w-[28px] h-[28px] transition-colors duration-200",
                                activeTab === item.id ? 'text-synapse-600 fill-synapse-600' : 'text-slate-500 group-hover:text-slate-600'
                              )} 
                              strokeWidth={activeTab === item.id ? 2.5 : 2} 
                            />
                        </div>
                        {activeTab === item.id && (
                            <div className="absolute bottom-0 h-[3px] bg-synapse-600 w-full max-w-[110px] rounded-t-full"></div>
                        )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-white border-0">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
            ))}
         </div>
      </div>
      </TooltipProvider>

      {/* --- Right: Actions & Dropdowns --- */}
      <div className="flex items-center gap-2 sm:gap-3 justify-end z-50">
        
        {/* Mobile Menu (Sheet) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 h-10 w-10">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                <div 
                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 mb-4 cursor-pointer"
                  onClick={() => { setActiveTab('profile'); }}
                >
                  <Avatar>
                    <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
                    <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="font-semibold">{userProfile?.displayName}</div>
                </div>
                {navItems.map(item => (
                  <SheetClose asChild key={item.id}>
                    <Button 
                      variant={activeTab === item.id ? "default" : "ghost"} 
                      className="justify-start gap-4 text-base h-12 w-full"
                      onClick={() => setActiveTab(item.id)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </SheetClose>
                ))}
                <div className="my-2 border-t border-slate-100" />
                <Button variant="ghost" className="justify-start gap-4 text-base h-12 w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
                   <LogOut className="w-5 h-5" />
                   Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* User Capsule (Profile Link) - Desktop */}
        <div 
          className="hidden xl:flex items-center gap-2 hover:bg-slate-100 p-1 pr-3 pl-1 rounded-full cursor-pointer transition-colors select-none" 
          onClick={() => setActiveTab('profile')}
        >
             <Avatar className="w-7 h-7 border border-slate-200">
               <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
               <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
             </Avatar>
             <span className="font-semibold text-[15px] text-slate-900">{userProfile?.displayName?.split(' ')[0]}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 relative">
          
          {/* Main Menu Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 h-10 w-10">
                  <LayoutGrid className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4 bg-slate-50" align="end">
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
            </PopoverContent>
          </Popover>

          {/* Messenger Popover */}
          <Popover>
            <PopoverTrigger asChild>
               <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 h-10 w-10">
                  <MessageCircle className="w-5 h-5" />
               </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0 flex flex-col h-[400px]" align="end">
               <div className="p-4 pb-2">
                 <div className="flex justify-between items-center mb-3">
                   <h3 className="text-2xl font-bold">Chats</h3>
                   <div className="flex gap-2 text-slate-500">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Settings className="w-5 h-5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MessageSquare className="w-5 h-5" /></Button>
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
                  <span className="text-synapse-600 font-semibold text-sm hover:underline cursor-pointer">See all in Messenger</span>
               </div>
            </PopoverContent>
          </Popover>

          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
               <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-full hover:bg-slate-200 text-slate-900 h-10 w-10 relative",
                    unreadCount > 0 ? "bg-synapse-100 text-synapse-700" : "bg-slate-100"
                  )}
               >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                     <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                     </div>
                  )}
               </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0 h-[80vh] max-h-[500px] flex flex-col" align="end">
               <div className="p-4 pb-2 flex justify-between items-center">
                 <h3 className="text-2xl font-bold">Notifications</h3>
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="w-5 h-5 text-slate-600" /></Button>
               </div>
               <div className="px-4 py-2 flex justify-between items-center">
                  <div className="flex gap-2">
                     <button className="bg-synapse-100 text-synapse-700 px-3 py-1.5 rounded-full text-sm font-semibold">All</button>
                     <button className="hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors">Unread</button>
                  </div>
                  {unreadCount > 0 && (
                     <button 
                        onClick={markAllAsRead}
                        className="text-synapse-600 text-sm hover:underline"
                     >
                        Mark all as read
                     </button>
                  )}
               </div>
               <div className="flex-1 overflow-y-auto px-2">
                  {notifications.length > 0 ? (
                     <div className="space-y-1 pb-4">
                        {notifications.map(notif => (
                           <NotificationItem key={notif.id} notif={notif} />
                        ))}
                     </div>
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Bell className="w-16 h-16 text-slate-200 mb-2" />
                        <p className="font-medium">No notifications</p>
                     </div>
                  )}
               </div>
            </PopoverContent>
          </Popover>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="hidden md:inline-flex rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 h-10 w-10 outline-none focus-visible:ring-0 ring-0">
                  <div className="relative">
                    <ChevronDown className="w-6 h-6" />
                  </div>
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[360px] p-2" align="end">
                <div className="shadow-[0_2px_12px_rgba(0,0,0,0.1)] rounded-xl p-1 mb-2">
                    <div 
                      onClick={() => setActiveTab('profile')}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                         <Avatar className="w-10 h-10 border border-slate-200">
                            <AvatarImage src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.displayName}`} />
                            <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                         </Avatar>
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

                <DropdownMenuGroup>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="py-2.5 px-3 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-slate-800" />
                                </div>
                                <span className="font-medium text-slate-900">Settings & privacy</span>
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64">
                            <DropdownMenuItem className="py-2">Settings</DropdownMenuItem>
                            <DropdownMenuItem className="py-2">Privacy Checkup</DropdownMenuItem>
                            <DropdownMenuItem className="py-2">Privacy Center</DropdownMenuItem>
                            <DropdownMenuItem className="py-2">Activity Log</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="py-2.5 px-3 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
                                    <HelpCircle className="w-5 h-5 text-slate-800" />
                                </div>
                                <span className="font-medium text-slate-900">Help & support</span>
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64">
                            <DropdownMenuItem className="py-2">Help Center</DropdownMenuItem>
                            <DropdownMenuItem className="py-2">Support Inbox</DropdownMenuItem>
                            <DropdownMenuItem className="py-2">Report a problem</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="py-2.5 px-3 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
                                    <Moon className="w-5 h-5 text-slate-800" />
                                </div>
                                <span className="font-medium text-slate-900">Display & accessibility</span>
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64">
                            <DropdownMenuItem className="py-2">Dark Mode</DropdownMenuItem>
                            <DropdownMenuItem className="py-2">Compact Mode</DropdownMenuItem>
                            <DropdownMenuItem className="py-2">Keyboard</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuGroup>

                <DropdownMenuItem 
                    className="py-2.5 px-3 rounded-lg cursor-pointer focus:bg-slate-100"
                    onClick={() => logout()}
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center group-hover:bg-slate-300 transition-colors">
                            <LogOut className="w-5 h-5 text-slate-800" />
                        </div>
                        <span className="font-medium text-slate-900">Log Out</span>
                    </div>
                </DropdownMenuItem>

                <div className="mt-4 text-xs text-slate-400 px-2 pb-2">
                   Privacy  · Terms  · Advertising  · Ad Choices   · Cookies  ·   More · Synapse © 2026
                </div>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </div>
  );
};

// Helper Components for Menu
const MenuLink: React.FC<{ icon: any, label: string, sub?: string }> = ({ icon: Icon, label, sub }) => (
  <div className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
      <Icon className="w-6 h-6 text-slate-700" />
      <div>
         <p className="font-medium text-slate-900 text-sm">{label}</p>
         {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
  </div>
);
