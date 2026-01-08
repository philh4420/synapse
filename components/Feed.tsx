import React, { useState, useEffect } from 'react';
import { CreatePost } from './CreatePost';
import { Stories } from './Stories';
import { Post } from './Post';
import { Post as PostType } from '../types';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Skeleton } from './ui/Skeleton';
import { Card } from './ui/Card';

export const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        };
      }) as PostType[];
      
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full max-w-[680px] mx-auto space-y-4 px-0 md:px-4 pb-24 lg:pb-6">
      
      {/* Stories Section */}
      <Stories />
      
      {/* Create Post Widget */}
      <CreatePost />
      
      {/* Posts Feed */}
      {loading ? (
        // Skeleton Loaders
        <div className="space-y-4 mt-4">
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
                <div className="flex justify-between mt-4">
                   <Skeleton className="w-20 h-8 rounded-md" />
                   <Skeleton className="w-20 h-8 rounded-md" />
                   <Skeleton className="w-20 h-8 rounded-md" />
                </div>
             </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Post key={post.id} post={post} />
          ))}
          
          {posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📭</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">No posts yet</h3>
              <p className="text-slate-500">Add a new post to get the conversation started!</p>
            </div>
          )}
          
          {posts.length > 0 && (
             <div className="text-center py-8 text-slate-400 text-sm font-medium">
                You've reached the end of the feed.
             </div>
          )}
        </div>
      )}
    </div>
  );
};