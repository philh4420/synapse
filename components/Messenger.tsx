
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, MoreHorizontal, Edit, Search, ArrowLeft, 
  Smile, Image as ImageIcon, Phone, Video, Info, Check, CheckCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../context/MessengerContext'; // Import Context
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, updateDoc, doc, limit, getDocs, setDoc, getDoc, documentId
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Chat, Message, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const Messenger: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { activeUserId } = useMessenger(); // Use Context
  
  // State
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewChat, setIsNewChat] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Chats
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

  // Handle activeUserId from Context (Profile Button Click)
  useEffect(() => {
    if (activeUserId && chats.length > 0) {
      const existingChat = chats.find(c => c.participants.includes(activeUserId));
      if (existingChat) {
        setActiveChatId(existingChat.id);
        setIsNewChat(false);
      } else {
        // If chat doesn't exist, we ideally fetch user details and start a new chat
        // For now, let's switch to New Chat mode and try to pre-select if possible
        // Or create it immediately if we have the profile data (requires fetching)
        const createImmediate = async () => {
           try {
             const userDoc = await getDoc(doc(db, 'users', activeUserId));
             if (userDoc.exists()) {
                const targetUser = userDoc.data() as UserProfile;
                await startChat(targetUser);
             }
           } catch(e) { console.error("Error starting chat from context", e); }
        };
        createImmediate();
      }
    } else if (activeUserId && chats.length === 0 && !loadingChats) {
       // Similar logic if no chats exist yet
        const createImmediate = async () => {
           try {
             const userDoc = await getDoc(doc(db, 'users', activeUserId));
             if (userDoc.exists()) {
                const targetUser = userDoc.data() as UserProfile;
                await startChat(targetUser);
             }
           } catch(e) { console.error("Error starting chat from context", e); }
        };
        createImmediate();
    }
  }, [activeUserId, chats, loadingChats]);

  // 2. Fetch Messages for Active Chat
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
      scrollToBottom();
      
      // Mark as read logic would go here
    });

    return () => unsubscribe();
  }, [activeChatId]);

  // 3. Fetch Friends for New Chat
  useEffect(() => {
    if (isNewChat && userProfile?.friends) {
      const fetchFriends = async () => {
        if (!userProfile.friends || userProfile.friends.length === 0) return;
        const friendIds = userProfile.friends.slice(0, 20); // Limit for demo
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startChat = async (friend: UserProfile) => {
    if (!user || !userProfile) return;

    // Check if chat already exists
    const existingChat = chats.find(c => c.participants.includes(friend.uid));
    
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setIsNewChat(false);
    } else {
      // Create new chat
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

  // Helper to get other participant details
  const getOtherParticipant = (chat: Chat) => {
    if (!user) return { displayName: 'Unknown', photoURL: '' };
    const otherId = chat.participants.find(p => p !== user.uid);
    if (otherId && chat.participantData && chat.participantData[otherId]) {
      return chat.participantData[otherId];
    }
    return { displayName: 'User', photoURL: '' };
  };

  // Filtered Friends
  const filteredFriends = friends.filter(f => 
    f.displayName?.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <div className="flex h-[600px] w-[360px] md:w-[700px] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex-col md:flex-row">
      
      {/* --- Sidebar (Chat List) --- */}
      <div className={cn(
        "w-full md:w-[300px] bg-slate-50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all",
        activeChatId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Chats</h2>
            <div className="flex gap-2">
               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full dark:hover:bg-slate-800" onClick={() => setIsNewChat(true)}>
                  <Edit className="w-5 h-5 text-slate-600 dark:text-slate-400" />
               </Button>
            </div>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
             <input 
               placeholder="Search Messenger" 
               className="w-full bg-slate-200/50 dark:bg-slate-800 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none dark:text-slate-200"
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
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
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
                 return (
                    <button 
                       key={chat.id} 
                       onClick={() => setActiveChatId(chat.id)}
                       className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group relative",
                          isActive 
                             ? "bg-blue-50 dark:bg-slate-800" 
                             : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                       )}
                    >
                       <div className="relative">
                          <Avatar className="h-12 w-12 border border-slate-200 dark:border-slate-700">
                             <AvatarImage src={other.photoURL} />
                             <AvatarFallback>{other.displayName[0]}</AvatarFallback>
                          </Avatar>
                          {/* Online status indicator placeholder */}
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={cn("text-[15px] font-semibold truncate", isActive ? "text-synapse-700 dark:text-synapse-400" : "text-slate-900 dark:text-slate-100")}>{other.displayName}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                             <span className={cn("truncate", !chat.lastMessage?.read && chat.lastMessage?.senderId !== user?.uid ? "font-bold text-slate-900 dark:text-white" : "")}>
                                {chat.lastMessage?.senderId === user?.uid ? 'You: ' : ''}{chat.lastMessage?.text || 'Started a chat'}
                             </span>
                             <span>·</span>
                             <span>{chat.updatedAt ? formatDistanceToNow(chat.updatedAt.toDate ? chat.updatedAt.toDate() : new Date(), { addSuffix: false }).replace('about ', '') : 'Now'}</span>
                          </div>
                       </div>
                       {!chat.lastMessage?.read && chat.lastMessage?.senderId !== user?.uid && (
                          <div className="w-3 h-3 bg-synapse-600 rounded-full absolute right-3 top-1/2 -translate-y-1/2 shadow-sm" />
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
         !activeChatId ? "hidden md:flex" : "flex"
      )}>
         {activeChatId ? (
            <>
               {/* Header */}
               <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                     <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveChatId(null)}>
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                     </Button>
                     <Avatar className="h-10 w-10">
                        <AvatarImage src={chats.find(c => c.id === activeChatId) ? getOtherParticipant(chats.find(c => c.id === activeChatId)!).photoURL : ''} />
                        <AvatarFallback>U</AvatarFallback>
                     </Avatar>
                     <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                           {chats.find(c => c.id === activeChatId) ? getOtherParticipant(chats.find(c => c.id === activeChatId)!).displayName : 'User'}
                        </h3>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">Active now</p>
                     </div>
                  </div>
                  <div className="flex gap-1 text-synapse-600 dark:text-synapse-400">
                     <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><Phone className="w-5 h-5" /></Button>
                     <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><Video className="w-5 h-5" /></Button>
                     <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><Info className="w-5 h-5" /></Button>
                  </div>
               </div>

               {/* Messages */}
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F0F2F5]/50 dark:bg-slate-950 scrollbar-thin">
                  {messages.map((msg, i) => {
                     const isMe = msg.senderId === user?.uid;
                     const prevMsg = messages[i-1];
                     const isSequence = prevMsg && prevMsg.senderId === msg.senderId;
                     
                     return (
                        <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                           <div className={cn("max-w-[70%] break-words px-4 py-2 text-[15px] shadow-sm", 
                              isMe 
                                 ? "bg-synapse-600 text-white rounded-2xl rounded-tr-sm" 
                                 : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700",
                              isSequence && isMe ? "rounded-tr-2xl mt-0.5" : "",
                              isSequence && !isMe ? "rounded-tl-2xl mt-0.5" : ""
                           )}>
                              {msg.text}
                           </div>
                        </div>
                     );
                  })}
                  <div ref={messagesEndRef} />
               </div>

               {/* Input */}
               <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <form onSubmit={sendMessage} className="flex items-end gap-2">
                     <div className="flex gap-1 mb-2">
                        <Button type="button" variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="w-5 h-5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800"><ImageIcon className="w-5 h-5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Smile className="w-5 h-5" /></Button>
                     </div>
                     <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center px-4 py-2 mb-1">
                        <input 
                           value={newMessage} 
                           onChange={(e) => setNewMessage(e.target.value)}
                           className="bg-transparent w-full focus:outline-none text-sm dark:text-slate-100 placeholder:text-slate-500"
                           placeholder="Type a message..."
                        />
                     </div>
                     <Button type="submit" disabled={!newMessage.trim()} variant="ghost" size="icon" className="rounded-full text-synapse-600 dark:text-synapse-400 hover:bg-slate-100 dark:hover:bg-slate-800 mb-1">
                        <Send className="w-5 h-5 fill-current" />
                     </Button>
                  </form>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center bg-slate-50/30 dark:bg-slate-900">
               <div className="w-24 h-24 bg-purple-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-500">
                  <div className="relative">
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse" />
                     <img src="https://cdni.iconscout.com/illustration/premium/thumb/chat-5694858-4743477.png" className="w-16 h-16 opacity-80 grayscale hover:grayscale-0 transition-all duration-500" alt="Chat" />
                  </div>
               </div>
               <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Your Messages</h3>
               <p className="max-w-xs">Send private photos and messages to a friend or group.</p>
            </div>
         )}
      </div>
    </div>
  );
};
