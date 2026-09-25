/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyMyRecipesMatches } from "@/components/recipes/empty-my-recipes-matches";

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

describe("EmptyMyRecipesMatches", () => {
  it("points cooks back to their full list", () => {
    render(<EmptyMyRecipesMatches clearHref="/my-recipes" />);
    expect(screen.getByText(/no recipes match/i)).toBeTruthy();
    expect(screen.getByText(/photo filter/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /clear filters/i })
    ).toHaveAttribute("href", "/my-recipes");
  });
});
