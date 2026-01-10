
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CreatePost } from './CreatePost';
import { Stories } from './Stories';
import { Post } from './Post';
import { Post as PostType } from '../types';
import { 
  collection, query, orderBy, limit, getDocs, startAfter, 
  where, onSnapshot, DocumentData, QueryDocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Skeleton } from './ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { Loader2, Sparkles, Rss, Users, ArrowUp, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

const POSTS_PER_PAGE = 10;

export const Feed: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [incomingPosts, setIncomingPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState<'all' | 'friends'>('all');

  const observer = useRef<IntersectionObserver | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Infinite Scroll Observer
  const lastPostElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Initial Fetch & Reset
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setIncomingPosts([]);
    setLastVisible(null);
    setHasMore(true);

    const fetchInitialPosts = async () => {
      try {
        let q;
        if (feedType === 'friends' && userProfile?.following && userProfile.following.length > 0) {
           const friendIds = userProfile.following.slice(0, 10);
           q = query(
              collection(db, 'posts'),
              where('author.uid', 'in', [...friendIds, user?.uid]), 
              orderBy('timestamp', 'desc'),
              limit(POSTS_PER_PAGE)
           );
        } else {
           q = query(
              collection(db, 'posts'),
              orderBy('timestamp', 'desc'),
              limit(POSTS_PER_PAGE)
           );
        }

        const snapshot = await getDocs(q);
        const fetchedPosts = processPosts(snapshot.docs);

        setPosts(fetchedPosts);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPosts();
  }, [feedType, user]);

  // Load More
  const loadMorePosts = async () => {
    if (!lastVisible || !hasMore) return;
    setLoadingMore(true);

    try {
        let q;
        if (feedType === 'friends' && userProfile?.following && userProfile.following.length > 0) {
           const friendIds = userProfile.following.slice(0, 10);
           q = query(
              collection(db, 'posts'),
              where('author.uid', 'in', [...friendIds, user?.uid]),
              orderBy('timestamp', 'desc'),
              startAfter(lastVisible),
              limit(POSTS_PER_PAGE)
           );
        } else {
           q = query(
              collection(db, 'posts'),
              orderBy('timestamp', 'desc'),
              startAfter(lastVisible),
              limit(POSTS_PER_PAGE)
           );
        }

      const snapshot = await getDocs(q);
      const newPosts = processPosts(snapshot.docs);

      if (snapshot.docs.length < POSTS_PER_PAGE) {
         setHasMore(false);
      }

      setPosts(prev => [...prev, ...newPosts]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Real-time listener for NEW posts
  useEffect(() => {
     if (!user) return;
     const now = new Date(); // Only listen for posts created AFTER component mount
     const q = query(
        collection(db, 'posts'), 
        where('timestamp', '>', now), 
        orderBy('timestamp', 'desc')
     );

     const unsubscribe = onSnapshot(q, (snapshot) => {
        if ((snapshot as any).empty) return;
        
        const newIncoming = processPosts((snapshot as any).docs);
        if (newIncoming.length > 0) {
           setIncomingPosts(prev => {
              // Ensure uniqueness against both current posts and existing incoming queue
              const currentIds = new Set(posts.map(p => p.id));
              const prevIncomingIds = new Set(prev.map(p => p.id));
              
              const uniqueNew = newIncoming.filter(p => 
                  !currentIds.has(p.id) && !prevIncomingIds.has(p.id)
              );
              
              return [...uniqueNew, ...prev];
           });
        }
     });

     return () => unsubscribe();
  }, [user, posts]); // dependency on posts ensures strict uniqueness check

  const showNewPosts = () => {
      setPosts(prev => [...incomingPosts, ...prev]);
      setIncomingPosts([]);
      if (topRef.current) {
          topRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

  // Helper to process and filter posts privacy
  const processPosts = (docs: DocumentData[]) => {
      return docs.map(doc => {
          const data = doc.data();
          return {
             id: doc.id,
             ...data,
             timestamp: data.timestamp?.toDate() || new Date(),
          } as PostType;
      }).filter(post => {
          // EXCLUDE COMMUNITY POSTS from main feed
          if (post.communityId) return false;

          if (post.author.uid === user?.uid) return true;
          if (post.privacy === 'public' || !post.privacy) return true;
          if (post.privacy === 'friends') {
              return userProfile?.friends?.includes(post.author.uid);
          }
          if (post.privacy === 'only_me') return false;
          return true;
      });
  };

  // Skeleton Component
  const FeedSkeleton = () => (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 mb-4">
      <div className="flex gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex flex-col gap-2 justify-center">
          <Skeleton className="w-32 h-4 rounded-md" />
          <Skeleton className="w-20 h-3 rounded-md" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="w-full h-4 rounded-md" />
        <Skeleton className="w-[90%] h-4 rounded-md" />
      </div>
      <Skeleton className="w-full h-64 rounded-xl" />
      <div className="flex justify-between mt-4 pt-4 border-t border-slate-100">
         <Skeleton className="w-20 h-8 rounded-md" />
         <Skeleton className="w-20 h-8 rounded-md" />
         <Skeleton className="w-20 h-8 rounded-md" />
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[680px] mx-auto pb-24 lg:pb-6 relative">
      <div ref={topRef} />
      
      {/* Stories Section */}
      <Stories />
      
      {/* Create Post Widget */}
      <div className="mb-5">
        <CreatePost />
      </div>

      {/* Feed Filter Tabs */}
      <div className="flex items-center justify-between mb-4 px-1 sticky top-[4.5rem] z-20 transition-all">
         <div className="flex p-1 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60">
             <button
                onClick={() => setFeedType('all')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                  feedType === 'all' 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
             >
                <Rss className="w-4 h-4" />
                For You
             </button>
             <button
                onClick={() => setFeedType('friends')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                  feedType === 'friends' 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
             >
                <Users className="w-4 h-4" />
                Friends
             </button>
         </div>
      </div>

      {/* New Posts Pill */}
      {incomingPosts.length > 0 && (
         <div className="sticky top-28 z-30 flex justify-center mb-4 pointer-events-none">
             <button 
                onClick={showNewPosts}
                className="pointer-events-auto bg-synapse-600 hover:bg-synapse-700 text-white px-5 py-2 rounded-full shadow-lg shadow-synapse-500/30 font-bold text-sm flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 transition-all transform hover:scale-105"
             >
                <ArrowUp className="w-4 h-4" />
                Show {incomingPosts.length} new {incomingPosts.length === 1 ? 'post' : 'posts'}
             </button>
         </div>
      )}
      
      {/* Posts Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <FeedSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => {
            if (index === posts.length - 1) {
               return <div ref={lastPostElementRef} key={post.id}><Post post={post} /></div>;
            }
            return <Post key={post.id} post={post} />;
          })}
          
          {posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200 text-center px-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-gradient-to-br from-synapse-100 to-synapse-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Sparkles className="w-10 h-10 text-synapse-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Welcome to Synapse</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                 {feedType === 'friends' 
                   ? "Your friends haven't posted yet. Connect with more people to populate your feed." 
                   : "This is the start of something new. Be the first to share a moment!"}
              </p>
            </div>
          )}
          
          {loadingMore && (
             <div className="flex justify-center py-6">
                <Loader2 className="w-8 h-8 animate-spin text-synapse-400" />
             </div>
          )}

          {!hasMore && posts.length > 0 && (
             <div className="text-center py-12 flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                   <Zap className="w-6 h-6 fill-current" />
                </div>
                <h4 className="font-bold text-slate-700">You're all caught up!</h4>
                <p className="text-slate-500 text-sm mt-1">Check back later for more updates.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
