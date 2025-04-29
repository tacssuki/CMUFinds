"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, ControllerRenderProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { postAPI } from "@/lib/postsAPI"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, ImagePlus, X, Loader2 } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Validation schema
const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  location: z.string().min(3, "Location must be at least 3 characters").max(100, "Location must be less than 100 characters"),
  type: z.enum(["LOST", "FOUND"], {
    required_error: "Please select whether the item was lost or found",
  }),
  category: z.string().optional(),
  date: z.string().optional(),
})

// Type for form data
type PostFormData = z.infer<typeof postSchema>

const categories = [
  "Electronics", 
  "Clothing", 
  "Accessories", 
  "Documents", 
  "Keys", 
  "Books", 
  "Wallet/Purse", 
  "ID/Cards",
  "Other"
]

export default function CreatePostPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  
  // Initialize form
  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
    title: "",
    description: "",
    location: "",
    type: "LOST",
      category: "Other",
      date: new Date().toISOString().slice(0, 10), // Default to today's date
    },
  })

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Handle form submission
  const onSubmit = async (data: PostFormData) => {
    setIsSubmitting(true)
    
    try {
      await postAPI.createPost({
        ...data,
        images: images,
      })
      
      toast({
        title: "Post created",
        description: "Your post has been created successfully",
      })
      
      // Redirect to posts page
      router.push("/posts?filter=my")
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update images state
  const handleImagesChange = (newImages: File[], newPreviews: string[]) => {
    setImages(newImages)
    setImagePreviewUrls(newPreviews)
  }

  // Show loading state while checking auth
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl">
      <Button
        variant="link"
        className="flex items-center mb-6 pl-0 text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a Lost & Found Post</CardTitle>
          <CardDescription>
            Provide details about the item you lost or found to help others identify it.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Type Selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOST">Lost Item</SelectItem>
                        <SelectItem value="FOUND">Found Item</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief title describing the item" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description of the item, including identifying features" 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Where the item was lost or found" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch("type") === "LOST" ? "Date Lost" : "Date Found"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field} 
                        max={new Date().toISOString().slice(0, 10)} // Limit to today or earlier
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Image Upload */}
              <div className="space-y-3">
                <div>
                  <FormLabel>Images</FormLabel>
                  <p className="text-sm text-gray-500 mb-2">
                    Upload images of the item (maximum 5)
                  </p>
                </div>
                
                <ImageUpload 
                  images={images}
                  imagePreviewUrls={imagePreviewUrls}
                  onImagesChange={handleImagesChange}
                  maxImages={5}
                  dropzoneText="Drag and drop item images here"
                />
              </div>
              
              <CardFooter className="px-0 pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Post...
                        </>
                      ) : (
                        "Create Post"
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Create this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Please review the details before creating the post. 
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                      >
                         {isSubmitting ? "Creating..." : "Confirm & Create"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 