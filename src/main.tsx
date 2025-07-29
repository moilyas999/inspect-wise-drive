import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service workers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register main service worker for offline functionality
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
    
    // Register Firebase messaging service worker
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('Firebase SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
