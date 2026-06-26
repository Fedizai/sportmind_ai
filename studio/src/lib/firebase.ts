// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Function to check if Firebase is configured
export function isFirebaseConfigured() {
  return !!firebaseConfig.apiKey;
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;


if (!isFirebaseConfigured()) {
    console.error("FIREBASE_CONFIG_MISSING: Firebase configuration is missing. Please add your API keys to the .env file.");
    // In a real app, you might throw an error here to prevent the app from starting
    // without a valid configuration, especially for production builds.
    // For now, we'll allow it to proceed to avoid crashing the dev server on initial setup.
    if (process.env.NODE_ENV === 'production') {
        throw new Error("Firebase configuration is missing. The application cannot start in production without it.");
    }
}

try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
} catch (e) {
    console.error("Failed to initialize Firebase. Please check your configuration.", e);
    if (process.env.NODE_ENV === 'production') {
        throw new Error("Firebase initialization failed. The application cannot start.");
    }
    // Provide non-null fallbacks to prevent crashes if not configured
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
    functions = {} as Functions;
}


export { app, auth, db, storage, functions };
