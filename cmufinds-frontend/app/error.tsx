"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import CMUFindsLogo from "@/components/CMUFindsLogo"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md text-center space-y-6">
        <CMUFindsLogo variant="shield" size="xl" className="mx-auto" />
        
        <h1 className="text-3xl font-bold text-primary mb-2">Something went wrong</h1>
        
        <p className="text-muted-foreground mb-6">
          We're sorry, but there was an error processing your request.
        </p>
        
        <Button 
          onClick={reset} 
          className="flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={16} />
          Try again
        </Button>
      </div>
      
      <div className="mt-12 p-4 bg-primary/5 rounded-lg border border-primary/20 max-w-md">
        <h3 className="text-primary font-medium mb-2">Need help?</h3>
        <p className="text-sm text-muted-foreground">
          If the issue persists, please contact our support team or try again later.
        </p>
      </div>
    </div>
  )
} 