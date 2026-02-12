/**
 * Cron script to refresh Square OAuth tokens for all active merchants.
 *
 * Intended to be run as a Railway Cron Service on a weekly schedule.
 *
 * Required environment variables:
 *   BACKEND_URL   – The base URL of the HaloCall backend (e.g. https://your-app.up.railway.app)
 *   ADMIN_API_KEY  – Shared secret that authenticates cron requests to the /admin endpoints
 *
 * Railway Cron schedule example: 0 9 * * 1  (every Monday at 9:00 AM UTC)
 */

const BACKEND_URL = process.env.BACKEND_URL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Safety net: force-kill the process after 60 seconds no matter what
const killTimer = setTimeout(() => {
  console.error('[CRON] Timed out after 60s, forcing exit');
  process.exit(1);
}, 60_000);
killTimer.unref();

if (!BACKEND_URL) {
  console.error('[CRON] Missing BACKEND_URL environment variable');
  process.exit(1);
}

if (!ADMIN_API_KEY) {
  console.error('[CRON] Missing ADMIN_API_KEY environment variable');
  process.exit(1);
}

async function refreshTokens() {
  const url = `${BACKEND_URL}/admin/refresh-tokens`;
  console.log(`[CRON] Refreshing tokens at ${new Date().toISOString()}`);
  console.log(`[CRON] POST ${url}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_API_KEY!,
      },
    });

    const data = await res.json();

    if (res.ok) {
      console.log('[CRON] Success:', JSON.stringify(data, null, 2));
    } else {
      console.error(`[CRON] Failed with status ${res.status}:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('[CRON] Request failed:', error);
  }

  // Ensure clean exit regardless of open handles
  console.log('[CRON] Done, exiting.');
  process.exit(0);
}

refreshTokens();
