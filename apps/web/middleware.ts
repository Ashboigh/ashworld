import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const pathname = req.nextUrl.pathname;

    const isAuthPage =
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/verify-email");

    const isPublicPage = pathname.startsWith("/checkout") || pathname.startsWith("/embed");
    const isInvitePage = pathname.startsWith("/invite/");
    const isMFAChallengePage = pathname === "/mfa-challenge";

    // Redirect authenticated users away from auth pages (except invite)
    if (isAuthPage && !isInvitePage && isAuth) {
      // Check if MFA is pending
      if (token?.mfaPending && !token?.mfaVerified) {
        return NextResponse.redirect(new URL("/mfa-challenge", req.url));
      }
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // If user has MFA pending, redirect to MFA challenge page
    if (isAuth && token?.mfaPending && !token?.mfaVerified && !isMFAChallengePage && !isAuthPage && !isPublicPage) {
      return NextResponse.redirect(new URL("/mfa-challenge", req.url));
    }

    // If on MFA challenge page but MFA is verified, redirect to onboarding
    if (isMFAChallengePage && isAuth && (!token?.mfaPending || token?.mfaVerified)) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // For the old /dashboard route, redirect to onboarding
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow access to auth pages and public pages without token
        const isPublicPage =
          pathname.startsWith("/login") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/forgot-password") ||
          pathname.startsWith("/reset-password") ||
          pathname.startsWith("/verify-email") ||
          pathname.startsWith("/invite/") ||
          pathname.startsWith("/checkout") ||
          pathname.startsWith("/embed") ||
          pathname === "/mfa-challenge";

        if (isPublicPage) {
          return true;
        }

        // Require token for protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Auth pages
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/invite/:path*",
    "/mfa-challenge",
    // Protected pages
    "/dashboard/:path*",
    "/onboarding",
    // Organization pages (dynamic routes)
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
