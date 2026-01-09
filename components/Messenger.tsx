
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, MoreHorizontal, Edit, Search, ArrowLeft, 
  Smile, Image as ImageIcon, Phone, Video, Info, X, Minimize2, Bell, Ban, ThumbsUp, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../context/MessengerContext';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, updateDoc, doc, limit, getDocs, documentId
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Chat, Message, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { uploadToCloudinary } from '../utils/upload';

export const Messenger: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { isOpen, closeChat, activeUserId } = useMessenger();
  
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
  
  // Uploading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Chats List
  useEffect(() => {
    if (!user) return;

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
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Fetch Messages for Active Chat (Separated from Chats update)
  useEffect(() => {
    if (!activeChatId) return;

    const q = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  // 3. Mark as Read Logic (Depends on chats to check lastMessage state)
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

  // 4. Handle activeUserId from Context (Start/Open Chat)
  // We use a ref to track if we've already handled the activeUserId to prevent loops
  const handledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeUserId || handledUserIdRef.current === activeUserId || loadingChats) return;

    const handleOpen = async () => {
        // Check if chat exists in currently loaded chats
        const existingChat = chats.find(c => c.participants.includes(activeUserId));
        
        if (existingChat) {
            setActiveChatId(existingChat.id);
            setIsNewChat(false);
            handledUserIdRef.current = activeUserId;
        } else {
            // Try to fetch or create
            try {
                // First check DB if local chats list might be stale or incomplete (though onSnapshot should handle it)
                // Assuming chats list is complete for user. If not found, create.
                const userDoc = await import('firebase/firestore').then(mod => mod.getDoc(doc(db, 'users', activeUserId)));
                if (userDoc.exists()) {
                    const targetUser = userDoc.data() as UserProfile;
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

  // 5. Fetch Friends for New Chat
  useEffect(() => {
    if (isNewChat && userProfile?.friends) {
      const fetchFriends = async () => {
        if (!userProfile.friends || userProfile.friends.length === 0) return;
        
        // Filter out empty strings
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
        } catch (e) {
           console.error(e);
        }
      };
      fetchFriends();
    }
  }, [isNewChat, userProfile]);

  const startChat = async (friend: UserProfile) => {
    if (!user || !userProfile) return;

    // Check if chat already exists
    const existingChat = chats.find(c => c.participants.includes(friend.uid));
    
    if (existingChat) {
      setActiveChatId(existingChat.id);
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId || !user) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        text,
        senderId: user.uid,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: {
          text,
          senderId: user.uid,
          timestamp: serverTimestamp(),
          read: false
        },
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    if (!user) return { displayName: 'Unknown', photoURL: '' };
    const otherId = chat.participants.find(p => p !== user.uid);
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

  // Don't render anything if closed (but keeping hooks valid)
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
              chats.map(chat => {
                 const other = getOtherParticipant(chat);
                 const isActive = activeChatId === chat.id;
                 const isUnread = !chat.lastMessage?.read && chat.lastMessage?.senderId !== user?.uid;
                 
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
                          {/* We don't have real online status yet, so simulating if recently active */}
                          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                       </div>
                       <div className="flex-1 min-w-0 pr-4">
                          <p className={cn("text-[15px] truncate", isUnread ? "font-bold text-slate-900" : "text-slate-900 dark:text-slate-100 font-medium")}>{other.displayName}</p>
                          <div className={cn("flex items-center gap-1 text-[13px]", isUnread ? "font-bold text-slate-900" : "text-slate-500 dark:text-slate-400")}>
                             <span className="truncate max-w-[140px]">
                                {chat.lastMessage?.senderId === user?.uid ? 'You: ' : ''}{chat.lastMessage?.text || 'Sent an image'}
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
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                           </div>
                           <div>
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-tight">
                                 {activeChatPartner.displayName}
                              </h3>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400">Active now</p>
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="flex gap-1 text-synapse-600 dark:text-synapse-400">
                     <Button variant="ghost" size="icon" className="rounded-full text-synapse-600 hover:bg-slate-100 dark:hover:bg-slate-800"><Phone className="w-5 h-5" /></Button>
                     <Button variant="ghost" size="icon" className="rounded-full text-synapse-600 hover:bg-slate-100 dark:hover:bg-slate-800"><Video className="w-5 h-5" /></Button>
                     <Button variant="ghost" size="icon" className="rounded-full text-synapse-600 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setShowChatInfo(!showChatInfo)}>
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
                  <div className="flex flex-col items-center pt-8 pb-12">
                     <Avatar className="h-24 w-24 mb-3 border-4 border-slate-100 shadow-sm">
                        <AvatarImage src={activeChatPartner?.photoURL} />
                        <AvatarFallback>U</AvatarFallback>
                     </Avatar>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeChatPartner?.displayName}</h3>
                     <p className="text-sm text-slate-500 mb-4">Synapse User</p>
                     <Button variant="secondary" size="sm" className="bg-slate-100 text-slate-900 font-semibold hover:bg-slate-200">View Profile</Button>
                  </div>

                  {messages.map((msg, i) => {
                     const isMe = msg.senderId === user?.uid;
                     const prevMsg = messages[i-1];
                     const nextMsg = messages[i+1];
                     
                     const isFirstInSequence = !prevMsg || prevMsg.senderId !== msg.senderId;
                     const isLastInSequence = !nextMsg || nextMsg.senderId !== msg.senderId;
                     
                     // Show timestamp if first msg or time difference > 20 mins
                     const showTime = isFirstInSequence && msg.timestamp && (!prevMsg?.timestamp || (msg.timestamp.toMillis() - prevMsg.timestamp.toMillis() > 20 * 60 * 1000));

                     return (
                        <React.Fragment key={msg.id}>
                           {showTime && (
                              <div className="text-center py-4">
                                 <span className="text-xs text-slate-400 font-medium uppercase">
                                    {msg.timestamp ? format(msg.timestamp.toDate(), 'MMM d, h:mm a') : ''}
                                 </span>
                              </div>
                           )}
                           <div className={cn("flex w-full group", isMe ? "justify-end" : "justify-start")}>
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
                                 {msg.image && (
                                    <img src={msg.image} className="rounded-2xl max-w-[250px] mb-1 border border-slate-200 cursor-pointer hover:opacity-95" />
                                 )}
                                 {msg.text && (
                                    <div className={cn("break-words px-4 py-2 text-[15px]", 
                                       isMe 
                                          ? "bg-synapse-600 text-white" 
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100",
                                       
                                       // Corner Rounding Logic
                                       isFirstInSequence && isLastInSequence ? "rounded-2xl" :
                                       isFirstInSequence && !isLastInSequence ? (isMe ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md") :
                                       !isFirstInSequence && isLastInSequence ? (isMe ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tl-md") :
                                       (isMe ? "rounded-2xl rounded-r-md" : "rounded-2xl rounded-l-md"),
                                       
                                       "mb-0.5"
                                    )}>
                                       {msg.text}
                                    </div>
                                 )}
                              </div>
                           </div>
                        </React.Fragment>
                     );
                  })}
                  
                  {/* Read Receipt (Mock) */}
                  {messages.length > 0 && messages[messages.length - 1].senderId === user?.uid && (
                     <div className="flex justify-end mt-1 mr-1">
                        <Avatar className="h-3.5 w-3.5 border border-white shadow-sm">
                           <AvatarImage src={activeChatPartner?.photoURL} />
                        </Avatar>
                     </div>
                  )}
                  <div ref={messagesEndRef} />
               </div>

               {/* Input */}
               <div className="p-3 bg-white dark:bg-slate-900">
                  <form onSubmit={sendMessage} className="flex items-end gap-2">
                     <div className="flex gap-1 mb-2">
                        <Button type="button" variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="w-5 h-5" /></Button>
                        <Button type="button" onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative">
                           {isUploading ? <div className="w-4 h-4 border-2 border-synapse-600 border-t-transparent rounded-full animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <Button type="button" variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Smile className="w-5 h-5" /></Button>
                     </div>
                     <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center px-4 py-2 mb-1">
                        <input 
                           value={newMessage} 
                           onChange={(e) => setNewMessage(e.target.value)}
                           className="bg-transparent w-full focus:outline-none text-[15px] dark:text-slate-100 placeholder:text-slate-500"
                           placeholder="Type a message..."
                        />
                        <button type="button" className="text-slate-400 hover:text-slate-600"><Smile className="w-5 h-5" /></button>
                     </div>
                     {newMessage.trim() ? (
                        <Button type="submit" variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800 mb-1">
                           <Send className="w-5 h-5 fill-current" />
                        </Button>
                     ) : (
                        <Button type="button" variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800 mb-1">
                           <ThumbsUp className="w-5 h-5 fill-current" />
                        </Button>
                     )}
                  </form>
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
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeChatPartner?.displayName}</h3>
               <p className="text-xs text-slate-500">Active now</p>
               
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
               <AccordionItem title="Chat Info">
                  <p className="text-sm text-slate-500">Theme</p>
                  <p className="text-sm text-slate-500">Emoji</p>
               </AccordionItem>
               <AccordionItem title="Media, Files and Links">
                  <div className="grid grid-cols-3 gap-1">
                     {/* Mock Media */}
                     {[1,2,3].map(i => (
                        <div key={i} className="bg-slate-100 aspect-square rounded-lg"></div>
                     ))}
                  </div>
               </AccordionItem>
               <AccordionItem title="Privacy & Support">
                  <div className="space-y-2">
                     <button className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-50 w-full p-2 rounded-lg transition-colors">
                        <Ban className="w-4 h-4" /> Block
                     </button>
                     <button className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 w-full p-2 rounded-lg transition-colors">
                        <Video className="w-4 h-4" /> Report
                     </button>
                  </div>
               </AccordionItem>
            </div>
         </div>
      )}
    </div>
  );
};

// Helper Components
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
         {open && <div className="px-3 pb-3 pt-1">{children}</div>}
      </div>
   );
};
