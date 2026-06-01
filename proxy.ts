import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(function proxy(req) {
    const token = req.nextauth.token
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    // If accessing admin route, check if user has ADMIN role
    if (isAdminRoute && token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/client', req.url))
    }
}, {
    callbacks: {
        authorized: ({ token }) => !!token,
    },
})

export const config = { matcher: ["/admin/:path*", "/client/:path*"] }
