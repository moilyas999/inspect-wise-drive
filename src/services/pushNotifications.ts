import { supabase } from '@/integrations/supabase/client';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
}

class PushNotificationService {
  private isInitialized = false;
  private registrationToken: string | null = null;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('Initializing push notifications...');
      
      // Check if we're on a native platform
      if (Capacitor.isNativePlatform()) {
        console.log('Native platform detected, setting up Capacitor push notifications');
        await this.initializeCapacitorPush();
      } else {
        console.log('Web platform detected, setting up web notifications');
        await this.initializeWebNotifications();
      }

      return this.isInitialized;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  private async initializeCapacitorPush(): Promise<void> {
    try {
      // Request permission for push notifications
      let permStatus = await PushNotifications.checkPermissions();
      console.log('Current permission status:', permStatus);

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied notifications permission');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Set up listeners
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ', token.value);
        this.registrationToken = token.value;
        this.storeToken(token.value);
        this.isInitialized = true;
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
        // Handle foreground notifications
        this.handleForegroundNotification(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed', notification);
        // Handle notification tap
        this.handleNotificationTap(notification);
      });

    } catch (error) {
      console.error('Error setting up Capacitor push notifications:', error);
    }
  }

  private async initializeWebNotifications(): Promise<void> {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        this.isInitialized = permission === 'granted';
      } else {
        this.isInitialized = Notification.permission === 'granted';
      }
      
      if (this.isInitialized) {
        console.log('Web notifications enabled');
        // Store a placeholder token for web
        this.storeToken('web-token-' + Date.now());
      }
    }
  }

  private handleForegroundNotification(notification: any) {
    // Show local notification when app is in foreground
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'New Message', {
        body: notification.body || 'You have a new notification',
        icon: '/icon-192x192.png',
        tag: 'app-notification',
        requireInteraction: true
      });
    }
  }

  private handleNotificationTap(notification: any) {
    console.log('Notification tapped:', notification);
    // Handle navigation based on notification data
    if (notification.notification?.data?.route) {
      window.location.href = notification.notification.data.route;
    }
  }

  private async storeToken(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const platform = Capacitor.isNativePlatform() ? 
          (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android') : 'web';
        
        console.log('Storing push token for platform:', platform);
        
        const { error } = await supabase
          .from('user_push_tokens')
          .upsert({
            user_id: user.id,
            token: token,
            platform: platform,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error storing push token:', error);
        } else {
          console.log('Push token stored successfully');
        }
      }
    } catch (error) {
      console.error('Error storing push token:', error);
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
    if (Capacitor.isNativePlatform()) {
      // For native platforms, we rely on the server to send push notifications
      // This method is called to show local notifications or trigger server notifications
      console.log('Native notification requested:', payload);
      
      // Show local notification if app is in foreground
      this.handleForegroundNotification({
        title: payload.title,
        body: payload.body,
        data: payload.data
      });
    } else {
      // For web, show browser notification
      await this.showWebNotification(payload);
    }
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