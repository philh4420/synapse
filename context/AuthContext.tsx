
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous profile listener if exists
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        // Real-time listener for the user profile
        // This ensures if someone accepts a friend request, the user sees it immediately
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error("Auth Profile Listener Error:", error);
          setLoading(false);
        });

        // --- PRESENCE SYSTEM ---
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Set online on connect
        updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }).catch(console.error);

        // Handle visibility change
        const handleVisibilityChange = () => {
           if (document.visibilityState === 'hidden') {
               updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(console.error);
           } else {
               updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }).catch(console.error);
           }
        };
        
        document.addEventListener("visibilitychange", handleVisibilityChange);
        
        // Clean up
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const logout = async () => {
    if (user) {
        // Set offline before signing out
        try {
            await updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: serverTimestamp() });
        } catch (e) { console.error("Error setting offline", e); }
    }
    await signOut(auth);
  };

  const refreshProfile = async () => {
    // With onSnapshot, manual refresh is rarely needed, but kept for compatibility
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
      } catch (e) {
        console.error("Manual profile refresh failed", e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
