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
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        try {
          const pool = await getDb();
          const email = credentials.email.toLowerCase().trim();
          
          // Fetch User with Institution Join from [dbo].[User]
          // Check if user exists in the Users table
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
