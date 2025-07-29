import React, { useState, useRef } from 'react';
import { Upload, Camera, Video, X, CheckCircle } from 'lucide-react';
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

      // Upload to Supabase Storage with progress simulation
      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, file);

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

  const hasRequiredMedia = uploadedFiles.length > 0;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {mediaType === 'video' ? (
                <Video className="h-5 w-5" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
              <span className="font-medium">
                {section} {mediaType === 'video' ? 'Video' : 'Photo'}
              </span>
              {required && (
                <Badge variant={hasRequiredMedia ? "default" : "destructive"}>
                  Required
                </Badge>
              )}
            </div>
            {hasRequiredMedia && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>

          {/* Upload area */}
          {!isUploading && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                hasRequiredMedia 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                Click to upload {mediaType === 'video' ? 'video' : 'photo'}
              </p>
              {mediaType === 'video' && (
                <p className="text-xs text-gray-500 mt-1">
                  Max duration: {Math.floor(maxDuration / 60)}:{maxDuration % 60 === 0 ? '00' : maxDuration % 60}
                </p>
              )}
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Uploading...</span>
                <span className="text-sm">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
              {previewUrl && (
                <div className="mt-2">
                  {mediaType === 'video' ? (
                    <video
                      src={previewUrl}
                      className="w-full max-w-xs h-32 object-cover rounded"
                      muted
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-w-xs h-32 object-cover rounded"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Uploaded Files</h4>
              <div className="grid grid-cols-2 gap-2">
                {uploadedFiles.map((fileUrl, index) => (
                  <div key={index} className="relative group">
                    {mediaType === 'video' ? (
                      <video
                        src={fileUrl}
                        className="w-full h-20 object-cover rounded"
                        controls
                      />
                    ) : (
                      <img
                        src={fileUrl}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeUploadedFile(fileUrl)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === 'video' ? 'video/*' : 'image/*'}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}