import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MediaUpload from "@/components/MediaUpload";
import { Loader2, CheckCircle, AlertCircle, Camera, FileText, ArrowLeft, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface InspectionJob {
  id: string;
  reg: string;
  make: string;
  model: string;
  vin?: string;
  year?: number;
  mileage?: number;
  color?: string;
  fuel_type?: string;
  transmission?: string;
  purchase_price?: number;
  priority: string;
  status: string;
  deadline?: string;
  seller_address?: string;
  notes?: string;
  business_id?: string;
}

interface InspectionSection {
  id: string;
  section_name: string;
  section_order: number;
  is_complete: boolean;
  rating?: number;
  notes?: string;
  inspector_comments?: string;
}

interface InspectionItem {
  id: string;
  section_id: string;
  item_name: string;
  item_description?: string;
  is_checked: boolean;
  condition_rating?: number;
  notes?: string;
  requires_photo: boolean;
  photo_url?: string;
}

interface InspectionFault {
  id: string;
  type: string;
  description: string;
  location?: string;
  media_url?: string;
  flagged_for_repair: boolean;
}

const Inspection = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<InspectionJob | null>(null);
  const [sections, setSections] = useState<InspectionSection[]>([]);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [faults, setFaults] = useState<InspectionFault[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [newFault, setNewFault] = useState({
    type: "",
    description: "",
    location: "",
    flagged_for_repair: false
  });

  useEffect(() => {
    if (jobId) {
      fetchInspectionData();
    }
  }, [jobId]);

  const fetchInspectionData = async () => {
    try {
      setLoading(true);

      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from("inspection_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("inspection_sections")
        .select("*")
        .eq("job_id", jobId)
        .order("section_order");

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
      
      if (sectionsData && sectionsData.length > 0 && !activeSection) {
        setActiveSection(sectionsData[0].section_name);
      }

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("inspection_items")
        .select("*")
        .eq("job_id", jobId);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch faults
      const { data: faultsData, error: faultsError } = await supabase
        .from("inspection_faults")
        .select("*")
        .eq("job_id", jobId);

      if (faultsError) throw faultsError;
      setFaults(faultsData || []);

    } catch (error: any) {
      console.error("Error fetching inspection data:", error);
      toast({
        title: "Error",
        description: "Failed to load inspection data",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (itemId: string, updates: Partial<InspectionItem>) => {
    try {
      const { error } = await supabase
        .from("inspection_items")
        .update(updates)
        .eq("id", itemId);

      if (error) throw error;

      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));

      toast({
        title: "✅ Item Updated",
        description: "Inspection item has been updated",
      });
    } catch (error: any) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const updateSectionStatus = async (sectionId: string, updates: Partial<InspectionSection>) => {
    try {
      const { error } = await supabase
        .from("inspection_sections")
        .update(updates)
        .eq("id", sectionId);

      if (error) throw error;

      setSections(prev => prev.map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      ));

      toast({
        title: "✅ Section Updated",
        description: "Inspection section has been updated",
      });
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast({
        title: "Error",
        description: "Failed to update section",
        variant: "destructive",
      });
    }
  };

  const addFault = async () => {
    if (!newFault.type || !newFault.description || !job) return;

    try {
      const { data, error } = await supabase
        .from("inspection_faults")
        .insert({
          job_id: jobId,
          business_id: job?.business_id,
          type: newFault.type,
          description: newFault.description,
          location: newFault.location || null,
          flagged_for_repair: newFault.flagged_for_repair
        })
        .select()
        .single();

      if (error) throw error;

      setFaults(prev => [...prev, data]);
      setNewFault({ type: "", description: "", location: "", flagged_for_repair: false });

      toast({
        title: "✅ Fault Added",
        description: "New fault has been recorded",
      });
    } catch (error: any) {
      console.error("Error adding fault:", error);
      toast({
        title: "Error", 
        description: "Failed to add fault",
        variant: "destructive",
      });
    }
  };

  const submitInspection = async () => {
    if (!job) return;

    const incompleteSections = sections.filter(section => !section.is_complete);
    if (incompleteSections.length > 0) {
      toast({
        title: "Incomplete Inspection",
        description: `Please complete all sections before submitting. ${incompleteSections.length} sections remaining.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("inspection_jobs")
        .update({ 
          status: "submitted",
          review_status: "pending" 
        })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "🎉 Inspection Submitted",
        description: "Inspection has been submitted for review",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error submitting inspection:", error);
      toast({
        title: "Error",
        description: "Failed to submit inspection",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressPercentage = () => {
    if (sections.length === 0) return 0;
    const completedSections = sections.filter(section => section.is_complete).length;
    return (completedSections / sections.length) * 100;
  };

  const getSectionItems = (sectionName: string) => {
    const section = sections.find(s => s.section_name === sectionName);
    return section ? items.filter(item => item.section_id === section.id) : [];
  };

  const getCurrentSection = () => {
    return sections.find(section => section.section_name === activeSection);
  };

  const renderStarRating = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 cursor-pointer ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300 hover:text-yellow-400"
            }`}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl font-semibold mb-2">Inspection Not Found</p>
            <p className="text-muted-foreground mb-4">The requested inspection could not be found.</p>
            <Button onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {job.reg} - {job.make} {job.model}
            </h1>
            <p className="text-muted-foreground">
              {job.year} • {job.color} • {job.fuel_type} • {job.transmission}
            </p>
          </div>
        </div>
        <Badge variant={
          job.priority === 'urgent' ? 'destructive' :
          job.priority === 'high' ? 'secondary' : 'default'
        }>
          {job.priority} priority
        </Badge>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(getProgressPercentage())}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {sections.filter(s => s.is_complete).length} of {sections.length} sections completed
          </p>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sections Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inspection Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.section_name ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => setActiveSection(section.section_name)}
                >
                  <span className="truncate">{section.section_name}</span>
                  {section.is_complete && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Inspection Area */}
        <div className="lg:col-span-3">
          <Tabs value="inspection" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inspection">Inspection</TabsTrigger>
              <TabsTrigger value="faults">Faults ({faults.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="inspection" className="space-y-6">
              {getCurrentSection() && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {getCurrentSection()?.section_name}
                      {getCurrentSection()?.is_complete && (
                        <Badge variant="secondary">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Section Rating */}
                    <div className="space-y-2">
                      <Label>Overall Section Rating</Label>
                      {renderStarRating(
                        getCurrentSection()?.rating || 0,
                        (rating) => updateSectionStatus(getCurrentSection()!.id, { rating })
                      )}
                    </div>

                    {/* Inspection Items */}
                    <div className="space-y-4">
                      {getSectionItems(activeSection).map((item) => (
                        <Card key={item.id} className="border-l-4 border-l-primary/20">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{item.item_name}</h4>
                                {item.item_description && (
                                  <p className="text-sm text-muted-foreground">{item.item_description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={item.is_checked ? "default" : "outline"}
                                  onClick={() => updateItemStatus(item.id, { is_checked: !item.is_checked })}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {item.is_checked ? "Checked" : "Check"}
                                </Button>
                              </div>
                            </div>

                            {/* Condition Rating */}
                            <div className="mb-3">
                              <Label className="text-sm">Condition Rating</Label>
                              {renderStarRating(
                                item.condition_rating || 0,
                                (rating) => updateItemStatus(item.id, { condition_rating: rating })
                              )}
                            </div>

                            {/* Photo Upload */}
                            {item.requires_photo && (
                              <div className="mb-3">
                                <Label className="text-sm">Required Photo</Label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <Button
                                    variant="outline"
                                    className="w-full flex items-center gap-2"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file && job) {
                                          try {
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                                            const filePath = `inspection-photos/${fileName}`;
                                            
                                            const { error: uploadError } = await supabase.storage
                                              .from('inspection-photos')
                                              .upload(filePath, file);
                                            
                                            if (uploadError) throw uploadError;
                                            
                                            const { data } = supabase.storage
                                              .from('inspection-photos')
                                              .getPublicUrl(filePath);
                                            
                                            await updateItemStatus(item.id, { photo_url: data.publicUrl });
                                          } catch (error) {
                                            console.error('Upload error:', error);
                                            toast({
                                              title: "Upload failed",
                                              description: "Failed to upload photo",
                                              variant: "destructive",
                                            });
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                  >
                                    <Camera className="w-4 h-4" />
                                    {item.photo_url ? "Replace Photo" : "Take Photo"}
                                  </Button>
                                </div>
                                {item.photo_url && (
                                  <img 
                                    src={item.photo_url} 
                                    alt={item.item_name}
                                    className="mt-2 max-w-xs rounded-lg"
                                  />
                                )}
                              </div>
                            )}

                            {/* Notes */}
                            <div>
                              <Label className="text-sm">Notes</Label>
                              <Textarea
                                placeholder="Add notes about this item..."
                                value={item.notes || ""}
                                onChange={(e) => updateItemStatus(item.id, { notes: e.target.value })}
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Section Notes */}
                    <div className="space-y-2">
                      <Label>Section Comments</Label>
                      <Textarea
                        placeholder="Add overall comments for this section..."
                        value={getCurrentSection()?.inspector_comments || ""}
                        onChange={(e) => updateSectionStatus(getCurrentSection()!.id, { inspector_comments: e.target.value })}
                        rows={3}
                      />
                    </div>

                    {/* Complete Section Button */}
                    <Button
                      className="w-full"
                      variant={getCurrentSection()?.is_complete ? "secondary" : "default"}
                      onClick={() => updateSectionStatus(
                        getCurrentSection()!.id, 
                        { is_complete: !getCurrentSection()?.is_complete }
                      )}
                    >
                      {getCurrentSection()?.is_complete ? "Mark as Incomplete" : "Complete Section"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="faults" className="space-y-6">
              {/* Add New Fault */}
              <Card>
                <CardHeader>
                  <CardTitle>Report New Fault</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fault Type</Label>
                      <Input
                        placeholder="e.g. Dent, Scratch, Engine Issue"
                        value={newFault.type}
                        onChange={(e) => setNewFault(prev => ({ ...prev, type: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g. Front bumper, Engine bay"
                        value={newFault.location}
                        onChange={(e) => setNewFault(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Detailed description of the fault..."
                      value={newFault.description}
                      onChange={(e) => setNewFault(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <Button onClick={addFault} disabled={!newFault.type || !newFault.description}>
                    Add Fault
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Faults */}
              <div className="space-y-4">
                {faults.map((fault) => (
                  <Card key={fault.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{fault.type}</h4>
                        {fault.flagged_for_repair && (
                          <Badge variant="destructive">Repair Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{fault.description}</p>
                      {fault.location && (
                        <p className="text-xs text-muted-foreground">Location: {fault.location}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          {getProgressPercentage() === 100 && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={submitInspection}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Submit Inspection
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inspection;
