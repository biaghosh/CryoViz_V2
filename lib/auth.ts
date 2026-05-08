import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb, sql } from "@/lib/models"; 

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      accessLevel?: string;
      institution?: string;
    };
  }
  interface User {
    accessLevel?: string;
    institution?: string;
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

        try {
          const pool = await getDb();
          const email = credentials.email.toLowerCase().trim();
          
          // 1. Check for valid OTP in [dbo].[Otp]
          // Schema verified: columns are 'createdAt' and 'expires'
          const otpCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, credentials.otp.trim())
            .query(`
              SELECT TOP 1 id FROM [dbo].[Otp] 
              WHERE email = @email AND otp = @otp AND expires > GETDATE()
              ORDER BY createdAt DESC
            `);

          if (otpCheck.recordset.length === 0) return null;

          // 2. Fetch User with Institution Join from [dbo].[User]
          // Schema verified: [User] has 'institutionId', [Institution] has 'name'
          const userCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`
              SELECT u.id, u.email, u.name, u.accessLevel, i.name as institution 
              FROM [dbo].[User] u
              LEFT JOIN [dbo].[Institution] i ON u.institutionId = i.id
              WHERE u.email = @email
            `);
          
          const user = userCheck.recordset[0];
          if (!user) return null;

          return {
            id: user.id, // nvarchar in schema
            email: user.email,
            name: user.name,
            accessLevel: user.accessLevel,
            institution: user.institution
          };
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.accessLevel = user.accessLevel;
        token.institution = user.institution;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.accessLevel = token.accessLevel as string;
        session.user.institution = token.institution as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/auth/login" },
};