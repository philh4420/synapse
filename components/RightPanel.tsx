
import React, { useEffect, useState } from 'react';
import { Search, MoreHorizontal, Video, Gift, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { collection, query, limit, getDocs, addDoc, deleteDoc, doc, onSnapshot, where, documentId } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, SponsoredAd } from '../types';
import { useAuth } from '../context/AuthContext';
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
  SheetClose
} from './ui/Sheet';

export const RightPanel: React.FC = () => {
  const { user, userProfile } = useAuth();
  
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
        // Fetch only first 20 friends for contacts list
        const friendIds = userProfile.friends.slice(0, 20);
        const q = query(collection(db, 'users'), where(documentId(), 'in', friendIds));
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
    } catch (error) {
      console.error("Failed to create ad:", error);
    } finally {
      setIsCreatingAd(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (confirm("Are you sure you want to remove this ad?")) {
      await deleteDoc(doc(db, 'ads', adId));
    }
  };

  return (
    <div className="hidden lg:flex flex-col w-[280px] xl:w-[360px] h-[calc(100vh-56px)] fixed right-0 top-14 pt-4 pr-2 pb-4 hover:overflow-y-auto hide-scrollbar">
      
      {/* --- Sponsored Section --- */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="font-semibold text-slate-500 text-[17px]">Sponsored</h3>
          
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
            <li key={ad.id} className="relative flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg cursor-pointer transition-colors group">
              <a href={ad.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full">
                <img 
                  src={ad.image} 
                  alt={ad.title} 
                  className="w-32 h-32 object-cover rounded-lg border border-slate-100 bg-slate-100"
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="font-semibold text-slate-900 text-[15px] leading-tight truncate pr-2">{ad.title}</span>
                  <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    {ad.site} <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
              
              {/* Admin Delete Option */}
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={(e) => { e.preventDefault(); handleDeleteAd(ad.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
          
          {ads.length === 0 && (
            <div className="px-2 py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
               <p className="text-sm text-slate-400 font-medium">No active ads</p>
               {userProfile?.role === 'admin' && <p className="text-xs text-synapse-500 mt-1">Click + to add one</p>}
            </div>
          )}
        </ul>
      </div>

      <Separator className="my-2 bg-slate-300/50" />

      {/* --- Birthdays Section --- */}
      {birthdayUsers.length > 0 && (
        <>
          <div className="mb-4 p-2">
            <h3 className="font-semibold text-slate-500 text-[17px] mb-2">Birthdays</h3>
            <div className="flex items-start gap-3 hover:bg-black/5 p-2 rounded-lg cursor-pointer transition-colors -ml-2">
              <Gift className="w-8 h-8 text-blue-500 mt-1 flex-shrink-0" />
              <p className="text-[15px] text-slate-900 leading-tight pt-1">
                <span className="font-semibold">{birthdayUsers[0].displayName}</span>
                {birthdayUsers.length > 1 && (
                  <span> and <span className="font-semibold">{birthdayUsers.length - 1} others</span></span>
                )}
                {' '}have birthdays today.
              </p>
            </div>
          </div>
          <Separator className="my-2 bg-slate-300/50" />
        </>
      )}

      {/* --- Contacts Section --- */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="font-semibold text-slate-500 text-[17px]">Contacts</h3>
          <div className="flex gap-1 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-200">
               <Video className="w-4 h-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-200">
               <Search className="w-4 h-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-200">
               <MoreHorizontal className="w-4 h-4" />
             </Button>
          </div>
        </div>
        
        {/* Contact List */}
        <div className="space-y-0.5 pb-10">
          {loadingContacts ? (
             // Skeleton loading state
             [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                   <Skeleton className="h-9 w-9 rounded-full" />
                   <Skeleton className="h-4 w-24" />
                </div>
             ))
          ) : contacts.length > 0 ? (
            contacts.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg cursor-pointer transition-colors group relative">
                <div className="relative">
                  <Avatar className="h-9 w-9 border border-slate-200/50">
                     <AvatarImage src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} />
                     <AvatarFallback>{u.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {/* Online Indicator (Mocked as mostly always green for demo feeling) */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <span className="font-medium text-slate-900 text-[15px] truncate">{u.displayName}</span>
              </div>
            ))
          ) : (
            <div className="px-2 text-sm text-slate-500 italic mt-2">
               {userProfile?.friends?.length === 0 ? "Add friends to see contacts" : "No contacts available"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
