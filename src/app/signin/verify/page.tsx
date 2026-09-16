import { redirect } from "next/navigation";

/** Former magic-link confirm page — password auth no longer uses this flow. */
export default function SignInVerifyRetiredPage() {
  redirect("/signin");
}
