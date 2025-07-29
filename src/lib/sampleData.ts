import { supabase } from '@/integrations/supabase/client';

export const createSampleJobs = async () => {
  try {
    const { data, error } = await supabase.rpc('create_sample_inspection_jobs');

    if (error) throw error;
    
    const result = data?.[0];
    return { 
      success: result?.jobs_created > 0, 
      message: result?.message,
      jobsCreated: result?.jobs_created || 0
    };
  } catch (error) {
    console.error('Error creating sample jobs:', error);
    return { 
      success: false, 
      error,
      message: 'Failed to create sample jobs'
    };
  }
};

export const getInspectorId = async () => {
  try {
    const { data, error } = await supabase
      .from('inspectors')
      .select('id')
      .single();

    if (error) throw error;
    return data?.id;
  } catch (error) {
    console.error('Error getting inspector ID:', error);
    return null;
  }
};