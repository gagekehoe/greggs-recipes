import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", false && "b", "c")).toContain("a");
    expect(cn("a", "c")).toContain("c");
  });
});
