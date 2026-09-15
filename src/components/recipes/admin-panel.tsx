"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  contentMode: "sanity" | "local";
};

export function AdminPanel({ contentMode }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [tags, setTags] = useState("");
  const [prepMinutes, setPrepMinutes] = useState(15);
  const [cookMinutes, setCookMinutes] = useState(30);
  const [servings, setServings] = useState(4);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/session");
        const data = await res.json();
        if (!cancelled) setAuthenticated(Boolean(data.authenticated));
      } catch {
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed");
      return;
    }
    setAuthenticated(true);
    setPassword("");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  }

  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          ingredients: ingredients
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          steps: steps
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          tags: tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          prepMinutes: Number(prepMinutes),
          cookMinutes: Number(cookMinutes),
          servings: Number(servings),
          imageUrl: imageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save recipe");
        return;
      }
      setStatus(`Published “${data.recipe.title}” (${data.mode}).`);
      setTitle("");
      setSummary("");
      setIngredients("");
      setSteps("");
      setTags("");
      setImageUrl("");
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-[var(--sage)]/30" />
        <div className="h-40 bg-[var(--sage)]/20" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <form onSubmit={login} className="mx-auto max-w-md space-y-5">
        <div>
          <h1 className="font-display text-4xl text-[var(--ink)]">Kitchen desk</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Enter the admin password to add recipes without touching code.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full">
          Unlock
        </Button>
        <p className="text-xs text-[var(--ink-soft)]">
          Local default password: <code>greggskitchen</code> (override with{" "}
          <code>ADMIN_PASSWORD</code>).
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-[var(--ink)]">Add a recipe</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Saving to{" "}
            <span className="font-medium text-[var(--ink)]">
              {contentMode === "sanity" ? "Sanity CMS" : "local JSON store"}
            </span>
            . Changes appear on the site immediately — no redeploy.
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
      </div>

      <form onSubmit={saveRecipe} className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Roasted tomato soup"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              rows={3}
              placeholder="What makes this dish worth cooking?"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredients">Ingredients (one per line)</Label>
          <Textarea
            id="ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            required
            rows={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="steps">Steps (one per line)</Label>
          <Textarea
            id="steps"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            required
            rows={10}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="soup, weeknight"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL (optional)</Label>
          <Input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="prep">Prep min</Label>
            <Input
              id="prep"
              type="number"
              min={0}
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cook">Cook min</Label>
            <Input
              id="cook"
              type="number"
              min={0}
              value={cookMinutes}
              onChange={(e) => setCookMinutes(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
            <Input
              id="servings"
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-700 md:col-span-2">{error}</p> : null}
        {status ? (
          <p className="text-sm text-[var(--accent-deep)] md:col-span-2">{status}</p>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" disabled={saving} className="min-w-40">
            {saving ? "Publishing…" : "Publish recipe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
