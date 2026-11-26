import { hmacSign, hmacVerify, parseCookies, serializeCookie } from '../../../shared/ids';
import { ApiError } from '../../api/src/queries';
import { GA4_SCOPE, type Ga4Property } from './ga4';
import type { OAuthEnv } from './oauth';

const COOKIE = '_pvc_ga4_state';
const KEY = 'ga4_report_connection';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const encoder = new TextEncoder();

type Env = OAuthEnv & { DB: D1Database };
interface TokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }
interface Connection { site_id: string; property_id: string; refresh_token: string }

export const isGa4Callback = (url: URL) => url.searchParams.get('state')?.startsWith('ga4.') ?? false;
const callbackUri = (origin: string) => `${origin}/api/auth/google/callback`;
const clearCookie = () => serializeCookie(COOKIE, '', { maxAgeSeconds: 0, httpOnly: true });

export async function ga4Consent(env: Env, url: URL, user: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new ApiError(503, 'Google OAuth is unavailable');
  const nonce = `ga4.${Date.now()}.${crypto.randomUUID()}`;
  const state = `${nonce}.${await hmacSign(env.HMAC_KEY, `${nonce}|${user}`)}`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: callbackUri(url.origin), response_type: 'code',
    scope: `openid email ${GA4_SCOPE}`, access_type: 'offline', prompt: 'consent', state,
  });
  return new Response(null, { status: 302, headers: {
    location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    'set-cookie': serializeCookie(COOKIE, state, { maxAgeSeconds: 600, httpOnly: true }),
    'cache-control': 'no-store',
  } });
}

export function ga4ConsentRedirect(property: Ga4Property, error?: string) {
  const params = new URLSearchParams({ source: 'ga4' });
  if (error) params.set('ga4_error', error);
  return new Response(null, { status: 302, headers: {
    location: `/sites/${property.site_id}?${params}`, 'set-cookie': clearCookie(), 'cache-control': 'no-store',
  } });
}

async function exchange(env: Env, params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST', body: new URLSearchParams({
      ...params, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!,
    }), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new ApiError(response.status === 400 ? 428 : 502, 'Google authorization could not be used');
  return response.json() as Promise<TokenResponse>;
}

export async function ga4ConsentToken(env: Env, request: Request, url: URL, user: string | null, allowed: (email: string) => boolean) {
  const state = url.searchParams.get('state') ?? '';
  const match = state.match(/^(ga4\.(\d+)\.[A-Za-z0-9-]+)\.([A-Za-z0-9_-]+)$/);
  const code = url.searchParams.get('code');
  const now = Date.now();
  if (!user || !match || !code || +match[2] > now || now - +match[2] > 600_000
    || parseCookies(request.headers.get('cookie'))[COOKIE] !== state
    || !await hmacVerify(env.HMAC_KEY, `${match[1]}|${user}`, match[3])) {
    throw new ApiError(403, 'GA4 consent has expired or was cancelled');
  }
  const tokens = await exchange(env, { grant_type: 'authorization_code', code, redirect_uri: callbackUri(url.origin) });
  if (!tokens.refresh_token || !tokens.access_token || !tokens.scope?.split(' ').includes(GA4_SCOPE)) {
    throw new ApiError(403, 'Google did not grant read-only reporting access');
  }
  const identity = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(10_000),
  });
  if (!identity.ok) throw new ApiError(403, 'Could not verify the Google account');
  const account = await identity.json() as { email?: string; email_verified?: boolean };
  if (!account.email_verified || !account.email || !allowed(account.email)) {
    throw new ApiError(403, 'Use a Google account allowed to administer this dashboard');
  }
  return { access_token: tokens.access_token, refresh_token: tokens.refresh_token };
}

async function tokenKey(secret: string) {
  const key = await crypto.subtle.digest('SHA-256', encoder.encode(`tally:ga4:v1|${secret}`));
  return crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function saveGa4Connection(env: Env, property: Ga4Property, refreshToken: string) {
  const value: Connection = { site_id: property.site_id, property_id: property.property_id, refresh_token: refreshToken };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await tokenKey(env.HMAC_KEY), encoder.encode(JSON.stringify(value)));
  const stored = [iv, new Uint8Array(ciphertext)].map(bytes => btoa(String.fromCharCode(...bytes))).join('.');
  await env.DB.prepare(`INSERT INTO instance_settings (key,value,updated_at) VALUES (?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(KEY, stored, Date.now()).run();
}

let accessCache: { stored: string; token: string; expires: number } | undefined;

export async function ga4Connection(env: Env, property: Ga4Property, statusOnly = false): Promise<string | null> {
  const row = await env.DB.prepare('SELECT value FROM instance_settings WHERE key=?').bind(KEY).first<{value: string}>();
  if (!row?.value) return null;
  if (!statusOnly && accessCache?.stored === row.value && accessCache.expires > Date.now()) return accessCache.token;
  const [iv64, data64] = row.value.split('.');
  let value: Connection;
  try {
    const iv = Uint8Array.from(atob(iv64), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(data64), c => c.charCodeAt(0));
    const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await tokenKey(env.HMAC_KEY), data);
    value = JSON.parse(new TextDecoder().decode(decoded)) as Connection;
  } catch {
    return null;
  }
  if (value.site_id !== property.site_id || value.property_id !== property.property_id || !value.refresh_token) return null;
  if (statusOnly) return 'connected';
  const result = await exchange(env, { grant_type: 'refresh_token', refresh_token: value.refresh_token });
  if (!result.access_token) throw new ApiError(428, 'GA4 authorization must be renewed');
  accessCache = { stored: row.value, token: result.access_token, expires: Date.now() + ((result.expires_in ?? 3600) - 60) * 1000 };
  return result.access_token;
}
