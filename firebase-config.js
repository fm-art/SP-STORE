// Replace these placeholders with the Firebase web app config from Firebase Console.
// This config is public by design; protect data with Firebase Security Rules.
export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};
export const storeConfig = {
  storeName: "ShopNest",
  // Display/manual UPI payments are not automatically verified.
  upiId: "your-store@upi"
};
