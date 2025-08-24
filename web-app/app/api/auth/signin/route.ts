import { NextRequest, NextResponse } from 'next/server'
import { sendMagicLink } from '@/lib/simple-auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    const success = await sendMagicLink(email)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Magic link sent' })
    } else {
      return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
    }
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
