import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.pg.js';
import { subcategories } from '$lib/server/db/schema.pg.js';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
  await db.delete(subcategories).where(eq(subcategories.id, parseInt(params.id!)));
  return new Response(null, { status: 204 });
};