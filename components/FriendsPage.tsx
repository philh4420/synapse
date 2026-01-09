
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, documentId, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, FriendRequest } from '../types';
import { Card } from './ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Button } from './ui/Button';
import { FriendButton } from './FriendButton';
import { Users, UserPlus, ChevronRight, Settings, Sparkles, UserSearch, Search, UserCheck } from 'lucide-react';
import { Separator } from './ui/Separator';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';

export const FriendsPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'requests' | 'suggestions' | 'all'>('home');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Listen for Incoming Requests
  useEffect(() => {
    if (!user) return;
    const qRequests = query(
      collection(db, 'friend_requests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(qRequests, async (snapshot) => {
      const reqs: FriendRequest[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const senderRef = doc(db, 'users', data.senderId);
        const senderSnap = await getDoc(senderRef);
        if (senderSnap.exists()) {
          reqs.push({
            id: docSnap.id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            status: data.status,
            timestamp: data.timestamp,
            sender: senderSnap.data() as UserProfile
          });
        }
      }
      setRequests(reqs);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Fetch All Friends
  useEffect(() => {
    const fetchFriends = async () => {
        if (!userProfile?.friends || userProfile.friends.length === 0) {
            setFriends([]);
            setLoading(false);
            return;
        }
        
        try {
            const validFriends = userProfile.friends.filter(id => id && typeof id === 'string' && id.trim().length > 0);
            
            if (validFriends.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }

            const chunk = validFriends.slice(0, 20); // Limit for demo
            if (chunk.length > 0) {
                const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const snap = await getDocs(q);
                const fetchedFriends: UserProfile[] = [];
                snap.forEach(d => fetchedFriends.push(d.data() as UserProfile));
                setFriends(fetchedFriends);
            } else {
                setFriends([]);
            }
        } catch (e) {
            console.error("Error fetching friends list", e);
        } finally {
            setLoading(false);
        }
    };

    fetchFriends();
  }, [user, userProfile?.friends]);

  // 3. Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) return;
      // Fetch only if needed or on mount
      if (suggestions.length > 0 && view !== 'home' && view !== 'suggestions') return;

      setLoading(true);
      try {
        const excludeIds = new Set<string>();
        excludeIds.add(user.uid);
        userProfile?.friends?.forEach(id => excludeIds.add(id));

        // Basic exclusion of pending requests
        const qSent = query(collection(db, 'friend_requests'), where('senderId', '==', user.uid));
        const sentSnap = await getDocs(qSent);
        sentSnap.forEach(doc => excludeIds.add(doc.data().receiverId));

        const qReceived = query(collection(db, 'friend_requests'), where('receiverId', '==', user.uid));
        const recSnap = await getDocs(qReceived);
        recSnap.forEach(doc => excludeIds.add(doc.data().senderId));

        const qUsers = query(collection(db, 'users'), limit(30));
        const userSnap = await getDocs(qUsers);
        
        const newSuggestions: UserProfile[] = [];
        userSnap.forEach(doc => {
            if (!excludeIds.has(doc.id)) {
                newSuggestions.push(doc.data() as UserProfile);
            }
        });
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error("Error fetching suggestions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user, userProfile, view]);

  // Filter Friends
  const filteredFriends = friends.filter(f => 
    f.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const NavItem = ({ id, icon: Icon, label, count }: { id: typeof view, icon: any, label: string, count?: number }) => (
    <button
      onClick={() => setView(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[15px] font-semibold transition-all duration-300 text-left relative overflow-hidden group",
        view === id 
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" 
          : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
        view === id 
          ? "bg-synapse-600 text-white" 
          : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="flex-1">{label}</span>
      {count !== undefined && count > 0 && (
         <span className="text-red-500 font-bold text-sm bg-red-50 px-2 py-0.5 rounded-full mr-2">{count}</span>
      )}
      {view === id && <ChevronRight className="w-5 h-5 text-slate-300" />}
    </button>
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 lg:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
         
         {/* --- Sidebar Navigation --- */}
         <div className="w-full lg:w-[300px] flex-shrink-0 lg:sticky lg:top-24 space-y-6">
            <div className="flex items-center justify-between px-2">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Friends</h1>
                <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
                    <Settings className="w-5 h-5" />
                </Button>
            </div>
            
            <div className="space-y-2">
               <NavItem id="home" icon={UserCheck} label="Home" />
               <NavItem id="requests" icon={UserPlus} label="Friend Requests" count={requests.length} />
               <NavItem id="suggestions" icon={UserSearch} label="Suggestions" />
               <NavItem id="all" icon={Users} label="All Friends" />
            </div>
            
            <Separator className="bg-slate-200/60" />

            {/* Mini Footer for Sidebar */}
            <div className="px-4 text-xs text-slate-400 leading-relaxed">
               <p>Friend requests and suggestions are based on mutual connections and profile information.</p>
            </div>
         </div>

         {/* --- Content Area --- */}
         <div className="flex-1 min-w-0 w-full">
            
            {/* HOME VIEW (Aggregated) */}
            {view === 'home' && (
               <div className="space-y-10">
                  {/* Requests Section */}
                  {requests.length > 0 && (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <h2 className="text-xl font-bold text-slate-900">Friend Requests <span className="text-red-500 text-lg ml-1">{requests.length}</span></h2>
                           <Button variant="link" onClick={() => setView('requests')} className="text-synapse-600 font-semibold">See all</Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                           {requests.slice(0, 4).map(req => (
                               <FriendRequestCard key={req.id} req={req} />
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Suggestions Section */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">People You May Know</h2>
                        <Button variant="link" onClick={() => setView('suggestions')} className="text-synapse-600 font-semibold">See all</Button>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {suggestions.slice(0, 8).map(s => (
                           <SuggestionCard key={s.uid} user={s} />
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* REQUESTS VIEW */}
            {view === 'requests' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-slate-900">Friend Requests</h2>
                  </div>

                  {requests.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                         {requests.map(req => (
                             <FriendRequestCard key={req.id} req={req} />
                         ))}
                      </div>
                  ) : (
                      <EmptyState 
                        icon={UserPlus} 
                        title="No new requests" 
                        desc="When people send you friend requests, they'll appear here." 
                      />
                  )}
               </div>
            )}

            {/* SUGGESTIONS VIEW */}
            {view === 'suggestions' && (
               <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900">People You May Know</h2>
                  {loading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-[3/4] bg-slate-100 rounded-3xl animate-pulse" />)}
                     </div>
                  ) : suggestions.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {suggestions.map(s => (
                           <SuggestionCard key={s.uid} user={s} />
                        ))}
                     </div>
                  ) : (
                      <EmptyState 
                        icon={Sparkles} 
                        title="No suggestions yet" 
                        desc="Try searching for people you know to build your network." 
                      />
                  )}
               </div>
            )}

            {/* ALL FRIENDS VIEW */}
            {view === 'all' && (
               <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <h2 className="text-2xl font-bold text-slate-900">All Friends</h2>
                     <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input 
                           type="text" 
                           placeholder="Search Friends" 
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full bg-slate-100 hover:bg-white focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-synapse-500/20 border border-transparent focus:border-synapse-200 transition-all"
                        />
                     </div>
                  </div>
                  
                  {friends.length > 0 ? (
                     <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {filteredFriends.map(friend => (
                           <Card key={friend.uid} className="flex items-center gap-4 p-4 hover:shadow-md transition-all border-slate-100 bg-white rounded-2xl group">
                              <Avatar className="w-20 h-20 rounded-2xl border border-slate-100 shadow-sm group-hover:scale-105 transition-transform">
                                 <AvatarImage src={friend.photoURL || ''} />
                                 <AvatarFallback>{friend.displayName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                 <h3 className="font-bold text-slate-900 text-[17px] truncate">{friend.displayName}</h3>
                                 <p className="text-xs text-slate-500 font-medium">Synapse User</p>
                              </div>
                              <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <FriendButton targetUid={friend.uid} size="icon" className="rounded-xl" />
                              </div>
                           </Card>
                        ))}
                        {filteredFriends.length === 0 && searchTerm && (
                           <div className="col-span-full py-12 text-center text-slate-500">
                              No friends found matching "{searchTerm}"
                           </div>
                        )}
                     </div>
                  ) : (
                      <EmptyState 
                        icon={Users} 
                        title="No friends yet" 
                        desc="Start adding friends to see them listed here." 
                        action={<Button variant="outline" onClick={() => setView('suggestions')}>Find Friends</Button>}
                      />
                  )}
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

// --- Sub Components ---

const FriendRequestCard = ({ req }: { req: FriendRequest }) => (
    <Card className="overflow-hidden border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col group bg-white">
      <div className="aspect-square bg-slate-100 relative overflow-hidden">
          <img 
            src={req.sender?.photoURL || ''} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            alt={req.sender?.displayName || 'User'}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </div>
      <div className="p-4 space-y-3 flex-1 flex flex-col -mt-12 relative z-10">
          <div className="space-y-0.5 flex-1 text-white drop-shadow-md">
            <h3 className="font-bold text-lg truncate leading-tight">{req.sender?.displayName}</h3>
            <p className="text-xs opacity-90 font-medium">1 mutual friend</p>
          </div>
          <div className="space-y-2 pt-4 bg-white rounded-t-2xl -mx-4 px-4">
            <FriendButton targetUid={req.senderId} className="w-full shadow-lg shadow-synapse-500/20" />
            <Button variant="secondary" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700">Delete</Button>
          </div>
      </div>
    </Card>
);

const SuggestionCard = ({ user }: { user: UserProfile }) => (
    <Card className="overflow-hidden border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col group bg-white">
        <div className="aspect-square bg-slate-100 relative overflow-hidden">
          <img 
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            alt={user.displayName || 'User'}
          />
        </div>
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
              <h3 className="font-bold text-[17px] text-slate-900 truncate leading-tight">{user.displayName}</h3>
              <p className="text-xs text-slate-500 font-medium">Suggested for you</p>
          </div>
          <div className="space-y-2 mt-auto">
              <FriendButton targetUid={user.uid} className="w-full" />
              <Button variant="ghost" className="w-full text-slate-400 hover:text-slate-600 hover:bg-slate-50">Remove</Button>
          </div>
        </div>
    </Card>
);

const EmptyState = ({ icon: Icon, title, desc, action }: { icon: any, title: string, desc: string, action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Icon className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">{desc}</p>
        {action}
    </div>
);
