import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { tokenStore } from '@/lib/token-store'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    
    // Check if token is in active tokens set
    if (!tokenStore.hasToken(token)) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded || decoded.type !== 'magic-link' || !decoded.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }
    
    // Remove token from active set (one-time use)
    tokenStore.removeToken(token);
    
    // Create session token
    const sessionToken = jwt.sign(
      { 
        email: decoded.email,
        userId: decoded.userId,
        name: decoded.email.split('@')[0],
        type: 'session'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    // Set cookie and redirect
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL || 'https://app.themetalayer.org'}`)
    response.cookies.set('session-token', sessionToken, {
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
