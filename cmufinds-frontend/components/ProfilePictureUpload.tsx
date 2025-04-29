"use client";

import { useState } from "react";
import { userAPI } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Loader2 } from "lucide-react";

interface ProfilePictureUploadProps {
  currentPictureUrl?: string;
  onSuccess?: (imageUrl: string) => void;
}

const ProfilePictureUpload = ({ 
  currentPictureUrl,
  onSuccess
}: ProfilePictureUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPictureUrl || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.match(/image\/(jpeg|jpg|png|webp|gif)/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Generate preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Upload to server
      const response = await userAPI.uploadProfilePicture(file);
      
      // Handle success
      if (response.data?.url) {
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been updated successfully",
        });
        
        if (onSuccess) {
          onSuccess(response.data.url);
        }
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your profile picture. Please try again.",
        variant: "destructive",
      });
      
      // Reset preview on error
      if (currentPictureUrl) {
        setPreviewUrl(currentPictureUrl);
      } else {
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-4">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {previewUrl ? (
            <img 
              src={`${previewUrl}?t=${Date.now()}`} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Error loading profile image preview:", previewUrl);
                
                // Try alternative URL formats if loading fails
                if (!previewUrl.includes('/api/v1/')) {
                  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                  const apiPath = `${baseUrl}/api/v1/uploads/profiles/${previewUrl.split('/').pop()}?t=${Date.now()}`;
                  console.log("Trying with API path:", apiPath);
                  e.currentTarget.src = apiPath;
                } else {
                  // Fallback to placeholder
                  e.currentTarget.src = '/placeholders/user.png';
                }
              }}
            />
          ) : (
            <span className="text-3xl text-muted-foreground">👤</span>
          )}
        </div>
        
        <label 
          htmlFor="profile-picture-upload" 
          className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </label>
        
        <input
          id="profile-picture-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>
      
      <span className="text-sm text-muted-foreground">
        Click the camera icon to upload a profile picture
      </span>
    </div>
  );
};

export default ProfilePictureUpload; 