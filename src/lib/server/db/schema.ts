import { pgTable, serial, text, integer, numeric, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // random token
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
  icon: text('icon').notNull().default('📦'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ─── Subcategories ────────────────────────────────────────────────────────────
export const subcategories = pgTable('subcategories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ─── Items ────────────────────────────────────────────────────────────────────
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  subcategoryId: integer('subcategory_id').references(() => subcategories.id),
  unit: text('unit').notNull().default('units'),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  threshold: numeric('threshold', { precision: 10, scale: 2 }).notNull().default('1'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ─── Purchases ────────────────────────────────────────────────────────────────
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  store: text('store').notNull(),
  pricePerUnit: numeric('price_per_unit', { precision: 10, scale: 2 }).notNull(),
  quantityBought: numeric('quantity_bought', { precision: 10, scale: 2 }).notNull(),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  notes: text('notes')
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
  items: many(items)
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, { fields: [subcategories.categoryId], references: [categories.id] }),
  items: many(items)
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
  subcategory: one(subcategories, { fields: [items.subcategoryId], references: [subcategories.id] }),
  purchases: many(purchases)
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  item: one(items, { fields: [purchases.itemId], references: [items.id] })
}));