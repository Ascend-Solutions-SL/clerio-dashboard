// supabase/functions/_shared/cors.ts
export const ALLOWED_ORIGINS = new Set([
    "http://localhost:3000",
  ]);
  
  export function getCorsHeaders(origin?: string) {
    const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000";
    return {
      "Access-Control-Allow-Origin": allowOrigin,
      Vary: "Origin",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
      "Access-Control-Max-Age": "86400",
    } as Record<string, string>;
  }
