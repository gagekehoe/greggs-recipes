import { redirect } from "next/navigation";

/** Old Kitchen Desk URL — send people to sign-in. */
export default function AdminRedirectPage() {
  redirect("/signin");
}
