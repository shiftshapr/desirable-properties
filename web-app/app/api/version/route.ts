import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'version.json')
    const versionData = fs.readFileSync(versionPath, 'utf8')
    const version = JSON.parse(versionData)
    
    return NextResponse.json({
      ...version,
      environment: process.env.NODE_ENV,
      privyConfigured: !!process.env.PRIVY_APP_ID,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Version not available',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 