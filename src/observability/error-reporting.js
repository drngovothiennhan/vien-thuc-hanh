import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config.js';

const REPORT_URL = `${SUPABASE_URL}/rest/v1/rpc/garden_hub_report_error_v1`;
const MAX_MESSAGE_LENGTH = 500;
const recentReports = new Map();
let handlersInstalled = false;

export function sanitizeReportMessage(value) {
  return String(value || 'Unknown application error')
    .replace(/\bBearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/((?:access|refresh)[_-]?token|authorization|password|secret)\s*[:=]\s*[^\s&,;]+/gi, '$1=[REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .slice(0, MAX_MESSAGE_LENGTH);
}

function routePath() {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.hash.split('?')[0]}`.slice(0, 160);
}

function normalizeContext(context = {}) {
  const allowed = ['area', 'operation', 'status', 'errorType'];
  const safe = {};
  for (const key of allowed) {
    const value = context[key];
    if (value === undefined || value === null) continue;
    safe[key] = String(value).slice(0, key === 'operation' ? 100 : 50);
  }
  return safe;
}

export async function reportGameHubError(session, error, context = {}) {
  const message = sanitizeReportMessage(error instanceof Error ? error.message : error);
  const code = String(context.code || 'application_error').replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 64);
  const path = routePath();
  const dedupeKey = `${code}|${path}`;
  const now = Date.now();
  if (now - (recentReports.get(dedupeKey) || 0) < 30_000) return false;
  recentReports.set(dedupeKey, now);
  if (recentReports.size > 100) recentReports.clear();

  if (!session?.accessToken) {
    console.error('[HIU TMC Game Hub] Error could not be sent to Admin Center because the session is unavailable.', { code, message });
    return false;
  }

  try {
    const response = await fetch(REPORT_URL, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${session.accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        p_code: code,
        p_message: message,
        p_route: path,
        p_context: normalizeContext(context)
      }),
      cache: 'no-store'
    });
    if (!response.ok) {
      console.error('[HIU TMC Game Hub] Admin Center error report was not accepted.', { code, status: response.status });
      return false;
    }
    return true;
  } catch {
    console.error('[HIU TMC Game Hub] Admin Center error report could not reach the server.', { code });
    return false;
  }
}

export function installGlobalErrorReporting(getSession) {
  if (handlersInstalled || typeof window === 'undefined') return;
  handlersInstalled = true;
  window.addEventListener('error', event => {
    void reportGameHubError(getSession(), event.error || event.message, { code: 'uncaught_error', area: 'runtime', operation: 'window.onerror' });
  });
  window.addEventListener('unhandledrejection', event => {
    void reportGameHubError(getSession(), event.reason, { code: 'unhandled_rejection', area: 'runtime', operation: 'unhandledrejection' });
  });
}
