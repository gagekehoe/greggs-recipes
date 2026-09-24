/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyCatalogMatches } from "@/components/recipes/empty-catalog-matches";

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

describe("EmptyCatalogMatches", () => {
  it("points people back to the full Gregg catalog", () => {
    render(<EmptyCatalogMatches clearHref="/#recipes" />);
    expect(screen.getByText(/no recipes match/i)).toBeTruthy();
    expect(screen.getByText(/gregg/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /clear search & filters/i })
    ).toHaveAttribute("href", "/#recipes");
  });
});
