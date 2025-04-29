import React from 'react'
import CMUFindsLogo from '@/components/CMUFindsLogo'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-48 h-48 mb-8">
        <CMUFindsLogo variant="shield" size="xl" />
      </div>
      
      <h2 className="text-2xl font-bold text-primary mb-8">Loading...</h2>
      
      <div className="w-64 h-2 bg-muted overflow-hidden rounded-full relative">
        <div className="h-full bg-gradient-to-r from-primary via-secondary to-primary absolute animate-loading-gradient w-[200%]"></div>
      </div>
    </div>
  )
} 