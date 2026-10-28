import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { locations, items } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
  const body = await request.json();
  const { name, icon } = body;

  const updateData: { name?: string; icon?: string } = {};
  if (name !== undefined) {
    if (!name.trim()) {
      return json({ error: 'Name is required' }, { status: 400 });
    }
    updateData.name = name.trim();
  }
  if (icon !== undefined) updateData.icon = icon;

  const [row] = await db.update(locations)
    .set(updateData)
    .where(eq(locations.id, parseInt(params.id!)))
    .returning();

  return json(row);
}

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id!);

  // Clear the location from any items that reference it
  await db.update(items)
    .set({ locationId: null })
    .where(eq(items.locationId, id));

  await db.delete(locations).where(eq(locations.id, id));
  return new Response(null, { status: 204 });
}
