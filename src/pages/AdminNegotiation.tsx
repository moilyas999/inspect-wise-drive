import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentInspector } from '@/hooks/useCurrentInspector';
import NegotiationPanel from '@/components/NegotiationPanel';
import { 
  ArrowLeft,
  Car,
  Clock,
  DollarSign,
  RefreshCw,
  User,
  MapPin,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface InspectionJob {
  id: string;
  reg: string;
  make: string;
  model: string;
  vin: string;
  seller_address: string;
  status: string;
  negotiation_status: string;
  business_id: string;
  deadline: string;
  final_agreed_price?: number;
  assigned_inspector?: {
    name: string;
    email: string;
  };
}

const AdminNegotiation = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { inspector } = useCurrentInspector();
  
  const [job, setJob] = useState<InspectionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    fetchJobData();
    
    // Auto-refresh every 10 seconds when negotiation is active
    const interval = setInterval(() => {
      if (job?.negotiation_status && 
          !['agreed', 'declined'].includes(job.negotiation_status)) {
        handleRefresh();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [jobId, job?.negotiation_status]);

  const fetchJobData = async () => {
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
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load job details",
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobData();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agreed':
        return <Badge className="bg-success hover:bg-success/80">✅ Price Agreed</Badge>;
      case 'declined':
        return <Badge variant="destructive">❌ Negotiation Ended</Badge>;
      case 'pending_admin':
        return <Badge className="bg-warning hover:bg-warning/80">⏰ Your Turn to Respond</Badge>;
      case 'pending_user':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Awaiting User Response</Badge>;
      default:
        return <Badge variant="secondary">Awaiting Initial Offer</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading negotiation...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Car className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Job Not Found</h2>
          <Button onClick={() => navigate('/admin')}>Return to Admin Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">
                Admin Negotiation: {job.make} {job.model}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">{job.reg}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(job.negotiation_status)}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Vehicle Info */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle & Inspection Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{job.seller_address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Inspector: {job.assigned_inspector?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>VIN: {job.vin}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Deadline: {format(new Date(job.deadline), 'PPp')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Status:</span>
                <Badge variant="outline">{job.status}</Badge>
              </div>
              {job.final_agreed_price && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="font-medium text-success">
                    Final Price: £{job.final_agreed_price.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/inspection/${jobId}`)}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                View Full Inspection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Negotiation Panel */}
        {job.business_id && inspector && (
          <NegotiationPanel
            jobId={job.id}
            businessId={job.business_id}
            isAdmin={true}
            currentUserId={inspector.id}
            negotiationStatus={job.negotiation_status}
            onNegotiationUpdate={fetchJobData}
          />
        )}

        {/* Status Messages */}
        {job.negotiation_status === 'not_started' && (
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Awaiting Initial Offer</h3>
              <p className="text-muted-foreground">
                The inspector hasn't submitted a price offer yet. Once they do, you'll be able to respond here.
              </p>
            </CardContent>
          </Card>
        )}

        {job.negotiation_status === 'pending_user' && (
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 text-warning mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Waiting for Inspector Response</h3>
              <p className="text-muted-foreground">
                Your response has been sent. Waiting for the inspector to accept or make a counter-offer.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This page will automatically refresh when there's an update.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminNegotiation;