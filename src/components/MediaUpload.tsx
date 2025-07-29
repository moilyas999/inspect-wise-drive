import React, { useState, useRef } from 'react';
import { Upload, Camera, Video, X, CheckCircle, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MediaUploadProps {
  jobId: string;
  vehicleId: string;
  businessId: string;
  section: string;
  mediaType: 'photo' | 'video';
  required?: boolean;
  maxDuration?: number; // for videos in seconds
  onUploadComplete: (mediaUrl: string, mediaType: string) => void;
  existingMedia?: string[];
}

export default function MediaUpload({
  jobId,
  vehicleId,
  businessId,
  section,
  mediaType,
  required = false,
  maxDuration = 300, // 5 minutes default
  onUploadComplete,
  existingMedia = []
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(existingMedia);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isPhoto = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (mediaType === 'photo' && !isPhoto) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (mediaType === 'video' && !isVideo) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate video duration
    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = async () => {
        if (video.duration > maxDuration) {
          toast({
            title: "Video too long",
            description: `Please select a video shorter than ${Math.floor(maxDuration / 60)} minutes`,
            variant: "destructive",
          });
          return;
        }
        await uploadFile(file, video.duration);
      };

      video.src = URL.createObjectURL(file);
    } else {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File, duration?: number) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `inspection-photos/${fileName}`;

      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filePath);

      // Save media record to database
      const { error: dbError } = await supabase
        .from('inspection_media')
        .insert({
          job_id: jobId,
          vehicle_id: vehicleId,
          business_id: businessId,
          section: section,
          media_type: mediaType,
          url: data.publicUrl,
          duration: duration ? Math.round(duration) : null,
          file_size: file.size
        });

      if (dbError) throw dbError;

      // Update state
      const newUploadedFiles = [...uploadedFiles, data.publicUrl];
      setUploadedFiles(newUploadedFiles);
      onUploadComplete(data.publicUrl, mediaType);

      toast({
        title: "Upload successful",
        description: `${mediaType === 'video' ? 'Video' : 'Photo'} uploaded successfully`,
      });

      // Clean up preview
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${mediaType}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const openCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeUploadedFile = async (fileUrl: string) => {
    try {
      // Remove from database
      const { error } = await supabase
        .from('inspection_media')
        .delete()
        .eq('url', fileUrl);

      if (error) throw error;

      // Update state
      const updatedFiles = uploadedFiles.filter(url => url !== fileUrl);
      setUploadedFiles(updatedFiles);

      toast({
        title: "File removed",
        description: "Media file has been removed",
      });
    } catch (error) {
      console.error('Error removing file:', error);
      toast({
        title: "Error",
        description: "Failed to remove file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm rounded-2xl">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {mediaType === 'video' ? (
                <Video className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="text-sm sm:text-base font-medium">
                {section} {mediaType === 'video' ? 'Video' : 'Photo'}
              </span>
              {required && (
                <Badge variant={uploadedFiles.length > 0 ? "default" : "destructive"} className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            {uploadedFiles.length > 0 && (
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Camera Button */}
            <Button
              variant="outline"
              onClick={openCamera}
              className="flex-1 gap-2 h-10 sm:h-12 rounded-xl border-2 border-dashed hover:border-primary transition-colors text-xs sm:text-sm"
              disabled={isUploading}
            >
              <Camera className="w-4 h-4" />
              <span className="font-medium">Take Photo</span>
            </Button>
            
            {/* Gallery Button */}
            <Button
              variant="outline"
              onClick={openGallery}
              className="flex-1 gap-2 h-10 sm:h-12 rounded-xl border-2 border-dashed hover:border-primary transition-colors text-xs sm:text-sm"
              disabled={isUploading}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="font-medium">From Gallery</span>
            </Button>
          </div>

          {/* Hidden Camera Input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Hidden Gallery Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 rounded-full" />
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              {mediaType === 'photo' ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-32 sm:h-48 object-cover rounded-lg"
                />
              ) : (
                <video 
                  src={previewUrl} 
                  controls 
                  className="w-full h-32 sm:h-48 object-cover rounded-lg"
                />
              )}
            </div>
          )}

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Uploaded {mediaType === 'photo' ? 'Photos' : 'Videos'} ({uploadedFiles.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {uploadedFiles.map((fileUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      {mediaType === 'photo' ? (
                        <img 
                          src={fileUrl} 
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video 
                          src={fileUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeUploadedFile(fileUrl)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• {mediaType === 'photo' ? 'Photos' : 'Videos'} will be uploaded to secure cloud storage</p>
            {mediaType === 'video' && (
              <p>• Maximum duration: {Math.floor(maxDuration / 60)} minutes</p>
            )}
            {required && (
              <p className="text-warning">• This {mediaType} is required for inspection completion</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}