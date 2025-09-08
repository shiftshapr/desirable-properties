'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOut() {
  const router = useRouter()

  useEffect(() => {
    const performSignOut = async () => {
      console.log('🔍 [SignOut] Starting magic link sign-out...')
      
      try {
        // Clear all storage
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
          console.log('🔍 [SignOut] Storage cleared')
        }
        
        // Sign out with magic link system
        await fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'include'
        })
        
        console.log('🔍 [SignOut] Magic link sign-out completed')
        
        // Force redirect to home
        window.location.href = '/'
        
      } catch (error) {
        console.error('🔍 [SignOut] Error:', error)
        // Force redirect anyway
        window.location.href = '/'
      }
    }

    performSignOut()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Signing you out...</p>
        </div>
      </div>
    </div>
  )
}
