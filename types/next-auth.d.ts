import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      isBanned: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: string;
    isBanned: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    isBanned: boolean;
  }
}
