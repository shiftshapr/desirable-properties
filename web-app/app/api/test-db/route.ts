import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { prisma } = await import('@/lib/db');
    
    // Test database connection
    const userCount = await prisma.user.count();
    
    // Test finding Daveed's user
    const testUser = await prisma.user.findFirst({
      where: { email: 'daveed@bridgit.io' }
    });
    
    return NextResponse.json({
      success: true,
      userCount,
      testUser: testUser ? {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name
      } : null,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    }, { status: 500 });
  }
}
