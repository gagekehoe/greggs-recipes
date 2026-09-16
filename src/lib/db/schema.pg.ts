import type { AdapterAccountType } from "@auth/core/adapters";
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ROLES } from "./schema";

/** Postgres / Neon schema — same logical tables as SQLite for Auth.js + reviews. */
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  /** bcrypt hash; null until the user sets a password (e.g. former magic-link accounts). */
  passwordHash: text("passwordHash"),
  role: text("role", { enum: ROLES }).notNull().default("viewer"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const recipeReviews = pgTable(
  "recipe_review",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recipeId: text("recipeId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("recipe_review_recipe_user_uidx").on(table.recipeId, table.userId),
  ]
);

export const recipeReviewImages = pgTable("recipe_review_image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  reviewId: text("reviewId")
    .notNull()
    .references(() => recipeReviews.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const recipeComments = pgTable("recipe_comment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  recipeId: text("recipeId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Durable recipe catalog (Neon in production). */
export const recipes = pgTable("recipe", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  /** JSON-encoded string[] */
  ingredients: text("ingredients").notNull().default("[]"),
  /** JSON-encoded string[] */
  steps: text("steps").notNull().default("[]"),
  /** JSON-encoded string[] */
  tags: text("tags").notNull().default("[]"),
  prepMinutes: integer("prepMinutes").notNull().default(0),
  cookMinutes: integer("cookMinutes").notNull().default(0),
  servings: integer("servings").notNull().default(1),
  imageUrl: text("imageUrl").notNull().default(""),
  imageAlt: text("imageAlt").notNull().default(""),
  authorId: text("authorId").notNull(),
  authorName: text("authorName").notNull(),
  /**
   * When true, only the author and selective share recipients may view.
   * Public catalog / sitemap still omit private recipes.
   */
  isPrivate: boolean("isPrivate").notNull().default(false),
  /** Optional attribution credit shown on the recipe detail page. */
  inspiredBy: text("inspiredBy").notNull().default(""),
  /** Optional https link for the Inspired by credit. */
  inspiredByUrl: text("inspiredByUrl").notNull().default(""),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Selective share grants for private recipes.
 * Exactly one of `userId` or `role` is set per row (user share XOR role share).
 * There is no “share with everyone” grant — use public visibility instead.
 */
export const recipeShares = pgTable(
  "recipe_share",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recipeId: text("recipeId")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("recipe_share_recipe_user_uidx").on(table.recipeId, table.userId),
    uniqueIndex("recipe_share_recipe_role_uidx").on(table.recipeId, table.role),
  ]
);
