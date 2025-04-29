"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/authStore'

const formSchema = z.object({
  usernameOrEmail: z.string().min(3, {
    message: 'Username or Email must be at least 3 characters.',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  }),
})

type FormData = z.infer<typeof formSchema>

const LoginPage = () => {
  const { login, isLoading, error } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const fromPath = searchParams.get('from') || '/posts'
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: FormData) => {
    // Clear previous errors from the store
    useAuthStore.getState().clearError(); 
    
    const success = await login(data); // Call login and get success status
    
    if (success) {
      // Show success toast
      toast({
        title: "Login successful",
        description: "Welcome back to CMUFinds!",
      });
      
      // Navigate to the intended destination
      router.push(fromPath.startsWith('/') ? fromPath : `/${fromPath}`);
    } else {
      // Error state is already set in the store by the login function
      // The {error && <Alert.../>} block below will display it.
      // Optionally, show a generic error toast as well
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: useAuthStore.getState().error || "Please check your credentials and try again.",
      });
    }
    // No need for a try-catch here anymore, as the store handles the API error
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Login to CMUFinds</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials below to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usernameOrEmail">Username or Email</Label>
                <Input
                  id="usernameOrEmail"
                  type="text"
                  placeholder="Enter your username or email"
                  {...register('usernameOrEmail')}
                />
                {errors.usernameOrEmail && (
                  <p className="text-sm text-destructive">{errors.usernameOrEmail.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                <Input
                  id="password"
                    type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">{showPassword ? 'Hide' : 'Show'} password</span>
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium hover:underline">
                Register
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage 