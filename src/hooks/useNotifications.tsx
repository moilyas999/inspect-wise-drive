import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { pushNotificationService } from '@/services/pushNotifications';

interface NotificationConfig {
  enableBrowserNotifications?: boolean;
  enableToastNotifications?: boolean;
}

export const useNotifications = (config: NotificationConfig = {}) => {
  const { enableBrowserNotifications = true, enableToastNotifications = true } = config;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Initialize push notifications
    const initNotifications = async () => {
      console.log('🔔 useNotifications: Starting notification initialization for user:', user?.id);
      
      try {
        const isInitialized = await pushNotificationService.initialize();
        console.log('🔔 useNotifications: Push service initialized:', isInitialized);
        setIsSubscribed(isInitialized);
        
        // Fallback to web notifications if push notifications are not available
        if (!isInitialized && enableBrowserNotifications && 'Notification' in window) {
          console.log('🔔 useNotifications: Falling back to web notifications');
          if (Notification.permission === 'default') {
            console.log('🔔 useNotifications: Requesting web notification permission');
            Notification.requestPermission().then(permission => {
              console.log('🔔 useNotifications: Web permission result:', permission);
              setIsSubscribed(permission === 'granted');
            });
          } else {
            console.log('🔔 useNotifications: Web permission already set:', Notification.permission);
            setIsSubscribed(Notification.permission === 'granted');
          }
        }
      } catch (error) {
        console.error('🔔 useNotifications: Error during initialization:', error);
      }
    };

    initNotifications();

    // Set up realtime subscriptions
    const channels: any[] = [];

    if (userRole === 'admin') {
      // Admin notifications: new inspections, completed inspections, new offers
      const adminChannel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inspection_jobs',
            filter: `status=in.(in_progress,submitted)`
          },
          (payload) => {
            console.log('Admin notification - job change:', payload);
            
            if (payload.eventType === 'UPDATE') {
              const oldRecord = payload.old;
              const newRecord = payload.new;
              
              // New inspection started
              if (oldRecord.status === 'not_started' && newRecord.status === 'in_progress') {
                showNotification(
                  'New Inspection Started',
                  `Inspector started inspection for ${newRecord.make} ${newRecord.model} (${newRecord.reg})`,
                  'inspection'
                );
              }
              
              // Inspection completed
              if (oldRecord.status === 'in_progress' && newRecord.status === 'submitted') {
                showNotification(
                  'Inspection Completed',
                  `Inspection completed for ${newRecord.make} ${newRecord.model} (${newRecord.reg})`,
                  'completion'
                );
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'negotiation_offers'
          },
          (payload) => {
            console.log('Admin notification - new offer:', payload);
            
            if (payload.new.offered_by === 'inspector') {
              showNotification(
                'New Price Offer',
                `Inspector submitted offer: £${payload.new.amount.toLocaleString()}`,
                'offer'
              );
            }
          }
        )
        .subscribe();

      channels.push(adminChannel);
    } else if (userRole === 'staff') {
      // Staff notifications: negotiation updates
      const staffChannel = supabase
        .channel('staff-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'negotiation_offers'
          },
          (payload) => {
            console.log('Staff notification - offer change:', payload);
            
            if (payload.eventType === 'INSERT' && payload.new.offered_by === 'admin') {
              showNotification(
                'Admin Response',
                `Admin responded with: £${payload.new.amount.toLocaleString()}`,
                'response'
              );
            }
            
            if (payload.eventType === 'UPDATE' && payload.new.status === 'accepted') {
              showNotification(
                'Offer Accepted!',
                `Your offer of £${payload.new.amount.toLocaleString()} was accepted!`,
                'success'
              );
            }
            
            if (payload.eventType === 'UPDATE' && payload.new.status === 'declined') {
              showNotification(
                'Offer Declined',
                `Your offer of £${payload.new.amount.toLocaleString()} was declined`,
                'declined'
              );
            }
          }
        )
        .subscribe();

      channels.push(staffChannel);
    }

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, userRole, enableBrowserNotifications, enableToastNotifications]);

  const showNotification = async (title: string, body: string, type: string) => {
    // Show toast notification
    if (enableToastNotifications) {
      const toastVariant = type === 'success' ? 'default' : 
                          type === 'declined' ? 'destructive' : 'default';
      
      toast({
        title,
        description: body,
        variant: toastVariant,
        duration: 6000,
      });
    }

    // Show push notification (native or web fallback)
    if (enableBrowserNotifications && isSubscribed) {
      try {
        const route = type === 'offer' || type === 'response' ? '/negotiation' : null;
        
        await pushNotificationService.sendNotification({
          title,
          body,
          data: { type, route }
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  return {
    isSubscribed,
    showNotification
  };
};