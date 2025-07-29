import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBusinessData, Inspector } from '@/hooks/useBusinessData';
import { supabase } from '@/integrations/supabase/client';
import CreateInspectionJobModal from '@/components/CreateInspectionJobModal';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Car, Clock, MapPin, PlayCircle, CheckCircle2, AlertCircle, RefreshCw, Plus, Calendar, Users, DollarSign 
} from 'lucide-react';
import { format } from 'date-fns';
import { MobileScreen } from '@/components/ui/mobile-container';
import { MobileHeader } from '@/components/ui/mobile-header';
import { MobileCard, MobileCardContent, MobileCardHeader, MobileCardTitle, MobileCardDescription } from '@/components/ui/mobile-card';

interface InspectionJob {
  id: string;
  reg: string;
  make: string;
  model: string;
  vin: string | null;
  seller_address: string | null;
  deadline: string;
  status: string;
  created_at: string;
  business_id: string;
  assigned_to: string;
  review_status: string | null;
  negotiation_status?: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  updated_at: string;
  vehicle_id: string | null;
  assigned_inspector?: {
    name: string;
    email: string;
  } | null;
}

const Dashboard = () => {
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const { businessId, business, getStaffMembers } = useBusinessData();
  const { isSubscribed } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    if (businessId) {
      fetchJobs();
      fetchInspectors();
    }
  }, [businessId]);

  const fetchInspectors = async () => {
    try {
      const staffMembers = await getStaffMembers();
      setInspectors(staffMembers);
    } catch (error) {
      console.error('Error fetching inspectors:', error);
    }
  };

  const fetchJobs = async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inspection_jobs')
        .select(`
          *,
          assigned_inspector:inspectors!inspection_jobs_assigned_to_fkey(name, email)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs((data as any) || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error Loading Jobs",
        description: "Failed to load inspection jobs. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'border-l-destructive';
      case 'in_progress':
        return 'border-l-warning';
      case 'submitted':
        return 'border-l-success';
      default:
        return 'border-l-muted';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" />Not Started</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="gap-1 border-warning text-warning"><Clock className="w-3 h-3" />In Progress</Badge>;
      case 'submitted':
        return <Badge variant="default" className="gap-1 bg-success hover:bg-success/80"><CheckCircle2 className="w-3 h-3" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUrgencyColor = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline < 24) return 'text-destructive';
    if (hoursUntilDeadline < 48) return 'text-warning';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <MobileScreen>
      <MobileHeader 
        title="Dashboard" 
        subtitle={`${business?.name}`}
        rightAction={
          inspectors.length > 0 && (
            <CreateInspectionJobModal onJobCreated={fetchJobs}>
              <Button variant="touch" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Job</span>
              </Button>
            </CreateInspectionJobModal>
          )
        }
      />

      <div className="space-y-6 pb-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <MobileCard variant="flat" className="text-center p-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{jobs.length}</div>
                <div className="text-sm text-muted-foreground">Total Jobs</div>
              </div>
            </div>
          </MobileCard>
          
          <MobileCard variant="flat" className="text-center p-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-warning/10 rounded-2xl">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  {jobs.filter(job => job.status === 'in_progress').length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </div>
          </MobileCard>
          
          <MobileCard variant="flat" className="text-center p-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-success/10 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {jobs.filter(job => job.status === 'submitted').length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </MobileCard>
          
          <MobileCard variant="flat" className="text-center p-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{inspectors.length}</div>
                <div className="text-sm text-muted-foreground">Inspectors</div>
              </div>
            </div>
          </MobileCard>
        </div>

        {/* Jobs List */}
        <MobileCard variant="elevated">
          <MobileCardHeader>
            <div className="flex items-center justify-between">
              <div>
                <MobileCardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Inspection Jobs
                </MobileCardTitle>
                <MobileCardDescription>
                  Manage vehicle inspections
                </MobileCardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchJobs}
                className="h-10 w-10 rounded-full"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </MobileCardHeader>
          
          <MobileCardContent>
            {jobs.length === 0 ? (
              <div className="text-center space-y-6 py-12">
                <div className="w-20 h-20 bg-muted/30 rounded-3xl flex items-center justify-center mx-auto">
                  <Car className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Jobs Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                    Create your first vehicle inspection job to get started.
                  </p>
                  
                  {inspectors.length > 0 ? (
                    <CreateInspectionJobModal onJobCreated={fetchJobs}>
                      <Button variant="mobile" className="gap-2">
                        <Plus className="w-5 h-5" />
                        Create First Job
                      </Button>
                    </CreateInspectionJobModal>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Add staff members first to create jobs
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = '/admin'}
                        className="h-12 rounded-2xl"
                      >
                        Add Staff Members
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <MobileCard 
                    key={job.id} 
                    variant="bordered"
                    interactive
                    className={`border-l-4 ${getStatusColor(job.status)}`}
                  >
                    <div className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-lg truncate">
                            {job.make} {job.model}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="px-3 py-1 bg-muted/50 rounded-full">
                              <span className="text-sm font-mono font-medium">{job.reg}</span>
                            </div>
                            {getStatusBadge(job.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {job.seller_address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span className="truncate">{job.seller_address}</span>
                          </div>
                        )}
                        
                        <div className={`flex items-center gap-2 ${getUrgencyColor(job.deadline)}`}>
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span className="truncate">
                            Due: {format(new Date(job.deadline), 'MMM d, yyyy')}
                          </span>
                        </div>
                        
                        {job.assigned_inspector && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4 shrink-0" />
                            <span className="truncate">{job.assigned_inspector.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="touch"
                          size="sm"
                          onClick={() => window.location.href = `/inspection/${job.id}`}
                          className="flex-1 gap-2"
                        >
                          <PlayCircle className="w-4 h-4" />
                          {job.status === 'submitted' ? 'View Report' : 'Continue'}
                        </Button>
                        {job.status === 'submitted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/negotiation/${job.id}`}
                            className="flex-1 gap-2 rounded-2xl active:scale-95 transition-all"
                          >
                            <DollarSign className="w-4 h-4" />
                            {job.negotiation_status === 'agreed' ? 'Agreement' : 'Negotiate'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>
            )}
          </MobileCardContent>
        </MobileCard>
      </div>
    </MobileScreen>
  );
};

export default Dashboard;