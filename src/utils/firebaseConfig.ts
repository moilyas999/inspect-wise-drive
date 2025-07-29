import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration - Replace with your actual Firebase project values
const firebaseConfig = {
  apiKey: "AIzaSyB5H9L8kVZQJ8ZZxQJ8ZZxQJ8ZZxQJ8ZZx", // Replace with your actual API key
  authDomain: "your-project.firebaseapp.com", // Replace with your actual domain
  projectId: "your-firebase-project", // Replace with your actual project ID
  storageBucket: "your-project.appspot.com", // Replace with your actual storage bucket
  messagingSenderId: "123456789", // Replace with your actual sender ID
  appId: "1:123456789:web:abcdef123456", // Replace with your actual app ID
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };

// Instructions to get these values:
// 1. Go to Firebase Console: https://console.firebase.google.com/
// 2. Select your project
// 3. Go to Project Settings (gear icon)
// 4. In the "General" tab, scroll down to "Your apps"
// 5. If you don't have a web app, click "Add app" and select web
// 6. Copy the config values from the SDK setup
// 7. For VAPID key, go to "Cloud Messaging" tab and generate a web push certificate