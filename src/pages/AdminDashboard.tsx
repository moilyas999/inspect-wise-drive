import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Car, 
  Clock, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  Users,
  BarChart3,
  Filter,
  XCircle,
  DollarSign
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Mobile-optimized header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">{business?.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="gap-2 h-10 px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 pb-20">
        <Tabs defaultValue="inspections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
            <TabsTrigger value="inspections" className="gap-2 text-sm rounded-lg">
              <Car className="w-4 h-4" />
              <span className="hidden sm:inline">Inspections</span>
              <span className="sm:hidden">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2 text-sm rounded-lg">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Staff Management</span>
              <span className="sm:hidden">Staff</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="space-y-6">
            {/* Mobile-optimized stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
                  <div className="text-xl font-bold text-primary">{stats.total}</div>
                </CardHeader>
              </Card>
              <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Not Started</CardTitle>
                  <div className="text-xl font-bold text-muted-foreground">{stats.notStarted}</div>
                </CardHeader>
              </Card>
              <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">In Progress</CardTitle>
                  <div className="text-xl font-bold text-warning">{stats.inProgress}</div>
                </CardHeader>
              </Card>
              <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Submitted</CardTitle>
                  <div className="text-xl font-bold text-success">{stats.submitted}</div>
                </CardHeader>
              </Card>
              <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
                  <div className="text-xl font-bold text-warning">{stats.pendingReview}</div>
                </CardHeader>
              </Card>
              <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Approved</CardTitle>
                  <div className="text-xl font-bold text-success">{stats.approved}</div>
                </CardHeader>
              </Card>
            </div>

            {/* Mobile-optimized filters */}
            <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="w-5 h-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by registration, VIN, make..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-2 focus:border-primary/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-12 rounded-xl border-2 focus:border-primary/30">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-popover/95 backdrop-blur-sm border-2">
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Review</Label>
                      <Select value={reviewFilter} onValueChange={setReviewFilter}>
                        <SelectTrigger className="h-12 rounded-xl border-2 focus:border-primary/30">
                          <SelectValue placeholder="All Reviews" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-popover/95 backdrop-blur-sm border-2">
                          <SelectItem value="all">All Reviews</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={fetchJobs}
                    className="w-full gap-2 h-12 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile-optimized jobs list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Jobs ({filteredJobs.length})
                </h2>
              </div>

              {filteredJobs.length === 0 ? (
                <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-2xl">
                  <CardContent className="py-12 text-center">
                    <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {jobs.length === 0 ? 'No Inspection Jobs' : 'No Results Found'}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {jobs.length === 0 
                        ? 'No inspection jobs have been created yet.' 
                        : 'Try adjusting your search criteria or filters.'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <Card 
                      key={job.id} 
                      className={`shadow-card border-0 bg-card/80 backdrop-blur-sm border-l-4 ${getUrgencyColor(job.deadline)} transition-all hover:shadow-lg rounded-2xl rounded-l-lg`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold truncate">
                              {job.make} {job.model}
                            </CardTitle>
                            <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <span className="font-mono text-sm bg-muted px-2 py-1 rounded-lg">
                                {job.reg}
                              </span>
                              {job.vin && (
                                <span className="text-xs text-muted-foreground truncate">
                                  VIN: {job.vin}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-2 ml-2">
                            {getStatusBadge(job.status)}
                            {job.status === 'submitted' && getReviewBadge(job.review_status)}
                            {job.status === 'submitted' && job.negotiation_status && getNegotiationBadge(job.negotiation_status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Inspector: {job.assigned_inspector?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Deadline: {format(new Date(job.deadline), 'PP')}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 h-10 rounded-xl flex-1"
                            onClick={() => navigate(`/admin/inspection/${job.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </Button>
                          {job.status === 'submitted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 h-10 rounded-xl flex-1"
                              onClick={() => navigate(`/admin/negotiation/${job.id}`)}
                            >
                              <DollarSign className="w-4 h-4" />
                              Negotiate
                            </Button>
                          )}
                          {job.vehicle_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 h-10 rounded-xl flex-1"
                              onClick={() => navigate(`/admin/vehicle/${job.vehicle_id}`)}
                            >
                              <Car className="w-4 h-4" />
                              Vehicle
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <StaffManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;