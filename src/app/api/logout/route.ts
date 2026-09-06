import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/utils";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "LOGOUT", "User", user.id);
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

export async function GET(request: Request) {
  return POST(request);
}
