import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-aware server client. Reads/writes the auth cookie so
// supabase.auth.getUser() reflects who's actually logged in, and so RLS
// policies keyed on auth.uid() apply to reads/writes made through it.
//
// Use this (not the raw anon client in app/actions/product.ts) for anything
// that needs to know who the current admin is — e.g. stamping created_by,
// or gating an action on being signed in at all.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component in some paths (e.g.
            // rendering /products); cookies can only be mutated from a
            // Server Action or Route Handler. Middleware refreshes the
            // session cookie on every request, so this is safe to ignore.
          }
        },
      },
    },
  );
}
