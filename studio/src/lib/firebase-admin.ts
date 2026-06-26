
import admin from "firebase-admin";

console.log("Initializing Firebase Admin SDK...");

// Check for necessary environment variables
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_PRIVATE_KEY ||
  !process.env.FIREBASE_CLIENT_EMAIL
) {
  console.error("🔥 Missing required Firebase Admin SDK environment variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL).");
  throw new Error("Missing required Firebase Admin SDK environment variables.");
}

// The private key from the environment variable might have escaped newlines (\\n).
// We need to replace them with actual newline characters.
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: privateKey,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

try {
  if (!admin.apps.length) {
    console.log("Firebase Admin SDK not initialized yet. Initializing...");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });
    console.log("✅ Firebase Admin SDK initialized successfully.");
  } else {
    console.log("Firebase Admin SDK already initialized.");
  }
} catch (error) {
    console.error("🔥 Error initializing Firebase Admin SDK:", error);
    throw new Error("Failed to initialize Firebase Admin SDK.");
}


const adminDb = admin.firestore();

export { adminDb };
