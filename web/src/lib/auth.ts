import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "default_secret_for_development_and_build",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000/",
  advanced: {
    useSecureCookies: false, // Penting untuk HTTP localhost di mode production!
  },
  emailAndPassword: { enabled: true },
  socialProviders: {
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "facebook"],
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      strategy: "jwe",
    },
  },
  user: {
    additionalFields: {
      gender: {
        type: "string",
        required: false,
      },
      date_of_birth: {
        type: "string",
        required: false,
      },
    },
  },
});
