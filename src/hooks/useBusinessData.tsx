import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Business {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Inspector {
  id: string;
  user_id: string;
  name: string;
  email: string;
  business_id: string;
  created_by: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export const useBusinessData = () => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (!user) {
      setBusiness(null);
      setBusinessId(null);
      setLoading(false);
      return;
    }

    fetchBusinessData();
  }, [user]);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);

      // Get user's business ID
      const { data: inspectorData, error: inspectorError } = await supabase
        .from('inspectors')
        .select('business_id')
        .eq('user_id', user?.id)
        .single();

      if (inspectorError) {
        console.error('Error fetching inspector data:', inspectorError);
        return;
      }

      const userBusinessId = inspectorData?.business_id;
      setBusinessId(userBusinessId);

      if (!userBusinessId) {
        console.warn('No business ID found for user');
        return;
      }

      // Get business details
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', userBusinessId)
        .single();

      if (businessError) {
        console.error('Error fetching business data:', businessError);
        return;
      }

      setBusiness(businessData);
    } catch (error) {
      console.error('Error in fetchBusinessData:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStaffMember = async (name: string, email: string) => {
    if (!businessId || userRole !== 'admin') {
      throw new Error('Unauthorized to create staff members');
    }

    try {
      console.log('Creating staff member via edge function:', { name, email, businessId, userId: user?.id });

      // Call edge function to create staff member server-side
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: {
          name: name.trim(),
          email: email.trim(),
          businessId: businessId,
          createdBy: user?.id
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create staff member');
      }

      if (!data.success) {
        console.error('Staff creation failed:', data.error);
        throw new Error(data.error?.message || 'Failed to create staff member');
      }

      console.log('Staff member created successfully:', data.user);
      return { success: true, user: data.user };

    } catch (error: any) {
      console.error('Error in createStaffMember:', error);
      
      // Fallback: Try the original browser method if edge function fails
      try {
        console.log('Attempting fallback browser method...');
        
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        
        const { data: fallbackData, error: fallbackError } = await supabase.auth.signUp({
          email: email.trim(),
          password: tempPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              name: name.trim(),
              role: 'staff',
              created_by: user?.id,
              business_id: businessId
            }
          }
        });

        if (fallbackError) {
          throw fallbackError;
        }

        // Send password reset email
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`
        });

        console.log('Fallback method succeeded:', fallbackData.user?.id);
        return { success: true, user: fallbackData.user };

      } catch (fallbackError: any) {
        console.error('Both methods failed:', fallbackError);
        return { 
          success: false, 
          error: { 
            message: fallbackError.message || error.message || 'Failed to create staff member' 
          }
        };
      }
    }
  };

  const getStaffMembers = async (): Promise<Inspector[]> => {
    if (!businessId) return [];

    try {
      const { data, error } = await supabase
        .from('inspectors')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Inspector[];
    } catch (error) {
      console.error('Error fetching staff members:', error);
      return [];
    }
  };

  const deactivateStaffMember = async (inspectorId: string) => {
    try {
      const { error } = await supabase
        .from('inspectors')
        .update({ status: 'inactive' })
        .eq('id', inspectorId)
        .eq('business_id', businessId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deactivating staff member:', error);
      return { success: false, error };
    }
  };

  const resetStaffPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error };
    }
  };

  return {
    business,
    businessId,
    loading,
    createStaffMember,
    getStaffMembers,
    deactivateStaffMember,
    resetStaffPassword,
    refetch: fetchBusinessData
  };
};