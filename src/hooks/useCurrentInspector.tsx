import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Inspector {
  id: string;
  user_id: string;
  name: string;
  email: string;
  business_id: string;
}

export const useCurrentInspector = () => {
  const [inspector, setInspector] = useState<Inspector | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentInspector = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('inspectors')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching inspector:', error);
        } else {
          setInspector(data);
        }
      } catch (error) {
        console.error('Error in useCurrentInspector:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentInspector();
  }, []);

  return { inspector, loading };
};