import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config.js';
import { reportGameHubError } from '../observability/error-reporting.js';

// Same-origin Eco proxy lets both applications share one rotating Supabase
// refresh token instead of keeping independently rotating copies.
export const SESSION_STORAGE_KEY = 'hiutmc-member-session-v1';
const SESSION_REFRESH_LOCK = 'hiutmc-supabase-session-refresh-v1';
const BRIDGE_FLAG = 'ecosystem_sso';
const REQUEST_TIMEOUT_MS = 12_000;

function requestSignal() {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch {
    return {};
  }
}

function expiryFromToken(token) {
  const exp = Number(decodeJwtPayload(token).exp || 0);
  return exp > 0 ? exp * 1000 : Date.now() + 45 * 60 * 1000;
}

function clearBridgeFragment() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

function consumeIncomingBridge() {
  if (!window.location.hash) return null;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (fragment.get(BRIDGE_FLAG) !== '1') return null;
  const accessToken = fragment.get('access_token') || '';
  const refreshToken = fragment.get('refresh_token') || '';
  clearBridgeFragment();
  const invalidFields = [];
  if (accessToken.length < 40) invalidFields.push('access_token');
  // Supabase owns the refresh-token format; require presence here and let its
  // Auth endpoint validate the value instead of imposing a local length rule.
  if (!refreshToken) invalidFields.push('refresh_token');
  if (invalidFields.length) {
    throw new Error(`Phiên HIU TMC gửi sang thiếu hoặc sai trường ${invalidFields.join(', ')}. Hãy mở Game Hub lại từ hệ sinh thái.`);
  }
  return { accessToken, refreshToken, expiresAt: expiryFromToken(accessToken) };
}

function readStoredSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    if (value?.accessToken && value?.refreshToken) return value;
  } catch {}
  return null;
}

function saveSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function authRequestError(message, status) {
  const error = new Error(message);
  // Only an explicit Auth 401 proves this stored credential is invalid.
  error.clearSession = status === 401;
  return error;
}

let validAccessTokenRequest = null;
export function getValidAccessToken() {
  const session = readStoredSession();
  if (!session) return Promise.resolve('');
  if (validAccessTokenRequest?.refreshToken === session.refreshToken) return validAccessTokenRequest.promise;
  const promise = (async () => {
    try {
      const valid = await refreshIfNeeded(session);
      if (valid.accessToken !== session.accessToken || valid.refreshToken !== session.refreshToken) {
        saveSession({ ...session, ...valid });
      }
      return valid.accessToken;
    } catch {
      return '';
    }
  })().finally(() => {
    if (validAccessTokenRequest?.promise === promise) validAccessTokenRequest = null;
  });
  validAccessTokenRequest = { refreshToken: session.refreshToken, promise };
  return promise;
}

export function buildLegacySsoUrl(href, session) {
  const target = new URL(href);
  if (session?.accessToken && session?.refreshToken) {
    target.hash = new URLSearchParams({
      ecosystem_sso: '1',
      access_token: session.accessToken,
      refresh_token: session.refreshToken
    }).toString();
  }
  return target.toString();
}

async function refreshIfNeeded(session) {
  const refresh = async () => {
    // Another tab (or Eco) may have rotated the token while this request was
    // waiting for the origin-wide Web Lock. Always use the latest stored pair.
    const latest = readStoredSession() || session;
    if (latest.expiresAt - Date.now() > 90_000) return latest;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: latest.refreshToken }),
      cache: 'no-store',
      signal: requestSignal()
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw authRequestError('Không thể xác minh phiên đăng nhập. Hãy mở Game Hub lại từ HIU TMC.', response.status);
    if (!body.access_token || !body.refresh_token) throw new Error('Không thể xác minh phiên đăng nhập. Hãy mở Game Hub lại từ HIU TMC.');
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: Number(body.expires_at || 0) * 1000 || expiryFromToken(body.access_token),
      member: latest.member
    };
  };
  const hostname = globalThis.window?.location?.hostname || '';
  const onEcoOrigin = hostname === 'hiutmc.com' || hostname.endsWith('.hiutmc.com');
  if (onEcoOrigin && navigator.locks?.request) {
    // Do not wait indefinitely for a lock held by another HIU TMC tab/WebView.
    // If another tab is refreshing, wait briefly for its rotated session to land.
    let lockUnavailable = false;
    try {
      const result = await navigator.locks.request(SESSION_REFRESH_LOCK, { ifAvailable: true }, lock => {
        if (!lock) {
          lockUnavailable = true;
          return null;
        }
        return refresh();
      });
      if (!lockUnavailable) return result;
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        const latest = readStoredSession();
        if (latest && latest.expiresAt - Date.now() > 90_000) return latest;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      return refresh();
    } catch (error) {
      // Some embedded WebViews expose Web Locks but do not implement them.
      throw error;
    }
  }
  return refresh();
}

async function verifyMember(accessToken) {
  const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: requestSignal()
  });
  const authUser = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok) throw authRequestError('Không xác minh được phiên thành viên. Hãy thử tải lại Game Hub.', authResponse.status);
  if (!authUser.id) throw new Error('Không xác minh được phiên thành viên. Hãy đăng nhập lại từ HIU TMC.');

  // app_metadata is issued by the trusted HIU TMC auth service. It anchors the
  // account, while the current role is refreshed through a server-side RPC so
  // role changes do not wait for an old JWT to expire.
  const memberId = String(authUser.app_metadata?.member_id || '');
  if (!memberId) throw new Error('Phiên này chưa liên kết hồ sơ HIU TMC. Hãy đăng nhập lại từ HIU TMC.');
  let role = 'member';
  try {
    const roleResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/garden_hub_current_member_role_v1`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
        body: '{}',
      cache: 'no-store',
      signal: requestSignal()
    });
    if (roleResponse.ok) {
      const payload = await roleResponse.json().catch(() => []);
      const row = Array.isArray(payload) ? payload[0] : payload;
      const currentRole = String(row?.role || '');
      if (currentRole) role = currentRole;
      else {
        void reportGameHubError({ accessToken }, new Error('The current member role lookup returned no role.'), {
          code: 'member_role_empty', area: 'access', operation: 'garden_hub_current_member_role_v1'
        });
      }
    } else {
      void reportGameHubError({ accessToken }, new Error('The current member role lookup failed.'), {
        code: 'member_role_http', area: 'access', operation: 'garden_hub_current_member_role_v1', status: roleResponse.status
      });
    }
  } catch (error) {
    void reportGameHubError({ accessToken }, error, {
      code: 'member_role_network', area: 'access', operation: 'garden_hub_current_member_role_v1'
    });
  }
  return {
    id: memberId,
    displayName: 'Thành viên HIU TMC',
    role,
    avatarUrl: ''
  };
}

export async function bootstrapSession() {
  let session = null;
  try {
    const bridged = consumeIncomingBridge();
    session = bridged || readStoredSession();
    if (!session) return { member: null, session: null, error: null };
    if (bridged) saveSession(bridged);
    // Validate the bridged access token without rotating its refresh token:
    // the Ecosystem still owns the stored session for a later return visit.
    const refreshed = await refreshIfNeeded(session);
    const member = await verifyMember(refreshed.accessToken);
    const complete = { ...refreshed, member };
    saveSession(complete);
    return { member, session: complete, error: null };
  } catch (error) {
    if (error?.clearSession === true) localStorage.removeItem(SESSION_STORAGE_KEY);
    return { member: null, session: null, error: error instanceof Error ? error.message : 'Không thể xác minh phiên HIU TMC.' };
  }
}

export async function logout() {
  // The same-origin proxy intentionally shares this key with Eco, so removing
  // it signs this browser out of both apps. Eco remains the owner of explicit
  // Supabase Auth revocation.
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
