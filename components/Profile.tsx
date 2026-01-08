import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post as PostComponent } from './Post';
import { Post as PostType } from '../types';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { MapPin, Link as LinkIcon, Calendar, Edit3, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const Profile: React.FC = () => {
  const { userProfile, user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Query posts where author.uid matches current user
    const q = query(
      collection(db, 'posts'),
      where('author.uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

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
  }, [user]);

  if (!userProfile) return null;

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 lg:pb-6">
      {/* Profile Header */}
      <div className="bg-white rounded-b-3xl shadow-sm border-b border-x border-slate-100 overflow-hidden mb-6">
        {/* Cover Image */}
        <div className="h-48 w-full bg-slate-200 relative">
          {userProfile.coverURL && (
            <img 
              src={userProfile.coverURL} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <img 
              src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.displayName}`} 
              alt={userProfile.displayName || 'User'} 
              className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-white object-cover"
            />
            <button className="mb-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-sm">
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">{userProfile.displayName}</h1>
            <p className="text-slate-500 font-medium">@{userProfile.email?.split('@')[0]}</p>
          </div>

          <p className="mt-4 text-slate-700 leading-relaxed">
            {userProfile.bio || "No bio yet. Click edit to add a bio about yourself."}
          </p>

          <div className="flex flex-wrap gap-y-2 gap-x-6 mt-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>Digital Nomad</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4" />
              <a href="#" className="text-synapse-600 hover:underline">synapse.com</a>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Joined {format(new Date(), 'MMMM yyyy')}</span>
            </div>
          </div>

          <div className="flex gap-6 mt-6 pt-6 border-t border-slate-50">
            <div className="flex gap-1.5">
              <span className="font-bold text-slate-900">{userProfile.following?.length || 0}</span>
              <span className="text-slate-500">Following</span>
            </div>
            <div className="flex gap-1.5">
              <span className="font-bold text-slate-900">{userProfile.followers?.length || 0}</span>
              <span className="text-slate-500">Followers</span>
            </div>
            <div className="flex gap-1.5">
              <span className="font-bold text-slate-900">{posts.length}</span>
              <span className="text-slate-500">Posts</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts Feed */}
      <h3 className="px-4 text-lg font-bold text-slate-900 mb-4">Posts</h3>
      
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-synapse-400" />
        </div>
      ) : (
        <div className="space-y-6 px-4 lg:px-0">
          {posts.map(post => (
            <PostComponent key={post.id} post={post} />
          ))}
          {posts.length === 0 && (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit3 className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No posts yet</h3>
              <p className="text-slate-500 mt-1">When you create a post, it will show up here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};