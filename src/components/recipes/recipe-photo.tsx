import Image from "next/image";
import {
  hasRecipeImage,
  recipeImageInitials,
  recipePlaceholderTone,
  resolveRecipeImageUrl,
} from "@/lib/recipes/image";
import { cn } from "@/lib/utils";

type Variant = "card" | "detail" | "hero";

type Props = {
  title: string;
  imageUrl?: string | null;
  imageAlt?: string;
  variant?: Variant;
  priority?: boolean;
  className?: string;
  /** Extra class on the Next/Image (object-cover etc.). */
  imageClassName?: string;
  sizes?: string;
};

const TONE_CLASS = [
  "recipe-photo-fallback--tone-a",
  "recipe-photo-fallback--tone-b",
  "recipe-photo-fallback--tone-c",
] as const;

export function RecipePhoto({
  title,
  imageUrl,
  imageAlt,
  variant = "card",
  priority = false,
  className,
  imageClassName,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: Props) {
  const src = resolveRecipeImageUrl(imageUrl);
  const alt = imageAlt?.trim() || title;
  const initials = recipeImageInitials(title);
  const tone = recipePlaceholderTone(title);

  if (src) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-cover", imageClassName)}
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${title} — photo coming soon`}
      className={cn(
        "recipe-photo-fallback relative flex h-full w-full flex-col items-center justify-center overflow-hidden",
        TONE_CLASS[tone],
        className
      )}
    >
      <div className="recipe-photo-fallback__pattern" aria-hidden />
      <div className="recipe-photo-fallback__glow" aria-hidden />
      <span
        className={cn(
          "relative z-10 font-display tracking-wide text-[#f3f0e8]/95",
          variant === "card" && "text-5xl md:text-6xl",
          variant === "detail" && "text-7xl md:text-8xl",
          variant === "hero" && "text-8xl md:text-9xl"
        )}
      >
        {initials}
      </span>
      <p className="relative z-10 mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-[#c5d0c2]/85">
        Photo soon
      </p>
    </div>
  );
}

export { hasRecipeImage };
