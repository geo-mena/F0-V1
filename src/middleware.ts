import NextAuth from "next-auth";
import authConfig from "@/auth.config";

import {
  DEFAULT_LOGIN_REDIRECT_URL,
  apiAuthPrefix,
  checkRoutesPrefix,
  authRoutes,
  protectedRoutes,
  publicRoutes,
} from "./routes";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { nextUrl } = req;

  // log the url
  console.log("🚧 nextUrl: ", nextUrl.pathname);
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isCheckRoute = nextUrl.pathname.startsWith(checkRoutesPrefix);
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  const slugRoute = req.nextUrl.pathname.split("/").pop();

  // ⚙️ Is Api Route:
  if (isApiAuthRoute) {
    return;
  }

  // ⚙️ Is Auth Route. First, check is authenticated:
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT_URL, nextUrl));
    }
    return;
  }

  // ⚙️ If Slug contains ``c``, redirect to /check/:slug:
  if (slugRoute?.endsWith("&c")) {
    return Response.redirect(
      new URL(`/check/${slugRoute.replace("&c", "")}`, nextUrl),
    );
  }

  // ⚙️ Protected routes. If not authenticated, redirect to /auth:
  if (!isLoggedIn && isProtectedRoute) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return Response.redirect(
      new URL(`/auth?callbackUrl=${encodedCallbackUrl}`, nextUrl),
    );
  }

  // ⚙️ Redirect using slug:
  // If not public route and not protected route:
  if (!isPublicRoute && !isProtectedRoute && !isCheckRoute) {
    try {
      console.log("🚧 slugRoute: ", slugRoute);
      console.log("🚧 req.nextUrl.origin: ", req.nextUrl.origin);
      const getDataApi = await fetch(
        `${req.nextUrl.origin}/api/url?slug=${slugRoute}`,
        {
          cache: "no-store",
        },
      );

      if (getDataApi.status === 404) {
        return;
      }

      const getDataUrl = await getDataApi.json();
      console.log("🚧 getDataUrl: ", getDataUrl);
      if (getDataUrl?.url) {
        const newURL = new URL(getDataUrl.url as string, req.url);
        return NextResponse.redirect(newURL);
      }
    } catch (error) {
      console.error("🚧 Error fetching slug: ", error);
    }
  }
  return;
});

export const config = {
  matcher: [
    "/((?!api/|_next/|images/|docs/|_proxy/|_static|_vercel|[\\w-]+\\.\\w+).*)",
    "/s/:slug*",
  ],
};
