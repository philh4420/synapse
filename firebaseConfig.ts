import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cast import.meta to any to avoid TypeScript error "Property 'env' does not exist on type 'ImportMeta'"
const env = (import.meta as any).env;

// Configuration loaded from environment variables for security and flexibility
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

export const GIPHY_API_KEY = env.VITE_GIPHY_API_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const cloudinaryConfig = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
  apiKey: env.VITE_CLOUDINARY_API_KEY,
  apiSecret: env.VITE_CLOUDINARY_API_SECRET,
  folder: env.VITE_CLOUDINARY_FOLDER || 'Synapse'
};