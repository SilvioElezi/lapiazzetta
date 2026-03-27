import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.SUPER_ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Password errata" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
