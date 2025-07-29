import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createSampleJobs, getInspectorId } from '@/lib/sampleData';
import { 
  Car, 
  Clock, 
  MapPin, 
  PlayCircle, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

interface InspectionJob {
  id: string;
  reg: string;
  make: string;
  model: string;
  vin: string;
  seller_address: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'submitted';
  created_at: string;
}

const Dashboard = () => {
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingJobs, setCreatingJobs] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_jobs')
        .select('*')
        .order('deadline', { ascending: true });

      if (error) throw error;
      setJobs((data as InspectionJob[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inspection jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleJobs = async () => {
    setCreatingJobs(true);
    try {
      const inspectorId = await getInspectorId();
      if (!inspectorId) {
        toast({
          title: "Error",
          description: "Inspector profile not found",
          variant: "destructive",
        });
        return;
      }

      const result = await createSampleJobs(inspectorId);
      if (result.success) {
        toast({
          title: "Sample Jobs Created",
          description: "3 sample inspection jobs have been added to your dashboard",
        });
        fetchJobs(); // Refresh the jobs list
      } else {
        toast({
          title: "Error",
          description: "Failed to create sample jobs",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setCreatingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const startInspection = (jobId: string) => {
    navigate(`/inspection/${jobId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" />Not Started</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="gap-1 border-warning text-warning"><Clock className="w-3 h-3" />In Progress</Badge>;
      case 'submitted':
        return <Badge variant="default" className="gap-1 bg-success hover:bg-success/80"><CheckCircle2 className="w-3 h-3" />Submitted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUrgencyColor = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline < 24) return 'border-l-destructive';
    if (hoursUntilDeadline < 48) return 'border-l-warning';
    return 'border-l-primary';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your inspection jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Inspector Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.user_metadata?.name || 'Inspector'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
              <div className="text-2xl font-bold text-primary">{jobs.length}</div>
            </CardHeader>
          </Card>
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <div className="text-2xl font-bold text-warning">
                {jobs.filter(job => job.status === 'in_progress').length}
              </div>
            </CardHeader>
          </Card>
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <div className="text-2xl font-bold text-success">
                {jobs.filter(job => job.status === 'submitted').length}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Inspection Jobs</h2>
            <div className="flex gap-2">
              {jobs.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateSampleJobs}
                  disabled={creatingJobs}
                  className="gap-2"
                >
                  {creatingJobs ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Sample Jobs
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchJobs}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          {jobs.length === 0 ? (
            <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center space-y-4">
                <Car className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Jobs Available</h3>
                  <p className="text-muted-foreground mb-4">
                    No inspection assignments found. You can add some sample jobs to get started.
                  </p>
                  <Button
                    onClick={handleCreateSampleJobs}
                    disabled={creatingJobs}
                    variant="mobile"
                    className="gap-2"
                  >
                    {creatingJobs ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Creating Jobs...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add Sample Inspection Jobs
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Card 
                  key={job.id} 
                  className={`shadow-card border-0 bg-card/80 backdrop-blur-sm border-l-4 ${getUrgencyColor(job.deadline)} transition-all hover:shadow-lg hover:scale-[1.01]`}
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
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{job.seller_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          Deadline: {format(new Date(job.deadline), 'PPp')}
                        </span>
                      </div>
                    </div>

                    {job.status !== 'submitted' && (
                      <Button
                        onClick={() => startInspection(job.id)}
                        variant="mobile"
                        className="w-full"
                      >
                        <PlayCircle className="w-5 h-5" />
                        {job.status === 'not_started' ? 'Start Inspection' : 'Continue Inspection'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;