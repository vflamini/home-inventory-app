import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { items } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';

type ItemUpdate = Partial<InferInsertModel<typeof items>>;

export const GET: RequestHandler = async ({ params }) => {
  const row = await db.query.items.findFirst({
    where: (i, { eq }) => eq(i.id, parseInt(params.id!)),
    with: {
      category: true,
      subcategory: true,
      purchases: { orderBy: (p, { desc }) => [desc(p.purchasedAt)] }
    }
  });

  if (!row) return json({ error: 'Not found' }, { status: 404 });
  return json(row);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  const { name, categoryId, subcategoryId, unit, quantity, threshold, notes } = body;

  const updateData: ItemUpdate = {};
  if (name !== undefined) updateData.name = name;
  if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
  if (subcategoryId !== undefined) updateData.subcategoryId = subcategoryId ? parseInt(subcategoryId) : null;
  if (unit !== undefined) updateData.unit = unit;
  if (quantity !== undefined) updateData.quantity = Number(quantity);
  if (threshold !== undefined) updateData.threshold = Number(threshold);
  if (notes !== undefined) updateData.notes = notes;
  updateData.updatedAt = new Date();

  await db.update(items)
    .set(updateData)
    .where(eq(items.id, parseInt(params.id!)));

  const row = await db.query.items.findFirst({
    where: (i, { eq }) => eq(i.id, parseInt(params.id!)),
    with: {
      category: true,
      subcategory: true,
      purchases: { orderBy: (p, { desc }) => [desc(p.purchasedAt)], limit: 5 }
    }
  });

  return json(row);
};

export const DELETE: RequestHandler = async ({ params }) => {
  await db.update(items)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(items.id, parseInt(params.id!)));
  return new Response(null, { status: 204 });
};