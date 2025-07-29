import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessData } from '@/hooks/useBusinessData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import StaffManagement from './StaffManagement';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Car, Clock, LogOut, CheckCircle2, AlertCircle, RefreshCw, Search, Eye, Users, BarChart3, Filter, XCircle, DollarSign 
} from 'lucide-react';
import { format } from 'date-fns';
import { MobileScreen } from '@/components/ui/mobile-container';
import { MobileHeader } from '@/components/ui/mobile-header';
import { MobileCard, MobileCardContent, MobileCardHeader, MobileCardTitle, MobileCardDescription } from '@/components/ui/mobile-card';
import { MobileInput } from '@/components/ui/mobile-input';

interface InspectionJob {
  id: string;
  reg: string;
  make: string;
  model: string;
  vin: string;
  seller_address: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'submitted';
  review_status: 'pending' | 'approved' | 'rejected';
  negotiation_status?: string;
  created_at: string;
  vehicle_id?: string;
  assigned_inspector?: {
    name: string;
    email: string;
  };
}

const AdminDashboard = () => {
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<InspectionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const { user, signOut } = useAuth();
  const { business } = useBusinessData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inspection_jobs')
        .select(`
          *,
          assigned_inspector:inspectors!inspection_jobs_assigned_to_fkey(
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }
      
      const transformedJobs = (data || []).map(job => ({
        ...job,
        assigned_inspector: job.assigned_inspector
      })) as InspectionJob[];
      
      setJobs(transformedJobs);
      setFilteredJobs(transformedJobs);
      
      if (transformedJobs.length === 0) {
        toast({
          title: "No Inspection Jobs",
          description: "No inspection jobs found. Create your first job to get started.",
        });
      }
    } catch (error: any) {
      console.error('Error in fetchJobs:', error);
      toast({
        title: "Error Loading Data",
        description: error.message || "Failed to load inspection jobs. Please refresh the page.",
        variant: "destructive",
      });
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    let filtered = jobs;

    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.assigned_inspector?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    if (reviewFilter !== 'all') {
      filtered = filtered.filter(job => job.review_status === reviewFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter, reviewFilter]);

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

  const getReviewBadge = (reviewStatus: string) => {
    switch (reviewStatus) {
      case 'approved':
        return <Badge className="gap-1 bg-success hover:bg-success/80"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending Review</Badge>;
    }
  };

  const getNegotiationBadge = (negotiationStatus: string) => {
    switch (negotiationStatus) {
      case 'agreed':
        return <Badge className="bg-success hover:bg-success/80"><CheckCircle2 className="w-3 h-3 mr-1" />Price Agreed</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'pending_admin':
        return <Badge className="bg-warning hover:bg-warning/80"><Clock className="w-3 h-3 mr-1" />Your Turn</Badge>;
      case 'pending_user':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Awaiting User</Badge>;
      default:
        return null;
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

  const getStats = () => {
    const total = jobs.length;
    const notStarted = jobs.filter(job => job.status === 'not_started').length;
    const inProgress = jobs.filter(job => job.status === 'in_progress').length;
    const submitted = jobs.filter(job => job.status === 'submitted').length;
    const pendingReview = jobs.filter(job => job.review_status === 'pending').length;
    const approved = jobs.filter(job => job.review_status === 'approved').length;
    
    return { total, notStarted, inProgress, submitted, pendingReview, approved };
  };

  const stats = getStats();

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
        title="Admin Dashboard" 
        subtitle={business?.name}
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-10 w-10 rounded-full"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        }
      />

      <div className="space-y-6 pb-8">
        <Tabs defaultValue="inspections" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl mb-6">
            <TabsTrigger value="inspections" className="gap-2 text-sm rounded-xl">
              <Car className="w-4 h-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2 text-sm rounded-xl">
              <Users className="w-4 h-4" />
              Staff
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <MobileCard variant="flat" className="text-center p-4">
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </MobileCard>
              <MobileCard variant="flat" className="text-center p-4">
                <div className="text-2xl font-bold text-warning">{stats.inProgress}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </MobileCard>
              <MobileCard variant="flat" className="text-center p-4">
                <div className="text-2xl font-bold text-success">{stats.submitted}</div>
                <div className="text-xs text-muted-foreground">Done</div>
              </MobileCard>
            </div>

            {/* Search */}
            <MobileInput
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />

            {/* Jobs List */}
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <MobileCard 
                  key={job.id} 
                  variant="bordered"
                  className={`border-l-4 ${getUrgencyColor(job.deadline)}`}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{job.make} {job.model}</h4>
                        <p className="text-sm text-muted-foreground">{job.reg}</p>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="touch"
                        size="sm"
                        onClick={() => navigate(`/review/${job.id}`)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="staff">
            <StaffManagement />
          </TabsContent>
        </Tabs>
      </div>
    </MobileScreen>
  );
};

export default AdminDashboard;