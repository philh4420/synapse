
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, MapPin, Clock, Users, Plus, Search, 
  Ticket, Music, Code, Briefcase, Coffee, Gamepad2, 
  ChevronRight, Share2, Loader2, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Event } from '../types';
import { uploadToCloudinary } from '../utils/upload';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';
import { cn } from '../lib/utils';

export const Events: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  // Create Event State
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'Social'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Determine the query - could add future date filtering here
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      // Client side filtering for 'upcoming' (optional but good for UX)
      const now = new Date().toISOString().split('T')[0];
      const upcoming = fetchedEvents.filter(e => e.date >= now);
      
      setEvents(upcoming);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const handleCreateEvent = async () => {
    if (!user || !newEvent.title || !newEvent.date || !newEvent.location) {
      toast("Please fill in all required fields", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let coverURL = `https://source.unsplash.com/1600x900/?${newEvent.category.toLowerCase()},event`;
      if (coverFile) {
        coverURL = await uploadToCloudinary(coverFile);
      } else {
        // Fallback static images if unsplash source is unreliable
        const fallbacks: Record<string, string> = {
           'Music': 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200',
           'Tech': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200',
           'Social': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200',
           'Art': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200',
           'Gaming': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200'
        };
        coverURL = fallbacks[newEvent.category] || fallbacks['Social'];
      }

      const docRef = await addDoc(collection(db, 'events'), {
        ...newEvent,
        coverURL,
        host: {
          uid: user.uid,
          name: userProfile?.displayName || user.displayName,
          avatar: userProfile?.photoURL || user.photoURL
        },
        attendees: [user.uid], // Host attends by default
        interested: [],
        timestamp: serverTimestamp()
      });

      // Notify friends about the new event
      if (userProfile?.friends && userProfile.friends.length > 0) {
         const batch = writeBatch(db);
         const friendsToNotify = userProfile.friends.slice(0, 20); // Limit batch ops
         
         friendsToNotify.forEach(friendId => {
            if (typeof friendId === 'string') {
               const notifRef = doc(collection(db, 'notifications'));
               batch.set(notifRef, {
                  recipientUid: friendId,
                  sender: {
                     uid: user.uid,
                     displayName: userProfile.displayName || 'Friend',
                     photoURL: userProfile.photoURL || ''
                  },
                  type: 'event_invite',
                  eventId: docRef.id,
                  previewText: newEvent.title,
                  read: false,
                  timestamp: serverTimestamp()
               });
            }
         });
         
         await batch.commit();
      }

      toast("Event created successfully!", "success");
      setIsCreating(false);
      setNewEvent({ title: '', description: '', date: '', time: '', location: '', category: 'Social' });
      setCoverFile(null);
      setCoverPreview('');
    } catch (error) {
      console.error(error);
      toast("Failed to create event", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const categories = [
    { name: 'All', icon: Ticket },
    { name: 'Music', icon: Music },
    { name: 'Tech', icon: Code },
    { name: 'Business', icon: Briefcase },
    { name: 'Social', icon: Coffee },
    { name: 'Gaming', icon: Gamepad2 }
  ];

  const filteredEvents = events.filter(e => {
    const matchesCategory = filter === 'All' || e.category === filter;
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-in fade-in duration-500 pb-24">
      
      {/* --- HERO HEADER (2026 Style) --- */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0F172A] mb-8 text-white shadow-2xl group border border-slate-800">
         <div className="absolute inset-0 z-0">
             {/* Abstract Glowing Orbs */}
             <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[150%] bg-gradient-to-bl from-rose-600 via-fuchsia-600 to-indigo-900 opacity-50 blur-[120px] animate-pulse" />
             <div className="absolute bottom-[-50%] left-[-20%] w-[80%] h-[150%] bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-900 opacity-40 blur-[120px]" />
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-125 mix-blend-overlay"></div>
         </div>

         <div className="relative z-10 p-8 md:p-14 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="max-w-2xl space-y-4">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-widest text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                  <Ticket className="w-3 h-3 text-rose-400" /> Synapse Events
               </div>
               <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] drop-shadow-xl">
                  Curated <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white/60">Experiences.</span>
               </h1>
               <p className="text-lg text-indigo-100/80 font-medium leading-relaxed max-w-lg">
                  Discover workshops, concerts, and meetups tailored to your interests. Connect in the real world.
               </p>
            </div>
            
            <div className="flex flex-col gap-4 w-full md:w-auto">
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="h-14 px-8 bg-white text-slate-900 hover:bg-rose-50 rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105"
                >
                  <Plus className="w-6 h-6 mr-2" /> Host Event
                </Button>
            </div>
         </div>
      </div>

      {/* --- FILTER & SEARCH BAR --- */}
      <div className="sticky top-20 z-30 mb-8">
         <div className="bg-white/80 backdrop-blur-2xl p-2 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto hide-scrollbar p-1">
               {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setFilter(cat.name)}
                    className={cn(
                       "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                       filter === cat.name 
                         ? "bg-slate-900 text-white shadow-md transform scale-105" 
                         : "bg-slate-100/50 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <cat.icon className="w-4 h-4" />
                    {cat.name}
                  </button>
               ))}
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-72 mr-1">
               <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
               <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events..." 
                  className="w-full bg-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-synapse-500/20 transition-all font-medium"
               />
            </div>
         </div>
      </div>

      {/* --- EVENTS GRID --- */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {[1,2,3].map(i => (
              <div key={i} className="h-[400px] bg-slate-200 rounded-[2rem] animate-pulse" />
           ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
           ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-slate-300" />
           </div>
           <h3 className="text-2xl font-bold text-slate-900">No events found</h3>
           <p className="text-slate-500 mt-2">Try adjusting your filters or create a new event.</p>
           <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-6 rounded-xl">Host an Event</Button>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
         <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-white/95 backdrop-blur-2xl rounded-[2rem] border border-white/60 shadow-2xl">
            <DialogHeader className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
               <DialogTitle className="text-2xl font-black text-slate-900">Host an Event</DialogTitle>
               <DialogDescription>
                  Bring people together. Create an experience.
               </DialogDescription>
            </DialogHeader>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
               {/* Cover Upload */}
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-48 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-synapse-400 transition-colors"
               >
                  {coverPreview ? (
                     <img src={coverPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                     <>
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                           <ImageIcon className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">Upload Cover Image</p>
                        <p className="text-xs text-slate-400 mt-1">Recommended: 1600x900</p>
                     </>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
               </div>

               <Input 
                  label="Event Title" 
                  placeholder="e.g. Synapse Launch Party" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="text-lg font-bold"
               />

               <div className="grid grid-cols-2 gap-6">
                  <Input 
                     label="Date" 
                     type="date"
                     value={newEvent.date}
                     onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  />
                  <Input 
                     label="Time" 
                     type="time"
                     value={newEvent.time}
                     onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  />
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <Input 
                     label="Location" 
                     placeholder="e.g. San Francisco or Online"
                     value={newEvent.location}
                     onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                     icon={MapPin}
                  />
                  <div className="space-y-1.5">
                     <label className="text-sm font-bold text-slate-700 ml-1">Category</label>
                     <select 
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={newEvent.category}
                        onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                     >
                        {categories.filter(c => c.name !== 'All').map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                     </select>
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Description</label>
                  <textarea 
                     className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px] resize-none"
                     placeholder="What can attendees expect?"
                     value={newEvent.description}
                     onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  />
               </div>

            </div>
            
            <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/80">
               <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl font-bold text-slate-500">Cancel</Button>
               <Button onClick={handleCreateEvent} disabled={isSubmitting} className="bg-synapse-600 hover:bg-synapse-700 text-white rounded-xl font-bold px-8 shadow-lg shadow-synapse-500/20">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Event"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

    </div>
  );
};

// --- EVENT CARD COMPONENT ---
const EventCard: React.FC<{ event: Event }> = ({ event }) => {
   const { user } = useAuth();
   const { toast } = useToast();
   
   const isGoing = user && event.attendees.includes(user.uid);
   const isInterested = user && event.interested.includes(user.uid);

   const handleRSVP = async (type: 'going' | 'interested') => {
      if (!user) return;
      const eventRef = doc(db, 'events', event.id);
      
      try {
         if (type === 'going') {
            if (isGoing) {
               await updateDoc(eventRef, { attendees: arrayRemove(user.uid) });
            } else {
               await updateDoc(eventRef, { attendees: arrayUnion(user.uid), interested: arrayRemove(user.uid) });
               toast("You're going!", "success");
            }
         } else {
            if (isInterested) {
               await updateDoc(eventRef, { interested: arrayRemove(user.uid) });
            } else {
               await updateDoc(eventRef, { interested: arrayUnion(user.uid), attendees: arrayRemove(user.uid) });
               toast("Marked as interested", "info");
            }
         }
      } catch (e) {
         console.error(e);
         toast("Failed to update RSVP", "error");
      }
   };

   const dateObj = new Date(event.date);
   const month = format(dateObj, 'MMM');
   const day = format(dateObj, 'd');

   return (
      <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 rounded-[2rem] bg-white relative flex flex-col h-full">
         
         {/* Cover */}
         <div className="h-48 w-full overflow-hidden relative bg-slate-900">
            <img 
               src={event.coverURL} 
               alt={event.title}
               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
            
            {/* Category Tag */}
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs font-bold text-white uppercase tracking-wider">
               {event.category}
            </div>

            {/* Date Badge */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xl rounded-2xl p-2 text-center min-w-[60px] shadow-lg">
               <span className="block text-xs font-bold text-rose-500 uppercase tracking-widest">{month}</span>
               <span className="block text-2xl font-black text-slate-900 leading-none">{day}</span>
            </div>
         </div>

         {/* Content */}
         <div className="p-6 flex flex-col flex-1">
            <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 group-hover:text-synapse-600 transition-colors line-clamp-2">
               {event.title}
            </h3>
            
            <div className="space-y-2 mb-6">
               <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Clock className="w-4 h-4 text-synapse-500" />
                  {event.time} • {format(dateObj, 'EEEE')}
               </div>
               <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  {event.location}
               </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                   <div className="flex -space-x-2">
                      <Avatar className="w-8 h-8 border-2 border-white">
                         <AvatarImage src={event.host.avatar} />
                         <AvatarFallback>{event.host.name[0]}</AvatarFallback>
                      </Avatar>
                      {event.attendees.length > 1 && (
                         <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                            +{event.attendees.length - 1}
                         </div>
                      )}
                   </div>
                   <span className="text-xs text-slate-400 font-medium">
                      {event.attendees.length} going
                   </span>
               </div>
               
               <div className="flex gap-2">
                  <Button 
                     size="sm"
                     variant={isGoing ? "default" : "secondary"}
                     onClick={() => handleRSVP('going')}
                     className={cn(
                        "rounded-xl font-bold shadow-sm transition-all",
                        isGoing ? "bg-synapse-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                     )}
                  >
                     {isGoing ? "Going" : "Join"}
                  </Button>
                  <Button 
                     size="icon"
                     variant="ghost"
                     onClick={() => {
                        const url = `${window.location.origin}/event/${event.id}`;
                        navigator.clipboard.writeText(url);
                        toast("Link copied!", "success");
                     }}
                     className="rounded-xl text-slate-400 hover:text-slate-600"
                  >
                     <Share2 className="w-4 h-4" />
                  </Button>
               </div>
            </div>
         </div>
      </Card>
   );
};
