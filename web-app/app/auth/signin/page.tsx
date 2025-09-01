'use client'

import { useState, useEffect } from 'react'
import { signIn, signOut, getProviders } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { data: session, status } = useSession()
  const router = useRouter()

  // Debug logging
  useEffect(() => {
    console.log('🔍 [SignIn] Component mounted')
    console.log('🔍 [SignIn] Session status:', status)
    console.log('🔍 [SignIn] Session data:', session)
  }, [session, status])

  const handleSignOut = async () => {
    console.log('🔍 [SignIn] Starting aggressive sign-out...')
    
    try {
      // Sign out with NextAuth
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: false 
      })
      
      console.log('🔍 [SignIn] NextAuth sign-out completed')
      
      // Clear any local storage or session storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        console.log('🔍 [SignIn] Local and session storage cleared')
      }
      
      // Force a hard refresh to clear all React state
      console.log('🔍 [SignIn] Forcing page refresh...')
      window.location.href = '/auth/signin'
      
    } catch (error) {
      console.error('🔍 [SignIn] Sign-out error:', error)
      // Fallback: force refresh anyway
      window.location.href = '/auth/signin'
    }
  }

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading session...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show message if already signed in instead of redirecting
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
              Already Signed In
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              You are already signed in as {session.user?.email}
            </p>
            <p className="mt-2 text-center text-xs text-gray-500">
              Session status: {status}
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Home Page
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Sign Out
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Force Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    console.log('🔍 [SignIn] Attempting email sign-in for:', email)

    try {
      const result = await signIn('email', {
        email,
        callbackUrl: '/',
        redirect: false,
      })

      console.log('🔍 [SignIn] Sign-in result:', result)

      if (result?.error) {
        setMessage(`Error: ${result.error}`)
        console.error('🔍 [SignIn] Sign-in error:', result.error)
      } else {
        setMessage('Check your email for a sign-in link!')
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.')
      console.error('🔍 [SignIn] Sign-in error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    console.log('🔍 [SignIn] Attempting OAuth sign-in with:', provider)
    await signIn(provider, { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign In to The Metalayer
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Testing NextAuth with Email, Google, Discord & Twitter
          </p>
        </div>

        {/* OAuth Providers */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthSignIn('google')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue with Google
          </button>
          
          <button
            onClick={() => handleOAuthSignIn('discord')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue with Discord
          </button>
          
          <button
            onClick={() => handleOAuthSignIn('twitter')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continue with Twitter
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">Or continue with email</span>
          </div>
        </div>

        {/* Email Sign In */}
        <form className="space-y-6" onSubmit={handleEmailSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {message && (
            <div className={`text-sm text-center ${message.includes('Check your email') ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
