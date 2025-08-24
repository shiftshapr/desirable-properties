import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ user: null })
    }
    
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ user: null })
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
