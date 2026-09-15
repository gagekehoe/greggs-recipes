import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gregg's Recipes",
    template: "%s · Gregg's Recipes",
  },
  description:
    "Home cooking from Gregg's kitchen — realistic recipes you can cook tonight, with a kitchen desk for adding new dishes without redeploying.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
