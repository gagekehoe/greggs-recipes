/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import type { Recipe } from "@/lib/recipes/types";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    refresh,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function recipe(partial: Partial<Recipe> = {}): Recipe {
  return {
    id: "r-mine",
    slug: "soup",
    title: "Tomato Soup",
    summary: "A simple tomato soup for weeknights.",
    ingredients: ["tomatoes"],
    steps: ["simmer"],
    tags: ["soup"],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    imageUrl: "",
    imageAlt: "",
    source: "db",
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    authorId: "me",
    authorName: "Maya",
    isPrivate: false,
    inspiredBy: "",
    inspiredByUrl: "",
    ...partial,
  };
}

afterEach(() => {
  cleanup();
});

describe("RecipeEditor visibility", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/recipes/shares") || url.includes("/api/users/directory")) {
          return {
            ok: true,
            json: async () => ({ shares: [], users: [] }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            recipe: {
              id: "r-mine",
              title: "Tomato Soup",
              isPrivate: init?.body
                ? Boolean(
                    JSON.parse(String(init.body)).isPrivate
                  )
                : false,
            },
            mode: "db",
          }),
        };
      })
    );
  });

  it("hides Make private on recipes the current user does not author", () => {
    render(
      <RecipeEditor
        contentMode="db"
        currentUserId="admin"
        canManageAll
        recipes={[
          recipe({ id: "r-other", authorId: "other", title: "Their Chili" }),
          recipe({ id: "r-mine", authorId: "admin", title: "My Soup" }),
        ]}
      />
    );

    const otherRow = screen.getByText("Their Chili").closest("li");
    const mineRow = screen.getByText("My Soup").closest("li");
    expect(otherRow?.textContent).not.toMatch(/Make private/);
    expect(mineRow?.textContent).toMatch(/Make private/);
  });

  it("keeps the edit form private after a list-row Make private so Save cannot republish", async () => {
    const user = userEvent.setup();
    render(
      <RecipeEditor
        contentMode="db"
        currentUserId="me"
        canManageAll={false}
        recipes={[recipe()]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(
      screen.getByRole("radio", { name: /^Public/i })
    ).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Make private" }));
    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /^Private/i })
      ).toBeChecked();
    });

    await user.click(
      screen.getByRole("checkbox", { name: /I wrote this recipe/i })
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls.filter(([url, init]) => {
        return String(url) === "/api/recipes" && init?.method === "PATCH";
      });
      expect(calls.length).toBeGreaterThanOrEqual(2);
      const saveBody = JSON.parse(String(calls.at(-1)?.[1]?.body));
      expect(saveBody.isPrivate).toBe(true);
    });
  });
});
