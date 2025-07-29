import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentInspector } from '@/hooks/useCurrentInspector';
import NegotiationPanel from '@/components/NegotiationPanel';
import { 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  User,
  Flag,
  FileText,
  Camera
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
  status: string;
  review_status: string;
  negotiation_status?: string;
  business_id?: string;
  assigned_inspector?: {
    name: string;
    email: string;
  };
}

interface InspectionSection {
  id: string;
  section_name: string;
  section_order: number;
  is_complete: boolean;
  notes: string;
  rating: number;
  inspector_comments: string;
  inspection_items: InspectionItem[];
}

interface InspectionItem {
  id: string;
  item_name: string;
  item_description: string;
  is_checked: boolean;
  condition_rating: number;
  notes: string;
  photo_url: string;
  requires_photo: boolean;
}

interface InspectionFault {
  id: string;
  type: string;
  description: string;
  location: string;
  media_url: string;
  flagged_for_repair: boolean;
}

const InspectionReview = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<InspectionJob | null>(null);
  const [sections, setSections] = useState<InspectionSection[]>([]);
  const [faults, setFaults] = useState<InspectionFault[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { inspector } = useCurrentInspector();

  useEffect(() => {
    if (!jobId) return;
    fetchInspectionData();
  }, [jobId]);

  const fetchInspectionData = async () => {
    try {
      setLoading(true);

      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
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

      if (jobError) throw jobError;
      setJob(jobData as InspectionJob);

      // Fetch inspection sections with items
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('inspection_sections')
        .select(`
          *,
          inspection_items (*)
        `)
        .eq('job_id', jobId)
        .order('section_order', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData as InspectionSection[]);

      // Fetch faults
      const { data: faultsData, error: faultsError } = await supabase
        .from('inspection_faults')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (faultsError) throw faultsError;
      setFaults(faultsData as InspectionFault[]);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inspection details",
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (reviewStatus: 'approved' | 'rejected') => {
    if (!job) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('inspection_jobs')
        .update({
          review_status: reviewStatus,
          reviewed_at: new Date().toISOString(),
          // reviewed_by would be set to current admin's inspector ID
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: `Inspection ${reviewStatus === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The inspection has been ${reviewStatus}`,
      });

      navigate('/admin');
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${reviewStatus} inspection`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaultFlag = async (faultId: string, currentFlag: boolean) => {
    try {
      const { error } = await supabase
        .from('inspection_faults')
        .update({ flagged_for_repair: !currentFlag })
        .eq('id', faultId);

      if (error) throw error;

      setFaults(prev => prev.map(fault => 
        fault.id === faultId 
          ? { ...fault, flagged_for_repair: !currentFlag }
          : fault
      ));

      toast({
        title: currentFlag ? "Fault Unflagged" : "Fault Flagged",
        description: currentFlag 
          ? "Fault removed from prep team queue"
          : "Fault flagged for preparation team",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update fault flag",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="gap-1 bg-success hover:bg-success/80"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending Review</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading inspection details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Inspection Not Found</h2>
          <Button onClick={() => navigate('/admin')}>Return to Dashboard</Button>
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
                Inspection Review: {job.make} {job.model}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">{job.reg}</p>
            </div>
            {getStatusBadge(job.review_status)}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Vehicle Info */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle Information
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
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Deadline: {format(new Date(job.deadline), 'PPp')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>VIN: {job.vin}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Sections */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Inspection Details</CardTitle>
            <CardDescription>
              {sections.length === 0 ? 'No inspection data available yet' : 
               `Completed sections: ${sections.filter(s => s.is_complete).length} / ${sections.length}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Inspection Data</h3>
                <p className="text-muted-foreground">
                  This inspection hasn't been started yet. The inspector needs to begin the inspection process.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sections.map((section) => (
                  <div key={section.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      {section.is_complete ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <h3 className="font-semibold">{section.section_name}</h3>
                      {section.rating && (
                        <Badge variant="outline">
                          {section.rating}/5 stars
                        </Badge>
                      )}
                    </div>
                    
                    {section.inspector_comments && (
                      <div className="mb-4 p-3 bg-muted/50 rounded">
                        <p className="text-sm font-medium mb-1">Inspector Comments:</p>
                        <p className="text-sm text-muted-foreground">{section.inspector_comments}</p>
                      </div>
                    )}

                    {section.inspection_items && section.inspection_items.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Inspection Items:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {section.inspection_items.map((item) => (
                            <div
                              key={item.id}
                              className={`p-3 rounded border ${
                                item.is_checked ? 'bg-success/10 border-success/20' : 'bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {item.is_checked ? (
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium">{item.item_name}</span>
                              </div>
                              {item.item_description && (
                                <p className="text-xs text-muted-foreground mb-2">{item.item_description}</p>
                              )}
                              {item.condition_rating && (
                                <p className="text-xs text-muted-foreground">
                                  Condition: {item.condition_rating}/5
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Notes: {item.notes}
                                </p>
                              )}
                              {item.photo_url && (
                                <div className="mt-2">
                                  <div className="flex items-center gap-1 text-xs text-primary mb-1">
                                    <Camera className="w-3 h-3" />
                                    Photo:
                                  </div>
                                  <img 
                                    src={item.photo_url} 
                                    alt={`${item.item_name} inspection photo`}
                                    className="w-full max-w-xs rounded-lg border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(item.photo_url, '_blank')}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faults */}
        {faults.length > 0 && (
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Reported Faults ({faults.length})
              </CardTitle>
              <CardDescription>
                Issues found during inspection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faults.map((fault) => (
                  <div
                    key={fault.id}
                    className={`p-4 rounded-lg border ${
                      fault.flagged_for_repair 
                        ? 'bg-warning/10 border-warning/30' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {fault.type}
                          </Badge>
                          {fault.location && (
                            <span className="text-sm text-muted-foreground">
                              {fault.location}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{fault.description}</p>
                        {fault.media_url && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Camera className="w-3 h-3" />
                              Photo evidence:
                            </div>
                            <img 
                              src={fault.media_url} 
                              alt={`${fault.type} fault photo`}
                              className="w-full max-w-xs rounded-lg border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(fault.media_url, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant={fault.flagged_for_repair ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFaultFlag(fault.id, fault.flagged_for_repair)}
                        className="gap-1"
                      >
                        <Flag className="w-3 h-3" />
                        {fault.flagged_for_repair ? 'Flagged' : 'Flag for Prep'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Negotiation Panel */}
        {job.business_id && (
          <NegotiationPanel
            jobId={job.id}
            businessId={job.business_id}
            isAdmin={true}
            currentUserId={inspector?.id || ""}
            negotiationStatus={job.negotiation_status || 'not_started'}
            onNegotiationUpdate={fetchInspectionData}
          />
        )}

        {/* Review Actions */}
        {job.review_status === 'pending' && (
          <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Review Actions</CardTitle>
              <CardDescription>
                Approve or reject this inspection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Review Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any notes about this inspection..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="min-h-20"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleReviewSubmit('rejected')}
                  disabled={submitting}
                  className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Inspection
                </Button>
                <Button
                  onClick={() => handleReviewSubmit('approved')}
                  disabled={submitting}
                  className="flex-1 gap-2 bg-success hover:bg-success/80"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Inspection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InspectionReview;