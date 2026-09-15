import type { MetadataRoute } from "next";

/** Keep auth/token URLs out of the index — they look like phishing bait. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/auth/", "/signin/verify", "/signin/done"],
    },
    host: "https://greggsrecipes.com",
  };
}
