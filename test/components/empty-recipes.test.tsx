/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyRecipes } from "@/components/recipes/empty-recipes";
import type { SessionUser } from "@/lib/auth/session";

afterEach(() => {
  cleanup();
});

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

describe("EmptyRecipes", () => {
  it("avoids pantry-empty framing for guests", () => {
    render(<EmptyRecipes user={null} />);
    expect(screen.getByText(/recipes are on the way/i)).toBeTruthy();
    expect(screen.queryByText(/pantry/i)).toBeNull();
    expect(screen.getByRole("link", { name: /sign in to join/i })).toHaveAttribute(
      "href",
      "/signin"
    );
  });

  it("points cooks at My recipes", () => {
    const user: SessionUser = {
      id: "c1",
      email: "cook@example.com",
      name: "Cook",
      role: "cook",
    };
    render(<EmptyRecipes user={user} />);
    expect(screen.getByText(/nothing published yet/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /my recipes/i })).toHaveAttribute(
      "href",
      "/my-recipes"
    );
  });

  it("explains viewer role without publish CTA", () => {
    const user: SessionUser = {
      id: "v1",
      email: "viewer@example.com",
      name: "Viewer",
      role: "viewer",
    };
    render(<EmptyRecipes user={user} />);
    expect(screen.getByText(/cooks and admins add dishes/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /your profile/i })).toHaveAttribute(
      "href",
      "/profile"
    );
  });
});
