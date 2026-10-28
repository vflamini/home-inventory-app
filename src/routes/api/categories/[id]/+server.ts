import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { categories, subcategories, items } from '$lib/server/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

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

  // Block deletion while ACTIVE items still belong to this category
  const activeItems = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.categoryId, id), eq(items.isActive, true)))
    .limit(1);

  if (activeItems.length > 0) {
    return json(
      { error: 'This category still has items. Reassign or delete them first.' },
      { status: 409 }
    );
  }

  // Permanently remove archived items in this category (they would otherwise block the FK)
  await db.delete(items)
    .where(and(eq(items.categoryId, id), eq(items.isActive, false)));

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