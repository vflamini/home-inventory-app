import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { subcategories, items } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id!);

  // Unassign the subcategory from any items before deleting it
  await db.update(items)
    .set({ subcategoryId: null })
    .where(eq(items.subcategoryId, id));

  await db.delete(subcategories).where(eq(subcategories.id, id));
  return new Response(null, { status: 204 });
};