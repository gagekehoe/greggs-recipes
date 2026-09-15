import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/** Keep auth/token URLs out of the index — they look like phishing bait. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/auth/", "/signin/verify", "/signin/done"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
