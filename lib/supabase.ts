import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
export const supabase = configured
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  : null;

// Only offer providers that the hosted Auth service has actually enabled.
export async function googleSignInAvailable(
  signal?: AbortSignal,
): Promise<boolean> {
  if (!configured) return false;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      signal,
    },
  );
  if (!response.ok) return false;
  const settings = await response.json();
  return settings.external?.google === true;
}
