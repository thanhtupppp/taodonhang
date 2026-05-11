import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

type Cookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login")
  ) {
    const response = NextResponse.next({ request });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        "",
      {
        cookies: {
          getAll(): Cookie[] {
            return request.cookies
              .getAll()
              .map(({ name, value }) => ({ name, value }));
          },
          setAll(cookiesToSet: Cookie[]): void {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({ name, value, ...(options ?? {}) });
            });
          },
        },
      },
    );

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }

  return NextResponse.next({ request });
}

export const config = { matcher: ["/admin/:path*"] };
