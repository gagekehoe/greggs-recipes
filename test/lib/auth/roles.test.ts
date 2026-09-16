import { afterEach, describe, expect, it } from "vitest";
import {
  authorPrivilege,
  canAssignRole,
  canEditRecipe,
  canManagePeople,
  canManageRecipe,
  canViewRecipe,
  canWriteRecipes,
  getAdminEmail,
  hasKitchenStaffPowers,
  isAdminEmail,
  isRole,
  isSiteOwner,
} from "@/lib/auth/roles";

describe("isRole", () => {
  it("accepts owner, admin, cook, and viewer", () => {
    expect(isRole("owner")).toBe(true);
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
  it("allows owner, admin, and cook", () => {
    expect(canWriteRecipes("owner")).toBe(true);
    expect(canWriteRecipes("admin")).toBe(true);
    expect(canWriteRecipes("cook")).toBe(true);
    expect(canWriteRecipes("viewer")).toBe(false);
    expect(canWriteRecipes(null)).toBe(false);
  });
});

describe("canManagePeople / canAssignRole", () => {
  it("allows owner and admin to manage people", () => {
    expect(canManagePeople("owner")).toBe(true);
    expect(canManagePeople("admin")).toBe(true);
    expect(canManagePeople("cook")).toBe(false);
    expect(canManagePeople("viewer")).toBe(false);
  });

  it("lets only owner assign or change the owner role", () => {
    expect(canAssignRole("owner", "owner")).toBe(true);
    expect(canAssignRole("owner", "admin")).toBe(true);
    expect(canAssignRole("admin", "cook")).toBe(true);
    expect(canAssignRole("admin", "owner")).toBe(false);
    expect(canAssignRole("admin", "cook", "owner")).toBe(false);
    expect(canAssignRole("cook", "admin")).toBe(false);
  });
});

describe("canEditRecipe / canManageRecipe", () => {
  const author = "author-1";
  const other = "other-1";

  it("lets owner and admin edit any recipe", () => {
    expect(canEditRecipe("owner", author, other)).toBe(true);
    expect(canEditRecipe("admin", author, other)).toBe(true);
    expect(canEditRecipe("admin", author, author)).toBe(true);
  });

  it("lets cooks edit only their own", () => {
    expect(canEditRecipe("cook", author, author)).toBe(true);
    expect(canEditRecipe("cook", author, other)).toBe(false);
  });

  it("keeps private recipe management author-only even for staff", () => {
    expect(
      canManageRecipe(
        "admin",
        { isPrivate: true, authorId: author },
        other
      )
    ).toBe(false);
    expect(
      canManageRecipe(
        "owner",
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

describe("canViewRecipe", () => {
  const author = "author-1";
  it("hides private recipes from non-authors", () => {
    expect(canViewRecipe({ isPrivate: false, authorId: author }, null)).toBe(
      true
    );
    expect(
      canViewRecipe({ isPrivate: true, authorId: author }, author)
    ).toBe(true);
    expect(
      canViewRecipe({ isPrivate: true, authorId: author }, "other")
    ).toBe(false);
  });
});

describe("admin email bootstrap helpers", () => {
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
  });
});

describe("role-based site owner + privilege badges", () => {
  it("treats only the owner role as site owner (not admin or email)", () => {
    expect(isSiteOwner({ role: "owner" })).toBe(true);
    expect(isSiteOwner({ role: "admin" })).toBe(false);
    expect(isSiteOwner({ role: "cook" })).toBe(false);
  });

  it("maps privilege badges from role only", () => {
    expect(authorPrivilege({ role: "owner" })).toBe("owner");
    expect(authorPrivilege({ role: "admin" })).toBe("admin");
    expect(authorPrivilege({ role: "cook" })).toBe("authorized_cook");
    expect(authorPrivilege({ role: "viewer" })).toBe(null);
    expect(hasKitchenStaffPowers("owner")).toBe(true);
    expect(hasKitchenStaffPowers("admin")).toBe(true);
    expect(hasKitchenStaffPowers("cook")).toBe(false);
  });
});
