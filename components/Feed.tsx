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
import { Card } from './ui/Card';
import { useAuth } from '../context/AuthContext';
import { Loader2, Filter } from 'lucide-react';
import { Button } from './ui/Button';

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
  
  // Infinite Scroll Observer Ref
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

  // Initial Fetch & Real-time Listener for NEW posts
  useEffect(() => {
    setLoading(true);
    setPosts([]); // Reset on feed type change
    setLastVisible(null);
    setHasMore(true);

    const fetchInitialPosts = async () => {
      try {
        let q;
        if (feedType === 'friends' && userProfile?.following && userProfile.following.length > 0) {
           // Note: Firestore 'in' query is limited to 10 items. 
           // For a real app, this needs a different architecture (e.g. fan-out).
           // Here we limit to first 10 friends for the demo.
           const friendIds = userProfile.following.slice(0, 10);
           q = query(
              collection(db, 'posts'),
              where('author.uid', 'in', [...friendIds, user?.uid]), 
              orderBy('timestamp', 'desc'),
              limit(POSTS_PER_PAGE)
           );
        } else {
           // Global Feed (All Public + User's Own)
           // We fetch generally and filter client side for privacy in this demo context
           q = query(
              collection(db, 'posts'),
              orderBy('timestamp', 'desc'),
              limit(POSTS_PER_PAGE)
           );
        }

        const snapshot = await getDocs(q);
        
        // Filter Logic (Client-Side for privacy compliance in this demo)
        const fetchedPosts = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
               id: doc.id,
               ...data,
               timestamp: data.timestamp?.toDate() || new Date(),
            } as PostType;
        }).filter(post => {
            if (post.author.uid === user?.uid) return true; // My posts
            if (post.privacy === 'public' || !post.privacy) return true; // Public posts
            if (post.privacy === 'friends') {
                // Check if I follow them (assuming follow = friend)
                return userProfile?.following?.includes(post.author.uid);
            }
            return false; // Only Me posts from others
        });

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
  }, [feedType, user, userProfile?.following]);

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
      
      const newPosts = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
             id: doc.id,
             ...data,
             timestamp: data.timestamp?.toDate() || new Date(),
          } as PostType;
      }).filter(post => {
          if (post.author.uid === user?.uid) return true;
          if (post.privacy === 'public' || !post.privacy) return true;
          if (post.privacy === 'friends') {
              return userProfile?.following?.includes(post.author.uid);
          }
          return false;
      });

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

  // Real-time listener for NEW posts (Prepended)
  useEffect(() => {
     if (!user) return;
     // Listen for posts created AFTER the component mounted
     const now = new Date();
     const q = query(
        collection(db, 'posts'), 
        where('timestamp', '>', now), 
        orderBy('timestamp', 'desc')
     );

     const unsubscribe = onSnapshot(q, (snapshot) => {
        const newIncoming = snapshot.docs.map(doc => {
           const data = doc.data() as any;
           return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(),
           } as PostType;
        }).filter(post => {
           // Same privacy filter
           if (post.author.uid === user?.uid) return true;
           if (post.privacy === 'public' || !post.privacy) return true;
           if (post.privacy === 'friends') return userProfile?.following?.includes(post.author.uid);
           return false;
        });
        
        if (newIncoming.length > 0) {
           setPosts(prev => {
              // Avoid duplicates if any
              const existingIds = new Set(prev.map(p => p.id));
              const uniqueNew = newIncoming.filter(p => !existingIds.has(p.id));
              return [...uniqueNew, ...prev];
           });
        }
     });

     return () => unsubscribe();
  }, [user, userProfile]);

  return (
    <div className="w-full max-w-[680px] mx-auto space-y-4 px-0 md:px-0 lg:px-4 pb-24 lg:pb-6">
      
      {/* Stories Section */}
      <Stories />
      
      {/* Create Post Widget */}
      <div className="mb-4">
        <CreatePost />
      </div>

      {/* Feed Filter Tabs */}
      <div className="flex items-center gap-2 mb-2 px-1">
         <Button 
            variant={feedType === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFeedType('all')}
            className={feedType === 'all' ? 'bg-synapse-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}
            size="sm"
         >
            All Posts
         </Button>
         <Button 
            variant={feedType === 'friends' ? 'primary' : 'secondary'}
            onClick={() => setFeedType('friends')}
            className={feedType === 'friends' ? 'bg-synapse-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}
            size="sm"
         >
            Friends
         </Button>
      </div>
      
      {/* Posts Feed */}
      {loading ? (
        // Skeleton Loaders
        <div className="space-y-4">
          {[1, 2].map((i) => (
             <Card key={i} className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
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
                   <Skeleton className="w-[80%] h-4 rounded-md" />
                </div>
                <Skeleton className="w-full h-64 rounded-xl" />
             </Card>
          ))}
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
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📭</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">No posts yet</h3>
              <p className="text-slate-500">
                 {feedType === 'friends' ? "Add friends to see their posts here!" : "Be the first to create a post!"}
              </p>
            </div>
          )}
          
          {loadingMore && (
             <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-synapse-600" />
             </div>
          )}

          {!hasMore && posts.length > 0 && (
             <div className="text-center py-8 text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
                <div className="h-[1px] w-12 bg-slate-300"></div>
                You've reached the end
                <div className="h-[1px] w-12 bg-slate-300"></div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};