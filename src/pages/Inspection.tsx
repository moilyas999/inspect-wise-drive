import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Car,
  Clock,
  MapPin
} from 'lucide-react';

interface InspectionJob {
  id: string;
  reg: string;
  make: string;
  model: string;
  vin: string;
  seller_address: string;
  deadline: string;
  status: string;
}

interface InspectionStep {
  id: string;
  section: string;
  is_complete: boolean;
  notes: string;
}

const INSPECTION_SECTIONS = [
  { id: 'exterior', name: 'Exterior Check', required_photos: 4, description: 'Front, Rear, Left Side, Right Side' },
  { id: 'interior', name: 'Interior Check', required_photos: 3, description: 'Dashboard, Seats, Infotainment' },
  { id: 'engine_bay', name: 'Engine Bay', required_photos: 2, description: 'Open bonnet view, Close-up engine' },
  { id: 'diagnosis_before', name: 'Diagnosis Before Test Drive', required_photos: 2, description: 'Machine connected, Fault codes screen' },
  { id: 'mechanical_faults', name: 'Mechanical Faults', required_photos: 0, description: 'Record any mechanical issues' },
  { id: 'bodywork_faults', name: 'Bodywork Faults', required_photos: 0, description: 'Record bodywork damage' },
  { id: 'tyre_check', name: 'Tyre Check', required_photos: 4, description: 'All four tyres' },
  { id: 'dashboard_mileage', name: 'Dashboard & Mileage', required_photos: 2, description: 'Odometer, Warning lights' },
  { id: 'test_drive', name: 'Test Drive', required_photos: 0, description: 'Confirm test drive completion' },
  { id: 'diagnosis_after', name: 'Diagnosis After Test Drive', required_photos: 2, description: 'Post test drive scan' },
  { id: 'documents', name: 'Documents', required_photos: 2, description: 'V5C, Service history' },
  { id: 'final_summary', name: 'Final Summary', required_photos: 0, description: 'Overall condition rating' }
];

const Inspection = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [job, setJob] = useState<InspectionJob | null>(null);
  const [steps, setSteps] = useState<InspectionStep[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    fetchJobAndSteps();
  }, [jobId]);

  const fetchJobAndSteps = async () => {
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('inspection_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData as InspectionJob);

      // Fetch existing steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('inspection_steps')
        .select('*')
        .eq('job_id', jobId);

      if (stepsError) throw stepsError;
      setSteps(stepsData as InspectionStep[]);

      // Find current section
      const completedSections = (stepsData as InspectionStep[]).filter(step => step.is_complete);
      setCurrentSectionIndex(Math.min(completedSections.length, INSPECTION_SECTIONS.length - 1));

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inspection details",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from('inspection_jobs')
        .update({ status })
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  const completeSection = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from('inspection_steps')
        .upsert({
          job_id: jobId,
          section: sectionId,
          is_complete: true,
          notes: ''
        });

      if (error) throw error;

      // Update local state
      const updatedSteps = [...steps];
      const existingIndex = updatedSteps.findIndex(step => step.section === sectionId);
      
      if (existingIndex >= 0) {
        updatedSteps[existingIndex].is_complete = true;
      } else {
        updatedSteps.push({
          id: '',
          section: sectionId,
          is_complete: true,
          notes: ''
        });
      }
      
      setSteps(updatedSteps);

      // Move to next section
      if (currentSectionIndex < INSPECTION_SECTIONS.length - 1) {
        setCurrentSectionIndex(currentSectionIndex + 1);
      }

      // Update job status to in_progress
      if (job?.status === 'not_started') {
        updateJobStatus('in_progress');
        setJob(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }

      toast({
        title: "Section Complete",
        description: `${INSPECTION_SECTIONS[currentSectionIndex].name} marked as complete`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update section",
        variant: "destructive",
      });
    }
  };

  const submitInspection = async () => {
    try {
      const { error } = await supabase
        .from('inspection_jobs')
        .update({ status: 'submitted' })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Inspection Submitted!",
        description: "Your inspection has been successfully submitted.",
      });

      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit inspection",
        variant: "destructive",
      });
    }
  };

  const isStepComplete = (sectionId: string) => {
    return steps.some(step => step.section === sectionId && step.is_complete);
  };

  const getCompletedStepsCount = () => {
    return steps.filter(step => step.is_complete).length;
  };

  const canSubmit = () => {
    return getCompletedStepsCount() === INSPECTION_SECTIONS.length;
  };

  const currentSection = INSPECTION_SECTIONS[currentSectionIndex];
  const progress = (getCompletedStepsCount() / INSPECTION_SECTIONS.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading inspection...</p>
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
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
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
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">
                {job.make} {job.model}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">{job.reg}</p>
            </div>
            <Badge 
              variant={job.status === 'submitted' ? 'default' : 'secondary'}
              className={job.status === 'submitted' ? 'bg-success hover:bg-success/80' : ''}
            >
              {job.status === 'submitted' ? 'Submitted' : 'In Progress'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card/30 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground font-medium">
                {getCompletedStepsCount()} / {INSPECTION_SECTIONS.length} sections
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Vehicle Info */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{job.seller_address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>VIN: {job.vin}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Section */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isStepComplete(currentSection.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Camera className="w-5 h-5 text-primary" />
                  )}
                  {currentSection.name}
                </CardTitle>
                <CardDescription>{currentSection.description}</CardDescription>
              </div>
              <Badge variant="outline">
                Step {currentSectionIndex + 1} of {INSPECTION_SECTIONS.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSection.required_photos > 0 && (
              <div className="bg-accent/50 rounded-lg p-4">
                <p className="text-sm text-accent-foreground">
                  📸 Required photos: {currentSection.required_photos}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {/* Photo upload buttons would go here */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: Math.max(currentSection.required_photos, 1) }).map((_, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-24 flex-col gap-2 border-dashed"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs">
                      {currentSection.required_photos > 0 
                        ? `Photo ${index + 1}` 
                        : 'Add Info'
                      }
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {!isStepComplete(currentSection.id) && (
              <Button
                onClick={() => completeSection(currentSection.id)}
                variant="mobile"
                className="w-full"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete {currentSection.name}
              </Button>
            )}

            {isStepComplete(currentSection.id) && currentSectionIndex < INSPECTION_SECTIONS.length - 1 && (
              <Button
                onClick={() => setCurrentSectionIndex(currentSectionIndex + 1)}
                variant="mobile"
                className="w-full"
              >
                Next Section
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Inspection Checklist */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Inspection Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {INSPECTION_SECTIONS.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    index === currentSectionIndex 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isStepComplete(section.id) ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : index === currentSectionIndex ? (
                      <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/20" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{section.name}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        {canSubmit() && job.status !== 'submitted' && (
          <Card className="shadow-card border-0 bg-gradient-success/10 backdrop-blur-sm border-success/20">
            <CardContent className="py-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Inspection Complete!</h3>
                  <p className="text-muted-foreground">All sections have been completed. Ready to submit.</p>
                </div>
                <Button
                  onClick={submitInspection}
                  variant="success"
                  size="xl"
                  className="w-full"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Inspection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Inspection;