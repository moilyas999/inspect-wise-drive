import { supabase } from '@/integrations/supabase/client';

export const createSampleJobs = async (inspectorId: string) => {
  try {
    const { error } = await supabase
      .from('inspection_jobs')
      .insert([
        {
          reg: 'AB21 XYZ',
          make: 'BMW',
          model: '320d M Sport',
          vin: 'WBABH71090P123456',
          seller_address: '123 Fleet Street, London, EC4A 2DY',
          assigned_to: inspectorId,
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          status: 'not_started'
        },
        {
          reg: 'CD19 ABC',
          make: 'Audi',
          model: 'A4 Avant',
          vin: 'WAUZZZ8V7GA123456',
          seller_address: '456 Commercial Road, Manchester, M15 4FN',
          assigned_to: inspectorId,
          deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
          status: 'not_started'
        },
        {
          reg: 'EF22 DEF',
          make: 'Mercedes-Benz',
          model: 'C220d AMG Line',
          vin: 'WDD2050821F123456',
          seller_address: '789 Business Park, Birmingham, B5 6QR',
          assigned_to: inspectorId,
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          status: 'not_started'
        }
      ]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error creating sample jobs:', error);
    return { success: false, error };
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