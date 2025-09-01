import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import GoogleProvider from 'next-auth/providers/google'
import DiscordProvider from 'next-auth/providers/discord'
import TwitterProvider from 'next-auth/providers/twitter'
// import { PrismaAdapter } from "@next-auth/prisma-adapter"
// import { PrismaClient } from "@prisma/client"

// const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: 'smtp.resend.com',
        port: 587,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@themetalayer.org',
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        console.log('🔍 [NextAuth] sendVerificationRequest called')
        console.log('🔍 [NextAuth] identifier:', identifier)
        console.log('🔍 [NextAuth] url:', url)
        console.log('🔍 [NextAuth] provider:', provider)
        
        try {
          const { createTransport } = await import('nodemailer')
          const transport = createTransport(provider.server)
          
          console.log('🔍 [NextAuth] Transport created successfully')
          
          const result = await transport.sendMail({
            to: identifier,
            from: provider.from,
            subject: `Sign in to The Metalayer`,
            text: `Click here to sign in: ${url}`,
            html: `<p>Click <a href="${url}">here</a> to sign in to The Metalayer.</p>`,
          })
          
          console.log('🔍 [NextAuth] Email sent successfully:', result)
        } catch (error) {
          console.error('🔍 [NextAuth] Email send error:', error)
          throw error
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('🔍 [NextAuth] signIn callback called')
      console.log('🔍 [NextAuth] user:', user)
      console.log('🔍 [NextAuth] account:', account)
      console.log('🔍 [NextAuth] profile:', profile)
      console.log('🔍 [NextAuth] email:', email)
      console.log('🔍 [NextAuth] credentials:', credentials)
      return true
    },
    async session({ session, token, user }) {
      console.log('🔍 [NextAuth] session callback called')
      console.log('🔍 [NextAuth] session:', session)
      console.log('🔍 [NextAuth] token:', token)
      console.log('🔍 [NextAuth] user:', user)
      return session
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      console.log('🔍 [NextAuth] jwt callback called')
      console.log('🔍 [NextAuth] token:', token)
      console.log('🔍 [NextAuth] user:', user)
      console.log('🔍 [NextAuth] account:', account)
      console.log('🔍 [NextAuth] profile:', profile)
      console.log('🔍 [NextAuth] trigger:', trigger)
      console.log('🔍 [NextAuth] session:', session)
      return token
    },
  },
  debug: true,
}

export default NextAuth(authOptions)
