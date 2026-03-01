import { db } from '$lib/server/db/index.js';

export async function load() {
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

  return { categories: categoriesData, items: itemsData };
}