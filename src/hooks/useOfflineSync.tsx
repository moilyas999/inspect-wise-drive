import { useState, useEffect, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OfflineAction {
  id: string;
  type: 'inspection_update' | 'fault_report' | 'media_upload' | 'job_submit';
  data: any;
  timestamp: number;
  retries: number;
}

const OFFLINE_STORAGE_KEY = 'offline_actions';
const MAX_RETRIES = 3;

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const { toast } = useToast();

  // Load pending actions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (stored) {
      try {
        setPendingActions(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse offline actions:', error);
        localStorage.removeItem(OFFLINE_STORAGE_KEY);
      }
    }
  }, []);

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: OfflineAction[]) => {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(actions));
    setPendingActions(actions);
  }, []);

  // Monitor network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } catch (error) {
        // Fallback for web
        setIsOnline(navigator.onLine);
      }
    };

    checkNetworkStatus();

    let networkListener: any = null;

    // Listen for network changes
    const setupNetworkListener = async () => {
      try {
        networkListener = await Network.addListener('networkStatusChange', (status) => {
          const wasOffline = !isOnline;
          setIsOnline(status.connected);
          
          if (wasOffline && status.connected) {
            // Just came back online
            toast({
              title: "Back Online",
              description: "Syncing your offline changes...",
            });
            syncOfflineActions();
          } else if (!status.connected) {
            toast({
              title: "Offline Mode",
              description: "Changes will be saved locally and synced when you're back online.",
            });
          }
        });
      } catch (error) {
        console.warn('Network listener not available:', error);
      }
    };

    setupNetworkListener();

    // Fallback for web
    const handleOnline = () => {
      const wasOffline = !isOnline;
      setIsOnline(true);
      if (wasOffline) {
        toast({
          title: "Back Online",
          description: "Syncing your offline changes...",
        });
        syncOfflineActions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Changes will be saved locally and synced when you're back online.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (networkListener) {
        networkListener.then((listener: any) => listener?.remove?.());
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, toast]);

  // Add action to offline queue
  const queueOfflineAction = useCallback((type: OfflineAction['type'], data: any) => {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    const newActions = [...pendingActions, action];
    savePendingActions(newActions);

    toast({
      title: "Saved Offline",
      description: "Your changes will be synced when you're back online.",
    });

    return action.id;
  }, [pendingActions, savePendingActions, toast]);

  // Execute a single offline action
  const executeAction = async (action: OfflineAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'inspection_update':
          await supabase
            .from('inspection_items')
            .update(action.data.updates)
            .eq('id', action.data.itemId);
          break;

        case 'fault_report':
          await supabase
            .from('inspection_faults')
            .insert(action.data);
          break;

        case 'media_upload':
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(action.data.path, action.data.file);
          
          if (uploadError) throw uploadError;

          if (action.data.itemId) {
            await supabase
              .from('inspection_items')
              .update({ photo_url: uploadData.path })
              .eq('id', action.data.itemId);
          }
          break;

        case 'job_submit':
          await supabase
            .from('inspection_jobs')
            .update({ status: 'submitted' })
            .eq('id', action.data.jobId);
          break;

        default:
          console.warn('Unknown action type:', action.type);
          return true; // Remove unknown actions
      }

      return true; // Success
    } catch (error) {
      console.error('Failed to execute offline action:', error);
      return false; // Failed
    }
  };

  // Sync all offline actions
  const syncOfflineActions = useCallback(async () => {
    if (!isOnline || syncInProgress || pendingActions.length === 0) {
      return;
    }

    setSyncInProgress(true);
    
    try {
      const remainingActions: OfflineAction[] = [];
      let successCount = 0;

      for (const action of pendingActions) {
        const success = await executeAction(action);
        
        if (success) {
          successCount++;
        } else {
          // Retry logic
          const updatedAction = {
            ...action,
            retries: action.retries + 1,
          };

          if (updatedAction.retries < MAX_RETRIES) {
            remainingActions.push(updatedAction);
          } else {
            console.error('Max retries reached for action:', action);
          }
        }
      }

      savePendingActions(remainingActions);

      if (successCount > 0) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${successCount} offline change${successCount !== 1 ? 's' : ''}.`,
        });
      }

      if (remainingActions.length > 0) {
        toast({
          title: "Partial Sync",
          description: `${remainingActions.length} action${remainingActions.length !== 1 ? 's' : ''} failed to sync. Will retry automatically.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync offline changes. Will retry automatically.",
        variant: "destructive",
      });
    } finally {
      setSyncInProgress(false);
    }
  }, [isOnline, syncInProgress, pendingActions, savePendingActions, toast]);

  // Auto-sync every 30 seconds when online
  useEffect(() => {
    if (!isOnline || pendingActions.length === 0) return;

    const interval = setInterval(() => {
      syncOfflineActions();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, pendingActions.length, syncOfflineActions]);

  return {
    isOnline,
    syncInProgress,
    pendingActions: pendingActions.length,
    queueOfflineAction,
    syncOfflineActions,
  };
};