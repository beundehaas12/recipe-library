import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables in middleware');
        return supabaseResponse;
    }

    try {
        const supabase = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        );
                        supabaseResponse = NextResponse.next({
                            request,
                        });
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        // Refreshing the auth token
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Redirect unauthenticated users to login (except for public routes)
        const publicRoutes = ['/login', '/complete-account', '/auth/callback'];
        const isPublicRoute = publicRoutes.some(route =>
            request.nextUrl.pathname.startsWith(route)
        );

        if (!user && !isPublicRoute && request.nextUrl.pathname !== '/') {
            // For now, allow the home page for unauthenticated users
            // They will see a login prompt there
        }

        return supabaseResponse;
    } catch (e) {
        console.error('Middleware error:', e);
        return supabaseResponse;
    }
}
