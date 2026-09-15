/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroCtas } from "@/components/layout/hero-ctas";
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

describe("HeroCtas", () => {
  it("shows Sign in for guests", () => {
    render(<HeroCtas user={null} />);
    expect(screen.getByRole("link", { name: /browse recipes/i })).toHaveAttribute(
      "href",
      "/#recipes"
    );
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      "/signin"
    );
    expect(screen.queryByRole("link", { name: /my recipes/i })).toBeNull();
  });

  it("replaces Sign in with My recipes for cooks", () => {
    const user: SessionUser = {
      id: "u1",
      email: "cook@example.com",
      name: "Cook",
      role: "cook",
    };
    render(<HeroCtas user={user} />);
    expect(screen.queryByRole("link", { name: /^sign in$/i })).toBeNull();
    expect(screen.getByRole("link", { name: /my recipes/i })).toHaveAttribute(
      "href",
      "/my-recipes"
    );
  });

  it("replaces Sign in with Profile for viewers", () => {
    const user: SessionUser = {
      id: "u2",
      email: "viewer@example.com",
      name: "Viewer",
      role: "viewer",
    };
    render(<HeroCtas user={user} />);
    expect(screen.queryByRole("link", { name: /^sign in$/i })).toBeNull();
    expect(screen.getByRole("link", { name: /^profile$/i })).toHaveAttribute(
      "href",
      "/profile"
    );
  });
});
