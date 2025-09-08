import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { tokenStore } from '@/lib/token-store'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    // Get the session token from cookies
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (sessionToken) {
      try {
        // Decode the token to get user info
        const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;
        
        // Invalidate the session token
        tokenStore.invalidateSessionToken(sessionToken);
        console.log('🔍 [SignOut] Invalidating session for user:', decoded.email);
      } catch (error) {
        console.log('🔍 [SignOut] Invalid session token, proceeding with signout');
      }
    }
    
    // Clear the session cookie
    const response = NextResponse.json({ success: true, message: 'Signed out successfully' });
    response.cookies.set('session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json({ success: false, error: 'Sign out failed' }, { status: 500 });
  }
}
