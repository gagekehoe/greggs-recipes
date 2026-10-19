import { and, eq } from "drizzle-orm";
import type { Role } from "@/lib/db/schema";
import {
  accounts,
  db,
  recipeComments,
  recipeReviews,
  recipeShares,
  recipes,
  users,
} from "@/lib/db";

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  cook: 1,
  admin: 2,
  owner: 3,
};

export type DuplicateEmailAccount = {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  image: string | null;
};

/** Higher kitchen privilege wins when two case-variant rows are merged. */
export function strongerRole(a: Role, b: Role): Role {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}

/**
 * Move recipes / reviews / comments / shares (and Auth.js account rows) from
 * a leftover case-variant user id onto the password-reset survivor.
 *
 * Reset already strips the sibling password, so anything still keyed on that
 * id is unreachable after login. Unique (recipeId, userId) conflicts keep the
 * survivor's row and drop the sibling's.
 */
export async function reassignOwnedContent(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  if (fromUserId === toUserId) return;

  await db
    .update(recipes)
    .set({ authorId: toUserId })
    .where(eq(recipes.authorId, fromUserId));

  const siblingReviews = (await db
    .select({ id: recipeReviews.id, recipeId: recipeReviews.recipeId })
    .from(recipeReviews)
    .where(eq(recipeReviews.userId, fromUserId))) as Array<{
    id: string;
    recipeId: string;
  }>;
  if (siblingReviews.length > 0) {
    const survivorReviews = (await db
      .select({ recipeId: recipeReviews.recipeId })
      .from(recipeReviews)
      .where(eq(recipeReviews.userId, toUserId))) as Array<{
      recipeId: string;
    }>;
    const taken = new Set(survivorReviews.map((row) => row.recipeId));
    for (const review of siblingReviews) {
      if (taken.has(review.recipeId)) {
        await db.delete(recipeReviews).where(eq(recipeReviews.id, review.id));
      } else {
        await db
          .update(recipeReviews)
          .set({ userId: toUserId })
          .where(eq(recipeReviews.id, review.id));
      }
    }
  }

  await db
    .update(recipeComments)
    .set({ userId: toUserId })
    .where(eq(recipeComments.userId, fromUserId));

  const siblingShares = (await db
    .select({
      id: recipeShares.id,
      recipeId: recipeShares.recipeId,
    })
    .from(recipeShares)
    .where(eq(recipeShares.userId, fromUserId))) as Array<{
    id: string;
    recipeId: string;
  }>;
  if (siblingShares.length > 0) {
    const survivorShares = (await db
      .select({ recipeId: recipeShares.recipeId })
      .from(recipeShares)
      .where(eq(recipeShares.userId, toUserId))) as Array<{
      recipeId: string;
    }>;
    const taken = new Set(survivorShares.map((row) => row.recipeId));
    for (const share of siblingShares) {
      if (taken.has(share.recipeId)) {
        await db.delete(recipeShares).where(eq(recipeShares.id, share.id));
      } else {
        await db
          .update(recipeShares)
          .set({ userId: toUserId })
          .where(eq(recipeShares.id, share.id));
      }
    }
  }

  const siblingAccounts = (await db
    .select({
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
    })
    .from(accounts)
    .where(eq(accounts.userId, fromUserId))) as Array<{
    provider: string;
    providerAccountId: string;
  }>;
  for (const account of siblingAccounts) {
    try {
      await db
        .update(accounts)
        .set({ userId: toUserId })
        .where(
          and(
            eq(accounts.provider, account.provider),
            eq(accounts.providerAccountId, account.providerAccountId)
          )
        );
    } catch {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, account.provider),
            eq(accounts.providerAccountId, account.providerAccountId)
          )
        );
    }
  }
}

/**
 * After picking the password-reset survivor, fold leftover case-variant rows
 * into it so login does not strand recipes or drop cook/admin privileges.
 */
export async function mergeDuplicateEmailAccounts(
  survivor: DuplicateEmailAccount,
  siblings: readonly DuplicateEmailAccount[]
): Promise<void> {
  if (siblings.length === 0) return;

  let nextRole = survivor.role;
  let nextName = survivor.name;
  let nextImage = survivor.image;

  for (const sibling of siblings) {
    nextRole = strongerRole(nextRole, sibling.role);
    if (!nextName?.trim() && sibling.name?.trim()) {
      nextName = sibling.name;
    }
    if (!nextImage && sibling.image) {
      nextImage = sibling.image;
    }
    await reassignOwnedContent(sibling.id, survivor.id);
  }

  const roleChanged = nextRole !== survivor.role;
  const nameChanged = (nextName ?? null) !== (survivor.name ?? null);
  const imageChanged = (nextImage ?? null) !== (survivor.image ?? null);
  if (!roleChanged && !nameChanged && !imageChanged) return;

  await db
    .update(users)
    .set({
      ...(roleChanged ? { role: nextRole } : {}),
      ...(nameChanged ? { name: nextName } : {}),
      ...(imageChanged ? { image: nextImage } : {}),
    })
    .where(eq(users.id, survivor.id));
}
