"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { postAPI } from "@/lib/postsAPI"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  MapPin, Search, Filter, Plus, X, Calendar, SortAsc, SortDesc, 
  RefreshCcw, Clock, Check, Clock3, AlertCircle
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import debounce from 'lodash.debounce'  // You might need to install this: npm install lodash.debounce
import { PostParams } from "@/lib/postsAPI"
import { cn } from "@/lib/utils"

// Define interfaces
interface Post {
  id: string
  type: "LOST" | "FOUND"
  title: string
  description: string
  location: string
  createdAt: string
  user: { id: string, name: string, username: string }
  status: string
  category?: string
  images?: (string | { id: string, url: string })[]
  dateLost?: string
  dateFound?: string
}

export default function PostsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuthStore()
  
  // Enhanced state management
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get("search") || ""
  })
  const [filter, setFilter] = useState(() => {
    return searchParams.get("type") || "ALL"
  })
  const [category, setCategory] = useState(() => {
    return searchParams.get("category") || "__ALL__"
  })
  const [status, setStatus] = useState(() => {
    return searchParams.get("status") || "PENDING"
  })
  const [location, setLocation] = useState(() => {
    return searchParams.get("location") || ""
  })
  const [sortBy, setSortBy] = useState(() => {
    return searchParams.get("sortBy") || "createdAt"
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    return (searchParams.get("sortOrder") as 'asc' | 'desc') || "desc"
  })
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: Number(searchParams.get("page") || "1"),
    totalPages: 1,
    totalPosts: 0,
    limit: Number(searchParams.get("limit") || "10")
  })

  // Check auth state
  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // NEW: Function to apply all current filters and update URL
  const applyFiltersAndSearch = () => {
    const url = new URL(window.location.href)
    const params: Record<string, string | null> = {
      search: searchQuery.trim() || null,
      type: filter !== "ALL" ? filter : null,
      category: category !== "__ALL__" ? category : null,
      status: status !== "ALL" ? status : null,
      location: location || null,
      sortBy: sortBy,
      sortOrder: sortOrder,
      page: '1' // Always reset to page 1 when applying filters
    };
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, value)
      }
    })
    
    router.replace(url.pathname + url.search)
    setShowAdvancedSearch(false) // Hide filters after applying
  }

  // Load posts when dependencies change (only URL params now trigger fetch)
  useEffect(() => {
    if (!isAuthenticated) return
    
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
    }
    
    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        const isMyPosts = searchParams.get('filter') === 'my'
        const apiParams: PostParams = {
          page: currentParams.page,
          limit: currentParams.limit,
          type: currentParams.type,
          category: currentParams.category,
          status: currentParams.status,
          search: currentParams.search,
          location: currentParams.location,
          sortBy: currentParams.sortBy,
          sortOrder: currentParams.sortOrder
        };
        
        let response
        if (isMyPosts) {
          response = await postAPI.getMyPosts(apiParams)
        } else if (apiParams.search || apiParams.category || apiParams.type || apiParams.status || apiParams.location) {
          response = await postAPI.searchPosts(apiParams)
        } else {
          // Regular feed only needs pagination and sorting
          response = await postAPI.getFeed({
            page: apiParams.page,
            limit: apiParams.limit,
            sortBy: apiParams.sortBy,
            sortOrder: apiParams.sortOrder
          })
        }
        
        // Handle response data structure
        if (response.data?.data) {
          const { posts, totalPosts, page, limit, totalPages } = response.data.data
          setPosts(posts || [])
            setPagination({
              currentPage: page,
            totalPages: totalPages || Math.ceil(totalPosts / limit),
              totalPosts,
              limit
            })
        } else {
          setPosts([])
          setPagination(prev => ({ ...prev, totalPosts: 0, totalPages: 1, currentPage: 1 }))
        }
      } catch (error) {
        console.error("Error fetching posts:", error)
        toast({
          title: "Error",
          description: "Failed to load posts. Please try again.",
          variant: "destructive"
        })
        setPosts([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPosts()
  }, [isAuthenticated, searchParams, toast]) // Only depend on searchParams now

  // Reset all filters (updates local state and then applies)
  const resetAllFilters = () => {
    setSearchQuery("")
    setFilter("ALL")
    setCategory("__ALL__")
    setStatus("PENDING") // Default status might be PENDING or ALL depending on desired UX
    setLocation("")
    setSortBy("createdAt")
    setSortOrder("desc")
    // Apply the reset immediately by updating URL
    applyFiltersAndSearch(); 
  }

  // Handle LOCAL filter state change (NO URL update)
  const handleLocalFilterChange = (name: string, value: string) => {
    switch(name) {
      case 'type':
        setFilter(value)
        break
      case 'category':
        setCategory(value)
        break
      case 'status':
        setStatus(value)
        break
      case 'location':
        setLocation(value)
        break
      case 'sortBy':
        setSortBy(value)
        break
      case 'sortOrder':
        setSortOrder(value as 'asc' | 'desc') // Add sort order state update
        break
    }
  }
  
  // Handle search input change (only updates local state)
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }
  
  // Handle form submission for search (applies filters)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFiltersAndSearch(); // Apply all current filters including search term
  };

  // Get status display with icon
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
    return <Badge variant="outline" className={cn("flex items-center", badgeClasses)}>{icon}{status}</Badge>;
  }
  
  // Format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Calculate posts per page options
  const pageSizeOptions = [5, 10, 20, 50]
  
  // Show loading state while checking auth
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {searchParams.get('filter') === 'my' ? 'My Posts' : 'Lost & Found Feed'}
          </h1>
          <p className="text-gray-500">
            {searchParams.get('filter') === 'my' 
              ? 'View and manage your posts' 
              : 'Browse recent lost and found items'}
          </p>
        </div>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="mb-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-500" />
                </div>
                <Input
                  type="search"
                  placeholder="Search by keyword..."
                  className="pl-10 w-full"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                />
              </div>
            </form>
            
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
          
          {showAdvancedSearch && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 dark:bg-card rounded-md border border-border">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Item Type</label>
                <Select 
                  value={filter}
                  onValueChange={(value: string) => handleLocalFilterChange('type', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Items</SelectItem>
                    <SelectItem value="LOST">Lost Items</SelectItem>
                    <SelectItem value="FOUND">Found Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Category</label>
                <Select 
                  value={category}
                  onValueChange={(value: string) => handleLocalFilterChange('category', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Categories</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Documents">Documents</SelectItem>
                    <SelectItem value="Keys">Keys</SelectItem>
                    <SelectItem value="Books">Books</SelectItem>
                    <SelectItem value="Wallet/Purse">Wallet/Purse</SelectItem>
                    <SelectItem value="ID/Cards">ID/Cards</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Status</label>
                <Select 
                  value={status}
                  onValueChange={(value: string) => handleLocalFilterChange('status', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="MATCHED">Matched</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Location</label>
                <Input
                  type="text"
                  placeholder="Filter by location..."
                  value={location}
                  onChange={(e) => handleLocalFilterChange('location', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Sort By</label>
                <Select 
                  value={sortBy}
                  onValueChange={(value: string) => handleLocalFilterChange('sortBy', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Sort Order</label>
                <Select 
                  value={sortOrder}
                  onValueChange={(value: string) => handleLocalFilterChange('sortOrder', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetAllFilters} 
                >
                  Reset Filters
                </Button>
                <Button 
                  type="button" 
                  variant="default" 
                  onClick={applyFiltersAndSearch} 
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Filters Display */}
      {(searchQuery || filter !== "ALL" || category !== "__ALL__" || status !== "PENDING" || location) && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <div className="text-sm text-muted-foreground flex items-center mr-2">Active filters:</div>
          
          {searchQuery && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Search:</span> {searchQuery}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => {
                  setSearchQuery("")
                  applyFiltersAndSearch()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filter !== "ALL" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Type:</span> {filter}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => {
                  setFilter("ALL")
                  applyFiltersAndSearch()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {category !== "__ALL__" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Category:</span> {category}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => {
                  setCategory("__ALL__")
                  applyFiltersAndSearch()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {status !== "PENDING" && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Status:</span> {status}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => {
                  setStatus("PENDING")
                  applyFiltersAndSearch()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {location && (
            <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
              <span className="font-normal">Location:</span> {location}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm"
                onClick={() => {
                  setLocation("")
                  applyFiltersAndSearch()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {(searchQuery || filter !== "ALL" || category !== "__ALL__" || status !== "PENDING" || location) && (
            <Button 
              variant="link"
              size="sm" 
              className="text-xs h-auto px-1 py-0.5 text-muted-foreground hover:text-destructive"
              onClick={resetAllFilters}
            >
              Clear All
            </Button>
          )}
        </div>
      )}
      
      {/* Page Size Control */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Results per page:</span>
          <Select
            value={String(pagination.limit)}
            onValueChange={(value: string) => {
              setPagination(prev => ({...prev, limit: Number(value)}))
              applyFiltersAndSearch()
            }}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              Showing {posts.length > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0} - {
                Math.min(pagination.currentPage * pagination.limit, pagination.totalPosts)
              } of {pagination.totalPosts} results
            </>
          )}
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading posts...</span>
        </div>
      ) : posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <Card 
                key={post.id}
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full bg-card"
                onClick={() => router.push(`/posts/${post.id}`)}
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  {post.images && post.images.length > 0 ? (
                    <img 
                      src={typeof post.images[0] === 'string' 
                        ? post.images[0] 
                        : (post.images[0] as any).url || '/placeholder.jpg'
                      }
                      alt={post.title}
                      className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                      No image
                    </div>
                  )}
                  <Badge 
                    className={`absolute top-2 left-2 text-white ${
                      post.type === 'LOST' ? 'bg-red-600' : 'bg-green-600'
                    }`}
                  >
                    {post.type}
                  </Badge>
                </div>
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium line-clamp-1">{post.title}</CardTitle>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </div>
                  </div>
                  {post.category && (
                    <Badge variant="outline" className="mt-1 bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-300 dark:text-slate-900 dark:border-slate-400">
                      {post.category}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="pb-2 flex-grow">
                  <CardDescription className="line-clamp-2">
                    {post.description}
                  </CardDescription>
                  {post.location && (
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <MapPin size={14} className="mr-1" />
                      {post.location}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="border-t pt-3 mt-auto text-sm">
                  <div className="flex justify-between w-full">
                    <div>
                      {post.user?.name === user?.name ? 'You' : post.user?.name || 'Anonymous'}
                    </div>
                      {getStatusDisplay(post.status)}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between mt-8 space-y-4 md:space-y-0">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.currentPage - 1) * pagination.limit + 1}-
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalPosts)} of {pagination.totalPosts} posts
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center mr-4">
                  <label htmlFor="limit-select" className="text-sm mr-2">Posts per page:</label>
                  <select
                    id="limit-select"
                    className="p-1 border rounded text-sm"
                    value={pagination.limit}
                    onChange={(e) => {
                      const newLimit = Number(e.target.value)
                      setPagination(prev => ({ ...prev, limit: newLimit }))
                      applyFiltersAndSearch()
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.max(1, pagination.currentPage - 1)
                    setPagination(prev => ({ ...prev, currentPage: newPage }))
                    applyFiltersAndSearch()
                  }}
                  disabled={pagination.currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="text-sm">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.min(pagination.totalPages, pagination.currentPage + 1)
                    setPagination(prev => ({ ...prev, currentPage: newPage }))
                    applyFiltersAndSearch()
                  }}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-card rounded-lg border border-dashed border-border">
          <p className="text-lg text-muted-foreground mb-4">No posts found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery 
              ? "Try different search terms or filters" 
              : searchParams.get('filter') === 'my'
                ? "You haven't created any posts yet"
                : "Be the first to create a post"
            }
          </p>
          <Button onClick={() => router.push("/posts/create")}>
            Create Post
          </Button>
        </div>
      )}
    </div>
  )
} 