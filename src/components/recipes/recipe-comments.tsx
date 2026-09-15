"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentWithAuthor } from "@/lib/reviews/store";

type Props = {
  recipeId: string;
  initialComments: CommentWithAuthor[];
  signedIn: boolean;
  hasDisplayName: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  signInHref: string;
  profileHref: string;
};

function formatWhen(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RecipeCommentsSection({
  recipeId,
  initialComments,
  signedIn,
  hasDisplayName,
  currentUserId,
  isAdmin,
  signInHref,
  profileHref,
}: Props) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!signedIn) {
      setError("Sign in to leave a comment.");
      return;
    }
    if (!body.trim()) {
      setError("Write a short comment first.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId, body: body.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not post comment");
          return;
        }
        if (data.comments) setComments(data.comments);
        setBody("");
        router.refresh();
      } catch {
        setError("Could not post comment");
      }
    });
  }

  async function removeComment(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not delete comment");
        return;
      }
      if (data.comments) setComments(data.comments);
      else setComments((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    });
  }

  return (
    <section className="border-t border-[var(--line)]/80 pt-14">
      <h2 className="font-display text-3xl text-[var(--ink)]">Comments</h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        {comments.length === 0
          ? "No comments yet."
          : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </p>

      {!signedIn ? (
        <div className="mt-8 border border-[var(--line)] bg-[var(--paper)]/70 px-5 py-6">
          <p className="text-[var(--ink)]">
            Sign in to join the conversation on this recipe.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Everyone can read comments. Sign in to post — no password, just a
            one-time email link.
          </p>
          <Link
            href={signInHref}
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-[var(--ink)] px-4 text-sm font-medium text-[#f7f4ec] transition-colors hover:bg-[var(--sage-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)] md:h-9"
          >
            Sign in to comment
          </Link>
        </div>
      ) : !hasDisplayName ? (
        <div className="mt-8 border border-[var(--line)] bg-[var(--paper)]/70 px-5 py-6">
          <p className="text-[var(--ink)]">
            Choose a display name before you comment.
          </p>
          <Link
            href={profileHref}
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-[var(--ink)] px-4 text-sm font-medium text-[#f7f4ec] transition-colors hover:bg-[var(--sage-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)] md:h-9"
          >
            Set display name
          </Link>
        </div>
      ) : (
        <form onSubmit={submitComment} className="mt-8 space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="recipe-comment"
              className="block text-sm font-medium text-[var(--ink)]"
            >
              Your comment
            </label>
            <Textarea
              id="recipe-comment"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ask a question or share a tip…"
              maxLength={2000}
              rows={3}
              className="rounded-none border-[var(--line)] bg-[var(--paper)]/50"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            Post comment
          </Button>
        </form>
      )}

      <ul className="mt-10 space-y-6">
        {comments.map((comment) => {
          const canDelete =
            Boolean(currentUserId) &&
            (comment.userId === currentUserId || isAdmin);
          return (
            <li
              key={comment.id}
              className="border-b border-[var(--line)]/60 pb-6 last:border-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-[var(--ink)]">
                  {comment.authorName || "Cook"}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  {formatWhen(comment.createdAt)}
                </p>
              </div>
              <p className="mt-2 leading-relaxed text-[var(--ink-muted)]">
                {comment.body}
              </p>
              {canDelete ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
                  onClick={() => removeComment(comment.id)}
                  disabled={pending}
                >
                  {isAdmin && comment.userId !== currentUserId
                    ? "Delete (admin)"
                    : "Delete"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
