import jwt from 'jsonwebtoken'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export interface User {
  id: string
  email: string
  name?: string
  provider: 'email' | 'google' | 'twitter' | 'discord'
  image?: string
}

export interface AuthToken {
  user: User
  iat: number
  exp: number
}

// Store pending email verifications (in production, use Redis or database)
const pendingVerifications = new Map<string, { email: string; expires: number }>()

// Store OAuth state tokens (in production, use Redis or database)
const oauthStates = new Map<string, { provider: string; expires: number }>()

export async function sendMagicLink(email: string): Promise<boolean> {
  try {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = Date.now() + 10 * 60 * 1000 // 10 minutes
    
    pendingVerifications.set(token, { email, expires })
    
    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@themetalayer.org',
      to: email,
      subject: 'Sign in to The Meta Layer',
      html: `<p>Click <a href="${verificationUrl}">here</a> to sign in.</p>`,
    })
    
    return true
  } catch (error) {
    console.error('Failed to send magic link:', error)
    return false
  }
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken
    return decoded.user
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function createToken(user: User): string {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyMagicLink(token: string): string | null {
  const verification = pendingVerifications.get(token)
  if (!verification) return null
  
  if (Date.now() > verification.expires) {
    pendingVerifications.delete(token)
    return null
  }
  
  pendingVerifications.delete(token)
  return verification.email
}

// OAuth helper functions
export function createOAuthState(provider: string): string {
  const state = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  oauthStates.set(state, { provider, expires })
  return state
}

export function verifyOAuthState(state: string): string | null {
  const oauthState = oauthStates.get(state)
  if (!oauthState) return null
  
  if (Date.now() > oauthState.expires) {
    oauthStates.delete(state)
    return null
  }
  
  oauthStates.delete(state)
  return oauthState.provider
}

// OAuth URLs
export function getGoogleOAuthUrl(): string {
  const state = createOAuthState('google')
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/oauth/google/callback`
  
  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile&` +
    `state=${state}`
}

export function getTwitterOAuthUrl(): string {
  const state = createOAuthState('twitter')
  const clientId = process.env.TWITTER_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/oauth/twitter/callback`
  
  return `https://twitter.com/i/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=tweet.read%20users.read&` +
    `state=${state}&` +
    `code_challenge_method=S256&` +
    `code_challenge=${crypto.randomBytes(32).toString('base64url')}`
}

export function getDiscordOAuthUrl(): string {
  const state = createOAuthState('discord')
  const clientId = process.env.DISCORD_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/oauth/discord/callback`
  
  return `https://discord.com/api/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=identify%20email&` +
    `state=${state}`
}

// Simple authentication system to bypass NextAuth
export interface SimpleUser {
  id: string
  email: string
  name?: string
}

export interface SimpleSession {
  user: SimpleUser | null
  expires: string
}

class SimpleAuth {
  private static instance: SimpleAuth
  private currentUser: SimpleUser | null = null

  static getInstance(): SimpleAuth {
    if (!SimpleAuth.instance) {
      SimpleAuth.instance = new SimpleAuth()
    }
    return SimpleAuth.instance
  }

  async getSession(): Promise<SimpleSession | null> {
    console.log('🔍 [SimpleAuth] getSession called')
    
    // Check if we have a user in memory
    if (this.currentUser) {
      console.log('🔍 [SimpleAuth] Returning user from memory:', this.currentUser)
      return {
        user: this.currentUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }
    
    console.log('🔍 [SimpleAuth] No user found, returning null')
    return null
  }

  async signIn(email: string, password?: string): Promise<SimpleUser | null> {
    console.log('🔍 [SimpleAuth] signIn called with email:', email)
    
    // Simple mock user creation
    const user: SimpleUser = {
      id: `user_${Date.now()}`,
      email: email,
      name: email.split('@')[0]
    }
    
    this.currentUser = user
    console.log('🔍 [SimpleAuth] User signed in:', user)
    return user
  }

  async signOut(): Promise<void> {
    console.log('🔍 [SimpleAuth] signOut called')
    this.currentUser = null
    console.log('🔍 [SimpleAuth] User signed out')
  }

  async getStatus(): Promise<'authenticated' | 'unauthenticated' | 'loading'> {
    console.log('🔍 [SimpleAuth] getStatus called')
    
    if (this.currentUser) {
      console.log('🔍 [SimpleAuth] Status: authenticated')
      return 'authenticated'
    } else {
      console.log('🔍 [SimpleAuth] Status: unauthenticated')
      return 'unauthenticated'
    }
  }
}

export const simpleAuth = SimpleAuth.getInstance()
