
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
import { Loader2, Sparkles, Rss, Users } from 'lucide-react';
import { cn } from '../lib/utils';

const POSTS_PER_PAGE = 5;

export const Feed: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState<'all' | 'friends'>('all');

  const observer = useRef<IntersectionObserver | null>(null);
  
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
    setLastVisible(null);
    setHasMore(true);

    const fetchInitialPosts = async () => {
      try {
        let q;
        if (feedType === 'friends' && userProfile?.following && userProfile.following.length > 0) {
           // Firestore 'in' query limit workaround (max 10)
           // In prod, use array-contains or separate feed collection
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
     const now = new Date();
     const q = query(
        collection(db, 'posts'), 
        where('timestamp', '>', now), 
        orderBy('timestamp', 'desc')
     );

     const unsubscribe = onSnapshot(q, (snapshot) => {
        const newIncoming = processPosts(snapshot.docs);
        
        if (newIncoming.length > 0) {
           setPosts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const uniqueNew = newIncoming.filter(p => !existingIds.has(p.id));
              return [...uniqueNew, ...prev];
           });
        }
     });

     return () => unsubscribe();
  }, [user]);

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
          if (post.author.uid === user?.uid) return true;
          if (post.privacy === 'public' || !post.privacy) return true;
          if (post.privacy === 'friends') {
              // Simple check: is the author in my friends list?
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
    <div className="w-full max-w-[680px] mx-auto pb-24 lg:pb-6">
      
      {/* Stories Section */}
      <Stories />
      
      {/* Create Post Widget */}
      <div className="mb-5">
        <CreatePost />
      </div>

      {/* Feed Filter Tabs */}
      <div className="flex items-center justify-between mb-4 px-1">
         <div className="flex p-1 bg-slate-200/50 rounded-xl">
             <button
                onClick={() => setFeedType('all')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  feedType === 'all' 
                    ? "bg-white text-synapse-600 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                )}
             >
                <Rss className="w-4 h-4" />
                For You
             </button>
             <button
                onClick={() => setFeedType('friends')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  feedType === 'friends' 
                    ? "bg-white text-synapse-600 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                )}
             >
                <Users className="w-4 h-4" />
                Friends
             </button>
         </div>
      </div>
      
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
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-slate-200 text-center px-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Welcome to your feed!</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                 {feedType === 'friends' 
                   ? "It looks like your friends haven't posted anything yet. Add more friends to see their updates here." 
                   : "Be the first to share what's on your mind, or connect with friends to see their posts."}
              </p>
            </div>
          )}
          
          {loadingMore && (
             <div className="flex justify-center py-6">
                <Loader2 className="w-8 h-8 animate-spin text-synapse-400" />
             </div>
          )}

          {!hasMore && posts.length > 0 && (
             <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                   <div className="w-2 h-2 bg-slate-400 rounded-full mx-0.5"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full mx-0.5"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full mx-0.5"></div>
                </div>
                <p className="text-slate-500 font-medium text-sm">You're all caught up!</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
