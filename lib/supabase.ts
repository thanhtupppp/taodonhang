import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { CookieMethodsServer, SetAllCookies } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type SupabaseCookie = {
  name: string;
  value: string;
};

function mapCookies(
  cookiesList: Array<{ name: string; value: string }>,
): SupabaseCookie[] {
  return cookiesList.map(({ name, value }) => ({ name, value }));
}

function buildCookieMethods(
  getAllCookies: () => SupabaseCookie[],
  setAllCookies: SetAllCookies,
): CookieMethodsServer {
  return {
    getAll(): SupabaseCookie[] {
      return getAllCookies();
    },
    setAll: setAllCookies,
  };
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const cookieMethods = buildCookieMethods(
    () => mapCookies(cookieStore.getAll()),
    (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...(options ?? {}) });
        });
      } catch {
        // Server Components can render without mutating cookies.
      }
    },
  );

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookieMethods,
  });
}

export function createSupabaseRouteClient(
  request: NextRequest,
  response: NextResponse,
) {
  const cookieMethods = buildCookieMethods(
    () => mapCookies(request.cookies.getAll()),
    (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set({ name, value, ...(options ?? {}) });
      });
    },
  );

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookieMethods,
  });
}

export function createSupabaseServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseEnv() {
  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}
