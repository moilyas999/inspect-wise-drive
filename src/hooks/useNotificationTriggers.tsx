import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useNotificationTriggers = () => {
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (!user) return;

    let cleanup: (() => void) | undefined;

    // Set up real-time listeners for notification triggers
    const setupTriggers = () => {
      // 1. Listen for new inspection jobs (notify admin when staff starts inspection)
      if (userRole === 'admin') {
        const jobsChannel = supabase
          .channel('inspection-jobs-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'inspection_jobs'
            },
            async (payload) => {
              console.log('New inspection job created:', payload);
              
              // Get inspector details
              const { data: inspector } = await supabase
                .from('inspectors')
                .select('name')
                .eq('id', payload.new.assigned_to)
                .single();

              if (inspector) {
                // Send notification via Supabase function
                await supabase.functions.invoke('send-fcm-notification', {
                  body: {
                    userId: user.id,
                    title: 'New Vehicle Inspection Started',
                    body: `${inspector.name} has started inspecting ${payload.new.reg}`
                  }
                });
              }
            }
          )
          .subscribe();

        // 2. Listen for inspection status changes (notify admin when submitted)
        const statusChannel = supabase
          .channel('inspection-status-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'inspection_jobs'
            },
            async (payload) => {
              console.log('Inspection job updated:', payload);
              
              // Check if status changed to submitted
              if (payload.new.status === 'submitted' && payload.old.status !== 'submitted') {
                const { data: inspector } = await supabase
                  .from('inspectors')
                  .select('name')
                  .eq('id', payload.new.assigned_to)
                  .single();

                if (inspector) {
                  await supabase.functions.invoke('send-fcm-notification', {
                    body: {
                      userId: user.id,
                      title: 'Vehicle Submitted',
                      body: `${inspector.name} submitted ${payload.new.reg} for review`
                    }
                  });
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(jobsChannel);
          supabase.removeChannel(statusChannel);
        };
      }

      // 3. Listen for negotiation offers (notify both parties)
      const negotiationChannel = supabase
        .channel('negotiation-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'negotiation_offers'
          },
          async (payload) => {
            console.log('Negotiation offer changed:', payload);
            
            const newOffer = payload.new as any;
            
            // Get job details
            const { data: job } = await supabase
              .from('inspection_jobs')
              .select('reg, assigned_to, business_id')
              .eq('id', newOffer.job_id)
              .single();

            if (!job) return;

            // Get admin user IDs
            const { data: adminRoles } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin');

            const adminUserIds = adminRoles?.map(r => r.user_id) || [];
            
            const { data: admins } = await supabase
              .from('inspectors')
              .select('user_id, name')
              .eq('business_id', job.business_id)
              .in('user_id', adminUserIds);

            const { data: staff } = await supabase
              .from('inspectors')
              .select('user_id, name')
              .eq('id', job.assigned_to)
              .single();

            // Determine who to notify based on who made the offer
            const isAdminOffer = newOffer.offered_by === 'admin';
            
            if (isAdminOffer && staff) {
              // Admin made offer, notify staff
              await supabase.functions.invoke('send-fcm-notification', {
                body: {
                  userId: staff.user_id,
                  title: `New update from Admin on ${job.reg}`,
                  body: `Admin sent you a new ${newOffer.offer_type} for ${job.reg}`
                }
              });
            } else if (!isAdminOffer && admins) {
              // Staff made offer, notify all admins
              for (const admin of admins) {
                await supabase.functions.invoke('send-fcm-notification', {
                  body: {
                    userId: admin.user_id,
                    title: `New update from ${staff?.name} on ${job.reg}`,
                    body: `${staff?.name} sent a new ${newOffer.offer_type} for ${job.reg}`
                  }
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(negotiationChannel);
      };
    };

    cleanup = setupTriggers();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [user, userRole]);
};