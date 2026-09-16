import { redirect } from "next/navigation";

/** Former magic-link done tab — password auth signs in in-place. */
export default function SignInDoneRetiredPage() {
  redirect("/signin");
}
