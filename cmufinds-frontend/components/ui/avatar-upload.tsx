"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, UploadCloud } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

interface AvatarUploadProps {
  currentImage?: string | null
  fallbackText?: string
  onImageChange: (file: File) => Promise<void>
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  maxSizeInMB?: number
  placeholderImageSrc?: string
}

const sizesMap = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
  xl: "h-40 w-40"
}

export function AvatarUpload({
  currentImage,
  fallbackText = "U",
  onImageChange,
  className = "",
  size = "md",
  maxSizeInMB = 2,
  placeholderImageSrc = "/placeholders/user.png"
}: AvatarUploadProps) {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileAdded = useCallback(async (file: File | null) => {
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Only image files are allowed",
        variant: "destructive",
      })
      return
    }
    
    // Check file size (convert MB to bytes)
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Image must be smaller than ${maxSizeInMB}MB`,
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsUploading(true)
      await onImageChange(file)
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      })
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      toast({
        title: "Error",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [maxSizeInMB, onImageChange, toast])
  
  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileAdded(files[0])
    }
  }, [handleFileAdded])
  
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div 
        className={`relative ${isDragging ? 'ring-2 ring-primary ring-offset-2 rounded-full' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Avatar className={`${sizesMap[size]} cursor-pointer`} onClick={handleButtonClick}>
          {currentImage ? (
            <AvatarImage 
              key={currentImage}
              src={currentImage}
              alt="Profile picture" 
              onError={(e) => {
                console.error("Error loading profile image from:", currentImage);
                e.currentTarget.src = placeholderImageSrc;
              }}
            />
          ) : (
            <AvatarImage src={placeholderImageSrc} alt="Profile picture" />
          )}
          <AvatarFallback className={`text-${size === "sm" ? "lg" : "2xl"} uppercase`}>
            {fallbackText}
          </AvatarFallback>
        </Avatar>
        
        {isDragging && (
          <div className="absolute inset-0 bg-primary/20 rounded-full flex items-center justify-center">
            <UploadCloud className="h-10 w-10 text-primary" />
          </div>
        )}
      </div>
      
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileAdded(e.target.files[0])
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="relative"
          disabled={isUploading}
          onClick={handleButtonClick}
        >
          {isUploading ? (
            "Uploading..."
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Change Picture
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 