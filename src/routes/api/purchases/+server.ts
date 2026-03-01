import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { purchases, items } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const rows = await db.query.purchases.findMany({
    where: (p, { eq }) => eq(p.itemId, parseInt(params.id!)),
    orderBy: (p, { desc }) => [desc(p.purchasedAt)]
  });
  return json(rows);
}

export const POST: RequestHandler = async ({ request, params }) => {
  const body = await request.json();
  const { store, pricePerUnit, quantityBought, notes, purchasedAt } = body;

  if (!store?.trim() || !pricePerUnit || !quantityBought) {
    return json({ error: 'Store, price, and quantity are required' }, { status: 400 });
  }

  const itemId = parseInt(params.id!);

  const [purchase] = await db.insert(purchases).values({
    itemId,
    store: store.trim(),
    pricePerUnit: String(pricePerUnit),
    quantityBought: String(quantityBought),
    notes: notes ?? null,
    purchasedAt: purchasedAt ? new Date(purchasedAt) : new Date()
  }).returning();

  // Update item quantity by adding what was bought
  await db.update(items)
    .set({
      quantity: sql`${items.quantity} + ${quantityBought}`,
      updatedAt: new Date()
    })
    .where(eq(items.id, itemId));

  return json(purchase, { status: 201 });
}