import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Car, FileText, Wrench, Camera, Video, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  reg: string;
  vin: string;
  make: string;
  model: string;
  status: string;
  current_stage: string;
  created_at: string;
}

interface InspectionJob {
  id: string;
  status: string;
  review_status: string;
  deadline: string;
  reviewed_at: string;
  assigned_to: string;
  inspector_name: string;
}

interface InspectionStep {
  id: string;
  section: string;
  is_complete: boolean;
  rating: number;
  notes: string;
  updated_at: string;
}

interface InspectionFault {
  id: string;
  type: string;
  description: string;
  location: string;
  flagged_for_repair: boolean;
  media_url: string;
  created_at: string;
  prep_progress?: {
    status: string;
    repair_photo_url: string;
    repair_video_url: string;
    parts_used: string;
    notes: string;
    completed_at: string;
  };
}

interface InspectionMedia {
  id: string;
  section: string;
  media_type: string;
  url: string;
  timestamp: string;
  duration?: number;
}

interface TimelineEvent {
  id: string;
  type: 'inspection' | 'fault' | 'repair' | 'review' | 'media';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  status?: string;
}

export default function VehicleProfile() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [inspectionJob, setInspectionJob] = useState<InspectionJob | null>(null);
  const [inspectionSteps, setInspectionSteps] = useState<InspectionStep[]>([]);
  const [faults, setFaults] = useState<InspectionFault[]>([]);
  const [media, setMedia] = useState<InspectionMedia[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleData();
    }
  }, [vehicleId]);

  const fetchVehicleData = async () => {
    try {
      setLoading(true);

      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (vehicleError) throw vehicleError;
      setVehicle(vehicleData);

      // Fetch inspection job
      const { data: jobData, error: jobError } = await supabase
        .from('inspection_jobs')
        .select(`
          *,
          inspectors!assigned_to (name)
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (jobError && jobError.code !== 'PGRST116') throw jobError;
      if (jobData) {
        setInspectionJob({
          ...jobData,
          inspector_name: jobData.inspectors?.name || 'Unknown'
        });
      }

      // Fetch inspection steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('inspection_steps')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('section');

      if (stepsError) throw stepsError;
      setInspectionSteps(stepsData || []);

      // Fetch faults with prep progress
      const { data: faultsData, error: faultsError } = await supabase
        .from('inspection_faults')
        .select(`
          *,
          prep_progress (
            status,
            repair_photo_url,
            repair_video_url,
            parts_used,
            notes,
            completed_at
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (faultsError) throw faultsError;
      
      // Transform the data to handle prep_progress array
      const transformedFaults = (faultsData || []).map(fault => ({
        ...fault,
        prep_progress: Array.isArray(fault.prep_progress) && fault.prep_progress.length > 0 
          ? fault.prep_progress[0] 
          : null
      }));
      
      setFaults(transformedFaults);

      // Fetch media
      const { data: mediaData, error: mediaError } = await supabase
        .from('inspection_media')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('timestamp', { ascending: false });

      if (mediaError) throw mediaError;
      setMedia(mediaData || []);

      // Build timeline
      buildTimeline(vehicleData, jobData, stepsData, transformedFaults, mediaData);

    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      toast({
        title: "Error",
        description: "Failed to load vehicle data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildTimeline = (
    vehicle: Vehicle,
    job: any,
    steps: InspectionStep[],
    faults: InspectionFault[],
    media: InspectionMedia[]
  ) => {
    const events: TimelineEvent[] = [];

    // Vehicle created
    events.push({
      id: `vehicle-${vehicle.id}`,
      type: 'inspection',
      title: 'Vehicle Added',
      description: `${vehicle.make} ${vehicle.model} (${vehicle.reg}) added to system`,
      timestamp: vehicle.created_at,
      icon: <Car className="h-4 w-4" />,
    });

    // Inspection job events
    if (job) {
      events.push({
        id: `job-${job.id}`,
        type: 'inspection',
        title: 'Inspection Started',
        description: `Assigned to ${job.inspector_name}`,
        timestamp: job.created_at,
        icon: <FileText className="h-4 w-4" />,
      });

      if (job.status === 'submitted') {
        events.push({
          id: `job-submitted-${job.id}`,
          type: 'inspection',
          title: 'Inspection Submitted',
          description: 'Inspector completed checklist',
          timestamp: job.updated_at,
          icon: <CheckCircle className="h-4 w-4" />,
          status: 'completed'
        });
      }

      if (job.reviewed_at) {
        events.push({
          id: `job-reviewed-${job.id}`,
          type: 'review',
          title: `Inspection ${job.review_status}`,
          description: `Admin reviewed and ${job.review_status} the inspection`,
          timestamp: job.reviewed_at,
          icon: job.review_status === 'approved' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />,
          status: job.review_status
        });
      }
    }

    // Media events (key videos)
    media.forEach(item => {
      if (item.media_type === 'video' && (item.section === 'walkaround' || item.section === 'bonnet')) {
        events.push({
          id: `media-${item.id}`,
          type: 'media',
          title: `${item.section === 'walkaround' ? 'Walkaround' : 'Bonnet'} Video Uploaded`,
          description: `${item.section === 'walkaround' ? '360° walkaround' : 'Engine sound recording'} completed`,
          timestamp: item.timestamp,
          icon: <Video className="h-4 w-4" />,
        });
      }
    });

    // Fault events
    faults.forEach(fault => {
      events.push({
        id: `fault-${fault.id}`,
        type: 'fault',
        title: `${fault.type} Fault Detected`,
        description: fault.description,
        timestamp: fault.created_at,
        icon: <AlertTriangle className="h-4 w-4" />,
        status: fault.flagged_for_repair ? 'flagged' : 'noted'
      });

      if (fault.prep_progress?.completed_at) {
        events.push({
          id: `repair-${fault.id}`,
          type: 'repair',
          title: 'Fault Repaired',
          description: `${fault.type} fault fixed${fault.prep_progress.parts_used ? ` using ${fault.prep_progress.parts_used}` : ''}`,
          timestamp: fault.prep_progress.completed_at,
          icon: <Wrench className="h-4 w-4" />,
          status: 'completed'
        });
      }
    });

    // Sort by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setTimeline(events);
  };

  const markAsReadyForSale = async () => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status: 'ready_for_sale',
          current_stage: 'complete'
        })
        .eq('id', vehicleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vehicle marked as ready for sale",
      });

      fetchVehicleData();
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      toast({
        title: "Error",
        description: "Failed to update vehicle status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Vehicle not found</h2>
          <Link to="/admin/dashboard" className="text-primary hover:underline">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{vehicle.make} {vehicle.model}</h1>
            <p className="text-muted-foreground">Registration: {vehicle.reg}</p>
            {vehicle.vin && <p className="text-sm text-muted-foreground">VIN: {vehicle.vin}</p>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={vehicle.status === 'ready_for_sale' ? 'default' : 'secondary'}>
            {vehicle.status}
          </Badge>
          <Badge variant="outline">
            {vehicle.current_stage}
          </Badge>
          {userRole === 'admin' && vehicle.status !== 'ready_for_sale' && (
            <Button onClick={markAsReadyForSale}>
              Mark Ready for Sale
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inspection">Inspection Details</TabsTrigger>
          <TabsTrigger value="faults">Faults & Repairs</TabsTrigger>
          <TabsTrigger value="media">Media Gallery</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Vehicle Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="h-5 w-5 mr-2" />
                  Vehicle Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Make:</span>
                  <span>{vehicle.make}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span>{vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration:</span>
                  <span>{vehicle.reg}</span>
                </div>
                {vehicle.vin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VIN:</span>
                    <span className="text-xs">{vehicle.vin}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={vehicle.status === 'ready_for_sale' ? 'default' : 'secondary'}>
                    {vehicle.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Inspection Status */}
            {inspectionJob && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Inspection Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inspector:</span>
                    <span>{inspectionJob.inspector_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={inspectionJob.status === 'submitted' ? 'default' : 'secondary'}>
                      {inspectionJob.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Review:</span>
                    <Badge variant={
                      inspectionJob.review_status === 'approved' ? 'default' :
                      inspectionJob.review_status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {inspectionJob.review_status}
                    </Badge>
                  </div>
                  {inspectionJob.deadline && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="text-xs">{new Date(inspectionJob.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inspection Steps:</span>
                  <span>{inspectionSteps.filter(s => s.is_complete).length}/{inspectionSteps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Faults Found:</span>
                  <span>{faults.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repairs Needed:</span>
                  <span>{faults.filter(f => f.flagged_for_repair).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Media Items:</span>
                  <span>{media.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inspection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspectionSteps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {step.is_complete ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                      )}
                      <div>
                        <h4 className="font-medium">{step.section}</h4>
                        {step.notes && (
                          <p className="text-sm text-muted-foreground">{step.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {step.rating && (
                        <Badge variant="outline">
                          Rating: {step.rating}/5
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(step.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faults" className="space-y-6">
          <div className="space-y-4">
            {faults.map((fault) => (
              <Card key={fault.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      {fault.type} Fault
                    </CardTitle>
                    <div className="flex space-x-2">
                      {fault.flagged_for_repair && (
                        <Badge variant="destructive">Repair Required</Badge>
                      )}
                      {fault.prep_progress?.status === 'completed' && (
                        <Badge variant="default">Repaired</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">Description</h4>
                    <p className="text-muted-foreground">{fault.description}</p>
                    {fault.location && (
                      <p className="text-sm text-muted-foreground">Location: {fault.location}</p>
                    )}
                  </div>

                  {fault.media_url && (
                    <div>
                      <h4 className="font-medium mb-2">Fault Evidence</h4>
                      <img 
                        src={fault.media_url} 
                        alt="Fault evidence" 
                        className="w-32 h-32 object-cover rounded"
                      />
                    </div>
                  )}

                  {fault.prep_progress && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Repair Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={fault.prep_progress.status === 'completed' ? 'default' : 'secondary'}>
                            {fault.prep_progress.status}
                          </Badge>
                        </div>
                        {fault.prep_progress.parts_used && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parts Used:</span>
                            <span>{fault.prep_progress.parts_used}</span>
                          </div>
                        )}
                        {fault.prep_progress.notes && (
                          <div>
                            <span className="text-muted-foreground">Repair Notes:</span>
                            <p className="text-sm">{fault.prep_progress.notes}</p>
                          </div>
                        )}
                        {fault.prep_progress.repair_photo_url && (
                          <div>
                            <span className="text-muted-foreground">Repair Evidence:</span>
                            <img 
                              src={fault.prep_progress.repair_photo_url} 
                              alt="Repair evidence" 
                              className="w-32 h-32 object-cover rounded mt-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {faults.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Faults Detected</h3>
                  <p className="text-muted-foreground">This vehicle passed inspection without any issues</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    {item.media_type === 'video' ? (
                      <Video className="h-4 w-4 mr-2" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    {item.section}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {item.media_type === 'video' ? (
                    <video 
                      src={item.url} 
                      controls 
                      className="w-full h-32 object-cover rounded"
                    />
                  ) : (
                    <img 
                      src={item.url} 
                      alt={item.section} 
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString()}
                    {item.duration && ` • ${item.duration}s`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full ${
                        event.status === 'completed' ? 'bg-green-100 text-green-600' :
                        event.status === 'approved' ? 'bg-blue-100 text-blue-600' :
                        event.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        event.status === 'flagged' ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {event.icon}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-200 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{event.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}