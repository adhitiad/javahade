import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  console.log("[SYNC ROUTE] Start handling sync request");
  try {
    // 1. Get the session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      console.error("[SYNC ROUTE] Better Auth session not found");
      return NextResponse.json(
        { error: "Unauthorized. No valid Better Auth session." },
        { status: 401 }
      );
    }
    console.log("[SYNC ROUTE] Better Auth session found for:", session.user.email);

    // 2. Call Django Social Login Sync Endpoint
    const djangoApiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL?.replace('/api/v1', '') || "http://localhost:8000";
    const serviceToken = process.env.INTERNAL_SERVICE_TOKEN as string;

    const payload = {
      email: session.user.email,
      name: session.user.name,
      avatar: session.user.image || "",
      provider: "better-auth",
    };

    console.log("[SYNC ROUTE] Calling Django at:", `${djangoApiUrl}/api/v1/auth/social-login/`);

    const djangoRes = await fetch(`${djangoApiUrl}/api/v1/auth/social-login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": serviceToken,
      },
      body: JSON.stringify(payload),
    });

    if (!djangoRes.ok) {
      const errorText = await djangoRes.text();
      console.error("[SYNC ROUTE] Django Sync Failed:", errorText);
      return NextResponse.json(
        { error: "Failed to sync with backend." },
        { status: djangoRes.status }
      );
    }

    const djangoData = await djangoRes.json();
    console.log("[SYNC ROUTE] Django sync successful for user:", djangoData.user?.email);

    // 3. Extract tokens from Django Set-Cookie headers
    // Django sets access_token and refresh_token as HttpOnly cookies.
    // We need to extract the raw token values and return them in JSON body
    // so the client can store them in localStorage for cross-port requests.
    const setCookieHeaders = djangoRes.headers.getSetCookie();
    let accessToken = "";
    let refreshToken = "";

    for (const cookie of setCookieHeaders) {
      const match = cookie.match(/^([^=]+)=([^;]+)/);
      if (match) {
        const [, name, value] = match;
        if (name === "access_token") accessToken = value;
        if (name === "refresh_token") refreshToken = value;
      }
    }

    console.log("[SYNC ROUTE] Extracted tokens - access:", !!accessToken, "refresh:", !!refreshToken);

    // 4. Return tokens in JSON body for client-side localStorage storage
    const nextRes = NextResponse.json(
      {
        message: "Sync successful",
        user: djangoData.user,
        tokens: {
          access: accessToken,
          refresh: refreshToken,
        },
      },
      { status: 200 }
    );

    // Also forward cookies for server-side use
    for (const cookie of setCookieHeaders) {
      nextRes.headers.append("Set-Cookie", cookie);
    }

    return nextRes;
  } catch (error: any) {
    console.error("[SYNC ROUTE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
