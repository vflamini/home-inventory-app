import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { categories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
  const body = await request.json();
  const { name, color, icon } = body;

  const [row] = await db.update(categories)
    .set({ name, color, icon })
    .where(eq(categories.id, parseInt(params.id!)))
    .returning();

  return json(row);
}

export const DELETE: RequestHandler = async ({ params }) => {
  await db.delete(categories).where(eq(categories.id, parseInt(params.id!)));
  return new Response(null, { status: 204 });
}