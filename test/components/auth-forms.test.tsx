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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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
    getSession.mockResolvedValue(null);
  });

  it("shows the sent confirmation state and waits for the link", async () => {
    const { SignInForm } = await import("@/components/auth/sign-in-form");
    render(<SignInForm sent />);
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/keep this tab open/i);
  });

  it("continues from the sent tab once a session appears", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    render(<SignInForm sent />);

    await waitFor(() => {
      expect(window.location.href).toBe("/welcome?next=%2F");
    });
  });

  it("submits an email magic link request to the done page", async () => {
    signIn.mockResolvedValue({ error: undefined, ok: true, status: 200, url: "" });
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText(/email/i), "cook@example.com");
    await user.click(screen.getByRole("button", { name: /email me a link/i }));
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        "nodemailer",
        expect.objectContaining({
          email: "cook@example.com",
          callbackUrl: "/signin/done?next=%2F",
          redirect: false,
        })
      );
    });
    expect(window.location.href).toBe("/signin?sent=1");
  });
});

describe("SignInDone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
  });

  it("tells the user they can close the magic-link tab", async () => {
    const close = vi.fn();
    Object.defineProperty(window, "close", { value: close, writable: true });

    const { SignInDone } = await import("@/components/auth/sign-in-done");
    render(<SignInDone nextPath="/recipes/soup" />);

    await waitFor(() => {
      expect(screen.getByText(/you’re signed in/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /close this tab/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue here instead/i })).toHaveAttribute(
      "href",
      "/welcome?next=%2Frecipes%2Fsoup"
    );
    expect(close).toHaveBeenCalled();
  });
});
