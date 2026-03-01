import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { subcategories } from '$lib/server/db/schema.js';

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return json({ error: 'Name is required' }, { status: 400 });
  }

  const [row] = await db.insert(subcategories).values({
    name: name.trim(),
    categoryId: parseInt(params.id!)
  }).returning();

  return json(row, { status: 201 });
}