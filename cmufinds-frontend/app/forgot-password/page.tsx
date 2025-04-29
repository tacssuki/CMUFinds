"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authAPI } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

const emailDomain = "@cityofmalabonuniversity.edu.ph";

const formSchema = z.object({
  email: z.string()
    .min(1, { message: "Email username is required" })
    .transform(val => `${val}${emailDomain}`)
    .pipe(z.string().email("Please enter a valid CMU email address")),
});

type FormData = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      await authAPI.forgotPassword(data.email);
      
      // Always show success even if email doesn't exist (for security)
      setIsSuccess(true);
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setErrorMessage("Something went wrong. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription>
                If your email is registered, you'll receive a password reset link shortly.
                Please check your inbox and spam folders.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex">
                    <Input
                      id="email"
                      type="text"
                      placeholder="your_username"
                      {...register("email")}
                      disabled={isLoading}
                      className="rounded-r-none border-r-0 flex-1"
                      onKeyDown={(e) => {
                        if (e.key === '@') {
                          e.preventDefault();
                        }
                      }}
                    />
                    <div className="px-3 bg-gray-100 border border-l-0 rounded-r-md flex items-center text-gray-600 text-sm">
                     {emailDomain}
                    </div>
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                {errorMessage && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-700">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 