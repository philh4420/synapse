
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, MoreHorizontal, Edit, Search, ArrowLeft, 
  Smile, Image as ImageIcon, Phone, Video, Info, X, Bell, Ban, ThumbsUp,
  ChevronDown, Flag, UserX, UserCheck, Check, Reply, Trash2, Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../context/MessengerContext';
import { useToast } from '../context/ToastContext';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, updateDoc, doc, limit, getDocs, documentId, arrayUnion, arrayRemove, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Chat, Message, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { uploadToCloudinary } from '../utils/upload';
import { Popover, PopoverContent, PopoverTrigger } from './ui/Popover';

// Theme Options
const THEMES = [
  { id: 'default', color: 'bg-synapse-600', name: 'Synapse Blue' },
  { id: 'rose', color: 'bg-rose-500', name: 'Rose' },
  { id: 'purple', color: 'bg-purple-600', name: 'Purple' },
  { id: 'emerald', color: 'bg-emerald-500', name: 'Emerald' },
  { id: 'orange', color: 'bg-orange-500', name: 'Orange' },
  { id: 'slate', color: 'bg-slate-800', name: 'Midnight' },
];

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥'];

export const Messenger: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { isOpen, closeChat, activeUserId } = useMessenger();
  const { toast } = useToast();
  
  // State
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewChat, setIsNewChat] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [showChatInfo, setShowChatInfo] = useState(false);
  
  // Enhanced Features State
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState<{uid: string, name: string} | null>(null);
  
  // New Features State
  const [sharedPhotos, setSharedPhotos] = useState<string[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  
  // Real-time Partner Info
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  
  // Uploading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Chats List
  useEffect(() => {
    if (!user) return;

    // Ensure we have the index: participants (Arrays) + updatedAt (Desc)
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChats(fetchedChats);
      setLoadingChats(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Deduplicate Chats for Display
  const uniqueChats = useMemo(() => {
    const seen = new Set();
    return chats.filter(chat => {
      const otherId = chat.participants.find(p => p !== user?.uid);
      if (!otherId) return true; // Fallback
      if (seen.has(otherId)) return false;
      seen.add(otherId);
      return true;
    });
  }, [chats, user]);

  // 3. Fetch Messages, Partner Profile & Shared Photos
  useEffect(() => {
    if (!activeChatId || !user) {
        setPartnerProfile(null);
        setSharedPhotos([]);
        return;
    }

    // A. Messages Listener
    const qMsgs = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // B. Partner Profile & Shared Photos
    const activeChat = chats.find(c => c.id === activeChatId);
    let unsubProfile = () => {};
    
    if (activeChat) {
        const partnerId = activeChat.participants.find(p => p !== user.uid);
        if (partnerId) {
            unsubProfile = onSnapshot(doc(db, 'users', partnerId), (docSnap) => {
                if (docSnap.exists()) {
                    setPartnerProfile(docSnap.data() as UserProfile);
                }
            });
        }
        
        // Fetch Shared Photos (Separate query to get history)
        const fetchPhotos = async () => {
           setPhotosLoading(true);
           try {
              const qPhotos = query(
                 collection(db, 'chats', activeChatId, 'messages'),
                 orderBy('timestamp', 'desc'),
                 limit(100)
              );
              const snap = await getDocs(qPhotos);
              const photos = snap.docs
                 .map(d => d.data().image)
                 .filter(img => img); // Filter non-null
              setSharedPhotos(photos);
           } catch (e) { console.error("Error fetching photos", e); }
           finally { setPhotosLoading(false); }
        };
        
        if (showChatInfo) {
           fetchPhotos();
        }
    }

    return () => {
        unsubMsgs();
        unsubProfile();
    };
  }, [activeChatId, chats, user, showChatInfo]);

  // 4. Mark as Read Logic
  useEffect(() => {
    if (!activeChatId || !user) return;

    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat && activeChat.lastMessage && !activeChat.lastMessage.read && activeChat.lastMessage.senderId !== user.uid) {
       const chatDocRef = doc(db, 'chats', activeChatId);
       updateDoc(chatDocRef, {
          'lastMessage.read': true
       }).catch(e => console.error("Error marking read", e));
    }
  }, [chats, activeChatId, user]);

  // 5. Handle activeUserId from Context
  const handledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeUserId || handledUserIdRef.current === activeUserId || loadingChats) return;

    const handleOpen = async () => {
        const existingChat = chats.find(c => c.participants.includes(activeUserId));
        
        if (existingChat) {
            setActiveChatId(existingChat.id);
            setIsNewChat(false);
            handledUserIdRef.current = activeUserId;
        } else {
            try {
                const userDoc = await getDocs(query(collection(db, 'users'), where(documentId(), '==', activeUserId)));
                if (!userDoc.empty) {
                    const targetUser = userDoc.docs[0].data() as UserProfile;
                    await startChat(targetUser);
                    handledUserIdRef.current = activeUserId;
                }
            } catch(e) { console.error("Error opening chat", e); }
        }
    };

    handleOpen();
  }, [activeUserId, chats, loadingChats]);

  // Reset handled ref when messenger closes
  useEffect(() => {
      if (!isOpen) handledUserIdRef.current = null;
  }, [isOpen]);

  // 6. Fetch Friends for New Chat
  useEffect(() => {
    if (isNewChat && userProfile?.friends) {
      const fetchFriends = async () => {
        if (!userProfile.friends || userProfile.friends.length === 0) return;
        const friendIds = userProfile.friends.filter(Boolean).slice(0, 20); 
        if (friendIds.length === 0) return;

        try {
           const chunks = [];
           for (let i = 0; i < friendIds.length; i += 10) {
               chunks.push(friendIds.slice(i, i + 10));
           }
           const promises = chunks.map(chunk => 
               getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
           );
           const snapshots = await Promise.all(promises);
           const fetchedFriends = snapshots.flatMap(s => s.docs.map(d => d.data() as UserProfile));
           setFriends(fetchedFriends);
        } catch (e) { console.error(e); }
      };
      fetchFriends();
    }
  }, [isNewChat, userProfile]);

  // --- Handlers ---

  const handleCall = () => {
      toast("Feature coming soon", "info");
  };

  const handleBlockUser = async () => {
      if (!user || !partnerProfile) return;
      const isBlocked = userProfile?.blockedUsers?.includes(partnerProfile.uid);
      
      try {
          const userRef = doc(db, 'users', user.uid);
          if (isBlocked) {
              await updateDoc(userRef, { blockedUsers: arrayRemove(partnerProfile.uid) });
              toast(`${partnerProfile.displayName} unblocked`, "success");
          } else {
              await updateDoc(userRef, { blockedUsers: arrayUnion(partnerProfile.uid) });
              toast(`${partnerProfile.displayName} blocked`, "error");
          }
      } catch (e) {
          toast("Failed to update block status", "error");
      }
  };

  const handleReportUser = () => {
      toast("User reported. We will review this shortly.", "success");
  };

  const updateChatSettings = async (key: string, value: any) => {
     if (!activeChatId) return;
     try {
        await updateDoc(doc(db, 'chats', activeChatId), { [key]: value });
     } catch(e) {
        console.error("Failed to update chat settings", e);
     }
  };

  const handleTyping = () => {
    if (!user || !activeChatId) return;
    
    // Set typing true
    const chatRef = doc(db, 'chats', activeChatId);
    updateDoc(chatRef, { [`typing.${user.uid}`]: true }).catch(console.error);

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set timeout to false
    typingTimeoutRef.current = setTimeout(() => {
        updateDoc(chatRef, { [`typing.${user.uid}`]: false }).catch(console.error);
    }, 2000);
  };

  const startChat = async (friend: UserProfile) => {
    if (!user || !userProfile) return;

    let targetChat = chats.find(c => c.participants.includes(friend.uid));

    if (!targetChat) {
       try {
         const q = query(
           collection(db, 'chats'), 
           where('participants', 'array-contains', user.uid)
         );
         const snapshot = await getDocs(q);
         const foundDoc = snapshot.docs.find(doc => {
            const data = doc.data();
            return data.participants.includes(friend.uid);
         });
         
         if (foundDoc) {
            targetChat = { id: foundDoc.id, ...foundDoc.data() } as Chat;
         }
       } catch (e) { console.error("Error checking existing chats", e); }
    }
    
    if (targetChat) {
      setActiveChatId(targetChat.id);
      setIsNewChat(false);
    } else {
      try {
        const participantData = {
          [user.uid]: { displayName: userProfile.displayName || 'User', photoURL: userProfile.photoURL || '' },
          [friend.uid]: { displayName: friend.displayName || 'User', photoURL: friend.photoURL || '' }
        };

        const docRef = await addDoc(collection(db, 'chats'), {
          participants: [user.uid, friend.uid],
          participantData,
          updatedAt: serverTimestamp()
        });
        
        setActiveChatId(docRef.id);
        setIsNewChat(false);
      } catch (e) {
        console.error("Error creating chat", e);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files?.[0] && activeChatId && user) {
        setIsUploading(true);
        try {
           const url = await uploadToCloudinary(e.target.files[0]);
           
           await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
              image: url,
              text: '',
              senderId: user.uid,
              timestamp: serverTimestamp()
           });

           await updateDoc(doc(db, 'chats', activeChatId), {
              lastMessage: {
                 text: 'Sent an image',
                 senderId: user.uid,
                 timestamp: serverTimestamp(),
                 read: false
              },
              updatedAt: serverTimestamp()
           });
        } catch(e) {
           console.error("Error sending image", e);
        } finally {
           setIsUploading(false);
        }
     }
  };

  const sendMessage = async (e: React.FormEvent, content: string = newMessage) => {
    e.preventDefault();
    if ((!content.trim() && !replyTo) || !activeChatId || !user) return;

    // Check Block Status
    if (partnerProfile && userProfile?.blockedUsers?.includes(partnerProfile.uid)) {
        toast("You have blocked this user. Unblock to send messages.", "error");
        return;
    }

    setNewMessage('');
    setReplyTo(null);

    const messageData: any = {
        text: content,
        senderId: user.uid,
        timestamp: serverTimestamp()
    };

    if (replyTo) {
        const partnerId = activeChatData?.participants.find(p => p !== user.uid);
        const displayName = partnerId && activeChatData?.nicknames?.[partnerId] 
            ? activeChatData.nicknames[partnerId] 
            : activeChatData?.participantData[replyTo.senderId]?.displayName;

        messageData.replyTo = {
            id: replyTo.id,
            text: replyTo.text || 'Image',
            senderId: replyTo.senderId,
            displayName: displayName || 'User'
        };
    }

    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), messageData);

      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: {
          text: content,
          senderId: user.uid,
          timestamp: serverTimestamp(),
          read: false
        },
        updatedAt: serverTimestamp(),
        [`typing.${user.uid}`]: false // Stop typing indicator immediately
      });
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
      if (!activeChatId || !user) return;
      try {
          const msgRef = doc(db, 'chats', activeChatId, 'messages', messageId);
          await updateDoc(msgRef, {
              [`reactions.${user.uid}`]: emoji
          });
      } catch (e) { console.error("Error reacting", e); }
  };

  const deleteMessage = async (messageId: string) => {
      if (!activeChatId) return;
      if (confirm("Unsend this message? It will be removed for everyone.")) {
          try {
              await deleteDoc(doc(db, 'chats', activeChatId, 'messages', messageId));
          } catch (e) { console.error("Error deleting message", e); }
      }
  };

  const saveNickname = async () => {
      if (!editingNickname || !activeChatId) return;
      try {
          await updateDoc(doc(db, 'chats', activeChatId), {
              [`nicknames.${editingNickname.uid}`]: editingNickname.name
          });
          setEditingNickname(null);
          toast("Nickname updated", "success");
      } catch(e) { toast("Failed to update nickname", "error"); }
  };

  const getOtherParticipant = (chat: Chat) => {
    if (!user) return { displayName: 'Unknown', photoURL: '' };
    const otherId = chat.participants.find(p => p !== user.uid);
    
    // Check for nickname first
    if (otherId && chat.nicknames && chat.nicknames[otherId]) {
        return { 
            displayName: chat.nicknames[otherId], 
            photoURL: chat.participantData?.[otherId]?.photoURL || ''
        };
    }

    if (otherId && chat.participantData && chat.participantData[otherId]) {
      return chat.participantData[otherId];
    }
    return { displayName: 'User', photoURL: '' };
  };

  const filteredFriends = friends.filter(f => 
    f.displayName?.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const activeChatData = chats.find(c => c.id === activeChatId);
  const activeChatPartner = activeChatData ? getOtherParticipant(activeChatData) : null;
  const currentTheme = THEMES.find(t => t.id === (activeChatData as any)?.theme) || THEMES[0];
  const currentEmoji = (activeChatData as any)?.emoji || '👍';
  
  // Real-time status logic
  const isOnline = partnerProfile?.isOnline;
  const isTyping = activeChatData?.typing && activeChatData.participants.some(p => p !== user?.uid && activeChatData.typing![p]);
  
  const lastSeenText = partnerProfile?.lastSeen 
    ? `Active ${formatDistanceToNow(partnerProfile.lastSeen.toDate ? partnerProfile.lastSeen.toDate() : new Date(), { addSuffix: true })}` 
    : 'Offline';
  
  const statusText = isTyping ? 'Typing...' : (isOnline ? 'Active now' : lastSeenText);
  
  const isBlockedByMe = partnerProfile && userProfile?.blockedUsers?.includes(partnerProfile.uid);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:inset-auto md:bottom-0 md:right-8 md:w-[900px] md:h-[650px] bg-white dark:bg-slate-900 md:rounded-t-2xl md:shadow-2xl border border-b-0 border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-10 md:flex-row overflow-hidden font-sans">
      
      {/* --- Sidebar (Chat List) --- */}
      <div className={cn(
        "w-full md:w-[320px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all z-20",
        activeChatId ? "hidden md:flex" : "flex h-full"
      )}>
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Chats</h2>
          <div className="flex gap-2">
             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={() => setIsNewChat(true)}>
                <Edit className="w-5 h-5 text-slate-900 dark:text-slate-100" />
             </Button>
             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full md:hidden bg-slate-100" onClick={closeChat}>
                <X className="w-5 h-5 text-slate-900" />
             </Button>
          </div>
        </div>
        
        <div className="px-4 pb-2">
           <div className="relative">
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
             <input 
               placeholder="Search Messenger" 
               className="w-full bg-slate-100 dark:bg-slate-800 rounded-full pl-10 pr-4 py-2 text-[15px] focus:outline-none dark:text-slate-200 placeholder-slate-500 transition-all focus:ring-2 focus:ring-transparent"
             />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {isNewChat ? (
              <div className="animate-in fade-in slide-in-from-left-4">
                 <div className="flex items-center gap-2 mb-2 px-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsNewChat(false)} className="-ml-2"><ArrowLeft className="w-4 h-4" /></Button>
                    <span className="font-semibold text-sm dark:text-slate-200">New Message</span>
                 </div>
                 <input 
                    placeholder="To: Type a name" 
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 px-2 py-2 text-sm focus:outline-none mb-2 dark:text-slate-200"
                    autoFocus
                 />
                 <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase px-2 mb-1">Suggested</p>
                    {filteredFriends.map(friend => (
                       <button 
                          key={friend.uid} 
                          onClick={() => startChat(friend)}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                       >
                          <Avatar className="h-10 w-10"><AvatarImage src={friend.photoURL || ''} /><AvatarFallback>{friend.displayName?.[0]}</AvatarFallback></Avatar>
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-200">{friend.displayName}</span>
                       </button>
                    ))}
                 </div>
              </div>
           ) : (
              uniqueChats.map(chat => {
                 const other = getOtherParticipant(chat);
                 const isActive = activeChatId === chat.id;
                 const isUnread = !chat.lastMessage?.read && chat.lastMessage?.senderId !== user?.uid;
                 const isSenderMe = chat.lastMessage?.senderId === user?.uid;
                 
                 return (
                    <button 
                       key={chat.id} 
                       onClick={() => setActiveChatId(chat.id)}
                       className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group relative",
                          isActive 
                             ? "bg-blue-50 dark:bg-slate-800" 
                             : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                       )}
                    >
                       <div className="relative">
                          <Avatar className="h-14 w-14 border border-slate-100 dark:border-slate-700">
                             <AvatarImage src={other.photoURL} />
                             <AvatarFallback>{other.displayName[0]}</AvatarFallback>
                          </Avatar>
                          {/* We don't show real-time status in the list to save reads, just active chat */}
                          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                       </div>
                       <div className="flex-1 min-w-0 pr-4">
                          <p className={cn("text-[15px] truncate", isUnread ? "font-bold text-slate-900" : "text-slate-900 dark:text-slate-100 font-medium")}>{other.displayName}</p>
                          <div className={cn("flex items-center gap-1 text-[13px]", isUnread ? "font-bold text-slate-900" : "text-slate-500 dark:text-slate-400")}>
                             <span className="truncate max-w-[140px]">
                                {isSenderMe ? 'You: ' : ''}{chat.lastMessage?.text || 'Sent an image'}
                             </span>
                             <span>·</span>
                             <span>
                                {chat.lastMessage?.timestamp 
                                  ? formatDistanceToNow(chat.lastMessage.timestamp.toDate ? chat.lastMessage.timestamp.toDate() : new Date(), { addSuffix: false })
                                      .replace('less than a minute', '1m')
                                      .replace(' minutes', 'm')
                                      .replace(' minute', 'm') 
                                      .replace(' hours', 'h')
                                      .replace(' hour', 'h')
                                      .replace(' days', 'd')
                                  : 'Now'}
                             </span>
                          </div>
                       </div>
                       {isUnread && (
                          <div className="w-3 h-3 bg-blue-600 rounded-full absolute right-4 top-1/2 -translate-y-1/2 shadow-sm" />
                       )}
                    </button>
                 );
              })
           )}
           {!isNewChat && chats.length === 0 && !loadingChats && (
              <div className="text-center py-10 text-slate-400">
                 <p className="mb-2">No chats yet</p>
                 <Button size="sm" variant="outline" onClick={() => setIsNewChat(true)}>Start a conversation</Button>
              </div>
           )}
        </div>
      </div>

      {/* --- Main Chat Window --- */}
      <div className={cn(
         "flex-1 flex flex-col bg-white dark:bg-slate-900 h-full relative",
         !activeChatId ? "hidden md:flex" : "flex h-full"
      )}>
         {activeChatId ? (
            <>
               {/* Header */}
               <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm z-10 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                     <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveChatId(null)}>
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                     </Button>
                     {activeChatPartner && (
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 -ml-1.5 rounded-lg transition-colors" onClick={() => setShowChatInfo(!showChatInfo)}>
                           <div className="relative">
                              <Avatar className="h-10 w-10">
                                 <AvatarImage src={activeChatPartner.photoURL} />
                                 <AvatarFallback>U</AvatarFallback>
                              </Avatar>
                              {/* Real-time Indicator */}
                              {isOnline && (
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                              )}
                           </div>
                           <div>
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-tight">
                                 {activeChatPartner.displayName}
                              </h3>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                                {partnerProfile ? statusText : 'Loading...'}
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="flex gap-1 text-synapse-600 dark:text-synapse-400">
                     <Button variant="ghost" size="icon" onClick={handleCall} className={cn("rounded-full text-synapse-600 hover:bg-slate-100 dark:hover:bg-slate-800", `text-${currentTheme.color.replace('bg-', '')}`)}><Phone className="w-5 h-5" /></Button>
                     <Button variant="ghost" size="icon" onClick={handleCall} className={cn("rounded-full text-synapse-600 hover:bg-slate-100 dark:hover:bg-slate-800", `text-${currentTheme.color.replace('bg-', '')}`)}><Video className="w-5 h-5" /></Button>
                     <Button variant="ghost" size="icon" className={cn("rounded-full text-synapse-600 hover:bg-slate-100 dark:hover:bg-slate-800", `text-${currentTheme.color.replace('bg-', '')}`)} onClick={() => setShowChatInfo(!showChatInfo)}>
                        <Info className={cn("w-5 h-5", showChatInfo && "fill-current")} />
                     </Button>
                     <div className="hidden md:flex ml-2 border-l border-slate-200 pl-2">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" onClick={closeChat}>
                           <X className="w-5 h-5" />
                        </Button>
                     </div>
                  </div>
               </div>

               {/* Messages */}
               <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-white dark:bg-slate-950 scrollbar-thin">
                  {/* Active Partner Profile Summary at Top */}
                  <div className="flex flex-col items-center pt-8 pb-12 opacity-70">
                     <Avatar className="h-24 w-24 mb-3 border-4 border-slate-100 shadow-sm">
                        <AvatarImage src={activeChatPartner?.photoURL} />
                        <AvatarFallback>U</AvatarFallback>
                     </Avatar>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeChatPartner?.displayName}</h3>
                     <p className="text-sm text-slate-500 mb-4">Synapse User</p>
                  </div>

                  {messages.map((msg, i) => {
                     const isMe = msg.senderId === user?.uid;
                     const prevMsg = messages[i-1];
                     const nextMsg = messages[i+1];
                     const isFirstInSequence = !prevMsg || prevMsg.senderId !== msg.senderId;
                     const isLastInSequence = !nextMsg || nextMsg.senderId !== msg.senderId;
                     const showTime = isFirstInSequence && msg.timestamp && (!prevMsg?.timestamp || (msg.timestamp.toMillis() - prevMsg.timestamp.toMillis() > 20 * 60 * 1000));
                     const isHovered = hoveredMessageId === msg.id;

                     return (
                        <React.Fragment key={msg.id}>
                           {showTime && (
                              <div className="text-center py-4">
                                 <span className="text-xs text-slate-400 font-medium uppercase">
                                    {msg.timestamp ? format(msg.timestamp.toDate(), 'MMM d, h:mm a') : ''}
                                 </span>
                              </div>
                           )}
                           <div 
                              className={cn("flex w-full group relative mb-2", isMe ? "justify-end" : "justify-start")}
                              onMouseEnter={() => setHoveredMessageId(msg.id)}
                              onMouseLeave={() => setHoveredMessageId(null)}
                           >
                              {!isMe && (
                                 <div className="w-8 flex-shrink-0 flex items-end mr-2">
                                    {isLastInSequence && (
                                       <Avatar className="h-7 w-7">
                                          <AvatarImage src={activeChatPartner?.photoURL} />
                                          <AvatarFallback>U</AvatarFallback>
                                       </Avatar>
                                    )}
                                 </div>
                              )}
                              
                              <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                 {/* Reply Context */}
                                 {msg.replyTo && (
                                     <div className={cn(
                                         "mb-1 text-xs px-3 py-1.5 rounded-xl bg-slate-100 border-l-4 border-slate-300 opacity-80", 
                                         isMe ? "self-end mr-2 text-right" : "self-start ml-2 text-left"
                                     )}>
                                         <p className="font-bold text-slate-700">Replying to {msg.replyTo.displayName}</p>
                                         <p className="truncate text-slate-500">{msg.replyTo.text}</p>
                                     </div>
                                 )}

                                 <div className="relative group/bubble flex items-center">
                                     {/* Action Buttons (Left for Me, Right for Others) */}
                                     {isMe && isHovered && (
                                         <div className="flex items-center gap-1 mr-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                                             <Popover>
                                                 <PopoverTrigger asChild>
                                                     <button className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><Smile className="w-4 h-4" /></button>
                                                 </PopoverTrigger>
                                                 <PopoverContent className="w-auto p-1 flex gap-1 bg-white rounded-full shadow-xl" side="top">
                                                     {QUICK_EMOJIS.map(e => <button key={e} onClick={() => addReaction(msg.id, e)} className="p-1.5 hover:bg-slate-100 rounded-full text-lg transition-transform hover:scale-125">{e}</button>)}
                                                 </PopoverContent>
                                             </Popover>
                                             <button onClick={() => setReplyTo(msg)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><Reply className="w-4 h-4" /></button>
                                             <button onClick={() => deleteMessage(msg.id)} className="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                         </div>
                                     )}

                                     {msg.image && (
                                        <img src={msg.image} className="rounded-2xl max-w-[250px] mb-1 border border-slate-200 cursor-pointer hover:opacity-95" />
                                     )}
                                     {msg.text && (
                                        <div className={cn("break-words px-4 py-2 text-[15px] relative", 
                                           isMe 
                                              ? `${currentTheme.color} text-white`
                                              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100",
                                           
                                           isFirstInSequence && isLastInSequence ? "rounded-2xl" :
                                           isFirstInSequence && !isLastInSequence ? (isMe ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md") :
                                           !isFirstInSequence && isLastInSequence ? (isMe ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tl-md") :
                                           (isMe ? "rounded-2xl rounded-r-md" : "rounded-2xl rounded-l-md"),
                                           
                                           "transition-colors duration-300 shadow-sm"
                                        )}>
                                           {msg.text}
                                           {/* Reactions Overlay */}
                                           {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                              <div className={cn(
                                                  "absolute -bottom-2 h-5 bg-white border border-slate-100 rounded-full px-1 flex items-center shadow-sm text-[10px] min-w-[20px] justify-center z-10",
                                                  isMe ? "-left-2" : "-right-2"
                                              )}>
                                                  {Object.values(msg.reactions).slice(0, 3).join('')}
                                                  {Object.keys(msg.reactions).length > 1 && <span className="ml-0.5 text-slate-500 font-bold">{Object.keys(msg.reactions).length}</span>}
                                              </div>
                                           )}
                                        </div>
                                     )}

                                     {/* Action Buttons (Right for Others) */}
                                     {!isMe && isHovered && (
                                         <div className="flex items-center gap-1 ml-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                                             <Popover>
                                                 <PopoverTrigger asChild>
                                                     <button className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><Smile className="w-4 h-4" /></button>
                                                 </PopoverTrigger>
                                                 <PopoverContent className="w-auto p-1 flex gap-1 bg-white rounded-full shadow-xl" side="top">
                                                     {QUICK_EMOJIS.map(e => <button key={e} onClick={() => addReaction(msg.id, e)} className="p-1.5 hover:bg-slate-100 rounded-full text-lg transition-transform hover:scale-125">{e}</button>)}
                                                 </PopoverContent>
                                             </Popover>
                                             <button onClick={() => setReplyTo(msg)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><Reply className="w-4 h-4" /></button>
                                         </div>
                                     )}
                                 </div>
                              </div>
                           </div>
                        </React.Fragment>
                     );
                  })}
                  
                  {/* Read Receipt & Typing Indicator */}
                  <div className="flex justify-end pr-4 h-5 items-center">
                      {/* Only show 'Seen' avatar if latest message is from me and read */}
                      {messages.length > 0 && messages[messages.length - 1].senderId === user?.uid && activeChatData?.lastMessage?.read && (
                         <Avatar className="h-3.5 w-3.5 border border-white shadow-sm ml-auto animate-in fade-in">
                            <AvatarImage src={activeChatPartner?.photoURL} />
                         </Avatar>
                      )}
                  </div>
                  
                  {isTyping && (
                      <div className="flex items-center gap-2 pl-10 text-slate-400 text-xs font-medium animate-pulse">
                          <div className="flex gap-1 bg-slate-100 rounded-full px-3 py-2">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                          </div>
                      </div>
                  )}

                  <div ref={messagesEndRef} />
               </div>

               {/* Input Area */}
               <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  {isBlockedByMe ? (
                      <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm">
                          <p>You have blocked this user. Unblock to send messages.</p>
                      </div>
                  ) : (
                    <div className="flex flex-col">
                        {replyTo && (
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-t-xl border-x border-t border-slate-100 text-xs text-slate-500 mb-1">
                                <div>
                                    <span className="font-bold">Replying to {replyTo.replyTo?.displayName || 'user'}</span>: {replyTo.text || 'Image'}
                                </div>
                                <button onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></button>
                            </div>
                        )}
                        <form onSubmit={(e) => sendMessage(e)} className="flex items-end gap-2">
                            <div className="flex gap-1 mb-2">
                                <Button type="button" variant="ghost" size="icon" className={cn("rounded-full hover:bg-slate-100 dark:hover:bg-slate-800", `text-${currentTheme.color.replace('bg-', '')}`)}><MoreHorizontal className="w-5 h-5" /></Button>
                                <Button type="button" onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className={cn("rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative", `text-${currentTheme.color.replace('bg-', '')}`)}>
                                {isUploading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                <Button type="button" variant="ghost" size="icon" className={cn("rounded-full hover:bg-slate-100 dark:hover:bg-slate-800", `text-${currentTheme.color.replace('bg-', '')}`)}><Smile className="w-5 h-5" /></Button>
                            </div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center px-4 py-2 mb-1">
                                <input 
                                value={newMessage} 
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    handleTyping();
                                }}
                                className="bg-transparent w-full focus:outline-none text-[15px] dark:text-slate-100 placeholder:text-slate-500"
                                placeholder="Type a message..."
                                />
                                <button type="button" className="text-slate-400 hover:text-slate-600"><Smile className="w-5 h-5" /></button>
                            </div>
                            {newMessage.trim() ? (
                                <Button type="submit" variant="ghost" size="icon" className={cn("rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mb-1", `text-${currentTheme.color.replace('bg-', '')}`)}>
                                <Send className="w-5 h-5 fill-current" />
                                </Button>
                            ) : (
                                <Button type="button" onClick={(e) => sendMessage(e, currentEmoji)} variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mb-1 text-2xl">
                                {currentEmoji}
                                </Button>
                            )}
                        </form>
                    </div>
                  )}
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col h-full relative">
                <div className="absolute top-2 right-2 hidden md:block">
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-100" onClick={closeChat}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center bg-white/50 dark:bg-slate-900">
                    <div className="w-24 h-24 bg-purple-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-500 shadow-inner">
                        <div className="relative">
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse" />
                            <img src="https://cdni.iconscout.com/illustration/premium/thumb/chat-5694858-4743477.png" className="w-16 h-16 opacity-80 grayscale hover:grayscale-0 transition-all duration-500" alt="Chat" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Your Messages</h3>
                    <p className="max-w-xs text-sm">Select a person from the list to start a conversation.</p>
                </div>
            </div>
         )}
      </div>

      {/* --- Right Sidebar (Chat Info) --- */}
      {activeChatId && showChatInfo && (
         <div className="w-[300px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 hidden lg:flex flex-col animate-in slide-in-from-right-10 overflow-y-auto">
            <div className="p-6 flex flex-col items-center border-b border-slate-100 dark:border-slate-800">
               <Avatar className="h-20 w-20 mb-3 shadow-md">
                  <AvatarImage src={activeChatPartner?.photoURL} />
                  <AvatarFallback>U</AvatarFallback>
               </Avatar>
               
               {editingNickname ? (
                   <div className="flex items-center gap-1 w-full">
                       <input 
                           value={editingNickname.name}
                           onChange={(e) => setEditingNickname({...editingNickname, name: e.target.value})}
                           className="text-center font-bold border-b border-slate-300 w-full focus:outline-none"
                           autoFocus
                           onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                       />
                       <button onClick={saveNickname}><Check className="w-4 h-4 text-green-600" /></button>
                   </div>
               ) : (
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 group cursor-pointer" onClick={() => activeChatPartner && setEditingNickname({uid: chats.find(c => c.id === activeChatId)!.participants.find(p => p !== user?.uid)!, name: activeChatPartner.displayName})}>
                       {activeChatPartner?.displayName}
                       <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400" />
                   </h3>
               )}

               <p className="text-xs text-slate-500 mt-1">
                  {partnerProfile ? (isOnline ? 'Active now' : 'Offline') : 'Active now'}
               </p>
               
               <div className="flex gap-4 mt-6">
                  <div className="flex flex-col items-center gap-1 cursor-pointer group">
                     <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        <UserProfileIcon className="w-5 h-5 text-slate-700" />
                     </div>
                     <span className="text-xs text-slate-500 font-medium">Profile</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 cursor-pointer group">
                     <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        <Bell className="w-5 h-5 text-slate-700" />
                     </div>
                     <span className="text-xs text-slate-500 font-medium">Mute</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 cursor-pointer group">
                     <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        <Search className="w-5 h-5 text-slate-700" />
                     </div>
                     <span className="text-xs text-slate-500 font-medium">Search</span>
                  </div>
               </div>
            </div>

            <div className="p-2 space-y-1">
               {/* Chat Info Accordion */}
               <AccordionItem title="Chat Info">
                  <div className="space-y-3 pt-2">
                     <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateChatSettings('theme', currentTheme.id === 'default' ? 'rose' : 'default')}>
                        <p className="text-sm text-slate-600 font-medium">Theme</p>
                        <div className={cn("w-6 h-6 rounded-full cursor-pointer border border-slate-200 shadow-sm", currentTheme.color)} />
                     </div>
                     {/* Theme Picker Grid (Visible mostly) */}
                     <div className="grid grid-cols-6 gap-2">
                        {THEMES.map(theme => (
                           <button 
                              key={theme.id}
                              onClick={() => updateChatSettings('theme', theme.id)}
                              className={cn(
                                 "w-6 h-6 rounded-full transition-transform hover:scale-110", 
                                 theme.color,
                                 currentTheme.id === theme.id ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""
                              )}
                              title={theme.name}
                           />
                        ))}
                     </div>

                     <div className="flex items-center justify-between group cursor-pointer">
                        <p className="text-sm text-slate-600 font-medium">Emoji</p>
                        <span className="text-xl">{currentEmoji}</span>
                     </div>
                     {/* Emoji Picker Grid */}
                     <div className="flex justify-between bg-slate-50 p-2 rounded-xl">
                        {QUICK_EMOJIS.map(emoji => (
                           <button 
                              key={emoji}
                              onClick={() => updateChatSettings('emoji', emoji)}
                              className={cn(
                                 "text-lg hover:scale-125 transition-transform", 
                                 currentEmoji === emoji ? "scale-125 drop-shadow-sm" : "opacity-70 hover:opacity-100"
                              )}
                           >
                              {emoji}
                           </button>
                        ))}
                     </div>
                  </div>
               </AccordionItem>

               {/* Media Accordion */}
               <AccordionItem title="Media, Files and Links">
                  {sharedPhotos.length > 0 ? (
                     <div className="grid grid-cols-3 gap-1 pt-1">
                        {sharedPhotos.map((photo, i) => (
                           <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90">
                              <img src={photo} className="w-full h-full object-cover" alt="shared" />
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-4 text-slate-400 text-xs">
                        {photosLoading ? "Loading..." : "No media shared yet"}
                     </div>
                  )}
               </AccordionItem>

               {/* Privacy Accordion */}
               <AccordionItem title="Privacy & Support">
                  <div className="space-y-2 pt-1">
                     <button 
                        onClick={handleBlockUser}
                        className={cn(
                            "flex items-center gap-2 text-sm font-medium w-full p-2 rounded-lg transition-colors",
                            isBlockedByMe ? "text-slate-600 hover:bg-slate-50" : "text-red-600 hover:bg-red-50"
                        )}
                     >
                        {isBlockedByMe ? <><UserCheck className="w-4 h-4" /> Unblock User</> : <><UserX className="w-4 h-4" /> Block User</>}
                     </button>
                     <button 
                        onClick={handleReportUser}
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-50 w-full p-2 rounded-lg transition-colors"
                     >
                        <Flag className="w-4 h-4" /> Report
                     </button>
                  </div>
               </AccordionItem>
            </div>
         </div>
      )}
    </div>
  );
};

const UserProfileIcon = (props: any) => (
   <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
);

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
   const [open, setOpen] = useState(false);
   return (
      <div className="rounded-lg overflow-hidden">
         <button 
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
         >
            <span className="font-bold text-sm text-slate-700">{title}</span>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
         </button>
         {open && <div className="px-3 pb-3 pt-1 animate-in slide-in-from-top-2">{children}</div>}
      </div>
   );
};
