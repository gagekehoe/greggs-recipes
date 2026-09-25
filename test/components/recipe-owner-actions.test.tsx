/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeOwnerActions } from "@/components/recipes/recipe-owner-actions";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
    replace: vi.fn(),
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
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

afterEach(() => {
  cleanup();
});

describe("RecipeOwnerActions", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders Edit recipe and Upload Photo with matching entry points", () => {
    render(
      <RecipeOwnerActions
        recipeId="r1"
        recipeTitle="Tomato Soup"
        imageUrl=""
      />
    );

    const edit = screen.getByRole("link", { name: "Edit recipe" });
    expect(edit).toHaveAttribute("href", "/my-recipes?edit=r1");
    expect(
      screen.getByRole("button", { name: "Upload Photo" })
    ).toBeInTheDocument();
  });

  it("shows empty guidance and keeps Upload disabled until a file is chosen", async () => {
    const user = userEvent.setup();
    render(
      <RecipeOwnerActions
        recipeId="r1"
        recipeTitle="Tomato Soup"
        imageUrl=""
      />
    );

    await user.click(screen.getByRole("button", { name: "Upload Photo" }));

    expect(screen.getByText("No file selected yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload photo" })
    ).toBeDisabled();
  });

  it("surfaces upload API errors in the dialog", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Photo store is unavailable" }),
    } as Response);

    render(
      <RecipeOwnerActions
        recipeId="r1"
        recipeTitle="Tomato Soup"
        imageUrl=""
      />
    );

    await user.click(screen.getByRole("button", { name: "Upload Photo" }));

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["fake"], "soup.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    await user.click(screen.getByRole("button", { name: "Upload photo" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Photo store is unavailable"
      );
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("uploads then photo-PATCHes and refreshes on success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "/uploads/recipes/soup.jpg" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(
      <RecipeOwnerActions
        recipeId="r1"
        recipeTitle="Tomato Soup"
        imageUrl=""
      />
    );

    await user.click(screen.getByRole("button", { name: "Upload Photo" }));
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["fake"], "soup.jpg", { type: "image/jpeg" });
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Upload photo" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/api/recipes/images"
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
    });
    const patchBody = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}")
    );
    expect(patchBody).toMatchObject({
      id: "r1",
      imageUrl: "/uploads/recipes/soup.jpg",
      rightsAttested: true,
    });
    expect(refresh).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
