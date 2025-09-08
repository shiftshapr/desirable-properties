import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { tokenStore } from '@/lib/token-store';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function GET(request: NextRequest) {
  try {
    // Get the session token from cookies
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Check if token has been invalidated
    if (tokenStore.isSessionTokenInvalid(sessionToken)) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Verify the JWT token
    const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;
    
    if (decoded && decoded.email) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.userId || decoded.email,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          affiliation: decoded.affiliation,
          age: decoded.age,
        }
      });
    }

    return NextResponse.json({ authenticated: false, user: null });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
