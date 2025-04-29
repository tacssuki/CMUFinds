"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { useAuthStore } from "@/store/authStore"
import Link from "next/link"
import zxcvbn from "zxcvbn"

const CMU_EMAIL_DOMAIN = "@cityofmalabonuniversity.edu.ph";

// Form validation schema
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  emailUsername: z
    .string()
    .min(2, "Username part of email is required")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores and dots"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string()
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: registerUser, isLoading, error, clearError } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);
  
  // React Hook Form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      emailUsername: "",
      password: "",
      confirmPassword: ""
    }
  })

  // Check password strength
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    const result = zxcvbn(password);
    setPasswordStrength(result.score);
  };

  // Watch password field for strength calculation
  const password = form.watch("password");
  useEffect(() => {
    checkPasswordStrength(password);
  }, [password]);

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0: return "Very Weak";
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Strong";
      default: return "Very Weak";
    }
  };

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0: return "bg-destructive";
      case 1: return "bg-destructive";
      case 2: return "bg-orange-500";
      case 3: return "bg-yellow-500";
      case 4: return "bg-green-500";
      default: return "bg-destructive";
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      // Construct full email with domain
      const fullEmail = data.emailUsername + CMU_EMAIL_DOMAIN;
      
      await registerUser({
        name: data.name,
        email: fullEmail,
        password: data.password
      })
      
      // Success toast notification
      toast({
        title: "Registration successful",
        description: "Your account has been created. You can now log in.",
      })
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      // Error is handled by the store, nothing to do here
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your details to create your CMUFinds account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Error alert if any */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailUsername">CMU Email Username</Label>
              <div className="flex items-center">
                <Input
                  id="emailUsername"
                  type="text"
                  placeholder="your.username"
                  className="rounded-r-none"
                  {...form.register("emailUsername")}
                  onChange={(e) => {
                    // Remove @ characters if the user tries to type them
                    const value = e.target.value.replace(/@/g, '');
                    e.target.value = value;
                    form.setValue("emailUsername", value);
                  }}
                />
                <span className="px-3 py-2 bg-muted border border-l-0 border-input rounded-r-md text-muted-foreground text-sm">
                  {CMU_EMAIL_DOMAIN}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
              Enter only the prefix of your CMU email — this will be your username.
              </p>
              {form.formState.errors.emailUsername && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.emailUsername.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
              <Input
                id="password"
                  type={showPassword ? 'text' : 'password'}
                placeholder="Create a secure password"
                {...form.register("password")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">{showPassword ? 'Hide' : 'Show'} password</span>
                </Button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
                    <div 
                      className={`h-full ${getStrengthColor(passwordStrength)}`} 
                      style={{ width: `${(passwordStrength + 1) * 20}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password strength: <span className="font-medium">{getStrengthText(passwordStrength)}</span>
                  </p>
                </div>
              )}
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
              <Input
                id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                {...form.register("confirmPassword")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">{showConfirmPassword ? 'Hide' : 'Show'} confirmation password</span>
                </Button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                </>
              ) : (
                "Register"
              )}
            </Button>
            
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="font-medium hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 