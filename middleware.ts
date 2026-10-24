import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { validateCsrfOrigin } from "@/lib/csrf";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const pathname = req.nextUrl.pathname;

        // F-004: Validate Origin/Referer on mutation requests (POST/PUT/PATCH/DELETE)
        if (!validateCsrfOrigin(req)) {
            return new NextResponse(JSON.stringify({ error: "Forbidden: CSRF check failed" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const isAdminRoute = pathname.startsWith("/admin");

        // If accessing admin route, check if user has ADMIN or SUPER_ADMIN role
        if (isAdminRoute && token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
            return NextResponse.redirect(new URL("/client", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname;
                // Cron and auth API routes handle their own authentication
                if (path.startsWith("/api/cron/") || path.startsWith("/api/auth/")) {
                    return true;
                }
                // API routes handle their own session check and return JSON 401 rather than HTML redirect
                if (path.startsWith("/api/")) {
                    return true;
                }
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ["/admin/:path*", "/client/:path*", "/api/:path*"],
};
