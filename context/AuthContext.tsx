import React, { createContext, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/app';
import { auth, db } from '../firebaseConfig';
import { UserProfile } from '../types';

interface AuthContextType {
  user: firebase.User | null;
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
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid: string) => {
    try {
      const docSnap = await db.collection('users').doc(uid).get();
      if (docSnap.exists) {
        setUserProfile(docSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await auth.signOut();
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};