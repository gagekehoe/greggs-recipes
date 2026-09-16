/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
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

describe("RecipeReviewsSection", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a sign-in CTA for guests", async () => {
    const { RecipeReviewsSection } = await import(
      "@/components/recipes/recipe-reviews"
    );
    render(
      <RecipeReviewsSection
        recipeId="r1"
        initialReviews={[]}
        initialSummary={{ average: 0, count: 0 }}
        signedIn={false}
        hasDisplayName={false}
        currentUserId={null}
        isAdmin={false}
        signInHref="/signin"
        profileHref="/profile"
      />
    );
    expect(screen.getByRole("link", { name: /sign in to review/i })).toHaveAttribute(
      "href",
      "/signin"
    );
  });

  it("prompts for a display name when signed in without one", async () => {
    const { RecipeReviewsSection } = await import(
      "@/components/recipes/recipe-reviews"
    );
    render(
      <RecipeReviewsSection
        recipeId="r1"
        initialReviews={[]}
        initialSummary={{ average: 0, count: 0 }}
        signedIn
        hasDisplayName={false}
        currentUserId="u1"
        isAdmin={false}
        signInHref="/signin"
        profileHref="/welcome"
      />
    );
    expect(
      screen.getByRole("link", { name: /set display name/i })
    ).toHaveAttribute("href", "/welcome");
  });

  it("posts a review when signed in with a display name", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        review: {
          id: "rev1",
          userId: "u1",
          rating: 5,
          body: "Delicious",
          images: [],
          authorPrivilege: null,
        },
        reviews: [
          {
            id: "rev1",
            userId: "u1",
            rating: 5,
            body: "Delicious",
            authorName: "Maya",
            authorPrivilege: null,
            images: [],
            updatedAt: new Date("2026-01-01"),
          },
        ],
        summary: { average: 5, count: 1 },
      }),
    } as Response);

    const { RecipeReviewsSection } = await import(
      "@/components/recipes/recipe-reviews"
    );
    const user = userEvent.setup();
    render(
      <RecipeReviewsSection
        recipeId="r1"
        initialReviews={[]}
        initialSummary={{ average: 0, count: 0 }}
        signedIn
        hasDisplayName
        currentUserId="u1"
        isAdmin={false}
        signInHref="/signin"
        profileHref="/profile"
      />
    );

    await user.click(screen.getByRole("radio", { name: /5 stars/i }));
    await user.type(
      screen.getByPlaceholderText(/optional/i),
      "Delicious"
    );
    await user.click(screen.getByRole("button", { name: /post review/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(await screen.findByText("Maya")).toBeInTheDocument();
    expect(screen.getByText(/5 average · 1 review/i)).toBeInTheDocument();
  });
  it("shows Owner, Admin, and Authorized cook badges on reviews", async () => {
    const { RecipeReviewsSection } = await import(
      "@/components/recipes/recipe-reviews"
    );
    render(
      <RecipeReviewsSection
        recipeId="r1"
        initialReviews={[
          {
            id: "rev-owner",
            recipeId: "r1",
            userId: "owner",
            rating: 5,
            body: "From the kitchen",
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
            authorName: "Gregg",
            authorPrivilege: "owner",
            images: [],
          },
          {
            id: "rev-admin",
            recipeId: "r1",
            userId: "admin",
            rating: 4,
            body: "Staff note",
            createdAt: new Date("2026-01-02"),
            updatedAt: new Date("2026-01-02"),
            authorName: "Pat",
            authorPrivilege: "admin",
            images: [],
          },
          {
            id: "rev-cook",
            recipeId: "r1",
            userId: "cook",
            rating: 4,
            body: "Mom’s tip",
            createdAt: new Date("2026-01-03"),
            updatedAt: new Date("2026-01-03"),
            authorName: "Mom",
            authorPrivilege: "authorized_cook",
            images: [],
          },
        ]}
        initialSummary={{ average: 4.3, count: 3 }}
        signedIn={false}
        hasDisplayName={false}
        currentUserId={null}
        isAdmin={false}
        signInHref="/signin"
        profileHref="/profile"
      />
    );
    expect(screen.getByText("Gregg")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Pat")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Mom")).toBeInTheDocument();
    expect(screen.getByText("Authorized cook")).toBeInTheDocument();
  });
});

describe("RecipeCommentsSection", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows guest CTA and posts comments when signed in", async () => {
    const { RecipeCommentsSection } = await import(
      "@/components/recipes/recipe-comments"
    );
    const { rerender } = render(
      <RecipeCommentsSection
        recipeId="r1"
        initialComments={[]}
        signedIn={false}
        hasDisplayName={false}
        currentUserId={null}
        isAdmin={false}
        signInHref="/signin?callbackUrl=%2Frecipes%2Fsoup"
        profileHref="/profile"
      />
    );
    expect(
      screen.getByRole("link", { name: /sign in to comment/i })
    ).toBeInTheDocument();

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        comments: [
          {
            id: "c1",
            userId: "u1",
            body: "Loved it",
            authorName: "Maya",
            authorPrivilege: null,
            createdAt: new Date("2026-01-01"),
          },
        ],
      }),
    } as Response);

    rerender(
      <RecipeCommentsSection
        recipeId="r1"
        initialComments={[]}
        signedIn
        hasDisplayName
        currentUserId="u1"
        isAdmin={false}
        signInHref="/signin"
        profileHref="/profile"
      />
    );

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText(/ask a question/i),
      "Loved it"
    );
    await user.click(screen.getByRole("button", { name: /post comment/i }));
    expect(await screen.findByText("Loved it")).toBeInTheDocument();
  });
});
