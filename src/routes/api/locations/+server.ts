import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { locations } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
  const rows = await db.query.locations.findMany({
    orderBy: (l, { asc }) => [asc(l.name)]
  });
  return json(rows);
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { name, icon } = body;

  if (!name?.trim()) {
    return json({ error: 'Name is required' }, { status: 400 });
  }

  const [row] = await db.insert(locations).values({
    name: name.trim(),
    icon: icon ?? '📍'
  }).returning();

  return json(row, { status: 201 });
}
