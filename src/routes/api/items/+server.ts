import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { items } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
  const rows = await db.query.items.findMany({
    where: (i, { eq }) => eq(i.isActive, true),
    with: {
      category: true,
      subcategory: true,
      purchases: {
        orderBy: (p, { desc }) => [desc(p.purchasedAt)],
        limit: 5
      }
    },
    orderBy: (i, { asc }) => [asc(i.name)]
  });
  return json(rows);
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { name, categoryId, subcategoryId, unit, quantity, threshold, notes } = body;

  if (!name?.trim() || !categoryId) {
    return json({ error: 'Name and category are required' }, { status: 400 });
  }

  const [row] = await db.insert(items).values({
    name: name.trim(),
    categoryId: parseInt(categoryId),
    subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
    unit: unit ?? 'units',
    quantity: quantity ?? '0',
    threshold: threshold ?? '1',
    notes: notes ?? null
  }).returning();

  // Return with relations
  const full = await db.query.items.findFirst({
    where: (i, { eq }) => eq(i.id, row.id),
    with: { category: true, subcategory: true, purchases: true }
  });

  return json(full, { status: 201 });
}
