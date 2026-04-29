import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accessLevel?: string;
    };
  }

  interface User {
    accessLevel?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessLevel?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;

        const match = await prisma.otp.findFirst({
          where: { email: credentials.email, otp: credentials.otp }
        });

        if (!match) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        
        if (!user) return null;

        // Clean up OTP after successful use
        await prisma.otp.deleteMany({ where: { email: credentials.email } });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          accessLevel: user.accessLevel
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update every 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 7 * 24 * 60 * 60, // 7 days to match session maxAge
  },

  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // If this is the first time the JWT is created (sign in)
      if (user && 'accessLevel' in user) {
        token.accessLevel = user.accessLevel as string;
      }

      // Ensure token has required fields for persistence
      if (!token.sub && user?.id) {
        token.sub = user.id;
      }

      // Add timestamp for debugging
      if (process.env.NODE_ENV === "development") {
        token.lastUpdated = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.accessLevel = token.accessLevel as string;
        // Ensure name is set properly
        if (!session.user.name && session.user.email) {
          session.user.name = session.user.email;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Required: for both GET/POST and session-based auth
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
