import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import {
  getUserByUsername,
  verifyPassword,
  createSession,
  makeSessionCookie,
  SESSION_COOKIE
} from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!username || !password) {
      return fail(400, { error: 'Username and password are required.', username });
    }

    const user = await getUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail(401, { error: 'Invalid username or password.', username });
    }

    const sessionId = await createSession(user.id);
    cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    throw redirect(303, '/');
  }
};