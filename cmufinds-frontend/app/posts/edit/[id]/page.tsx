"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useAuthStore } from "@/store/authStore"
import { postAPI, PostData } from "@/lib/postsAPI"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Role } from "@/types"
import { ImageUpload } from "@/components/ui/image-upload"
// --- Import Shadcn Form Components ---
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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

// --- Define categories (consistent with create page) ---
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
];

// --- Define Zod schema for edit form (consistent with create page structure) ---
const editPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  location: z.string().min(3, "Location must be at least 3 characters").max(100, "Location must be less than 100 characters"),
  type: z.enum(["LOST", "FOUND"], {
    required_error: "Please select whether the item was lost or found",
  }),
  category: z.string().optional(),
  date: z.string().optional(),
});

type EditPostFormData = z.infer<typeof editPostSchema>;

interface PostImage {
  id: string;
  url: string;
}

interface Post {
  id: string;
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  location: string;
  category?: string;
  date?: string;
  createdAt: string;
  updatedAt: string;
  images?: PostImage[];
  user: {
    id: string;
    name: string;
  };
  status: string;
}

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<PostImage[]>([])
  const id = params.id as string

  // --- Initialize react-hook-form --- 
  const form = useForm<EditPostFormData>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      type: "LOST",
      category: "Other",
      date: "",
    },
  });

  // Check authentication and redirect if not logged in
  useEffect(() => {
    // Give auth state time to initialize
    const timer = setTimeout(() => {
      setCheckingAuth(false)
      if (!isAuthenticated) {
        window.location.href = '/login'
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [isAuthenticated])

  // Fetch post data and set form defaults
  useEffect(() => {
    if (!id || !isAuthenticated) return

    const fetchPost = async () => {
      setIsFetching(true)
      try {
        const response = await postAPI.getPostById(id)
        const post = response.data.post as Post

        // Check if user is authorized to edit this post
        if (!user || (user.userId !== post.user.id && !user.roles.includes(Role.ADMIN) && !user.roles.includes(Role.DEVELOPER))) {
          toast({
            title: "Unauthorized",
            description: "You don't have permission to edit this post.",
            variant: "destructive"
          })
          router.push(`/posts/${id}`)
          return
        }

        // --- Reset form with fetched data ---
        form.reset({
          title: post.title,
          description: post.description,
          location: post.location,
          type: post.type,
          category: post.category || "Other",
          date: post.date ? post.date.split('T')[0] : undefined
        });

        // Set existing images
        if (post.images && post.images.length > 0) {
          setExistingImages(post.images)
        }
      } catch (error) {
        console.error("Error fetching post:", error)
        toast({
          title: "Error",
          description: "Could not load post data.",
          variant: "destructive"
        })
        router.push("/posts")
      } finally {
        setIsFetching(false)
      }
    }

    fetchPost()
  }, [id, isAuthenticated, router, toast, user, form])

  // Handle image changes from the ImageUpload component
  const handleImagesChange = (newFiles: File[], newPreviews: string[]) => {
    setImageFiles(newFiles)
    setImagePreviewUrls(newPreviews)
  }
  
  // Remove an existing image from the post
  const removeExistingImage = (imageId: string) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId))
  }

  // --- Update handleSubmit to use react-hook-form data ---
  const handleSubmit = async (data: EditPostFormData) => {
    setIsLoading(true)

    try {
      // Format date as ISO string if it exists
      const formattedData = {
        ...data,
        date: data.date ? new Date(data.date + 'T00:00:00').toISOString() : undefined
      }

      await postAPI.updatePost(id, {
        ...formattedData,
        images: imageFiles,
      })
      
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      })
      
      router.push(`/posts/${id}`)
    } catch (error) {
      console.error("Error updating post:", error)
      toast({
        title: "Error",
        description: "There was an error updating your post. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // If checking auth or not authenticated, show loading until redirect happens
  if (checkingAuth || !isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Checking authorization...</span>
      </div>
    )
  }

  // If fetching, show loading
  if (isFetching) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading post data...</span>
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
          <CardTitle className="text-2xl">Edit Post</CardTitle>
          <CardDescription>
            Update the details of your post.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
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
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
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
                        value={field.value || ''}
                        max={new Date().toISOString().slice(0, 10)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Current Images</FormLabel>
                {existingImages.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {existingImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="h-20 w-20 rounded overflow-hidden border bg-muted">
                          <img 
                            src={image.url} 
                            alt="Existing post image" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingImage(image.id)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center shadow hover:bg-red-700 transition-colors text-xs"
                          aria-label="Remove image"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No images attached</p>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <FormLabel>Add New Images</FormLabel>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload new images (maximum {5 - existingImages.length} allowed)
                  </p>
                </div>
                <ImageUpload 
                  images={imageFiles}
                  imagePreviewUrls={imagePreviewUrls}
                  onImagesChange={handleImagesChange}
                  maxImages={5 - existingImages.length}
                  dropzoneText="Drag and drop new images here"
                />
              </div>
              
              <CardFooter className="px-0 pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating Post...
                        </>
                      ) : (
                        "Update Post"
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Update this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Please confirm you want to save the changes to this post.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={isLoading}
                      >
                        {isLoading ? "Updating..." : "Confirm & Update"}
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