import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  Filter
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
  inspector?: {
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
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_jobs')
        .select(`
          *,
          inspectors!inner(
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedJobs = (data || []).map(job => ({
        ...job,
        inspector: job.inspectors
      })) as InspectionJob[];
      
      setJobs(transformedJobs);
      setFilteredJobs(transformedJobs);
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

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    let filtered = jobs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.inspector?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter]);

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

  const getStats = () => {
    const total = jobs.length;
    const notStarted = jobs.filter(job => job.status === 'not_started').length;
    const inProgress = jobs.filter(job => job.status === 'in_progress').length;
    const submitted = jobs.filter(job => job.status === 'submitted').length;
    
    return { total, notStarted, inProgress, submitted };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading inspection data...</p>
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
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Vehicle Inspection Management</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
            </CardHeader>
          </Card>
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Not Started</CardTitle>
              <div className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</div>
            </CardHeader>
          </Card>
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <div className="text-2xl font-bold text-warning">{stats.inProgress}</div>
            </CardHeader>
          </Card>
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <div className="text-2xl font-bold text-success">{stats.submitted}</div>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by registration, VIN, make, model, or inspector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="default"
                onClick={fetchJobs}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Inspection Jobs ({filteredJobs.length})
            </h2>
          </div>

          {filteredJobs.length === 0 ? (
            <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {jobs.length === 0 ? 'No Inspection Jobs' : 'No Results Found'}
                </h3>
                <p className="text-muted-foreground">
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
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Inspector: {job.inspector?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Deadline: {format(new Date(job.deadline), 'PPp')}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </div>
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

export default AdminDashboard;