"use client"

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CMUFindsLogo from '@/components/CMUFindsLogo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md text-center space-y-6">
        <CMUFindsLogo variant="shield" size="xl" className="mx-auto" />
        
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
        
        <p className="text-muted-foreground mb-6">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <Button asChild className="gap-2">
          <Link href="/">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  )
} 