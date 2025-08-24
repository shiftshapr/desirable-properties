import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink, createToken, User } from '@/lib/simple-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    
    const email = verifyMagicLink(token)
    
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }
    
    // Create user object
    const user: User = {
      id: email, // Use email as ID for simplicity
      email,
      provider: 'email'
    }
    
    // Create JWT token
    const jwtToken = createToken(user)
    
    // Set cookie and redirect
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`)
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    return response
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
