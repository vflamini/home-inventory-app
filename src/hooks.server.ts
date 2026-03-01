import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE } from '$lib/server/auth';

const PUBLIC_ROUTES = ['/login', '/register'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(SESSION_COOKIE);
  const isPublic = PUBLIC_ROUTES.some((r) => event.url.pathname.startsWith(r));
  const isApi = event.url.pathname.startsWith('/api');

  // Validate session and attach user to locals
  if (sessionId) {
    const user = await validateSession(sessionId);
    event.locals.user = user ?? undefined;
  }

  // Protect all non-public, non-API routes
  if (!isPublic && !isApi && !event.locals.user) {
    throw redirect(303, '/login');
  }

  // Redirect already-logged-in users away from login/register
  if (isPublic && event.locals.user) {
    throw redirect(303, '/');
  }

  // Protect API routes too — return 401 instead of redirect
  if (isApi && !event.locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return resolve(event);
};