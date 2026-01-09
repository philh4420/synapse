
import React, { useEffect, useState } from 'react';
import { Search, MoreHorizontal, Video, Gift, Plus, ExternalLink, Trash2, Cake, ArrowRight } from 'lucide-react';
import { collection, query, limit, getDocs, addDoc, deleteDoc, doc, onSnapshot, where, documentId } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, SponsoredAd } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Skeleton } from './ui/Skeleton';
import { Button } from './ui/Button';
import { Separator } from './ui/Separator';
import { Input } from './ui/Input';
import { uploadToCloudinary } from '../utils/upload';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
  SheetDescription
} from './ui/Sheet';

export const RightPanel: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  // State
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [birthdayUsers, setBirthdayUsers] = useState<UserProfile[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  
  // Ad Creation State
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdSite, setNewAdSite] = useState('');
  const [newAdLink, setNewAdLink] = useState('');
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [isCreatingAd, setIsCreatingAd] = useState(false);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Contacts (Actual Friends)
    const fetchContacts = async () => {
      if (!userProfile?.friends || userProfile.friends.length === 0) {
        setContacts([]);
        setBirthdayUsers([]);
        setLoadingContacts(false);
        return;
      }

      try {
        // Sanitize IDs
        const validFriendIds = userProfile.friends.filter(id => id && typeof id === 'string' && id.trim().length > 0);
        
        if (validFriendIds.length === 0) {
           setContacts([]);
           setBirthdayUsers([]);
           setLoadingContacts(false);
           return;
        }

        // Fetch only first 20 friends for contacts list
        const chunk = validFriendIds.slice(0, 20);
        const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        const friendsList = snap.docs.map(doc => doc.data() as UserProfile);
        
        setContacts(friendsList);

        // Calculate Birthdays from friends list
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const bdays = friendsList.filter(u => {
          if (!u.birthDate) return false;
          const [_, m, d] = u.birthDate.split('-').map(Number);
          return m === currentMonth && d === currentDay;
        });
        
        setBirthdayUsers(bdays);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();

    // 2. Real-time Listener for Ads
    const adsQuery = query(collection(db, 'ads'));
    const unsubscribeAds = onSnapshot(adsQuery, (snapshot) => {
      const fetchedAds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SponsoredAd[];
      setAds(fetchedAds);
    });

    return () => unsubscribeAds();
  }, [user, userProfile?.friends]); // Refetch when friends change

  // Handle Create Ad
  const handleCreateAd = async () => {
    if (!newAdTitle || !newAdSite || !newAdLink || !adImageFile || !user) return;
    
    setIsCreatingAd(true);
    try {
      const imageUrl = await uploadToCloudinary(adImageFile);
      
      await addDoc(collection(db, 'ads'), {
        title: newAdTitle,
        site: newAdSite,
        link: newAdLink,
        image: imageUrl
      });

      // Reset Form
      setNewAdTitle('');
      setNewAdSite('');
      setNewAdLink('');
      setAdImageFile(null);
      toast("Ad created successfully", "success");
    } catch (error) {
      console.error("Failed to create ad:", error);
      toast("Failed to create ad", "error");
    } finally {
      setIsCreatingAd(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (confirm("Are you sure you want to remove this ad?")) {
      try {
        await deleteDoc(doc(db, 'ads', adId));
        toast("Ad removed", "info");
      } catch (error) {
        toast("Failed to remove ad", "error");
      }
    }
  };

  return (
    <div className="hidden lg:flex flex-col w-[280px] xl:w-[360px] h-[calc(100vh-90px)] fixed right-0 top-[5.5rem] pt-4 pr-2 pb-4 hover:overflow-y-auto hide-scrollbar">
      
      {/* --- Sponsored Section --- */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="font-bold text-slate-500 text-[15px] tracking-wide uppercase">Sponsored</h3>
          
          {/* Admin Create Ad Button */}
          {userProfile?.role === 'admin' && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-synapse-600 hover:bg-synapse-50 rounded-full">
                  <Plus className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Create Sponsored Ad</SheetTitle>
                  <SheetDescription className="text-sm text-slate-500">
                    Fill out the form below to create a new sponsored advertisement visible to users.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-6">
                  <Input 
                    placeholder="Ad Title (e.g. Nike Air Max)" 
                    value={newAdTitle}
                    onChange={(e) => setNewAdTitle(e.target.value)}
                  />
                  <Input 
                    placeholder="Site Domain (e.g. nike.com)" 
                    value={newAdSite}
                    onChange={(e) => setNewAdSite(e.target.value)}
                  />
                  <Input 
                    placeholder="Target Link (https://...)" 
                    value={newAdLink}
                    onChange={(e) => setNewAdLink(e.target.value)}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ad Image</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setAdImageFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-synapse-50 file:text-synapse-700 hover:file:bg-synapse-100"
                    />
                  </div>
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button onClick={handleCreateAd} disabled={isCreatingAd}>
                      {isCreatingAd ? 'Creating...' : 'Launch Ad'}
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <ul className="space-y-4">
          {ads.map((ad) => (
            <li key={ad.id} className="group relative">
              <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block relative rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all group-hover:-translate-y-1">
                <div className="aspect-[1.91/1] overflow-hidden">
                    <img 
                      src={ad.image} 
                      alt={ad.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 right-3 text-white text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                       Visit <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
                <div className="p-3">
                    <div className="flex justify-between items-start">
                       <h4 className="font-bold text-slate-900 leading-tight pr-4">{ad.title}</h4>
                       <ExternalLink className="w-3 h-3 text-slate-400 mt-1 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{ad.site}</p>
                </div>
              </a>
              
              {/* Admin Delete Option */}
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={(e) => { e.preventDefault(); handleDeleteAd(ad.id); }}
                  className="absolute -top-2 -right-2 p-1.5 bg-white text-red-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
          
          {ads.length === 0 && (
            <div className="px-4 py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
               <p className="text-sm text-slate-400 font-medium">No active ads</p>
               {userProfile?.role === 'admin' && <p className="text-xs text-synapse-500 mt-1 cursor-pointer hover:underline">Click + to add one</p>}
            </div>
          )}
        </ul>
      </div>

      <Separator className="my-2 bg-slate-200/60" />

      {/* --- Birthdays Section --- */}
      {birthdayUsers.length > 0 && (
        <div className="my-4">
            <h3 className="font-bold text-slate-500 text-[15px] tracking-wide uppercase mb-3 px-2">Events</h3>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 p-4 text-white shadow-md shadow-blue-200 transform transition-transform hover:scale-[1.02] cursor-pointer group">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white/20 rounded-full blur-xl" />
                <div className="absolute bottom-0 left-0 -mb-2 -ml-2 w-16 h-16 bg-black/10 rounded-full blur-xl" />
                
                <div className="relative z-10 flex items-start gap-3">
                   <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Cake className="w-6 h-6 text-white" />
                   </div>
                   <div className="flex-1">
                      <p className="font-bold text-lg leading-tight">It's {birthdayUsers[0].displayName.split(' ')[0]}'s Birthday!</p>
                      <p className="text-blue-50 text-sm mt-1 font-medium group-hover:text-white transition-colors">
                        {birthdayUsers.length > 1 ? `And ${birthdayUsers.length - 1} others have birthdays today.` : 'Wish them a great day.'}
                      </p>
                   </div>
                </div>
            </div>
        </div>
      )}

      {/* --- Contacts Section --- */}
      <div className="flex-1 flex flex-col mt-2">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="font-bold text-slate-500 text-[15px] tracking-wide uppercase">Contacts</h3>
          <div className="flex gap-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-100">
               <Video className="w-4 h-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-100">
               <Search className="w-4 h-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-100">
               <MoreHorizontal className="w-4 h-4" />
             </Button>
          </div>
        </div>
        
        {/* Contact List */}
        <div className="space-y-1 pb-10 flex-1 overflow-y-auto pr-1">
          {loadingContacts ? (
             // Skeleton loading state
             [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                   <Skeleton className="h-10 w-10 rounded-full" />
                   <Skeleton className="h-4 w-24" />
                </div>
             ))
          ) : contacts.length > 0 ? (
            contacts.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-100 rounded-xl cursor-pointer transition-all group relative">
                <div className="relative">
                  <Avatar className="h-9 w-9 border border-slate-200/50 shadow-sm">
                     <AvatarImage src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} />
                     <AvatarFallback>{u.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {/* Online Indicator with Pulse */}
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  </span>
                </div>
                <span className="font-semibold text-slate-700 text-[14px] truncate group-hover:text-slate-900">{u.displayName}</span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 mt-2">
               <p className="text-sm text-slate-500">No contacts available</p>
               <p className="text-xs text-slate-400 mt-1">Add friends to chat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
