import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { purchases, items } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const rows = await db.query.purchases.findMany({
    where: (p, { eq }) => eq(p.itemId, parseInt(params.id!)),
    orderBy: (p, { desc }) => [desc(p.purchasedAt)]
  });
  return json(rows);
};

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  const { store, pricePerUnit, quantityBought, notes, purchasedAt } = body;

  const itemId = parseInt(params.id!);

  // Insert the purchase record
  const result = db.insert(purchases).values({
    itemId,
    store,
    pricePerUnit,
    quantityBought,
    notes: notes || null,
    purchasedAt: purchasedAt ? new Date(purchasedAt) : new Date()
  }).run();

  const purchase = db.select().from(purchases)
    .where(eq(purchases.id, Number(result.lastInsertRowid)))
    .get();

  // Increment the item's quantity
  await db
  .update(items)
  .set({
    quantity: sql`${items.quantity} + ${String(quantityBought)}`,
    updatedAt: new Date()
  })
  .where(eq(items.id, itemId));

  // Re-fetch the updated item with relations
  const updatedItem = await db.query.items.findFirst({
    where: (i, { eq }) => eq(i.id, itemId),
    with: {
      category: true,
      subcategory: true,
      purchases: {
        orderBy: (p, { desc }) => [desc(p.purchasedAt)],
        limit: 5
      }
    }
  });

  return json(updatedItem, { status: 201 });
};