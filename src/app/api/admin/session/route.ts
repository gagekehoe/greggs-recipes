import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getContentMode } from "@/lib/recipes";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({
    authenticated,
    contentMode: getContentMode(),
  });
}
