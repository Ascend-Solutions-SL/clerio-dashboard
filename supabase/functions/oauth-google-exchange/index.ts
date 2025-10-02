// supabase/functions/oauth-google-exchange/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Types ---
interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

interface UserTokens {
  access_token: string;
  refresh_token: string | null;
  expiry_date: string | null;
  scope: string | null;
  token_type: string;
}

interface TokenExchangeRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

interface ErrorResponse {
  error: string;
  [key: string]: unknown;
}

// --- Constants ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Max-Age': '86400',
} as const;

// --- Environment Variables ---
const ENV = {
  SUPABASE_URL: Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL'),
  SERVICE_ROLE_KEY: Deno.env.get('SERVICE_ROLE_KEY'),
  ANON_KEY: Deno.env.get('ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY'),
  GOOGLE_CLIENT_ID: Deno.env.get('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: Deno.env.get('GOOGLE_CLIENT_SECRET'),
} as const;

// Validate required environment variables
const missingVars = Object.entries(ENV)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Type-safe environment variables after validation
const {
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  ANON_KEY,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = ENV as Required<typeof ENV>;

// --- Helpers ---
function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  });
  
  // Add custom headers
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => responseHeaders.append(key, v));
    } else if (value) {
      responseHeaders.set(key, value);
    }
  });

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization')?.trim();
  if (!auth) return null;
  
  const [scheme, token] = auth.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : null;
}

// --- Google OAuth ---
async function exchangeAuthCode(params: {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code: params.code,
    code_verifier: params.code_verifier,
    grant_type: 'authorization_code',
    redirect_uri: params.redirect_uri,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token refresh failed: ${error}`);
  }

  return response.json();
}

// --- Database Operations ---
function getSupabaseClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

async function getUserTokens(userId: string): Promise<UserTokens | null> {
  const { data, error } = await getSupabaseClient()
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertUserTokens(
  userId: string,
  tokens: Partial<UserTokens> & { access_token: string }
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('user_google_tokens')
    .upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_type: tokens.token_type ?? 'Bearer',
        scope: tokens.scope ?? null,
        expiry_date: tokens.expiry_date ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

// --- Request Handlers ---
async function handlePostRequest(userId: string, body: unknown): Promise<Response> {
  // Validate request body
  if (!body || typeof body !== 'object') {
    return errorResponse('Invalid request body', 400);
  }

  const { code, code_verifier, redirect_uri } = body as Partial<TokenExchangeRequest>;
  
  if (!code || !code_verifier || !redirect_uri) {
    return errorResponse('Missing required parameters: code, code_verifier, redirect_uri', 400);
  }

  try {
    const tokens = await exchangeAuthCode({ code, code_verifier, redirect_uri });
    const expiryDate = tokens.expires_in
      ? new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      : null;

    await upsertUserTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      scope: tokens.scope,
      expiry_date: expiryDate,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Token exchange failed:', error);
    return errorResponse('Failed to exchange authorization code', 500);
  }
}

async function handleGetRequest(userId: string): Promise<Response> {
  const tokens = await getUserTokens(userId);
  if (!tokens) return errorResponse('No tokens found', 404);

  // Check if token is expired
  const isExpired = tokens.expiry_date && new Date(tokens.expiry_date) <= new Date();
  
  if (isExpired && tokens.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      const newExpiry = refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : tokens.expiry_date;

      await upsertUserTokens(userId, {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokens.refresh_token,
        token_type: refreshed.token_type || tokens.token_type,
        scope: refreshed.scope || tokens.scope,
        expiry_date: newExpiry,
      });

      return jsonResponse({
        access_token: refreshed.access_token,
        token_type: refreshed.token_type || tokens.token_type,
        expiry_date: newExpiry,
        scope: refreshed.scope || tokens.scope,
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      return errorResponse('Failed to refresh token', 500);
    }
  }

  return jsonResponse(tokens);
}

// --- Main Handler ---
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Verify authentication
  const token = getBearerToken(req);
  if (!token) return errorResponse('Unauthorized', 401);

  try {
    // Verify the token and get user
    const supabaseClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) return errorResponse('Invalid token', 401);

    // Route the request
    switch (req.method) {
      case 'POST': {
        const body = await req.json().catch(() => null);
        return handlePostRequest(user.id, body);
      }
      case 'GET':
        return handleGetRequest(user.id);
      default:
        return errorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Request failed:', error);
    return errorResponse('Internal server error', 500);
  }
});
