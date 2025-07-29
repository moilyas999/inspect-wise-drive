import { supabase } from '@/integrations/supabase/client';
import { firebaseConfig } from '@/utils/firebaseConfig';

class FirebaseMessagingService {
  private messaging: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return;
      
      // Load Firebase SDK dynamically
      await this.loadFirebaseSDK();

      // Initialize Firebase app using the compat version
      if ((window as any).firebase) {
        const firebase = (window as any).firebase;
        const app = firebase.initializeApp(firebaseConfig);
        this.messaging = firebase.messaging();

        // Request permission and get token
        await this.requestPermissionAndGetToken();

        // Listen for foreground messages
        this.messaging.onMessage((payload: any) => {
          console.log('Message received in foreground:', payload);
          this.showNotification(payload);
        });
      }

      this.isInitialized = true;
      console.log('Firebase Messaging initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Messaging:', error);
    }
  }

  private async loadFirebaseSDK(): Promise<void> {
    // Load Firebase SDK via script tags
    if (!(window as any).firebase) {
      await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      if (!(window as any).firebase) {
        console.error('Firebase not loaded');
        return null;
      }
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      const firebase = (window as any).firebase;
      const messaging = firebase.messaging();
      
      const token = await messaging.getToken({
        vapidKey: firebaseConfig.vapidKey
      });

      if (token) {
        console.log('FCM registration token:', token);
        await this.saveTokenToDatabase(token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert or update the FCM token
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          platform: 'web'
        }, {
          onConflict: 'user_id,token'
        });

      if (error) {
        console.error('Error saving FCM token:', error);
      } else {
        console.log('FCM token saved to database');
      }
    } catch (error) {
      console.error('Error saving FCM token to database:', error);
    }
  }

  private showNotification(payload: any): void {
    const { notification, data } = payload;
    
    if (notification) {
      // Show browser notification
      if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(notification.title, {
            body: notification.body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: data
          });
        });
      }
    }
  }

  async sendNotificationToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-fcm-notification', {
        body: {
          userId,
          title,
          body,
          data
        }
      });

      if (error) {
        console.error('Error sending FCM notification:', error);
      }
    } catch (error) {
      console.error('Error invoking FCM notification function:', error);
    }
  }
}

export const firebaseMessagingService = new FirebaseMessagingService();