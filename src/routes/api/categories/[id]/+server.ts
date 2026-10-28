import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { categories, subcategories, items } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

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
  const id = parseInt(params.id!);

  // Block deletion while items still belong to this category
  const referencingItems = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.categoryId, id))
    .limit(1);

  if (referencingItems.length > 0) {
    return json(
      { error: 'This category still has items. Reassign or delete them first.' },
      { status: 409 }
    );
  }

  // Unassign items from this category's subcategories, which will be cascade-deleted
  const subs = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .where(eq(subcategories.categoryId, id));

  if (subs.length > 0) {
    await db.update(items)
      .set({ subcategoryId: null })
      .where(inArray(items.subcategoryId, subs.map((s) => s.id)));
  }

  await db.delete(categories).where(eq(categories.id, id));
  return new Response(null, { status: 204 });
}