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

  it("shows a safe error when credentials do not match", async () => {
    signIn.mockResolvedValue({
      error: "CredentialsSignin",
      ok: false,
      status: 401,
      url: null,
    });

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/^email$/i), "cook@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/email or password doesn’t match/i)
      ).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("rejects mismatched and weak passwords on register", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole("tab", { name: /new here/i }));
    await user.type(screen.getByLabelText(/^email$/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "password456");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don’t match/i)).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("surfaces register API errors such as duplicate email", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "That email already has an account. Sign in instead.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { SignInForm } = await import("@/components/auth/sign-in-form");
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole("tab", { name: /new here/i }));
    await user.type(screen.getByLabelText(/^email$/i), "dup@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/that email already has an account/i)
      ).toBeInTheDocument();
    });
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("email=cook%40example.com");
  });

  it("requests a reset and shows the Gregg inbox confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        message:
          "If that email is on Gregg's Recipes, you'll get a reset link shortly.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ForgotPasswordForm } = await import(
      "@/components/auth/forgot-password-form"
    );
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText(/^email$/i)).toHaveValue("cook@example.com");
    await user.click(screen.getByRole("button", { name: /email reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /check your inbox/i })
      ).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/forgot-password",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText(/Gregg's Recipes/i)).toBeInTheDocument();
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

  it("saves a new password and signs in", async () => {
    signIn.mockResolvedValue({ error: undefined, ok: true, status: 200, url: "" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ResetPasswordForm } = await import(
      "@/components/auth/reset-password-form"
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/^new password$/i), "new-password-99");
    await user.type(
      screen.getByLabelText(/^confirm password$/i),
      "new-password-99"
    );
    await user.click(
      screen.getByRole("button", { name: /save password and sign in/i })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: "cook@example.com",
          password: "new-password-99",
          redirect: false,
        })
      );
    });
    expect(window.location.href).toBe("/welcome?next=%2F");
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { ResetPasswordForm } = await import(
      "@/components/auth/reset-password-form"
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/^new password$/i), "password123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "password456");
    await user.click(
      screen.getByRole("button", { name: /save password and sign in/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/passwords don’t match/i)).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows reset-link-needed when email or token is missing", async () => {
    searchParams = new URLSearchParams();
    const { ResetPasswordForm } = await import(
      "@/components/auth/reset-password-form"
    );
    render(<ResetPasswordForm />);
    expect(
      screen.getByRole("heading", { name: /reset link needed/i })
    ).toBeInTheDocument();
  });

  it("surfaces invalid or expired token errors from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error:
          "This reset link is invalid or expired. Request a new one from Forgot password.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ResetPasswordForm } = await import(
      "@/components/auth/reset-password-form"
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/^new password$/i), "password123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "password123");
    await user.click(
      screen.getByRole("button", { name: /save password and sign in/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument();
    });
    expect(signIn).not.toHaveBeenCalled();
  });
});
