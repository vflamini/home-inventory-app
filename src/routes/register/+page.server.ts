import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import {
  getUserByUsername,
  createUser,
  createSession,
  SESSION_COOKIE
} from '$lib/server/auth';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    if (!username || !password) {
      return fail(400, { error: 'Username and password are required.', username });
    }
    if (username.length < 3) {
      return fail(400, { error: 'Username must be at least 3 characters.', username });
    }
    if (password.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters.', username });
    }
    if (password !== confirm) {
      return fail(400, { error: 'Passwords do not match.', username });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return fail(409, { error: 'That username is already taken.', username });
    }

    const user = await createUser(username, password);
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