import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { tokenStore } from '@/lib/token-store';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@themetalayer.org';

// Initialize Resend only if API key is available
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!RESEND_API_KEY || !resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Generate JWT token for magic link
    const token = jwt.sign(
      { 
        email, 
        userId: email, // Use email as user ID for simplicity
        type: 'magic-link',
        exp: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutes
      },
      JWT_SECRET
    );

    // Store token
    tokenStore.addToken(token);

    // Create magic link
    const magicLink = `${process.env.NEXTAUTH_URL || 'https://app.themetalayer.org'}/api/auth/verify?token=${token}`;

    // Send email
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Your Magic Link - Sign In to Desirable Properties',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sign in to Desirable Properties</h2>
          <p>Click the link below to sign in:</p>
          <a href="${magicLink}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Sign In
          </a>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 10 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Magic link sent to your email' });
  } catch (error) {
    console.error('Error generating magic link:', error);
    return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
  }
}
