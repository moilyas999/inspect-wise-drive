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
      console.log('Creating staff member:', { name, email, businessId, userId: user?.id });

      // Generate a random password
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Create the user using edge function
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: {
          name: name.trim(),
          email: email.trim(),
          password: password,
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

      console.log('Staff member created successfully with password:', password);
      
      // Return success with password for display in UI
      return { 
        success: true, 
        user: data.user, 
        password: password,
        email: email.trim()
      };

    } catch (error: any) {
      console.error('Error in createStaffMember:', error);
      return { 
        success: false, 
        error: { 
          message: error.message || 'Failed to create staff member' 
        }
      };
    }
  };

  const getStaffMembers = async (): Promise<Inspector[]> => {
    if (!businessId) {
      console.log('No businessId available for fetching staff');
      return [];
    }

    try {
      console.log('Fetching staff members for businessId:', businessId);
      
      const { data, error } = await supabase
        .from('inspectors')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      console.log('Staff query result:', { data, error, businessId });

      if (error) {
        console.error('Database error fetching staff:', error);
        throw error;
      }
      
      const staff = (data || []) as Inspector[];
      console.log('Returning staff members:', staff.length, 'members');
      return staff;
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
      console.log('Resetting password for:', email);
      
      // Generate a new random password
      const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Get staff member name
      const staffMember = await getStaffMembers().then(members => 
        members.find(m => m.email === email)
      );
      const staffName = staffMember?.name || 'User';

      // Update password using admin function
      const { data, error } = await supabase.functions.invoke('reset-staff-password', {
        body: {
          email: email.trim(),
          newPassword: newPassword
        }
      });

      if (error) {
        console.error('Password reset error:', error);
        throw new Error('Failed to reset password');
      }

      console.log('Password reset successful, new password:', newPassword);
      
      // Return success with new password for display in UI
      return { 
        success: true, 
        password: newPassword,
        email: email.trim(),
        name: staffName
      };
    } catch (error: any) {
      console.error('Error resetting password:', error);
      return { success: false, error: { message: error.message || 'Failed to reset password' } };
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