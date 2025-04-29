"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { postAPI, PostParams } from "@/lib/postsAPI";
import { Loader2, PlusCircle, Filter, Search, X, MapPin, Calendar, SortAsc, SortDesc, RefreshCcw, Clock, Check, Clock3, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  description: string;
  location: string;
  type: "LOST" | "FOUND";
  status: string;
  createdAt: string;
  images: Array<string | { id: string; url: string }>;
  category?: string;
  userId: string;
  user: {
    id: string;
    name: string;
    username?: string;
  };
}

interface PostsResponse {
  posts: Post[];
  page: number;
  limit: number;
  totalPosts: number;
  totalPages: number;
}

// Helper function to format status for display
const formatStatusForDisplay = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'Pending';
    case 'MATCHED': return 'Matched';
    case 'RESOLVED': return 'Resolved';
    default: return status;
  }
};

// Helper function to format sortBy for display
const formatSortByForDisplay = (sortBy: string): string => {
  switch (sortBy) {
    case 'createdAt': return 'Date Created';
    case 'title': return 'Title';
    case 'category': return 'Category';
    case 'type': return 'Type';
    case 'status': return 'Status';
    default: return sortBy;
  }
};

// Helper function to format sortOrder for display
const formatSortOrderForDisplay = (sortOrder: 'asc' | 'desc'): string => {
  return sortOrder === 'asc' ? 'Ascending' : 'Descending';
};

export default function MyPostsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination (includes limit) - Initialized directly
  const [pagination, setPagination] = useState({
    currentPage: Number(searchParams.get("page") || "1"),
    totalPages: 1,
    totalPosts: 0,
    limit: Number(searchParams.get("limit") || "10") // Default limit
  });
  
  // Filter states (local, updated immediately) - Initialized directly
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [postType, setPostType] = useState<string>(() => searchParams.get("type") || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "ALL");
  const [category, setCategory] = useState<string>(() => searchParams.get("category") || "__ALL__"); // Use placeholder
  const [location, setLocation] = useState<string>(() => searchParams.get("location") || "");
  const [sortBy, setSortBy] = useState<string>(() => searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (searchParams.get("sortOrder") as 'asc' | 'desc') || "desc");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false); 

  // REMOVED Applied filters state - Now read directly from URL or local state for application

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

  // REMOVED useEffect for initializing state from searchParams (done inline now)

  // Fetch posts whenever URL searchParams change
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Read filters directly from searchParams for fetching
    const currentParams = {
      search: searchParams.get("search") || undefined,
      type: searchParams.get("type") || undefined,
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
      location: searchParams.get("location") || undefined,
      sortBy: searchParams.get("sortBy") || 'createdAt',
      sortOrder: (searchParams.get("sortOrder") as 'asc' | 'desc') || 'desc',
      page: Number(searchParams.get("page") || "1"),
      limit: Number(searchParams.get("limit") || "10")
    };

    const fetchPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use currentParams derived from URL for the API call
        const params: PostParams = { // Using PostParams type
          page: currentParams.page,
          limit: currentParams.limit,
          type: currentParams.type,
          status: currentParams.status,
          category: currentParams.category,
          location: currentParams.location,
          search: currentParams.search,
          sortBy: currentParams.sortBy,
          sortOrder: currentParams.sortOrder
        };

        const response = await postAPI.getMyPosts(params);
      
        if (response.data && response.data.data) {
          const { posts, totalPosts, page, limit, totalPages } = response.data.data;
          setPosts(posts || []);
          setPagination({ // Update pagination state correctly
            currentPage: page,
            totalPosts,
            totalPages: totalPages || Math.ceil(totalPosts / limit),
            limit
          });
        } else {
          setError("Failed to load posts");
          setPosts([]);
          setPagination(prev => ({ ...prev, totalPosts: 0, totalPages: 1, currentPage: 1 }));
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        setError("Failed to load posts. Please try again.");
        setPosts([]);
        toast({ // Added toast notification on error
          title: "Error",
          description: "Failed to load posts. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, searchParams, toast]); // Depend on searchParams now

  // Apply filters and update URL
  const applyFiltersAndSearch = useCallback(() => { // Wrap in useCallback
    const url = new URL(window.location.href);
    const params: Record<string, string | null> = {
      search: searchTerm.trim() || null,
      type: postType !== "ALL" ? postType : null,
      status: statusFilter !== "ALL" ? statusFilter : null,
      category: category !== "__ALL__" ? category : null,
      location: location || null,
      sortBy: sortBy !== "createdAt" ? sortBy : null, // Only include if not default
      sortOrder: sortOrder !== "desc" ? sortOrder : null, // Only include if not default
      page: '1', // Reset page when applying filters
      limit: pagination.limit.toString() // Keep current limit
    };
    
    // Clean up null/undefined parameters before setting URL
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    // Use router.replace to avoid adding to history stack
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    setShowAdvancedSearch(false); // Optional: Hide panel after applying
  }, [searchTerm, postType, statusFilter, category, location, sortBy, sortOrder, pagination.limit, router]);


  // Handle form submission (uses applyFiltersAndSearch)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFiltersAndSearch();
  };

  // Update LOCAL state only when filter inputs change
  const handleLocalFilterChange = (name: string, value: string) => {
    switch (name) {
      case 'type': setPostType(value); break;
      case 'status': setStatusFilter(value); break;
      case 'category': setCategory(value); break;
      case 'location': setLocation(value); break;
      case 'sortBy': setSortBy(value); break;
      case 'sortOrder': setSortOrder(value as 'asc' | 'desc'); break;
    }
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Reset filters
  const resetFilters = useCallback(() => { // Wrap in useCallback
    setSearchTerm("");
    setPostType("ALL");
    setStatusFilter("ALL"); // Reset to ALL or desired default
    setCategory("__ALL__");
    setLocation("");
    setSortBy("createdAt");
    setSortOrder("desc");
    // Apply the reset immediately
    // Need to construct params manually here as local state updates might not be immediate
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    url.searchParams.delete('type');
    url.searchParams.delete('status');
    url.searchParams.delete('category');
    url.searchParams.delete('location');
    url.searchParams.delete('sortBy');
    url.searchParams.delete('sortOrder');
    url.searchParams.set('page', '1'); // Reset page
    url.searchParams.set('limit', pagination.limit.toString()); // Keep limit
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    setShowAdvancedSearch(false);
  }, [router, pagination.limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusDisplay = (status: string) => {
    let badgeVariant: "outline" | "secondary" | "default" = "outline";
    let badgeClasses = "";
    let icon: React.ReactNode = <AlertCircle className="h-4 w-4 mr-1" />;

    switch(status) {
      case 'PENDING':
        // Inverted: Blue bg, dark text in dark mode
        badgeClasses = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-300 dark:text-blue-900 dark:border-blue-400";
        icon = <Clock3 className="h-4 w-4 mr-1" />;
        break;
      case 'MATCHED':
         // Inverted: Purple bg, dark text in dark mode
        badgeClasses = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-300 dark:text-purple-900 dark:border-purple-400";
        icon = <RefreshCcw className="h-4 w-4 mr-1" />;
        break;
      case 'RESOLVED':
        // Inverted: Green bg, dark text in dark mode
        badgeClasses = "bg-green-50 text-green-700 border-green-200 dark:bg-green-300 dark:text-green-900 dark:border-green-400";
        icon = <Check className="h-4 w-4 mr-1" />;
        break;
      default:
        badgeClasses = "border-border"; // Default outline
        break;
    }
    // Return Badge component directly for easier styling
    return <Badge variant="outline" className={cn("flex items-center", badgeClasses)}>{icon}{formatStatusForDisplay(status)}</Badge>;
  };

  const getTypeColor = (type: "LOST" | "FOUND") => {
    return type === "LOST"
      ? "bg-red-100 text-red-800"
      : "bg-green-100 text-green-800";
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Redirecting to login...</span>
      </div>
    );
  }

  // Calculate posts per page options
  const pageSizeOptions = [5, 10, 20, 50];

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">My Posts</h1>
        <Link href="/posts/create">
          <Button className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Post
          </Button>
        </Link>
      </div>

      {/* Filters and Search Area - Matched with posts/page.tsx */}
      <div className="mb-6">
        <div className="space-y-4">
          {/* Top Row: Search + Filter Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Form */}          
            <form onSubmit={handleFormSubmit} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search in your posts..."
                  value={searchTerm}
                  onChange={handleSearchTermChange}
                  className="pl-9"
                />
              </div>
            </form>
            
            {/* Filter Toggle Button */}
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant={showAdvancedSearch ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showAdvancedSearch ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel (Conditional) */}
          {showAdvancedSearch && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 dark:bg-card rounded-md border border-border">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Type</label>
                <Select value={postType} onValueChange={(v: string) => handleLocalFilterChange('type', v)}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                    <SelectItem value="FOUND">Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Status</label>
                <Select value={statusFilter} onValueChange={(v: string) => handleLocalFilterChange('status', v)}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="MATCHED">Matched</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Category</label>
                <Select value={category} onValueChange={(v: string) => handleLocalFilterChange('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Categories</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    {/* Add other categories */} 
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Location</label>
                <Input 
                  type="text" 
                  placeholder="Filter by location" 
                  value={location} 
                  onChange={(e) => handleLocalFilterChange('location', e.target.value)} 
                />
              </div>
              
              {/* Sort By Filter */}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Sort By</label>
                <Select value={sortBy} onValueChange={(v: string) => handleLocalFilterChange('sortBy', v)}>
                  <SelectTrigger><SelectValue placeholder="Sort By" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    {/* Add other sort options */} 
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order Filter */}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Sort Order</label>
                <Select value={sortOrder} onValueChange={(v: string) => handleLocalFilterChange('sortOrder', v)}>
                  <SelectTrigger><SelectValue placeholder="Order" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons within Panel */}
              <div className="md:col-span-3 flex justify-end gap-2 pt-4 border-t border-border mt-2">
                 <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
                <Button type="button" variant="default" onClick={() => { applyFiltersAndSearch(); setShowAdvancedSearch(false); }}>
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Filters Display (Updated to match posts/page.tsx) */}
      {(searchTerm || postType !== "ALL" || category !== "__ALL__" || statusFilter !== "ALL" || location || sortBy !== "createdAt" || sortOrder !== "desc") && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <span className="text-sm text-muted-foreground mr-2">Active filters:</span>
          {searchTerm && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Search:</span> "{searchTerm}"
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => { setSearchTerm(""); applyFiltersAndSearch(); }}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {postType !== "ALL" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Type:</span> {postType}
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => { setPostType("ALL"); applyFiltersAndSearch(); }}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {category !== "__ALL__" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Category:</span> {category}
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => { setCategory("__ALL__"); applyFiltersAndSearch(); }}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {statusFilter !== "ALL" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Status:</span> {formatStatusForDisplay(statusFilter)}
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => { setStatusFilter("ALL"); applyFiltersAndSearch(); }}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {location && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Location:</span> {location}
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => { setLocation(""); applyFiltersAndSearch(); }}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {/* === ADDED Sort By Badge === */}
          {sortBy !== "createdAt" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Sort By:</span> {formatSortByForDisplay(sortBy)}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => {
                  setSortBy("createdAt")
                  applyFiltersAndSearch()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* === ADDED Sort Order Badge === */}
          {sortOrder !== "desc" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Sort Order:</span> {formatSortOrderForDisplay(sortOrder)}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => {
                  setSortOrder("desc")
                  applyFiltersAndSearch()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {(searchTerm || postType !== "ALL" || category !== "__ALL__" || statusFilter !== "ALL" || location || sortBy !== "createdAt" || sortOrder !== "desc") && (
             <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0.5 text-muted-foreground hover:text-destructive" onClick={resetFilters}>
              Clear All
            </Button>
          )}
        </div>
      )}
      
      {/* Page Size Control & Results Count (Updated) */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Results per page:</span>
          <Select
            value={String(pagination.limit)}
            onValueChange={(value: string) => {
              setPagination(prev => ({...prev, limit: Number(value)}));
              // Trigger URL update which will refetch
              const url = new URL(window.location.href);
              url.searchParams.set('limit', value);
              url.searchParams.set('page', '1'); 
              router.replace(`${url.pathname}?${url.searchParams.toString()}`);
            }}
          >
            <SelectTrigger className="w-20 h-8"><SelectValue placeholder="10" /></SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {/* Showing X - Y of Z results logic - Added */}
          {loading ? (
            "Loading..."
          ) : (
            <>
              Showing {(pagination.currentPage - 1) * pagination.limit + 1}-
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalPosts)} of {pagination.totalPosts} results
            </>
          )}
        </div>
      </div>

      {/* Loading / Error / No Posts States */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your posts...</span>
        </div>
      ) : error ? (
        <div className="text-center text-red-600 p-8 bg-card rounded-lg shadow">
          <p>{error}</p>
          <Button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('search');
              url.searchParams.delete('type');
              url.searchParams.delete('status');
              url.searchParams.delete('category');
              url.searchParams.delete('location');
              url.searchParams.delete('sortBy');
              url.searchParams.delete('sortOrder');
              url.searchParams.set('page', '1');
              url.searchParams.set('limit', pagination.limit.toString());
              router.replace(`${url.pathname}?${url.searchParams.toString()}`);
            }}
            variant="outline"
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center p-8 bg-card rounded-lg shadow border border-border">
          <h2 className="text-xl font-semibold mb-2 text-foreground">No posts found</h2>
          <p className="text-muted-foreground mb-4">
            You haven't created any posts yet or no posts match your filters.
          </p>
        </div>
      ) : (
        <>
          {/* Posts Grid - Updated Card rendering */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {posts.map((post) => (
               <Card 
                 key={post.id}
                 className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full bg-card"
                 onClick={() => router.push(`/posts/${post.id}`)}
               >
                  {/* === ADDED Image Block === */}
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {(post.images && post.images.length > 0 && (post.images[0] as any).url) ? (
                      <img 
                        src={(post.images[0] as any).url}
                        alt={post.title}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                        onError={(e) => (e.currentTarget.src = '/placeholders/no-image.png')} // Fallback image
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                        No image
                      </div>
                    )}
                    {/* Keep the Type Badge */}
                    <Badge 
                      className={`absolute top-2 left-2 text-white ${
                        post.type === 'LOST' ? 'bg-red-600' : 'bg-green-600'
                      }`}
                    >
                      {post.type}
                    </Badge>
                  </div>
                  {/* === END Image Block === */}

                 <CardHeader className="pb-2">
                   <div className="flex justify-between items-start">
                     <CardTitle className="text-lg font-medium line-clamp-1">{post.title}</CardTitle>
                     <div className="text-xs text-muted-foreground">
                       {formatDate(post.createdAt)}
                     </div>
                   </div>
                   {post.category && (
                     <Badge variant="outline" className="mt-1 bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-300 dark:text-slate-900 dark:border-slate-400">{post.category}</Badge>
                   )}
                 </CardHeader>
                 <CardContent className="pb-2 flex-grow">
                   <CardDescription className="line-clamp-2">{post.description}</CardDescription>
                   {post.location && (
                     <div className="flex items-center mt-2 text-sm text-muted-foreground">
                       <MapPin size={14} className="mr-1" />
                       {post.location}
                     </div>
                   )}
                 </CardContent>
                 <CardFooter className="border-t pt-3 mt-auto text-sm">
                   <div className="flex justify-between w-full">
                    {/* Display Owner Name or "You" based on ID comparison */}
                    <div className="text-muted-foreground">
                      {/* This page always shows posts where post.userId === user.userId */}
                      {/* Therefore, it should always display "You" */}
                      <span className="font-semibold text-primary dark:text-secondary">You</span>
                    </div>
                      {getStatusDisplay(post.status)}
                  </div>
                 </CardFooter>
               </Card>
             ))}
          </div>

          {/* Pagination Controls (Updated to match posts/page.tsx style/logic) */}
          {pagination.totalPages > 1 && (
             <div className="flex flex-col md:flex-row items-center justify-between mt-8 space-y-4 md:space-y-0">
              {/* Results count text moved here for consistency */}
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.currentPage - 1) * pagination.limit + 1}-
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalPosts)} of {pagination.totalPosts} posts
              </div>
              
              <div className="flex items-center space-x-2">
                 {/* Page size select moved here for consistency */}
                 <div className="flex items-center mr-4">
                  <label htmlFor="limit-select" className="text-sm mr-2">Posts per page:</label>
                  <Select
                      value={String(pagination.limit)}
                      onValueChange={(value: string) => {
                        setPagination(prev => ({...prev, limit: Number(value)}));
                        const url = new URL(window.location.href);
                        url.searchParams.set('limit', value);
                        url.searchParams.set('page', '1'); 
                        router.replace(`${url.pathname}?${url.searchParams.toString()}`);
                      }}
                    >
                      <SelectTrigger className="w-20 h-8"><SelectValue placeholder="10" /></SelectTrigger>
                      <SelectContent>
                        {pageSizeOptions.map(size => (
                          <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>

                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                    const newPage = Math.max(1, pagination.currentPage - 1);
                    const url = new URL(window.location.href);
                    url.searchParams.set('page', newPage.toString());
                    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
                  }}
                  disabled={pagination.currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm px-2"> {/* Adjusted padding */}
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                     const newPage = Math.min(pagination.totalPages, pagination.currentPage + 1);
                     const url = new URL(window.location.href);
                     url.searchParams.set('page', newPage.toString());
                     router.replace(`${url.pathname}?${url.searchParams.toString()}`);
                  }}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 