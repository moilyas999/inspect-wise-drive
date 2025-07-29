import { useEffect } from "react";
import { messaging, getToken, onMessage } from "@/utils/firebaseConfig";
import { supabase } from "@/integrations/supabase/client";

export const useFCM = (userId?: string) => {
  useEffect(() => {
    if (!userId || !("Notification" in window)) return;

    const setupFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        
        if (permission === "granted") {
          // Get VAPID key from backend
          const { data: vapidData } = await supabase.functions.invoke('get-vapid-key');
          const vapidKey = vapidData?.vapidKey;
          
          if (!vapidKey) {
            throw new Error('VAPID key not available');
          }

          const token = await getToken(messaging, {
            vapidKey: vapidKey
          });

          if (token) {
            console.log('FCM registration token:', token);
            await saveFCMToken(token, userId);
            
            // Listen for foreground messages
            onMessage(messaging, (payload) => {
              console.log('Message received in foreground:', payload);
              showNotification(payload);
            });
          }
        } else {
          console.warn("Notification permission denied");
        }
      } catch (error) {
        console.error("FCM setup error:", error);
      }
    };

    setupFCM();
  }, [userId]);
};

async function saveFCMToken(token: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({
        user_id: userId,
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

function showNotification(payload: any): void {
  const { notification, data } = payload;
  
  if (notification && 'serviceWorker' in navigator) {
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