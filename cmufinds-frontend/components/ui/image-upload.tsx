"use client"

import { useState, useRef, useCallback } from "react"
import { ImagePlus, X, UploadCloud } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ImageUploadProps {
  maxImages?: number
  images: File[]
  imagePreviewUrls: string[]
  onImagesChange: (files: File[], previews: string[]) => void
  className?: string
  dropzoneText?: string
  dropzoneSubText?: string
  maxSizeInMB?: number
  acceptedFileTypes?: string
}

export function ImageUpload({
  maxImages = 5,
  images,
  imagePreviewUrls,
  onImagesChange,
  className = "",
  dropzoneText = "Drag and drop images here",
  dropzoneSubText = "or click to browse",
  maxSizeInMB = 5,
  acceptedFileTypes = "image/*"
}: ImageUploadProps) {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFilesAdded = useCallback((newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return
    
    const filesArray = Array.from(newFiles)
    
    // Check if exceeding max number of images
    if (images.length + filesArray.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can upload a maximum of ${maxImages} images`,
        variant: "destructive",
      })
      return
    }
    
    // Validate file types and sizes
    const validFiles = filesArray.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed",
          variant: "destructive",
        })
        return false
      }
      
      // Check file size (convert MB to bytes)
      if (file.size > maxSizeInMB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Images must be smaller than ${maxSizeInMB}MB`,
          variant: "destructive",
        })
        return false
      }
      
      return true
    })
    
    if (validFiles.length === 0) return
    
    // Create preview URLs for valid files
    const newImageUrls = validFiles.map(file => URL.createObjectURL(file))
    
    // Update the parent component
    onImagesChange(
      [...images, ...validFiles], 
      [...imagePreviewUrls, ...newImageUrls]
    )
  }, [images, imagePreviewUrls, maxImages, maxSizeInMB, onImagesChange, toast])
  
  const removeImage = (index: number) => {
    // Release object URL to avoid memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index])
    
    const newImages = images.filter((_, i) => i !== index)
    const newImageUrls = imagePreviewUrls.filter((_, i) => i !== index)
    
    onImagesChange(newImages, newImageUrls)
  }
  
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
    handleFilesAdded(files)
  }, [handleFilesAdded])
  
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Image Previews */}
      {imagePreviewUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {imagePreviewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <div className="h-24 rounded overflow-hidden border">
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`cursor-pointer flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-md transition-colors
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center p-4 text-center">
            {isDragging ? (
              <UploadCloud className="h-10 w-10 text-primary mb-2" />
            ) : (
              <ImagePlus className="h-10 w-10 text-gray-400 mb-2" />
            )}
            <p className="text-sm font-medium">
              {isDragging ? "Drop images here" : dropzoneText}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {dropzoneSubText}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maximum {maxImages} images (up to {maxSizeInMB}MB each)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedFileTypes}
            multiple
            onChange={(e) => handleFilesAdded(e.target.files)}
          />
        </div>
      )}
    </div>
  )
} 