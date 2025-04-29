"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  // Redirect authenticated users to posts page
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/posts')
    }
  }, [isAuthenticated, router])

  return (
    <div className="flex flex-col items-center justify-center space-y-12 text-center pt-12">
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to CMUFinds
        </h1>
        <p className="text-xl text-muted-foreground">
          A modern platform connecting City of Malabon University students with their lost belongings.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={() => router.push('/login')}>
            Log in
          </Button>
          <Button variant="outline" onClick={() => router.push('/register')}>
            Sign up
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Report Lost Items</CardTitle>
            <CardDescription>Easily report your lost belongings</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create detailed posts about lost items with images and location information to improve chances of recovery.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Submit Found Items</CardTitle>
            <CardDescription>Help others find their belongings</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Post items you've found around the campus to help reconnect them with their owners quickly.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Secure Chat</CardTitle>
            <CardDescription>Private communication</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Chat securely with other users to arrange item returns and verify ownership before meeting.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 