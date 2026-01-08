import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

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

// Initialize Firebase (Singleton pattern to prevent re-initialization)
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const auth = app.auth();
export const db = app.firestore();

export const cloudinaryConfig = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
  apiKey: env.VITE_CLOUDINARY_API_KEY,
  apiSecret: env.VITE_CLOUDINARY_API_SECRET,
  folder: env.VITE_CLOUDINARY_FOLDER || 'Synapse'
};

export default firebase;