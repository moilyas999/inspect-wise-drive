import { useState, useEffect, useCallback } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { supabase } from '@/integrations/supabase/client';

interface OfflineInspectionData {
  items: Record<string, any>;
  faults: any[];
  media: any[];
  lastSynced: number;
}

const INSPECTION_STORAGE_PREFIX = 'inspection_';

export const useOfflineInspection = (jobId: string) => {
  const [localData, setLocalData] = useState<OfflineInspectionData>({
    items: {},
    faults: [],
    media: [],
    lastSynced: 0,
  });
  const { isOnline, queueOfflineAction } = useOfflineSync();

  const storageKey = `${INSPECTION_STORAGE_PREFIX}${jobId}`;

  // Load cached inspection data
  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        setLocalData(JSON.parse(cached));
      } catch (error) {
        console.error('Failed to parse cached inspection data:', error);
      }
    }
  }, [storageKey]);

  // Save to local storage
  const saveLocalData = useCallback((data: OfflineInspectionData) => {
    localStorage.setItem(storageKey, JSON.stringify(data));
    setLocalData(data);
  }, [storageKey]);

  // Update inspection item
  const updateInspectionItem = useCallback(async (itemId: string, updates: any) => {
    const newData = {
      ...localData,
      items: {
        ...localData.items,
        [itemId]: { ...localData.items[itemId], ...updates },
      },
    };
    saveLocalData(newData);

    if (isOnline) {
      try {
        await supabase
          .from('inspection_items')
          .update(updates)
          .eq('id', itemId);
      } catch (error) {
        console.error('Failed to update inspection item online:', error);
        queueOfflineAction('inspection_update', { itemId, updates });
      }
    } else {
      queueOfflineAction('inspection_update', { itemId, updates });
    }
  }, [localData, saveLocalData, isOnline, queueOfflineAction]);

  // Add fault
  const addFault = useCallback(async (faultData: any) => {
    const fault = {
      ...faultData,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      job_id: jobId,
      created_at: new Date().toISOString(),
    };

    const newData = {
      ...localData,
      faults: [...localData.faults, fault],
    };
    saveLocalData(newData);

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('inspection_faults')
          .insert({ ...faultData, job_id: jobId })
          .select()
          .single();

        if (error) throw error;

        // Update local data with real ID
        const updatedData = {
          ...newData,
          faults: newData.faults.map(f => 
            f.id === fault.id ? { ...f, id: data.id } : f
          ),
        };
        saveLocalData(updatedData);
      } catch (error) {
        console.error('Failed to add fault online:', error);
        queueOfflineAction('fault_report', { ...faultData, job_id: jobId });
      }
    } else {
      queueOfflineAction('fault_report', { ...faultData, job_id: jobId });
    }

    return fault.id;
  }, [localData, saveLocalData, isOnline, queueOfflineAction, jobId]);

  // Upload media
  const uploadMedia = useCallback(async (file: File, itemId?: string) => {
    const mediaId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${jobId}/${Date.now()}_${file.name}`;

    // Store file locally for later upload
    const media = {
      id: mediaId,
      file,
      fileName,
      itemId,
      uploaded: false,
      created_at: new Date().toISOString(),
    };

    const newData = {
      ...localData,
      media: [...localData.media, media],
    };
    saveLocalData(newData);

    if (isOnline) {
      try {
        const { data, error } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, file);

        if (error) throw error;

        if (itemId) {
          await supabase
            .from('inspection_items')
            .update({ photo_url: data.path })
            .eq('id', itemId);
        }

        // Mark as uploaded
        const updatedData = {
          ...newData,
          media: newData.media.map(m => 
            m.id === mediaId ? { ...m, uploaded: true, path: data.path } : m
          ),
        };
        saveLocalData(updatedData);

        return data.path;
      } catch (error) {
        console.error('Failed to upload media online:', error);
        queueOfflineAction('media_upload', { file, path: fileName, itemId });
      }
    } else {
      queueOfflineAction('media_upload', { file, path: fileName, itemId });
    }

    return fileName;
  }, [localData, saveLocalData, isOnline, queueOfflineAction, jobId]);

  // Submit inspection
  const submitInspection = useCallback(async () => {
    if (isOnline) {
      try {
        await supabase
          .from('inspection_jobs')
          .update({ status: 'submitted' })
          .eq('id', jobId);

        // Clear local data after successful submission
        localStorage.removeItem(storageKey);
        setLocalData({
          items: {},
          faults: [],
          media: [],
          lastSynced: Date.now(),
        });

        return true;
      } catch (error) {
        console.error('Failed to submit inspection online:', error);
        queueOfflineAction('job_submit', { jobId });
        return false;
      }
    } else {
      queueOfflineAction('job_submit', { jobId });
      return false;
    }
  }, [isOnline, queueOfflineAction, jobId, storageKey]);

  return {
    localData,
    updateInspectionItem,
    addFault,
    uploadMedia,
    submitInspection,
    isOnline,
  };
};