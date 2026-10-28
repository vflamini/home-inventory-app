import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // random token
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
  icon: text('icon').notNull().default('📦'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Subcategories ────────────────────────────────────────────────────────────
export const subcategories = sqliteTable('subcategories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Locations ────────────────────────────────────────────────────────────────
export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  icon: text('icon').notNull().default('📍'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Items ────────────────────────────────────────────────────────────────────
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  subcategoryId: integer('subcategory_id').references(() => subcategories.id),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  unit: text('unit').notNull().default('units'),
  quantity: real('quantity').notNull().default(0),
  threshold: real('threshold').notNull().default(1),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Purchases ────────────────────────────────────────────────────────────────
export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  store: text('store').notNull(),
  pricePerUnit: real('price_per_unit').notNull(),
  quantityBought: real('quantity_bought').notNull(),
  purchasedAt: integer('purchased_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  notes: text('notes'),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
  items: many(items),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, { fields: [subcategories.categoryId], references: [categories.id] }),
  items: many(items),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
  subcategory: one(subcategories, { fields: [items.subcategoryId], references: [subcategories.id] }),
  location: one(locations, { fields: [items.locationId], references: [locations.id] }),
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  item: one(items, { fields: [purchases.itemId], references: [items.id] }),
}));