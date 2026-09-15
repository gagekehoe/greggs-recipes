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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update }),
  signIn: vi.fn(),
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
  });

  it("shows the sent confirmation state", async () => {
    const { SignInForm } = await import("@/components/auth/sign-in-form");
    render(<SignInForm sent />);
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
  });

  it("submits an email magic link request", async () => {
    const { signIn } = await import("next-auth/react");
    vi.mocked(signIn).mockResolvedValue({ error: undefined, ok: true, status: 200, url: "" } as never);
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { href: "", assign },
      writable: true,
    });

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText(/email/i), "cook@example.com");
    await user.click(screen.getByRole("button", { name: /email me a link/i }));
    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });
  });
});
