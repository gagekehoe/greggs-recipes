import type { Role } from "@/lib/db/schema";

/** Any signed-in role may leave a review. */
export function canLeaveReview(role: Role | undefined | null): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "cook" ||
    role === "viewer"
  );
}

/** Same gate as reviews — signed-in members can comment. */
export function canPostComment(role: Role | undefined | null): boolean {
  return canLeaveReview(role);
}

export function canEditOwnReview(
  role: Role | undefined | null,
  reviewUserId: string | undefined | null,
  userId: string | undefined | null
): boolean {
  if (!canLeaveReview(role) || !userId || !reviewUserId) return false;
  return reviewUserId === userId;
}

/** Authors delete their own comments; owner/admin can delete any. */
export function canDeleteComment(
  role: Role | undefined | null,
  commentUserId: string | undefined | null,
  userId: string | undefined | null
): boolean {
  if (!role || !userId || !commentUserId) return false;
  if (role === "owner" || role === "admin") return true;
  return commentUserId === userId;
}

/** Authors manage their own review images; owner/admin can remove any. */
export function canManageReviewImages(
  role: Role | undefined | null,
  reviewUserId: string | undefined | null,
  userId: string | undefined | null
): boolean {
  if (!role || !userId || !reviewUserId) return false;
  if (role === "owner" || role === "admin") return true;
  return reviewUserId === userId;
}
