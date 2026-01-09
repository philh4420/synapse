
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Home, Users, LayoutGrid, MessageCircle, Bell, ChevronDown, 
  Activity, Shield, MonitorPlay, X, LogOut, Settings, HelpCircle, 
  Moon, PlusCircle, PenTool, Flag, Star, MoreHorizontal, Menu, UserPlus,
  Ticket
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../context/MessengerContext';
import { collection, query, where, limit, onSnapshot, orderBy, updateDoc, doc, getDocs } from 'firebase/firestore';
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
  DropdownMenuGroup
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
  SheetClose,
  SheetDescription
} from './ui/Sheet';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { user, userProfile, logout } = useAuth();
  const { isOpen, toggleMessenger } = useMessenger(); // Use Context
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Message Notifications State
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const navItems = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'friends', icon: Users, label: 'Friends' }, 
    { id: 'videos', icon: MonitorPlay, label: 'Watch' },
  ];

  if (userProfile?.role === 'admin') {
      navItems.push({ id: 'admin', icon: Shield, label: 'Admin' });
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for General Notifications
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

  // Listen for Unread Messages
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Check if last message exists, is NOT read, and I am NOT the sender
        if (data.lastMessage && !data.lastMessage.read && data.lastMessage.senderId !== user.uid) {
          count++;
        }
      });
      setUnreadMessageCount(count);
    });

    return () => unsubscribe();
  }, [user]);

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
    let targetTab = 'feed';

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
      case 'friend_request':
        message = 'sent you a friend request';
        targetTab = 'friends';
        icon = <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white"><UserPlus className="w-3 h-3 text-white fill-current" /></div>;
        break;
      case 'friend_accept':
        message = 'accepted your friend request';
        targetTab = 'profile'; 
        icon = <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1 border-2 border-white"><Activity className="w-3 h-3 text-white fill-current" /></div>;
        break;
      case 'page_invite':
        message = 'invited you to like their new page';
        targetTab = 'pages';
        icon = <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1 border-2 border-white"><Flag className="w-3 h-3 text-white fill-current" /></div>;
        break;
      case 'event_invite':
        message = 'hosted a new event';
        targetTab = 'events';
        icon = <div className="absolute -bottom-1 -right-1 bg-rose-500 rounded-full p-1 border-2 border-white"><Ticket className="w-3 h-3 text-white fill-current" /></div>;
        break;
      default:
        message = 'interacted with your content';
    }

    return (
      <div 
        onClick={() => { markAsRead(notif); setActiveTab(targetTab); }}
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
    <div className="fixed top-0 lg:top-4 left-0 lg:left-1/2 lg:-translate-x-1/2 w-full lg:w-[96%] max-w-[1920px] h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b lg:border border-slate-200 dark:border-white/5 shadow-sm lg:shadow-lg lg:shadow-black/5 lg:rounded-2xl z-50 flex items-center justify-between px-4 select-none transition-all duration-300">
      
      {/* --- Left: Logo & Search --- */}
      <div className="flex items-center gap-3 z-50 relative">
        <div 
          onClick={() => setActiveTab('feed')}
          className="w-10 h-10 bg-gradient-to-br from-synapse-500 to-synapse-700 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-all flex-shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
        >
           <Activity className="text-white w-6 h-6" />
        </div>
        
        {/* Search Input */}
        <div className="relative hidden xl:block ml-1" ref={searchRef}>
           <Search className={cn("absolute left-3 top-2.5 w-4 h-4 transition-colors", isSearching ? "text-synapse-600" : "text-slate-400")} />
           <input 
             type="text" 
             value={searchQuery}
             onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
             onFocus={() => setIsSearching(true)}
             placeholder="Search Synapse" 
             className="bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-full py-2.5 pl-10 pr-4 w-60 focus:w-72 text-[15px] focus:outline-none focus:ring-2 focus:ring-synapse-500/20 focus:bg-white dark:focus:bg-slate-800 placeholder-slate-500 text-slate-900 dark:text-slate-100 transition-all duration-300 border border-transparent focus:border-synapse-200 dark:focus:border-slate-700"
           />
           {searchQuery && (
             <button 
               onClick={() => { setSearchQuery(''); setSearchResults([]); }}
               className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
             >
               <X className="w-4 h-4" />
             </button>
           )}

            {isSearching && searchQuery && (
              <div className="absolute top-14 left-0 w-full bg-white/90 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 dark:border-white/10 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                {searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div 
                      key={result.uid}
                      className="px-4 py-2 hover:bg-synapse-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3 transition-colors"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearching(false);
                      }}
                    >
                      <Avatar className="w-9 h-9 border border-slate-100 dark:border-slate-700">
                        <AvatarImage src={result.photoURL || `https://ui-avatars.com/api/?name=${result.displayName}`} />
                        <AvatarFallback>{result.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{result.displayName}</p>
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

        <Button variant="ghost" size="icon" className="xl:hidden rounded-full bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Search className="w-5 h-5" />
        </Button>
      </div>

      {/* --- Center: Navigation --- */}
      <TooltipProvider delayDuration={0}>
      <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-auto h-full absolute left-0 right-0 pointer-events-none">
         <div className="flex w-full justify-center items-center h-full pointer-events-auto gap-2 lg:gap-4">
            {navItems.map(item => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                        onClick={() => setActiveTab(item.id)}
                        className="relative group h-12 w-28 flex items-center justify-center"
                    >
                        <div className={cn(
                            "w-full h-full rounded-xl flex items-center justify-center transition-all duration-300",
                            activeTab === item.id 
                              ? 'bg-synapse-50 dark:bg-synapse-900/30 text-synapse-600 dark:text-synapse-400 shadow-sm' 
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
                        )}>
                            <item.icon 
                              className={cn(
                                "w-[26px] h-[26px] transition-transform duration-300",
                                activeTab === item.id ? 'scale-110' : 'group-hover:scale-105'
                              )} 
                              strokeWidth={activeTab === item.id ? 2.5 : 2} 
                            />
                            {item.id === 'friends' && notifications.some(n => n.type === 'friend_request' && !n.read) && (
                                <div className="absolute top-3 right-8 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
                            )}
                        </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-900 dark:bg-slate-700 text-white border-0 rounded-lg px-3 py-1.5 text-xs font-medium">
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
              <Button variant="ghost" size="icon" className="rounded-full bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 h-10 w-10">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">
                   Navigation menu for mobile devices.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                <div 
                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 mb-4 cursor-pointer"
                  onClick={() => { setActiveTab('profile'); }}
                >
                  <Avatar>
                    <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
                    <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="font-semibold dark:text-white">{userProfile?.displayName}</div>
                </div>
                {navItems.map(item => (
                  <SheetClose asChild key={item.id}>
                    <Button 
                      variant={activeTab === item.id ? "default" : "ghost"} 
                      className="justify-start gap-4 text-base h-12 w-full dark:text-slate-200"
                      onClick={() => setActiveTab(item.id)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </SheetClose>
                ))}
                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                <Button variant="ghost" className="justify-start gap-4 text-base h-12 w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={logout}>
                   <LogOut className="w-5 h-5" />
                   Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* User Capsule (Profile Link) - Desktop */}
        <div 
          className="hidden xl:flex items-center gap-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 p-1.5 pr-4 pl-1.5 rounded-full cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 select-none" 
          onClick={() => setActiveTab('profile')}
        >
             <Avatar className="w-8 h-8 border border-slate-200 dark:border-slate-700 shadow-sm">
               <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
               <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
             </Avatar>
             <span className="font-semibold text-[14px] text-slate-700 dark:text-slate-200">{userProfile?.displayName?.split(' ')[0]}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 relative">
          
          {/* Main Menu Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex rounded-full bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-synapse-600 dark:hover:text-synapse-400 h-10 w-10 transition-colors">
                  <LayoutGrid className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/40 dark:border-slate-800" align="end">
               <h3 className="text-xl font-bold mb-4 px-2 dark:text-white">Menu</h3>
               <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-sm border border-white/50 dark:border-slate-700 overflow-hidden mb-4">
                  <div className="p-3 border-b border-slate-100/50 dark:border-slate-700/50">
                    <input type="text" placeholder="Search menu" className="w-full bg-slate-100/50 dark:bg-slate-900/50 rounded-full px-3 py-2 text-sm focus:outline-none dark:text-slate-200" />
                  </div>
                  <div className="p-2 space-y-1">
                     <p className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">Social</p>
                     <MenuLink icon={Flag} label="Pages" sub="Discover and connect with businesses" />
                     <MenuLink icon={Users} label="Groups" sub="Connect with people who share your interests" />
                     <MenuLink icon={Star} label="Favorites" sub="View posts from your favorite people" />
                  </div>
               </div>
               <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-sm border border-white/50 dark:border-slate-700 overflow-hidden">
                   <div className="p-2 space-y-1">
                      <p className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">Create</p>
                      <MenuLink icon={PenTool} label="Post" />
                      <MenuLink icon={PlusCircle} label="Story" />
                   </div>
               </div>
            </PopoverContent>
          </Popover>

          {/* Messenger Trigger (Toggles Global Widget) */}
          <Button 
            onClick={toggleMessenger} 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-full h-10 w-10 transition-colors relative",
              isOpen 
                ? "bg-synapse-100 text-synapse-600 hover:bg-synapse-200 dark:bg-synapse-900/50 dark:text-synapse-400"
                : "bg-slate-100/50 hover:bg-synapse-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-synapse-600"
            )}
          >
             <MessageCircle className={cn("w-5 h-5", isOpen && "fill-current")} />
             {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-in zoom-in">
                   {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
             )}
          </Button>

          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
               <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-full h-10 w-10 relative transition-all duration-300",
                    unreadCount > 0 
                        ? "bg-synapse-100 text-synapse-600 hover:bg-synapse-200 dark:bg-synapse-900/50 dark:text-synapse-400" 
                        : "bg-slate-100/50 hover:bg-synapse-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-synapse-600"
                  )}
               >
                  <Bell className={cn("w-5 h-5", unreadCount > 0 && "fill-current")} />
                  {unreadCount > 0 && (
                     <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                     </span>
                  )}
               </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0 h-[80vh] max-h-[500px] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-white/50 dark:border-slate-800" align="end">
               <div className="p-4 pb-2 flex justify-between items-center">
                 <h3 className="text-2xl font-bold dark:text-white">Notifications</h3>
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="w-5 h-5 text-slate-600 dark:text-slate-400" /></Button>
               </div>
               <div className="px-4 py-2 flex justify-between items-center">
                  <div className="flex gap-2">
                     <button className="bg-synapse-100 dark:bg-synapse-900/50 text-synapse-700 dark:text-synapse-300 px-3 py-1.5 rounded-full text-sm font-semibold">All</button>
                     <button className="hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors">Unread</button>
                  </div>
                  {unreadCount > 0 && (
                     <button 
                        onClick={markAllAsRead}
                        className="text-synapse-600 dark:text-synapse-400 text-sm hover:underline"
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
                        <Bell className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-2" />
                        <p className="font-medium">No notifications</p>
                     </div>
                  )}
               </div>
            </PopoverContent>
          </Popover>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="hidden md:inline-flex rounded-full bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 h-10 w-10 outline-none focus-visible:ring-0 ring-0">
                  <div className="relative">
                    <ChevronDown className="w-6 h-6" />
                  </div>
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[360px] p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-white/50 dark:border-slate-800" align="end">
                <div className="shadow-[0_4px_20px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-800 rounded-xl p-1 mb-2 border border-slate-100 dark:border-slate-700">
                    <div 
                      onClick={() => setActiveTab('profile')}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                    >
                         <Avatar className="w-10 h-10 border border-slate-200 dark:border-slate-600">
                            <AvatarImage src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.displayName}`} />
                            <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                         </Avatar>
                         <div className="flex-1">
                             <span className="font-semibold text-slate-900 dark:text-white block">{userProfile?.displayName}</span>
                             <span className="text-sm text-slate-500 dark:text-slate-400">See your profile</span>
                         </div>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                        <div className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                            Give Feedback
                        </div>
                    </div>
                </div>

                <DropdownMenuGroup>
                    <DropdownMenuItem 
                        className="py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800"
                        onClick={() => setActiveTab('settings')}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">Settings & privacy</span>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                        className="py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800"
                        onClick={() => setActiveTab('help')}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <HelpCircle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">Help & support</span>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                        className="py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800"
                        onClick={() => setActiveTab('display')}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">Display & accessibility</span>
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuItem 
                    className="py-2.5 px-3 rounded-lg cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800 mt-1"
                    onClick={() => logout()}
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                            <LogOut className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">Log Out</span>
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
  <div className="flex items-center gap-3 p-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors group">
      <Icon className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-synapse-600 dark:group-hover:text-synapse-400 transition-colors" />
      <div>
         <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{label}</p>
         {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
  </div>
);
