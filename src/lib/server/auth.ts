import { db } from '$lib/server/db/index';
import { users, sessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// ── Constants ──────────────────────────────────────────────────────────────────
const SESSION_COOKIE = 'pantry_session';
const SESSION_TTL_DAYS = 30;

// ── Password hashing (SHA-256 + salt, no external deps) ───────────────────────
// For production consider argon2 or bcrypt, but this is solid for a home app.
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(s + password).digest('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, storedHash: string): boolean {
  // storedHash format: "salt:hash"
  const [salt, hash] = storedHash.split(':');
  const { hash: computed } = hashPassword(password, salt);
  // timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
  } catch {
    return false;
  }
}

export function formatPasswordHash(password: string): string {
  const { hash, salt } = hashPassword(password);
  return `${salt}:${hash}`;
}

// ── Session management ────────────────────────────────────────────────────────
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });
  return sessionId;
}

export async function validateSession(sessionId: string): Promise<{ userId: number; username: string } | null> {
  if (!sessionId) return null;

  const row = await db.query.sessions.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
    with: { user: true }
  });

  if (!row) return null;
  if (row.expiresAt < new Date()) {
    // Expired — clean it up
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return { userId: row.userId, username: row.user.username };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
export { SESSION_COOKIE };

export function makeSessionCookie(sessionId: string): string {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

// ── User lookup ───────────────────────────────────────────────────────────────
export async function getUserByUsername(username: string) {
  return db.query.users.findFirst({
    where: (u, { eq }) => eq(u.username, username.toLowerCase().trim())
  });
}

export async function createUser(username: string, password: string) {
  const passwordHash = formatPasswordHash(password);
  const [user] = await db.insert(users).values({
    username: username.toLowerCase().trim(),
    passwordHash
  }).returning();
  return user;
}