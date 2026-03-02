import { db } from '$lib/server/db/index.js';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }) => {
  const [categoriesData, itemsData] = await Promise.all([
    db.query.categories.findMany({
      with: { subcategories: true },
      orderBy: (c, { asc }) => [asc(c.name)]
    }),
    db.query.items.findMany({
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
    })
  ]);

  return {
    user: locals.user,
    categories: categoriesData,
    items: itemsData
  };
};