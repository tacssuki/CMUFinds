'use client';

import React, { useEffect, useState } from 'react';
import { redirect, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, Flag, BarChart3, FileText, Menu, X, Clock } from 'lucide-react';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Role } from '@/types';
import { Button } from '@/components/ui/button';

// Admin sidebar items
const sidebarItems = [
  { label: 'Dashboard', href: '/admin', icon: <Home className="h-5 w-5" /> },
  { label: 'User Management', href: '/admin/users', icon: <Users className="h-5 w-5" /> },
  { label: 'Posts Management', href: '/admin/posts', icon: <FileText className="h-5 w-5" /> },
  { label: 'Reports', href: '/admin/reports', icon: <Flag className="h-5 w-5" /> },
  { label: 'Audit Logs', href: '/admin/logs', icon: <Clock className="h-5 w-5" /> },
];

interface User {
  id: string;
  roles?: string[];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Get user from auth store
  const { isAuthenticated, user } = useAuthStore();
  
  // Function to check if user has admin access from JWT 
  const checkAdminAccess = () => {
    console.log('Checking admin access, auth store user:', user);
    
    // If we have the user from auth store, use that
    if (isAuthenticated && user?.roles) {
      const hasAccess = user.roles.some(role => [Role.ADMIN, Role.DEVELOPER].includes(role));
      console.log('Auth store roles check:', user.roles, 'Has access:', hasAccess);
      return hasAccess;
    }
    
    // Fallback: check from JWT token directly
    const token = Cookies.get('token');
    if (!token) {
      console.log('No token found in cookies');
      return false;
    }
    
    try {
      const decoded = jwtDecode<User>(token);
      const roles = decoded.roles || [];
      const hasAccess = roles.some(role => ['ADMIN', 'DEVELOPER'].includes(role));
      console.log('JWT token roles check:', roles, 'Has access:', hasAccess);
      return hasAccess;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return false;
    }
  };
  
  // Get a nice display of the user's roles
  const formatUserRoles = () => {
    if (!user?.roles || user.roles.length === 0) return 'No roles';
    
    // Show all roles the user has
    return user.roles.map(role => {
      switch(role) {
        case Role.ADMIN: return 'Admin';
        case Role.DEVELOPER: return 'Developer';
        case Role.STUDENT: return 'Student';
        default: return role;
      }
    }).join(', ');
  };
  
  // Use client-side check on mount
  useEffect(() => {
    setIsClient(true);
    
    // Only run this check on the client
    const hasAccess = checkAdminAccess();
    if (!hasAccess) {
      console.log('No admin access, redirecting to posts');
      router.replace('/posts');
    }
    
    // Add event listener for mobile responsive design
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [router]);
  
  // Don't render anything during initial server render to avoid flashing content
  if (!isClient) {
    return null; 
  }
  
  // Double-check access before rendering content
  if (!checkAdminAccess()) {
    return null; // Don't render anything while redirecting
  }

  // Sidebar content (reused between mobile and desktop)
  const SidebarContent = () => (
    <>
      <div className="p-6">
        <h2 className="text-xl font-bold text-primary dark:text-secondary">Admin Panel</h2>
        <p className="text-sm text-muted-foreground mt-1">System Management</p>
      </div>
      <nav className="px-3 py-2">
        {sidebarItems.map((item) => {
          const isActive = 
            item.href === '/admin' 
              ? pathname === '/admin' 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors my-1",
                isActive 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              )}
            >
              {React.cloneElement(item.icon, { 
                className: cn(
                  item.icon.props.className, 
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )
              })}
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex md:w-64 flex-col bg-card border-r border-border shadow-sm h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}
      
      {/* Mobile Sidebar - slides in from left */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex-col bg-card border-r border-border shadow-lg transition-transform duration-300 ease-in-out md:hidden",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex justify-end p-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-full h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto bg-muted/30 dark:bg-background">
        {/* Mobile header with menu button */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            className="rounded-full h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {children}
      </main>
    </div>
  );
} 