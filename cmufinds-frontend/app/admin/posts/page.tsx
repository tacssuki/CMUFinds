'use client';

import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { 
  Search, Filter, RefreshCw, Eye, Archive, CheckCircle2, 
  Link2, Pencil, Trash2, RotateCcw, Settings, Edit, Undo // Added icons
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea'; // Added Textarea
import { useToast } from '@/components/ui/use-toast'; // Added useToast
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Define the Post type including user details and deletedAt
interface Post {
  id: string;
  title: string;
  description: string;
  type: 'LOST' | 'FOUND';
  status: 'PENDING' | 'MATCHED' | 'RESOLVED'; // Use backend statuses
  location: string;
  userId: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null; // Added for soft delete
  imageUrl?: string; // From transformPostImages
  images?: { id: string; url: string }[]; // From transformPostImages
  user?: {
    id?: string;
    name?: string;
    username?: string;
  };
}

// Define available post statuses for the dropdown
const POST_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'RESOLVED', label: 'Resolved' },
];

// Add interface for PostHistory (adjust based on actual data from backend)
interface PostHistoryEntry {
  id: string;
  postId: string;
  action: string;
  changedBy: string; // User ID
  timestamp: string;
  // Include related data if fetched by backend:
  // post?: { title?: string };
  // user?: { username?: string }; 
}

// Add interface for ArchivedPost (adjust based on actual data)
interface ArchivedPostEntry {
  id: string;
  originalPostId: string;
  archivedAt: string;
  // Include original post details if fetched by backend:
  // originalPost?: { title?: string; /* other fields */ };
}

export default function PostManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [deletedPosts, setDeletedPosts] = useState<Post[]>([]);
  const [postHistory, setPostHistory] = useState<PostHistoryEntry[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<ArchivedPostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletedTotalPages, setDeletedTotalPages] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [archivedTotalPages, setArchivedTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('active');
  const [postTypeFilter, setPostTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  
  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [isEditPostDialogOpen, setIsEditPostDialogOpen] = useState(false); // Edit dialog
  const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false); // Status dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // Delete confirmation

  // State for selected items/forms
  const [selectedPost, setSelectedPost] = useState<Post | null>(null); // For view, edit, status, delete
  const [editPostFormData, setEditPostFormData] = useState({ 
    title: '', description: '', location: '', category: '' 
  });
  const [selectedStatus, setSelectedStatus] = useState<string>(''); // For status update
  const [matchableItems, setMatchableItems] = useState<Post[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Fetch posts
  const fetchPostsData = async (page: number, type: 'active' | 'deleted' | 'history' | 'archived') => {
    setLoading(true);
    setError(null);
    try {
      let response;
      const params: any = { page: page, limit: 10 };

      if (type === 'active' || type === 'deleted') {
        params.includeDeleted = (type === 'deleted');
        // Add filters only for active/deleted tabs
        if (postTypeFilter !== 'all') params.type = postTypeFilter;
         // Only apply status filter to active posts for now
        if (type === 'active' && statusFilter !== 'all') params.status = statusFilter; 
        if (searchQuery.trim()) params.search = searchQuery.trim();
        response = await adminAPI.getPosts(params); 
        const fetchedPosts = response.data?.data?.posts || [];
        const total = response.data?.data?.totalPosts || 0;
        const limit = response.data?.data?.limit || 10;
        if (type === 'deleted') {
          setDeletedPosts(fetchedPosts.filter((p: Post) => p.deletedAt)); 
          setDeletedTotalPages(Math.ceil(total / limit));
        } else {
          setPosts(fetchedPosts.filter((p: Post) => !p.deletedAt)); 
          setTotalPages(Math.ceil(total / limit));
        }
      } else if (type === 'history') {
        // Fetch Post History using the new general history function
        if (searchQuery.trim()) params.search = searchQuery.trim(); // Example filter
        response = await adminAPI.getPostHistory(params); // Use the new function
        setPostHistory(response.data?.data?.history || []); 
        setHistoryTotalPages(Math.ceil((response.data?.data?.total || 0) / (response.data?.data?.limit || 10)));
      } else if (type === 'archived') {
        // Fetch Archived Posts using the new dedicated function
        if (searchQuery.trim()) params.search = searchQuery.trim(); // Example filter
        response = await adminAPI.getArchivedPosts(params); // Use the new function
        // Make sure the backend response structure is handled correctly (e.g., data.data.archivedPosts?)
        // Assuming the backend returns archived posts similarly to regular posts for now.
        setArchivedPosts(response.data?.data?.archivedPosts || response.data?.data?.posts || []); 
        setArchivedTotalPages(Math.ceil((response.data?.data?.total || 0) / (response.data?.data?.limit || 10)));
      }

    } catch (err) {
      const errorMsg = `Failed to load ${type} posts.`;
      setError(errorMsg);
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      console.error(errorMsg, err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch posts based on active tab and pagination
  useEffect(() => {
    const pageMap = { 
      active: currentPage, 
      deleted: deletedPage, 
      history: historyPage, 
      archived: archivedPage 
    };
    fetchPostsData(pageMap[activeTab as keyof typeof pageMap], activeTab as any);
  }, [currentPage, deletedPage, historyPage, archivedPage, activeTab, postTypeFilter, statusFilter, searchQuery]); // Re-fetch on relevant changes

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset page to 1 when searching
    if (activeTab === 'active') setCurrentPage(1);
    else if (activeTab === 'deleted') setDeletedPage(1);
    else if (activeTab === 'history') setHistoryPage(1);
    else if (activeTab === 'archived') setArchivedPage(1);
    // Fetching is handled by useEffect dependency on searchQuery
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    const pageMap = { 
      active: currentPage, 
      deleted: deletedPage, 
      history: historyPage, 
      archived: archivedPage 
    };
    fetchPostsData(pageMap[activeTab as keyof typeof pageMap], activeTab as any);
  };

  // View post details
  const handleViewPost = (post: Post) => {
    setSelectedPost(post);
    setIsViewDialogOpen(true);
  };

  // Edit Post Dialog
  const handleEditPost = (post: Post) => {
    setSelectedPost(post);
    setEditPostFormData({ 
      title: post.title, 
      description: post.description, 
      location: post.location,
      category: post.category || ''
    });
    setIsEditPostDialogOpen(true);
  };

  const handleEditPostFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditPostFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEditPost = async () => {
    if (!selectedPost) return;
    try {
      await adminAPI.updatePost(selectedPost.id, editPostFormData);
      toast({ title: "Success", description: "Post updated successfully." });
      setIsEditPostDialogOpen(false);
      const pageMap = { 
        active: currentPage, 
        deleted: deletedPage, 
        history: historyPage, 
        archived: archivedPage 
      };
      fetchPostsData(pageMap[activeTab as keyof typeof pageMap], activeTab as any);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to update post.", variant: "destructive" });
      console.error('Error updating post:', err);
    }
  };

  // Update Status Dialog
  const handleUpdateStatus = (post: Post) => {
    setSelectedPost(post);
    setSelectedStatus(post.status);
    setIsUpdateStatusDialogOpen(true);
  };

  const handleSaveStatusUpdate = async () => {
    if (!selectedPost || !selectedStatus) return;
    try {
      await adminAPI.updatePostStatus(selectedPost.id, { status: selectedStatus });
      toast({ title: "Success", description: "Post status updated." });
      setIsUpdateStatusDialogOpen(false);
      const pageMap = { 
        active: currentPage, 
        deleted: deletedPage, 
        history: historyPage, 
        archived: archivedPage 
      };
      fetchPostsData(pageMap[activeTab as keyof typeof pageMap], activeTab as any);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to update status.", variant: "destructive" });
      console.error('Error updating post status:', err);
    }
  };
  
  // Delete Post Dialog (Soft Delete)
  const handleDeletePost = (post: Post) => {
    setSelectedPost(post);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDeletePost = async () => {
    if (!selectedPost) return;
    try {
      await adminAPI.deletePost(selectedPost.id); // Calls soft delete endpoint
      toast({ title: "Success", description: "Post moved to deleted tab." });
      setIsDeleteDialogOpen(false);
      // Refetch both lists
      const pageMap = { 
        active: currentPage, 
        deleted: deletedPage, 
        history: historyPage, 
        archived: archivedPage 
      };
      fetchPostsData(pageMap[activeTab as keyof typeof pageMap], activeTab as any);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to delete post.", variant: "destructive" });
      console.error('Error deleting post:', err);
    }
  };

  // Restore Post
  const handleRestorePost = async (postId: string) => {
     try {
      await adminAPI.restorePost(postId);
      toast({ title: "Success", description: "Post restored." });
      // Refetch both lists
      const pageMap = { 
        active: currentPage, 
        deleted: deletedPage, 
        history: historyPage, 
        archived: archivedPage 
      };
      fetchPostsData(pageMap[activeTab as keyof typeof pageMap], activeTab as any);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to restore post.", variant: "destructive" });
      console.error('Error restoring post:', err);
    }
  };

  // Match post
  const handleMatchDialog = async (post: Post) => {
    try {
      setSelectedPost(post);
      const response = await adminAPI.getPotentialMatches(post.id);
      setMatchableItems(response.data.potentialMatches || []); // Ensure it's an array
      setSelectedMatchId('');
      setIsMatchDialogOpen(true);
    } catch (err) {
      toast({ title: "Error", description: "Failed to get potential matches.", variant: "destructive" });
      console.error('Error getting potential matches:', err);
    }
  };

  const handleMatchPost = async () => {
    if (!selectedPost || !selectedMatchId) return;
    try {
      await adminAPI.matchPost(selectedPost.id, selectedMatchId);
      toast({ title: "Success", description: "Posts matched." });
      setIsMatchDialogOpen(false);
      const pageMap = { 
        active: currentPage, 
        deleted: deletedPage, 
        history: historyPage, 
        archived: archivedPage 
      };
      fetchPostsData(pageMap[activeTab as keyof typeof pageMap], activeTab as any);
    } catch (err) {
      toast({ title: "Error", description: "Failed to match posts.", variant: "destructive" });
      console.error('Error matching posts:', err);
    }
  };

  // Format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'Invalid Date';
    }
  };

  // Render post type badge
  const renderPostTypeBadge = (type: string) => {
    if (type === 'LOST') {
      // Inverted: Amber background, dark text in dark mode
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-300 dark:text-amber-900 dark:border-amber-400">Lost</Badge>;
    }
    // Inverted: Green background, dark text in dark mode
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-300 dark:text-green-900 dark:border-green-400">Found</Badge>;
  };

  // Render post status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        // Inverted: Blue background, dark text in dark mode
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-300 dark:text-blue-900 dark:border-blue-400">Pending</Badge>;
      case 'MATCHED':
        // Inverted: Purple background, dark text in dark mode
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-300 dark:text-purple-900 dark:border-purple-400">Matched</Badge>;
      case 'RESOLVED':
         // Inverted: Green background, dark text in dark mode
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-300 dark:text-green-900 dark:border-green-400">Resolved</Badge>;
      default:
        // Default outline for unknown status
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render post table
  const renderPostTable = (postList: Post[], isDeletedTab: boolean) => {
    if (loading && postList.length === 0) {
      // Render Skeleton Loader for Table
    return (
        <div className="w-full space-y-2 rounded-md border p-4">
          {/* Skeleton Header */}
          <div className="flex justify-between space-x-4">
            <Skeleton className="h-5 w-[80px]" />
            <Skeleton className="h-5 w-[250px]" />
            <Skeleton className="h-5 w-[100px] hidden md:block" />
            <Skeleton className="h-5 w-[100px]" />
            <Skeleton className="h-5 w-[120px]" />
            <Skeleton className="h-5 w-[80px]" />
          </div>
          {/* Skeleton Rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between space-x-4 mt-4">
              <Skeleton className="h-8 w-[80px]" />
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-8 w-[100px] hidden md:block" />
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-8 w-[80px]" />
            </div>
          ))}
      </div>
    );
  }

    if (!loading && postList.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          No {isDeletedTab ? 'deleted' : 'active'} posts found.
        </div>
      );
    }

    return (
      <ScrollArea className="w-full overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background border-b">
            <TableRow>
              <TableHead className="w-[80px]">Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isDeletedTab ? 'Deleted At' : 'Created At'}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {postList.map((post) => (
              <TableRow key={post.id}>
                <TableCell>{renderPostTypeBadge(post.type)}</TableCell>
                <TableCell className="font-medium max-w-[250px] truncate" title={post.title}>{post.title}</TableCell>
                <TableCell className="hidden md:table-cell">{post.user?.name || post.user?.username || 'N/A'}</TableCell>
                <TableCell>{renderStatusBadge(post.status)}</TableCell>
                <TableCell>{formatDate(isDeletedTab ? post.deletedAt : post.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex space-x-1 justify-end">
                    {isDeletedTab ? (
          <Button 
                         variant="ghost"
                         size="icon"
                         onClick={() => handleRestorePost(post.id)}
                         title="Restore Post"
                       >
                         <RotateCcw className="h-4 w-4" />
          </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleViewPost(post)} title="View Details"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditPost(post)} title="Edit Post"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleUpdateStatus(post)} title="Update Status"><Settings className="h-4 w-4" /></Button>
                        {post.status === 'PENDING' && (
                           <Button variant="ghost" size="icon" onClick={() => handleMatchDialog(post)} title="Find Match"><Link2 className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive dark:text-red-500 dark:hover:text-red-400" onClick={() => handleDeletePost(post)} title="Delete Post"><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  // Render History Table
  const renderHistoryTable = () => {
     if (loading && postHistory.length === 0) {
       // Render Skeleton Loader for History
       return (
         <div className="w-full space-y-2 rounded-md border p-4">
           {/* Skeleton Header */}
           <div className="flex justify-between space-x-4">
             <Skeleton className="h-5 w-[150px]" />
             <Skeleton className="h-5 w-[200px]" />
             <Skeleton className="h-5 w-[100px]" />
             <Skeleton className="h-5 w-[150px]" />
           </div>
           {/* Skeleton Rows */}
           {[...Array(5)].map((_, i) => (
             <div key={i} className="flex justify-between space-x-4 mt-4">
               <Skeleton className="h-8 w-[150px]" />
               <Skeleton className="h-8 w-[200px]" />
               <Skeleton className="h-8 w-[100px]" />
               <Skeleton className="h-8 w-[150px]" />
             </div>
           ))}
        </div>
      );
    }
    if (!loading && postHistory.length === 0) {
      return <p className="p-4 text-center text-muted-foreground">No post history found.</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Post ID</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Changed By (User ID)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {postHistory.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.timestamp)}</TableCell>
              <TableCell>{entry.postId}</TableCell>
              <TableCell><Badge variant="outline">{entry.action}</Badge></TableCell>
              <TableCell>{entry.changedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  
  // Render Archived Table
  const renderArchivedTable = () => {
     if (loading && archivedPosts.length === 0) {
       // Render Skeleton Loader for Archived
       return (
         <div className="w-full space-y-2 rounded-md border p-4">
           {/* Skeleton Header */}
           <div className="flex justify-between space-x-4">
             <Skeleton className="h-5 w-[150px]" />
             <Skeleton className="h-5 w-[200px]" />
             {/* Add more header skeletons if needed */}
           </div>
           {/* Skeleton Rows */}
           {[...Array(5)].map((_, i) => (
             <div key={i} className="flex justify-between space-x-4 mt-4">
               <Skeleton className="h-8 w-[150px]" />
               <Skeleton className="h-8 w-[200px]" />
               {/* Add more row skeletons if needed */}
             </div>
           ))}
        </div>
      );
    }
     if (!loading && archivedPosts.length === 0) {
      return <p className="p-4 text-center text-muted-foreground">No archived posts found.</p>;
    }
     return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Archived At</TableHead>
            <TableHead>Original Post ID</TableHead>
             {/* TODO: Add columns for original post details when fetched */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {archivedPosts.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.archivedAt)}</TableCell>
              <TableCell>{entry.originalPostId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Posts Management</h1>
        <p className="text-muted-foreground">
          Manage lost and found items across the platform
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter and search through posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="w-full md:w-auto">
              <Label className="text-sm font-medium mb-1 block">Post Type</Label>
              <Select value={postTypeFilter} onValueChange={(value: string) => { setPostTypeFilter(value); setCurrentPage(1); setDeletedPage(1); setHistoryPage(1); setArchivedPage(1); }}>
                <SelectTrigger className="w-full md:w-[140px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                  <SelectItem value="FOUND">Found</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {activeTab === 'active' && (
            <div className="w-full md:w-auto">
              <Label className="text-sm font-medium mb-1 block">Status</Label>
                <Select value={statusFilter} onValueChange={(value: string) => { setStatusFilter(value); setCurrentPage(1); setDeletedPage(1); setHistoryPage(1); setArchivedPage(1); }}>
                  <SelectTrigger className="w-full md:w-[140px]"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All (Non-Resolved)</SelectItem>
                    {POST_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            )}
            
            <form onSubmit={handleSearch} className="flex-1 w-full">
              <Label className="text-sm font-medium mb-1 block">Search</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search title, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button type="submit" size="icon"><Filter className="h-4 w-4" /></Button>
                <Button type="button" variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active Posts</TabsTrigger>
          <TabsTrigger value="deleted">Deleted Posts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
      <Card>
            <CardHeader>
              <CardTitle>Active Posts</CardTitle>
              <CardDescription>Posts currently visible to users.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderPostTable(posts, false)}
            </CardContent>
           </Card>
          {!loading && posts.length > 0 && totalPages > 1 && (
             <div className="flex justify-center mt-4 space-x-2">
              <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1 || loading}>Previous</Button>
              <span className="py-2 px-4">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || loading}>Next</Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="deleted" className="mt-4">
           <Card>
             <CardHeader>
              <CardTitle>Deleted Posts</CardTitle>
              <CardDescription>Posts that have been soft-deleted and are hidden from users.</CardDescription>
            </CardHeader>
             <CardContent>
                {renderPostTable(deletedPosts, true)}
             </CardContent>
           </Card>
           {!loading && deletedPosts.length > 0 && deletedTotalPages > 1 && (
             <div className="flex justify-center mt-4 space-x-2">
               <Button variant="outline" onClick={() => setDeletedPage((prev) => Math.max(prev - 1, 1))} disabled={deletedPage === 1 || loading}>Previous</Button>
               <span className="py-2 px-4">Page {deletedPage} of {deletedTotalPages}</span>
               <Button variant="outline" onClick={() => setDeletedPage((prev) => Math.min(prev + 1, deletedTotalPages))} disabled={deletedPage === deletedTotalPages || loading}>Next</Button>
             </div>
            )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
           <Card>
             <CardHeader>
               <CardTitle>Post History</CardTitle>
               <CardDescription>Activity log related to posts.</CardDescription>
            </CardHeader>
             <CardContent>
               {renderHistoryTable()}
             </CardContent>
           </Card>
           {/* History Pagination */}
           {!loading && postHistory.length > 0 && historyTotalPages > 1 && (
             <div className="flex justify-center mt-4 space-x-2">
               <Button variant="outline" onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))} disabled={historyPage === 1 || loading}>Previous</Button>
               <span className="py-2 px-4">Page {historyPage} of {historyTotalPages}</span>
               <Button variant="outline" onClick={() => setHistoryPage((prev) => Math.min(prev + 1, historyTotalPages))} disabled={historyPage === historyTotalPages || loading}>Next</Button>
          </div>
        )}
        </TabsContent>
        <TabsContent value="archived" className="mt-4">
           <Card>
             <CardHeader>
               <CardTitle>Archived Posts</CardTitle>
               <CardDescription>Posts that have been archived after resolution.</CardDescription>
            </CardHeader>
             <CardContent>
               {renderArchivedTable()}
             </CardContent>
      </Card>
           {/* Archived Pagination */} 
           {!loading && archivedPosts.length > 0 && archivedTotalPages > 1 && (
      <div className="flex justify-center mt-4 space-x-2">
               <Button variant="outline" onClick={() => setArchivedPage((prev) => Math.max(prev - 1, 1))} disabled={archivedPage === 1 || loading}>Previous</Button>
               <span className="py-2 px-4">Page {archivedPage} of {archivedTotalPages}</span>
               <Button variant="outline" onClick={() => setArchivedPage((prev) => Math.min(prev + 1, archivedTotalPages))} disabled={archivedPage === archivedTotalPages || loading}>Next</Button>
      </div>
            )}
        </TabsContent>
      </Tabs>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Post Details</DialogTitle></DialogHeader>
          {selectedPost && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderPostTypeBadge(selectedPost.type)}
                  {renderStatusBadge(selectedPost.status)}
                </div>
                <span className="text-sm text-muted-foreground">Created: {formatDate(selectedPost.createdAt)}</span>
              </div>
              <h3 className="text-lg font-bold mt-2">{selectedPost.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 break-words">{selectedPost.description}</p>
                </div>
                 <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Image(s)</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(selectedPost.images && selectedPost.images.length > 0 && selectedPost.images[0].id !== 'placeholder') ? (
                      selectedPost.images.map(img => (
                        <img key={img.id} src={img.url} alt={selectedPost.title} className="h-20 w-20 rounded border object-cover" />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No image provided.</p>
                    )}
                  </div>
                  </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Location</Label>
                  <p className="text-sm mt-1">{selectedPost.location}</p>
                  </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Category</Label>
                  <p className="text-sm mt-1">{selectedPost.category || 'N/A'}</p>
                    </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">User</Label>
                  <p className="text-sm mt-1">{selectedPost.user?.name || selectedPost.user?.username || 'N/A'}</p>
                </div>
                  <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Last Updated</Label>
                  <p className="text-sm mt-1">{formatDate(selectedPost.updatedAt)}</p>
                  </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPostDialogOpen} onOpenChange={setIsEditPostDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" name="title" value={editPostFormData.title} onChange={handleEditPostFormChange} />
            </div>
             <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" name="description" value={editPostFormData.description} onChange={handleEditPostFormChange} />
            </div>
             <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" name="location" value={editPostFormData.location} onChange={handleEditPostFormChange} />
            </div>
             <div>
              <Label htmlFor="edit-category">Category</Label>
              <Input id="edit-category" name="category" value={editPostFormData.category} onChange={handleEditPostFormChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPostDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditPost}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpdateStatusDialogOpen} onOpenChange={setIsUpdateStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Post Status</DialogTitle>
            <DialogDescription>Change the status for "{selectedPost?.title}".</DialogDescription>
          </DialogHeader>
           <div className="py-4">
             <Label htmlFor="status-select">New Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="status-select">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {POST_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
           </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStatusUpdate} disabled={!selectedStatus || selectedStatus === selectedPost?.status}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the post "{selectedPost?.title}"? 
              This action is reversible via the Deleted Posts tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDeletePost}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Post</DialogTitle>
            <DialogDescription>
              Select a potential matching post to create a match
            </DialogDescription>
          </DialogHeader>
          
          {selectedPost && (
            <div className="space-y-4 py-4">
              <div>
                <p className="font-medium">Current Post:</p>
                <p>{selectedPost.title} ({renderPostTypeBadge(selectedPost.type)})</p>
              </div>
              
              <div>
                <Label htmlFor="match-post">Select Matching Post</Label>
                <Select
                  value={selectedMatchId}
                  onValueChange={setSelectedMatchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a matching post" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchableItems.length === 0 ? (
                      <SelectItem value="none" disabled>No potential matches found</SelectItem>
                    ) : (
                      matchableItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title} - {item.location}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMatchPost} 
              disabled={!selectedMatchId}
            >
              Create Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 