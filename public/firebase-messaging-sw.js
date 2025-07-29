// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyB5H9L8kVZQJ8ZZxQJ8ZZxQJ8ZZxQJ8ZZx", // Replace with your actual API key
  authDomain: "your-project.firebaseapp.com", // Replace with your actual domain
  projectId: "your-firebase-project", // Replace with your actual project ID
  storageBucket: "your-project.appspot.com", // Replace with your actual storage bucket
  messagingSenderId: "123456789", // Replace with your actual sender ID
  appId: "1:123456789:web:abcdef123456" // Replace with your actual app ID
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const { notification, data } = payload;
  
  if (notification) {
    const notificationTitle = notification.title || 'Vehicle Inspector';
    const notificationOptions = {
      body: notification.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data,
      click_action: data?.url || '/',
      actions: [
        {
          action: 'open',
          title: 'Open App'
        }
      ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there is already a client open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            return client.navigate(urlToOpen);
          }
        }
        
        // If no client is found, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});