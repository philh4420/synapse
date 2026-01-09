
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, TrendingUp, Zap, Globe, MoreHorizontal, 
  CheckCircle2, Users, Loader2, Image as ImageIcon, Camera, ArrowRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Page } from '../types';
import { uploadToCloudinary } from '../utils/upload';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';
import { cn } from '../lib/utils';

export const Pages: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [myPages, setMyPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Create Page State
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPageData, setNewPageData] = useState({ name: '', category: '', bio: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState({ cover: '', avatar: '' });

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Fetch Pages
  useEffect(() => {
    const q = query(collection(db, 'pages'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Page[];
      
      setAllPages(pages);
      if (user) {
        setMyPages(pages.filter(p => p.ownerId === user.uid));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      if (type === 'cover') {
        setCoverFile(file);
        setPreviews(prev => ({ ...prev, cover: url }));
      } else {
        setAvatarFile(file);
        setPreviews(prev => ({ ...prev, avatar: url }));
      }
    }
  };

  // Submit New Page
  const handleCreatePage = async () => {
    if (!user || !newPageData.name || !newPageData.category) {
      toast("Name and Category are required", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let coverURL = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200"; // Default abstract
      let photoURL = `https://ui-avatars.com/api/?name=${newPageData.name}&background=random`;

      if (coverFile) coverURL = await uploadToCloudinary(coverFile);
      if (avatarFile) photoURL = await uploadToCloudinary(avatarFile);

      await addDoc(collection(db, 'pages'), {
        name: newPageData.name,
        handle: `@${newPageData.name.toLowerCase().replace(/\s+/g, '')}`,
        category: newPageData.category,
        description: newPageData.bio,
        coverURL,
        photoURL,
        ownerId: user.uid,
        followers: 0,
        verified: false,
        timestamp: serverTimestamp()
      });

      toast("Page created successfully!", "success");
      setIsCreating(false);
      setNewPageData({ name: '', category: '', bio: '' });
      setCoverFile(null);
      setAvatarFile(null);
      setPreviews({ cover: '', avatar: '' });

    } catch (error) {
      console.error(error);
      toast("Failed to create page", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPages = allPages.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Brand', 'Public Figure', 'Gaming', 'Technology', 'Art', 'Business'];

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* --- HERO HEADER --- */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 mb-8 text-white shadow-2xl group border border-slate-800">
         <div className="absolute inset-0 z-0">
             <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-gradient-to-br from-synapse-600 via-purple-600 to-indigo-900 opacity-60 blur-[100px] animate-pulse" />
             <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[150%] bg-gradient-to-tl from-cyan-500 via-teal-500 to-emerald-500 opacity-30 blur-[100px]" />
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
         </div>

         <div className="relative z-10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
               <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-widest text-indigo-100 shadow-sm">
                     <Globe className="w-3 h-3 text-cyan-300" /> Synapse Pages
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4">
                     Discover Your <br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white/70">Next Obsession</span>
                  </h1>
                  <p className="text-lg text-indigo-100/80 font-medium leading-relaxed">
                     Connect with businesses, brands, and organizations that shape the future. Create your own space in the Synapse network.
                  </p>
               </div>
               
               <Button 
                 onClick={() => setIsCreating(true)}
                 className="h-14 px-8 bg-white text-slate-900 hover:bg-indigo-50 rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105"
               >
                 <Plus className="w-6 h-6 mr-2" /> Create Page
               </Button>
            </div>
         </div>
      </div>

      {/* --- YOUR PAGES (Horizontal Scroll) --- */}
      {myPages.length > 0 && (
         <div className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2 px-2">
               <Zap className="w-5 h-5 text-synapse-600 fill-current" /> Managed by you
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar px-1">
               {myPages.map(page => (
                  <div key={page.id} className="min-w-[280px] h-[160px] rounded-3xl overflow-hidden relative group cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100">
                     <img src={page.coverURL} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                     <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-white">
                           <AvatarImage src={page.photoURL} />
                           <AvatarFallback>{page.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-white">
                           <p className="font-bold text-lg leading-tight truncate max-w-[150px]">{page.name}</p>
                           <p className="text-xs opacity-80">{page.followers > 1000 ? (page.followers/1000).toFixed(1) + 'k' : page.followers} followers</p>
                        </div>
                     </div>
                     <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-5 h-5 text-white" />
                     </div>
                  </div>
               ))}
               <div 
                  onClick={() => setIsCreating(true)}
                  className="min-w-[100px] h-[160px] rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-synapse-400 hover:text-synapse-600 hover:bg-synapse-50 transition-all"
               >
                  <Plus className="w-8 h-8 mb-2" />
                  <span className="text-xs font-bold uppercase">New</span>
               </div>
            </div>
         </div>
      )}

      {/* --- DISCOVERY SECTION --- */}
      <div className="space-y-6">
         
         {/* Filters & Search */}
         <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto hide-scrollbar p-1">
               {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                       "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                       categoryFilter === cat 
                         ? "bg-slate-900 text-white shadow-md" 
                         : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    )}
                  >
                    {cat}
                  </button>
               ))}
            </div>
            
            <div className="relative w-full md:w-64 mr-2">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
               <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find pages..." 
                  className="w-full bg-slate-100 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-synapse-500/20 transition-all"
               />
            </div>
         </div>

         {/* Pages Grid */}
         {loading ? (
            <div className="flex justify-center py-20">
               <Loader2 className="w-10 h-10 text-synapse-500 animate-spin" />
            </div>
         ) : filteredPages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredPages.map(page => (
                  <PageCard key={page.id} page={page} />
               ))}
            </div>
         ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-900">No pages found</h3>
               <p className="text-slate-500">Try adjusting your filters or search term.</p>
            </div>
         )}
      </div>

      {/* --- CREATE DIALOG --- */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
         <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl">
            <DialogHeader className="p-6 border-b border-slate-100">
               <DialogTitle className="text-2xl font-bold text-slate-900">Create a Page</DialogTitle>
               <DialogDescription>
                  Build your presence on Synapse. Connect with a global audience.
               </DialogDescription>
            </DialogHeader>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
               
               {/* Visuals Upload */}
               <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Visual Identity</label>
                  
                  {/* Cover */}
                  <div 
                     onClick={() => coverInputRef.current?.click()}
                     className="relative h-40 w-full rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-synapse-300 transition-colors"
                  >
                     {previews.cover ? (
                        <img src={previews.cover} className="w-full h-full object-cover" alt="Preview" />
                     ) : (
                        <div className="flex flex-col items-center text-slate-400">
                           <ImageIcon className="w-8 h-8 mb-2" />
                           <span className="text-xs font-bold">Add Cover Photo</span>
                        </div>
                     )}
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                     <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                  </div>

                  {/* Profile Pic - Overlapping */}
                  <div className="relative -mt-12 ml-4">
                     <div 
                        onClick={() => avatarInputRef.current?.click()}
                        className="w-24 h-24 rounded-full bg-white p-1 shadow-lg cursor-pointer group relative"
                     >
                        <div className="w-full h-full rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden hover:border-synapse-300 transition-colors">
                           {previews.avatar ? (
                              <img src={previews.avatar} className="w-full h-full object-cover" alt="Avatar" />
                           ) : (
                              <Camera className="w-6 h-6 text-slate-400" />
                           )}
                        </div>
                        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                     </div>
                  </div>
               </div>

               {/* Details */}
               <div className="space-y-4">
                   <Input 
                     label="Page Name" 
                     placeholder="e.g. Synapse Gaming" 
                     value={newPageData.name}
                     onChange={(e) => setNewPageData({...newPageData, name: e.target.value})}
                   />
                   
                   <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Category</label>
                      <select 
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={newPageData.category}
                        onChange={(e) => setNewPageData({...newPageData, category: e.target.value})}
                      >
                         <option value="">Select Category</option>
                         {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>

                   <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Description</label>
                      <textarea 
                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px] resize-none"
                        placeholder="Tell people what this page is about..."
                        value={newPageData.bio}
                        onChange={(e) => setNewPageData({...newPageData, bio: e.target.value})}
                      />
                   </div>
               </div>

            </div>

            <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/50">
               <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl">Cancel</Button>
               <Button onClick={handleCreatePage} disabled={isSubmitting} className="bg-synapse-600 hover:bg-synapse-700 text-white rounded-xl shadow-lg shadow-synapse-500/20 px-6">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Launch Page"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Page Card Component ---
const PageCard: React.FC<{ page: Page }> = ({ page }) => {
  const [following, setFollowing] = useState(false);

  return (
    <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2rem] bg-white relative hover:-translate-y-1">
       {/* Cover Image */}
       <div className="h-40 w-full overflow-hidden relative bg-slate-100">
          <img 
            src={page.coverURL} 
            alt={page.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
       </div>

       {/* Content */}
       <div className="px-6 pb-6 pt-12 relative">
          {/* Floating Avatar */}
          <div className="absolute -top-10 left-6">
             <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg group-hover:rotate-3 transition-transform duration-300">
                <img src={page.photoURL} className="w-full h-full object-cover rounded-xl bg-slate-100" alt="" />
                {page.verified && (
                   <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white">
                      <CheckCircle2 className="w-3 h-3" />
                   </div>
                )}
             </div>
          </div>
          
          <div className="flex justify-between items-start mb-2">
             <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-synapse-600 transition-colors">{page.name}</h3>
                <p className="text-sm text-slate-400 font-medium">{page.category}</p>
             </div>
          </div>
          
          <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">
             {page.description || `Welcome to the official page of ${page.name}. Connect with us to stay updated.`}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
             <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <Users className="w-4 h-4" />
                {page.followers > 1000 ? (page.followers/1000).toFixed(1) + 'k' : page.followers}
             </div>
             
             <Button 
               size="sm"
               onClick={() => setFollowing(!following)}
               className={cn(
                 "rounded-xl font-bold transition-all duration-300",
                 following 
                   ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                   : "bg-synapse-600 text-white hover:bg-synapse-700 shadow-md shadow-synapse-500/30"
               )}
             >
                {following ? "Following" : "Follow"}
             </Button>
          </div>
       </div>
    </Card>
  );
};
