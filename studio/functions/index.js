
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * A Cloud Function that triggers when a new user is created in Firebase Authentication.
 * It creates a corresponding user document in the Firestore "users" collection.
 */
exports.createUserDocument = functions.auth.user().onCreate((user) => {
  const { uid, email, displayName } = user;

  // Data to be saved in the new user document
  const userData = {
    uid: uid,
    email: email || "",
    displayName: displayName || "New User",
    role: "player", // Default role for new users
    plan: "athlete", // Default plan for new users
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Get a reference to the new user document
  const userDocRef = admin.firestore().collection("users").doc(uid);

  // Set the document with the user's data
  return userDocRef.set(userData)
    .then(() => {
      console.log(`Successfully created user document for UID: ${uid}`);
      return null;
    })
    .catch((error) => {
      console.error(`Error creating user document for UID: ${uid}`, error);
      return null;
    });
});
