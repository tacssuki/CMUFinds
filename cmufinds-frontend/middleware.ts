import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

// Routes that require authentication
const protectedRoutes = [
  '/posts',
  '/posts/create',
  '/profile',
  '/my-posts',
]

// Routes that require admin role - use specifically for full routes, not partials
const adminRoutes = [
  '/admin',
  '/admin/users',
  '/admin/reports',
  '/admin/stats',
  '/admin/logs',
]

interface DecodedToken {
  userId: string;
  roles: string[];
  iat: number;
  exp: number;
}

// Define public paths that don't require authentication
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password']

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const { pathname } = url
  
  // Debug function to log without overwhelming - only in development
  const debug = (...messages: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Middleware] ${pathname}:`, ...messages)
    }
  }
  
  // Get token from cookies
  const token = request.cookies.get('token')?.value
  debug('Token exists:', !!token)
  
  // Skip middleware processing for API routes and static files
  if (pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.includes('.')) {
    debug('Skipping middleware for API/static path')
    return NextResponse.next()
  }
  
  // Check if the path is admin-related - check for this explicitly
  const isAdminPath = adminRoutes.includes(pathname) || pathname.startsWith('/admin/')
  debug('Is admin path:', isAdminPath)
  
  // Check if the user is trying to access a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  debug('Is public path:', isPublicPath)
  
  // For admin paths, check if user has admin or developer role
  if (isAdminPath) {
    debug('Processing admin path')
    
    if (!token) {
      debug('No token found for admin path, redirecting to login')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    try {
      // Decode the token
      const decoded = jwtDecode<DecodedToken>(token)
      debug('Token decoded for admin path, roles:', decoded.roles)
      
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000)
      if (decoded.exp < currentTime) {
        debug('Token expired, redirecting to login')
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      // Check if user has admin or developer role
      const hasAdminAccess = decoded.roles && 
        Array.isArray(decoded.roles) && 
        decoded.roles.some(role => ['ADMIN', 'DEVELOPER'].includes(role))
      
      debug('Has admin access:', hasAdminAccess)
      
      if (!hasAdminAccess) {
        debug('User does not have admin/developer role, redirecting to posts')
        return NextResponse.redirect(new URL('/posts', request.url))
      }
      
      // If admin, allow access - explicitly return next()
      debug('Admin access granted')
      return NextResponse.next()
    } catch (error) {
      debug('Error decoding token:', error)
      // Invalid token, redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // Handle the homepage root path separately
  if (pathname === '/') {
    if (token) {
      debug('Root path with token, redirecting to posts')
      return NextResponse.redirect(new URL('/posts', request.url))
    } else {
      debug('Root path without token, allowing access')
      return NextResponse.next()
    }
  }
  
  // If user is authenticated and trying to access a public path, redirect to posts
  if (token && isPublicPath) {
    debug('Authenticated user trying to access public path, redirecting to posts')
    return NextResponse.redirect(new URL('/posts', request.url))
  }
  
  // If user is not authenticated and trying to access a protected path, redirect to login
  const isProtectedPath = protectedRoutes.some(route => pathname.startsWith(route))
  if (!token && isProtectedPath) {
    debug('Unauthenticated user trying to access protected path, redirecting to login')
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Allow all other requests to proceed
  debug('Request allowed to proceed')
  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for specific static files
     * that we definitely want to bypass middleware processing
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 