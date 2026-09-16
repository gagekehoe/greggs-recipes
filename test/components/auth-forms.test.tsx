/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
});

const refresh = vi.fn();
const replace = vi.fn();
const update = vi.fn();
const getSession = vi.fn();
const signIn = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace, push: vi.fn() }),
  useSearchParams: () => searchParams,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update }),
  signIn: (...args: unknown[]) => signIn(...args),
  getSession: (...args: unknown[]) => getSession(...args),
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

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { name: "Maya" } }),
      })
    );
  });

  it("saves a profile name", async () => {
    const { ProfileForm } = await import("@/components/auth/profile-form");
    const user = userEvent.setup();
    render(
      <ProfileForm
        initialName=""
        email="m@example.com"
        mode="profile"
      />
    );
    await user.type(screen.getByLabelText(/display name/i), "Maya");
    await user.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/profile saved/i);
    });
    expect(update).toHaveBeenCalled();
  });

  it("redirects after welcome save", async () => {
    const { ProfileForm } = await import("@/components/auth/profile-form");
    const user = userEvent.setup();
    render(
      <ProfileForm
        initialName="Bo"
        email={null}
        mode="welcome"
        nextHref="/recipes/soup"
      />
    );
    await user.click(screen.getByRole("button", { name: /save and continue/i }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/recipes/soup");
    });
  });
});

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    getSession.mockResolvedValue(null);
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it("signs in with email and password", async () => {
    signIn.mockResolvedValue({ error: undefined, ok: true, status: 200, url: "" });

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /email me a link/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^email$/i), "cook@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: "cook@example.com",
          password: "password123",
          redirect: false,
        })
      );
    });
    expect(window.location.href).toBe("/welcome?next=%2F");
  });

  it("registers then signs in", async () => {
    signIn.mockResolvedValue({ error: undefined, ok: true, status: 200, url: "" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole("tab", { name: /new here/i }));
    await user.type(screen.getByLabelText(/^email$/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: "new@example.com",
          password: "password123",
        })
      );
    });
  });

  it("links to forgot password", async () => {
    const { SignInForm } = await import("@/components/auth/sign-in-form");
    render(<SignInForm />);
    const links = screen.getAllByRole("link", { name: /forgot password/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "/forgot-password");
  });

  it("toggles password visibility with View / Hide", async () => {
    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);

    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute("type", "password");

    const view = screen.getByRole("button", { name: /view password/i });
    expect(view).toHaveAttribute("aria-pressed", "false");
    await user.click(view);

    expect(password).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: /hide password/i });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    await user.click(hide);
    expect(password).toHaveAttribute("type", "password");
  });
});

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("email=cook%40example.com&token=abc");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      })
    );
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it("toggles new and confirm password visibility", async () => {
    const { ResetPasswordForm } = await import(
      "@/components/auth/reset-password-form"
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    const newPassword = screen.getByLabelText(/^new password$/i);
    const confirm = screen.getByLabelText(/^confirm password$/i);
    expect(newPassword).toHaveAttribute("type", "password");
    expect(confirm).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /^view new password$/i }));
    expect(newPassword).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "password");

    await user.click(
      screen.getByRole("button", { name: /^view confirm password$/i })
    );
    expect(confirm).toHaveAttribute("type", "text");
  });
});
