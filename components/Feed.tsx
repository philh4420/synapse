import React, { useState, useEffect } from 'react';
import { CreatePost } from './CreatePost';
import { Post } from './Post';
import { Post as PostType } from '../types';
import { db } from '../firebaseConfig';
import { Loader2 } from 'lucide-react';

export const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Connect to the 'posts' collection in Firebase Firestore
    // Order by timestamp descending (newest first)
    const unsubscribe = db.collection('posts')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        const postsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to JavaScript Date
            timestamp: data.timestamp?.toDate() || new Date(),
          };
        }) as PostType[];
        
        setPosts(postsData);
        setLoading(false);
      });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 px-4 pb-24 lg:pb-6">
      <CreatePost />
      
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-synapse-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <Post key={post.id} post={post} />
          ))}
          {posts.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <p>No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};