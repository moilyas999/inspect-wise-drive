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
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: 'web-token-' + Date.now(),
          platform: 'web',
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing notification preference:', error);
      }
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_push_tokens')
          .delete()
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();