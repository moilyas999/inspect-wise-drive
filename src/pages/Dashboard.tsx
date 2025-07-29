import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBusinessData, Inspector } from '@/hooks/useBusinessData';
import { supabase } from '@/integrations/supabase/client';
import CreateInspectionJobModal from '@/components/CreateInspectionJobModal';
import { 
  Car,
  Clock, 
  MapPin, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Plus,
  Calendar,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">
              Manage vehicle inspections for {business?.name}
            </p>
          </div>
          
          {inspectors.length > 0 && (
            <CreateInspectionJobModal onJobCreated={fetchJobs} inspectors={inspectors}>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Inspection Job
              </Button>
            </CreateInspectionJobModal>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Car className="w-4 h-4" />
                Total Jobs
              </CardTitle>
              <div className="text-2xl font-bold text-primary">{jobs.length}</div>
            </CardHeader>
          </Card>
          
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                In Progress
              </CardTitle>
              <div className="text-2xl font-bold text-warning">
                {jobs.filter(job => job.status === 'in_progress').length}
              </div>
            </CardHeader>
          </Card>
          
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </CardTitle>
              <div className="text-2xl font-bold text-success">
                {jobs.filter(job => job.status === 'submitted').length}
              </div>
            </CardHeader>
          </Card>
          
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Inspectors
              </CardTitle>
              <div className="text-2xl font-bold text-primary">{inspectors.length}</div>
            </CardHeader>
          </Card>
        </div>

        {/* Jobs List */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Vehicle Inspection Jobs
                </CardTitle>
                <CardDescription>
                  Manage all vehicle purchase inspections
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchJobs}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center space-y-4 py-12">
                <Car className="w-16 h-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Inspection Jobs Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first vehicle inspection job to get started with your dealership operations.
                  </p>
                  
                  {inspectors.length > 0 ? (
                    <CreateInspectionJobModal onJobCreated={fetchJobs} inspectors={inspectors}>
                      <Button size="lg" className="gap-2">
                        <Plus className="w-5 h-5" />
                        Create First Inspection Job
                      </Button>
                    </CreateInspectionJobModal>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        You need to add staff members before creating inspection jobs.
                      </p>
                      <Button variant="outline" onClick={() => window.location.href = '/admin'}>
                        Add Staff Members First
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Card 
                    key={job.id} 
                    className={`border-l-4 ${getStatusColor(job.status)} transition-all hover:shadow-md`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-semibold">
                            {job.make} {job.model}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                              {job.reg}
                            </span>
                            {job.vin && (
                              <span className="text-xs text-muted-foreground">
                                VIN: {job.vin}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {job.seller_address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{job.seller_address}</span>
                          </div>
                        )}
                        
                        <div className={`flex items-center gap-2 ${getUrgencyColor(job.deadline)}`}>
                          <Calendar className="w-4 h-4" />
                          <span>
                            Deadline: {format(new Date(job.deadline), 'PPp')}
                          </span>
                        </div>
                        
                        {job.assigned_inspector && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>Assigned to: {job.assigned_inspector.name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Created: {format(new Date(job.created_at), 'PPp')}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/inspection/${job.id}`}
                          className="gap-2"
                        >
                          <PlayCircle className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;