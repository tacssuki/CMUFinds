"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell, Menu, X, Search, Filter } from "lucide-react"
import { 
  NavigationMenu, 
  NavigationMenuContent, 
  NavigationMenuItem, 
  NavigationMenuLink, 
  NavigationMenuList, 
  NavigationMenuTrigger 
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import { Role } from "@/types"
import { notificationAPI } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import CMUFindsLogo from "@/components/CMUFindsLogo"
import { useSocketStore } from "@/store/socketStore"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

// Define notification type structure (adjust based on actual data)
interface Notification {
  id: string;
  content: string;
  type: string; // 'MATCH', 'RESOLVE', 'NEW_THREAD', 'NEW_MESSAGE', etc.
  isRead: boolean;
  createdAt: string;
  // Add other fields like metadata if needed
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchType, setSearchType] = useState<string>("ALL")
  const [searchCategory, setSearchCategory] = useState<string>("")

  // Access the shared socket from the store
  const { socket, isConnected } = useSocketStore((state) => ({ 
    socket: state.socket, 
    isConnected: state.isConnected 
  }));

  const isAdmin = user?.roles.includes(Role.ADMIN) || user?.roles.includes(Role.DEVELOPER)
  
  // Reset search state when navigating away from posts
  useEffect(() => {
    if (!pathname.includes('/posts')) {
      setSearchQuery("")
      setSearchType("ALL")
      setSearchCategory("")
      setShowAdvancedSearch(false)
    }
  }, [pathname])

  // Fetch notifications if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
    }
  }, [isAuthenticated])

  // --- Effect to Listen for Notifications via Shared Socket ---
  useEffect(() => {
    // Only listen if the socket is connected
    if (socket && isConnected) {
      console.log('Navbar: Socket connected, listening for notifications...');
      
      const notificationListener = (newNotification: Notification) => {
        console.log('>>> Navbar: Received new_notification event via shared socket:', newNotification);
        setNotifications((prevNotifications) => [
          newNotification, 
          ...prevNotifications,
        ]);
        setUnreadCount((prevCount) => prevCount + 1);
      };

      socket.on('new_notification', notificationListener);

      // Cleanup: remove listener when component unmounts or socket disconnects
      return () => {
        console.log('Navbar: Cleaning up notification listener.');
        socket.off('new_notification', notificationListener);
      };
    } else {
      console.log('Navbar: Socket not connected, not listening for notifications.');
    }
    // Re-run if socket instance or connection status changes
  }, [socket, isConnected]); 
  // --- End Notification Listener Effect ---

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications()
      setNotifications(response.data)
      setUnreadCount(response.data.filter((n: any) => !n.isRead).length)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id)
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead()
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }
  
  // Enhanced search handler with advanced options  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim() && searchType === "ALL" && !searchCategory) {
      return
    }
    
    const params = new URLSearchParams()
    
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim())
    }
    
    if (searchType !== "ALL") {
      params.set('type', searchType)
    }
    
    if (searchCategory) {
      params.set('category', searchCategory)
    }
    
    const searchPath = `/posts?${params.toString()}`
    router.push(searchPath)
    setShowAdvancedSearch(false)
  }

  // Only show search on non-posts pages to avoid duplication
  const shouldShowSearch = isAuthenticated && !pathname.startsWith('/posts')

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <CMUFindsLogo variant="full" size="md" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            {isAuthenticated && (
              <>
                <Link 
                  href="/posts" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === "/posts" 
                      ? "text-foreground font-semibold" 
                      : "text-muted-foreground dark:hover:text-primary-foreground/80 hover:text-primary"
                  )}
                >
                  Browse Posts
                </Link>
                <Link 
                  href="/posts/create" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === "/posts/create" 
                      ? "text-foreground font-semibold" 
                      : "text-muted-foreground dark:hover:text-primary-foreground/80 hover:text-primary"
                  )}
                >
                  Create Post
                </Link>
              </>
            )}
          </nav>
        </div>
        
        {/* Search Bar - Only show on non-posts pages */}
        {shouldShowSearch && (
          <div className="hidden md:block flex-1 max-w-md mx-6">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-cmu-blue/70" />
                </div>
                <input 
                  type="search" 
                  placeholder="Search lost and found items..."
                  className="w-full py-2 pl-10 pr-10 border rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  type="button" 
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-cmu-blue/70 hover:text-cmu-blue"
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              
              {/* Advanced Search Dropdown */}
              {showAdvancedSearch && (
                <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg border p-4 z-10 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Item Type</label>
                    <select 
                      className="w-full p-2 border rounded text-sm"
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                    >
                      <option value="ALL">All Items</option>
                      <option value="LOST">Lost Items</option>
                      <option value="FOUND">Found Items</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select 
                      className="w-full p-2 border rounded text-sm"
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Documents">Documents</option>
                      <option value="Keys">Keys</option>
                      <option value="Books">Books</option>
                      <option value="Wallet/Purse">Wallet/Purse</option>
                      <option value="ID/Cards">ID/Cards</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchQuery("")
                        setSearchType("ALL")
                        setSearchCategory("")
                      }}
                    >
                      Reset
                    </Button>
                    <Button type="submit" size="sm">Search</Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Right side - auth, notifications */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] text-[10px]"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={markAllAsRead}
                        className="text-xs h-8"
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  
                  <ScrollArea className="h-[300px]">
                    {notifications.length > 0 ? (
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={cn(
                              "p-3 rounded-md text-sm",
                              notification.isRead ? "bg-background" : "bg-muted"
                            )}
                          >
                            <div className="flex justify-between">
                              <div>
                                <p>
                                  {notification.type === 'MATCH' && 'Your item has been matched!'}
                                  {notification.type === 'RESOLVE' && 'Your post has been resolved'}
                                  {notification.type === 'NEW_THREAD' && 'You have a new chat message'}
                                  {notification.type === 'NEW_MESSAGE' && 'You have a new chat message'}
                                  {!['MATCH', 'RESOLVE', 'NEW_THREAD', 'NEW_MESSAGE'].includes(notification.type) && 'New notification'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        No notifications
                      </p>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* ---- Theme Toggle ---- */}
              <ThemeToggle />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={user?.profilePictureUrl || "/placeholders/user.png"} 
                        alt={user?.name || "User"} 
                      />
                      <AvatarFallback className="uppercase">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-posts">My Posts</Link>
                  </DropdownMenuItem>
                  {(user?.roles.includes(Role.ADMIN) || user?.roles.includes(Role.DEVELOPER)) && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={logout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background md:hidden">
          <div className="container flex flex-col gap-6 pt-16 pb-8">
            <div className="flex justify-between items-center">
              <Link 
                href="/" 
                className="flex items-center space-x-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="text-xl font-bold tracking-tight">CMUFinds</span>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Search - Only show on non-posts pages */}
            {shouldShowSearch && (
              <div className="mb-4">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-4 h-4 text-gray-500" />
                    </div>
                    <input 
                      type="search" 
                      placeholder="Search lost and found items..."
                      className="w-full py-2 pl-10 pr-4 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Item Type</label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                    >
                      <option value="ALL">All Items</option>
                      <option value="LOST">Lost Items</option>
                      <option value="FOUND">Found Items</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Documents">Documents</option>
                      <option value="Keys">Keys</option>
                      <option value="Books">Books</option>
                      <option value="Wallet/Purse">Wallet/Purse</option>
                      <option value="ID/Cards">ID/Cards</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("")
                        setSearchType("ALL")
                        setSearchCategory("")
                      }}
                    >
                      Reset
                    </Button>
                    <Button type="submit">Search</Button>
                  </div>
                </form>
              </div>
            )}
            
            <nav className="flex flex-col gap-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/posts" 
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-primary",
                      pathname === "/posts" ? "text-foreground" : "text-foreground/60"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Browse Posts
                  </Link>
                  <Link 
                    href="/posts/create" 
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-primary",
                      pathname === "/posts/create" ? "text-foreground" : "text-foreground/60"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Create Post
                  </Link>
                  <Link 
                    href="/profile" 
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-primary",
                      pathname === "/profile" ? "text-foreground" : "text-foreground/60"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link 
                    href="/my-posts" 
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-primary",
                      pathname === "/my-posts" ? "text-foreground" : "text-foreground/60"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Posts
                  </Link>
                  {(user?.roles.includes(Role.ADMIN) || user?.roles.includes(Role.DEVELOPER)) && (
                    <Link 
                      href="/admin" 
                      className={cn(
                        "text-lg font-medium transition-colors hover:text-primary",
                        pathname.startsWith("/admin") ? "text-foreground" : "text-foreground/60"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-lg font-medium text-foreground/60 hover:text-primary"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className={cn(
                      "text-lg font-medium text-foreground/60 hover:text-primary",
                      pathname === "/login" ? "text-foreground" : "text-foreground/60"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link 
                    href="/register" 
                    className={cn(
                      "text-lg font-medium text-foreground/60 hover:text-primary",
                      pathname === "/register" ? "text-foreground" : "text-foreground/60"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>

            {/* ---- Mobile Theme Toggle ---- */}
            <div className="mt-auto pt-4 border-t">
              <p className="text-sm font-medium mb-2">Theme</p>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  )
} 