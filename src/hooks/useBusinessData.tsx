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
      // Create auth user for staff member
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        email_confirm: true,
        user_metadata: {
          name,
          role: 'staff',
          created_by: user?.id,
          business_id: businessId
        }
      });

      if (error) throw error;

      // Update the inspector record with business_id
      if (data.user) {
        const { error: updateError } = await supabase
          .from('inspectors')
          .update({ 
            business_id: businessId,
            created_by: user?.id 
          })
          .eq('user_id', data.user.id);

        if (updateError) {
          console.error('Error updating inspector business_id:', updateError);
        }

        // Send password reset email
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`
        });
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Error creating staff member:', error);
      return { success: false, error };
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