"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/use-toast";
import { postAPI } from "@/lib/postsAPI";
import { ArrowLeft, User, MapPin, Calendar, Info, Archive, Trash2, CheckCircle, Pencil, MessageCircle, Flag, Loader2 } from "lucide-react";
import { Role } from "@/types";
import { chatAPI } from "@/lib/api";
import ImageViewModal from "@/components/ImageViewModal";

// Add state for chat drawer
import { useGlobalChatDrawer } from "@/store/globalChatDrawerStore";

// Import necessary Shadcn UI components for dialog, tooltip, select
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
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import ReportDialog from '@/components/ReportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface PostImage {
  id: string;
  url: string;
}

interface PostUser {
  id: string;
  name: string;
}

interface Post {
  id: string;
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  location: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  images?: PostImage[];
  user: PostUser;
  status: string;
  isOwner: boolean;
  userId: string;
}

// Define available statuses for the dropdown
const POST_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "MATCHED", label: "Matched" },
  { value: "RESOLVED", label: "Resolved" },
];

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // State for status update action
  const [isModalOpen, setIsModalOpen] = useState(false); // State for image modal visibility
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null); // State for the image URL in the modal
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false); // State for report dialog
  const [statusToUpdate, setStatusToUpdate] = useState<string | null>(null);
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
  
  // Get the global chat drawer state
  const { openChatDrawer } = useGlobalChatDrawer();

  const id = params.id as string;

  // Check authentication and redirect if not logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          window.location.href = '/login';
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Fetch post details
  useEffect(() => {
    if (!id || !isAuthenticated) return;

    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await postAPI.getPostById(id);
        const fetchedPost = response.data.post;
        setPost(fetchedPost);
      } catch (error) {
        console.error("Error fetching post:", error);
        setError("Could not load post details");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, isAuthenticated]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleNextImage = () => {
    if (post?.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images!.length);
    }
  };

  const handlePrevImage = () => {
    if (post?.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + post.images!.length) % post.images!.length);
    }
  };

  // Handle opening chat for this post
  const handleContactOwner = async () => {
    try {
      // Open the chat drawer
      openChatDrawer(post?.id);
      
      // Optionally, you could create the thread but not navigate
      await chatAPI.getOrCreateThread(post!.id);
    } catch (error) {
      console.error("Error setting up chat:", error);
      toast({
        title: "Error",
        description: "Failed to set up chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle checking inbox
  const handleCheckInbox = () => {
    // Simply open the chat drawer without a specific post
    openChatDrawer();
  };

  // Handler for updating the post status via Select
  const handleUpdateStatus = async (newStatus: string) => {
    if (!post || newStatus === post.status) return; // Don't update if status hasn't changed
    setIsUpdatingStatus(true);
    setIsStatusUpdateDialogOpen(false);
    try {
      await postAPI.updateMyPostStatus(post.id, newStatus);
      setPost({ ...post, status: newStatus }); // Update local state
      toast({
        title: "Status Updated",
        description: `Post status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating post status:", error);
      toast({
        title: "Error",
        description: (error as any)?.response?.data?.message || "Could not update post status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handler for deleting the post (soft delete)
  const handleDeletePost = async () => {
    if (!post) return;
    setIsDeleting(true); // Indicate loading/processing
    try {
      await postAPI.deletePost(post.id);
      toast({
        title: "Post Deleted",
        description: "Your post has been deleted.",
      });
      // Redirect back to feed or another appropriate page after delete
      router.push("/posts"); 
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Could not delete post.",
        variant: "destructive",
      });
      setIsDeleting(false); // Reset loading state on error
    }
    // No need to set deleting to false on success as we navigate away
  };
  
  // Handler for archiving the post
  const handleArchivePost = async () => {
    if (!post || post.status !== "RESOLVED") return;
    setIsArchiving(true);
    try {
      await postAPI.archiveMyPost(post.id);
      toast({
        title: "Post Archived",
        description: "Your post has been archived successfully.",
      });
      // Redirect back to feed or another appropriate page after archive
      router.push("/posts");
    } catch (error) {
      console.error("Error archiving post:", error);
      toast({
        title: "Error",
        description: (error as any)?.response?.data?.message || "Could not archive post.",
        variant: "destructive",
      });
      setIsArchiving(false);
    }
    // No need to set archiving to false on success as we navigate away
  };

  // Function to open the image modal
  const openImageModal = (url: string) => {
    setModalImageUrl(url);
    setIsModalOpen(true);
  };

  // Function to close the image modal
  const closeImageModal = () => {
    setIsModalOpen(false);
    setModalImageUrl(null);
  };

  const handleStartChat = () => {
    if (post && user && post.userId !== user.userId) {
      openChatDrawer(post.id);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Redirecting to login...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading post details...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <button
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} className="mr-1" />
          Back to Feed
        </button>
        <div className="p-6 text-center">
          <h2 className="text-xl text-red-600 mb-2">Error</h2>
          <p className="mb-4">{error || "Post not found"}</p>
          <button
            onClick={() => router.push("/posts")}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Go to Feed
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.userId === post.userId;

  return (
    <TooltipProvider>
    <div className="container mx-auto p-4 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
      >
        <ArrowLeft size={20} className="mr-1" />
        Back to Feed
      </button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start mb-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                post.type === "LOST"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                  : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
              }`}
            >
              {post.type}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Posted: {formatDate(post.createdAt)}
            </span>
          </div>
          <CardTitle className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{post.title}</CardTitle>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
            <MapPin size={16} className="mr-1" />
            <span>{post.location}</span>
          </div>
          {post.category && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Info size={16} className="mr-1" />
              <span>Category: {post.category}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {post.images && post.images.length > 0 && (
            <div className="relative">
              <div 
                className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-800 cursor-pointer" 
                onClick={() => post.images && openImageModal(post.images[currentImageIndex].url)}
              >
                <img
                  src={post.images[currentImageIndex].url}
                  alt={`Image ${currentImageIndex + 1} of ${post.title}`}
                  className="object-contain w-full h-64"
                />
              </div>
              {post.images.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between p-2">
                  <button
                    onClick={handlePrevImage}
                    className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-opacity duration-200"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-opacity duration-200"
                  >
                    &gt;
                  </button>
                </div>
              )}
              {post.images.length > 1 && (
                <div className="flex justify-center p-2 gap-1">
                  {post.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full ${
                        idx === currentImageIndex
                          ? "bg-blue-600 dark:bg-blue-400"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    ></button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Description</h2>
            <CardDescription className="whitespace-pre-line text-gray-700 dark:text-gray-300">{post.description}</CardDescription>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
          <div>
            <span className="px-3 py-1 text-sm border rounded-full bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              Status: {post.status}
            </span>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2 items-center">
            {!isOwner && (
              <Button onClick={handleStartChat} size="sm">
                <MessageCircle className="mr-2 h-4 w-4" /> Start Chat
              </Button>
            )}
            {!isOwner && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => setIsReportDialogOpen(true)}
                      aria-label="Report this post"
                    >
                      <Flag className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Report Post</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isOwner && (
              <>
                <Button onClick={handleCheckInbox} variant="default" size="sm"> 
                  Check Inbox
                </Button>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-select" className="text-sm font-medium whitespace-nowrap">
                    Set Status:
                  </Label>
                  {post.status === 'PENDING' && (
                    <AlertDialog open={isStatusUpdateDialogOpen && statusToUpdate === 'MATCHED'} onOpenChange={(open) => { if (!open) setIsStatusUpdateDialogOpen(false); }}>
                      <AlertDialogTrigger asChild>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={() => { setStatusToUpdate('MATCHED'); setIsStatusUpdateDialogOpen(true); }}
                           disabled={isUpdatingStatus}
                         >
                           {isUpdatingStatus && statusToUpdate === 'MATCHED' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                           Mark as Matched
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark as Matched?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This indicates you have found a potential match for your {post.type === 'LOST' ? 'lost' : 'found'} item.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setIsStatusUpdateDialogOpen(false)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleUpdateStatus('MATCHED')} disabled={isUpdatingStatus}>
                            Confirm Match
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {(post.status === 'PENDING' || post.status === 'MATCHED') && (
                    <AlertDialog open={isStatusUpdateDialogOpen && statusToUpdate === 'RESOLVED'} onOpenChange={(open) => { if (!open) setIsStatusUpdateDialogOpen(false); }}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setStatusToUpdate('RESOLVED'); setIsStatusUpdateDialogOpen(true); }}
                          disabled={isUpdatingStatus}
                        >
                          {isUpdatingStatus && statusToUpdate === 'RESOLVED' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          Mark as Resolved
                        </Button>
                      </AlertDialogTrigger>
                       <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark as Resolved?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This indicates the item has been successfully returned or the post is no longer needed. This allows archiving.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setIsStatusUpdateDialogOpen(false)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleUpdateStatus('RESOLVED')} disabled={isUpdatingStatus}>
                            Confirm Resolution
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => router.push(`/posts/edit/${post.id}`)}
                      disabled={post.status === 'RESOLVED'} 
                      aria-label="Edit Post"
                      className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700">
                    <p>{post.status === 'RESOLVED' ? "Cannot edit resolved post" : "Edit Post"}</p>
                  </TooltipContent>
                </Tooltip>
                
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild disabled={post.status !== "RESOLVED"}> 
                        <div className={`${post.status !== "RESOLVED" ? 'cursor-not-allowed' : ''}`}>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={post.status !== "RESOLVED" || isArchiving}
                            className={`text-gray-600 border-gray-500 dark:text-gray-400 dark:border-gray-600 ${post.status === 'RESOLVED' ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'opacity-50'}`}
                            aria-label="Archive Post"
                          >
                            {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                          </Button>
                        </div>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700">
                      <p>{post.status === "RESOLVED" ? "Archive Post" : "Must be Resolved to Archive"}</p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Archived posts are removed from public view but can still be accessed by administrators. This action cannot be easily undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleArchivePost} disabled={isArchiving}>
                        {isArchiving ? "Archiving..." : "Yes, archive post"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <AlertDialogTrigger asChild>
                         <Button 
                           variant="outline" 
                           size="icon"
                           className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-500 dark:border-red-500 dark:hover:bg-red-900/50 dark:hover:text-red-400"
                           disabled={isDeleting}
                           aria-label="Delete Post"
                         >
                           {isDeleting ? <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-red-600 dark:border-red-500 rounded-full"></span> : <Trash2 className="h-4 w-4" />}
                          </Button>
                       </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700">
                      <p>Delete Post</p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialogContent className="dark:bg-gray-900 dark:border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="dark:text-gray-100">Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription className="dark:text-gray-400">
                        This action cannot be undone. This will move your post to an archive accessible by administrators.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeletePost} 
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 dark:text-gray-100"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Yes, delete post"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {modalImageUrl && (
        <ImageViewModal 
          imageUrl={modalImageUrl} 
          isOpen={isModalOpen} 
          onClose={closeImageModal} 
          filename={post.title}
        />
      )}

      <ReportDialog 
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        entityType="POST"
        entityId={id}
      />
    </div>
    </TooltipProvider>
  );
} 