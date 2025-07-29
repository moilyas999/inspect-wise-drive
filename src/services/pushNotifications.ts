// Simplified push notification service for web/mobile compatibility
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
}

class PushNotificationService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // For web, just check notification permissions
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          this.isInitialized = permission === 'granted';
        } else {
          this.isInitialized = Notification.permission === 'granted';
        }
      }

      return this.isInitialized;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Simplified notification for web compatibility
  private async storeNotificationPreference(userId: string) {
    try {
      // Just log for now - no database table needed
      console.log('Notification preference stored for user:', userId);
    } catch (error) {
      console.error('Error storing notification preference:', error);
    }
  }

  // Fallback web notification for development/web
  async showWebNotification(payload: NotificationPayload) {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: '/src/assets/app-icon.png',
        tag: 'app-notification',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        if (payload.data?.route) {
          window.location.href = payload.data.route;
        }
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.showWebNotification(payload);
      }
    }
  }

  async sendNotification(payload: NotificationPayload) {
    await this.showWebNotification(payload);
  }

  async removeToken() {
    console.log('Notification token removed (simplified)');
  }
}

export const pushNotificationService = new PushNotificationService();