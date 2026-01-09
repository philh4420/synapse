
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Post as PostType } from '../types';
import { Post } from './Post';
import { Bookmark, Sparkles, FolderOpen, ArrowRight, Layout, Filter } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export const SavedPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [savedPosts, setSavedPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have no user or no saved posts array, stop loading
    if (!user || !userProfile) {
      setLoading(false);
      return;
    }

    const fetchSaved = async () => {
      setLoading(true);
      try {
        const savedIds = userProfile.savedPosts || [];
        
        if (savedIds.length === 0) {
            setSavedPosts([]);
            setLoading(false);
            return;
        }

        // Reverse to show most recently saved first
        // Note: In a production app with pagination, we'd fetch these differently.
        const reversedIds = [...savedIds].reverse();
        
        const promises = reversedIds.map(id => getDoc(doc(db, 'posts', id)));
        const snapshots = await Promise.all(promises);
        
        const posts = snapshots
          .filter(snap => snap.exists())
          .map(snap => ({
            id: snap.id,
            ...snap.data(),
            timestamp: snap.data()?.timestamp?.toDate() || new Date(),
          })) as PostType[];

        setSavedPosts(posts);
      } catch (error) {
        console.error("Error fetching saved posts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [user, userProfile?.savedPosts]); // Re-run if the savedPosts array in context changes

  if (loading) {
    return (
      <div className="max-w-[680px] mx-auto space-y-6 pt-4 animate-in fade-in">
         <Skeleton className="h-48 w-full rounded-[2.5rem]" />
         <div className="space-y-4">
            {[1, 2].map(i => (
                <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                    <div className="flex gap-3 mb-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex flex-col gap-2 justify-center">
                        <Skeleton className="w-32 h-4 rounded-md" />
                        <Skeleton className="w-20 h-3 rounded-md" />
                        </div>
                    </div>
                    <Skeleton className="w-full h-32 rounded-xl" />
                </div>
            ))}
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto pb-12 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* --- Hero Header --- */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 mb-8 text-white shadow-2xl group border border-slate-800">
         {/* Animated Background Mesh */}
         <div className="absolute inset-0 z-0">
             <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[150%] bg-gradient-to-bl from-purple-600 via-indigo-600 to-blue-900 opacity-50 blur-[100px] animate-pulse" />
             <div className="absolute bottom-[-50%] left-[-20%] w-[80%] h-[150%] bg-gradient-to-tr from-fuchsia-600 via-rose-500 to-orange-500 opacity-30 blur-[100px]" />
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
         </div>

         <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-widest text-purple-200 shadow-sm">
                   <Sparkles className="w-3 h-3" /> Private Collection
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                   Your Vault
                </h1>
                <p className="text-slate-300/90 text-sm md:text-base font-medium leading-relaxed max-w-sm">
                   A curated collection of moments you want to remember. Only you can see what you've saved.
                </p>
            </div>
            
            <div className="relative shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-3xl border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)] transform rotate-3 group-hover:rotate-6 transition-transform duration-500">
                    <Bookmark className="w-10 h-10 text-purple-200 drop-shadow-lg fill-current" />
                </div>
            </div>
         </div>
      </div>

      {/* --- Controls / Count --- */}
      <div className="flex items-center justify-between mb-6 px-2">
         <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            All Items <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{savedPosts.length}</span>
         </h2>
         <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800 hover:bg-white">
                <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800 hover:bg-white">
                <Layout className="w-4 h-4 mr-2" /> Manage
            </Button>
         </div>
      </div>

      {/* --- Feed --- */}
      {savedPosts.length > 0 ? (
        <div className="space-y-6">
           {savedPosts.map((post) => (
              <div key={post.id} className="relative group/item transition-all duration-300">
                 {/* Decorative Line connecting items */}
                 <div className="absolute left-8 top-full h-6 w-0.5 bg-slate-200 -ml-px z-0 last:hidden" />
                 
                 <Post post={post} />
              </div>
           ))}
           
           <div className="pt-8 pb-4 text-center">
              <div className="inline-flex items-center justify-center p-2 rounded-full bg-slate-100 text-slate-400">
                 <div className="h-1.5 w-1.5 rounded-full bg-current mx-1" />
                 <div className="h-1.5 w-1.5 rounded-full bg-current mx-1" />
                 <div className="h-1.5 w-1.5 rounded-full bg-current mx-1" />
              </div>
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6 bg-white/60 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300">
           <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center relative shadow-inner">
              <FolderOpen className="w-9 h-9 text-slate-400" />
           </div>
           <div className="max-w-xs space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Your vault is empty</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                 When you see something you like, tap the <span className="font-bold text-slate-700">Save</span> button to add it here for safekeeping.
              </p>
           </div>
           <Button variant="outline" className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Browse Feed <ArrowRight className="w-4 h-4 ml-2" />
           </Button>
        </div>
      )}
    </div>
  );
};
