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
      // Generate a temporary password for the staff member
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Create auth user for staff member using regular signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            name,
            role: 'staff',
            created_by: user?.id,
            business_id: businessId
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // The trigger function will automatically create the inspector record
        // Just send password reset email so they can set their own password
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`
        });

        if (resetError) {
          console.warn('Password reset email failed:', resetError);
        }
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