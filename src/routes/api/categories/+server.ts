import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { categories } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
  const rows = await db.query.categories.findMany({
    with: { subcategories: true },
    orderBy: (c, { asc }) => [asc(c.name)]
  });
  return json(rows);
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { name, color, icon } = body;

  if (!name?.trim()) {
    return json({ error: 'Name is required' }, { status: 400 });
  }

  const [row] = await db.insert(categories).values({
    name: name.trim(),
    color: color ?? '#6366f1',
    icon: icon ?? '📦'
  }).returning();

  return json(row, { status: 201 });
}