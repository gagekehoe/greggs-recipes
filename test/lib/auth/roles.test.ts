import { afterEach, describe, expect, it } from "vitest";
import {
  canEditRecipe,
  canManagePeople,
  canManageRecipe,
  canViewRecipe,
  canWriteRecipes,
  getAdminEmail,
  isAdminEmail,
  isRole,
} from "@/lib/auth/roles";

describe("isRole", () => {
  it("accepts admin, cook, and viewer", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("cook")).toBe(true);
    expect(isRole("viewer")).toBe(true);
  });

  it("rejects unknown or non-string values", () => {
    expect(isRole("publisher")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(1)).toBe(false);
  });
});

describe("canWriteRecipes", () => {
  it("allows admin and cook", () => {
    expect(canWriteRecipes("admin")).toBe(true);
    expect(canWriteRecipes("cook")).toBe(true);
  });

  it("denies viewer and missing roles", () => {
    expect(canWriteRecipes("viewer")).toBe(false);
    expect(canWriteRecipes(null)).toBe(false);
    expect(canWriteRecipes(undefined)).toBe(false);
  });
});

describe("canManagePeople", () => {
  it("allows only admin", () => {
    expect(canManagePeople("admin")).toBe(true);
    expect(canManagePeople("cook")).toBe(false);
    expect(canManagePeople("viewer")).toBe(false);
    expect(canManagePeople(null)).toBe(false);
  });
});

describe("canEditRecipe", () => {
  const author = "user-author";
  const other = "user-other";

  it("lets admin edit any recipe", () => {
    expect(canEditRecipe("admin", author, other)).toBe(true);
    expect(canEditRecipe("admin", author, author)).toBe(true);
    expect(canEditRecipe("admin", null, other)).toBe(true);
  });

  it("lets cook edit only their own recipe", () => {
    expect(canEditRecipe("cook", author, author)).toBe(true);
    expect(canEditRecipe("cook", author, other)).toBe(false);
    expect(canEditRecipe("cook", null, author)).toBe(false);
  });

  it("denies viewer and unauthenticated users", () => {
    expect(canEditRecipe("viewer", author, author)).toBe(false);
    expect(canEditRecipe("cook", author, null)).toBe(false);
    expect(canEditRecipe(null, author, author)).toBe(false);
    expect(canEditRecipe(undefined, author, author)).toBe(false);
  });
});

describe("canViewRecipe / canManageRecipe", () => {
  const author = "user-author";
  const other = "user-other";

  it("allows anyone to view public recipes", () => {
    expect(canViewRecipe({ isPrivate: false, authorId: author }, null)).toBe(
      true
    );
    expect(canViewRecipe({ authorId: author }, other)).toBe(true);
  });

  it("limits private recipes to the author", () => {
    expect(
      canViewRecipe({ isPrivate: true, authorId: author }, author)
    ).toBe(true);
    expect(
      canViewRecipe({ isPrivate: true, authorId: author }, other)
    ).toBe(false);
    expect(
      canViewRecipe({ isPrivate: true, authorId: author }, null)
    ).toBe(false);
  });

  it("keeps private recipe management author-only even for admins", () => {
    expect(
      canManageRecipe(
        "admin",
        { isPrivate: true, authorId: author },
        other
      )
    ).toBe(false);
    expect(
      canManageRecipe(
        "admin",
        { isPrivate: true, authorId: author },
        author
      )
    ).toBe(true);
    expect(
      canManageRecipe(
        "admin",
        { isPrivate: false, authorId: author },
        other
      )
    ).toBe(true);
  });
});

describe("admin email helpers", () => {
  const previous = process.env.ADMIN_EMAIL;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.ADMIN_EMAIL;
    } else {
      process.env.ADMIN_EMAIL = previous;
    }
  });

  it("defaults getAdminEmail when ADMIN_EMAIL is unset", () => {
    delete process.env.ADMIN_EMAIL;
    expect(getAdminEmail()).toBe("gagekehoe17@gmail.com");
  });

  it("normalizes ADMIN_EMAIL casing and whitespace", () => {
    process.env.ADMIN_EMAIL = "  Admin@Example.COM ";
    expect(getAdminEmail()).toBe("admin@example.com");
  });

  it("matches admin emails case-insensitively", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(isAdminEmail("Admin@Example.com")).toBe(true);
    expect(isAdminEmail(" other@example.com ")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
