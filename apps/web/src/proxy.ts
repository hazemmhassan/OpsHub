import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { env } from "./env";
import { routing } from "./i18n/routing";

const handleInternationalization = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleInternationalization(request);
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(cacheHeaders).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
