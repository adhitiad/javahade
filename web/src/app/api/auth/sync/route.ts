import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // 1. Get the session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. No valid Better Auth session." },
        { status: 401 }
      );
    }

    // 2. Call Django Social Login Sync Endpoint
    const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL?.replace('/api/v1', '') || "http://localhost:8000";
    const serviceToken = process.env.INTERNAL_SERVICE_TOKEN as string;

    // Based on accountLinking, Better Auth stores the provider if it's social.
    // If it's a social login, the session might not directly expose the provider
    // but the email and name are guaranteed by Google/Facebook.
    const payload = {
      email: session.user.email,
      name: session.user.name,
      avatar: session.user.image || "",
      provider: "better-auth",
    };

    const djangoRes = await fetch(`${djangoApiUrl}/api/v1/auth/social-login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": serviceToken,
      },
      body: JSON.stringify(payload),
    });

    if (!djangoRes.ok) {
      console.error("Django Sync Failed:", await djangoRes.text());
      return NextResponse.json(
        { error: "Failed to sync with backend." },
        { status: djangoRes.status }
      );
    }

    const djangoData = await djangoRes.json();

    // 3. Extract Set-Cookie headers from Django
    const setCookieHeaders = djangoRes.headers.getSetCookie();

    // 4. Return success and forward the cookies to the browser
    const nextRes = NextResponse.json(
      { message: "Sync successful", user: djangoData.user },
      { status: 200 }
    );

    for (const cookie of setCookieHeaders) {
      nextRes.headers.append("Set-Cookie", cookie);
    }

    return nextRes;
  } catch (error: any) {
    console.error("Error in sync route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
