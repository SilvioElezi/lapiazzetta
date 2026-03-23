import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const MENU_PATH = join(process.cwd(), "data", "menu.json");

function readMenu() {
  try {
    return JSON.parse(readFileSync(MENU_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeMenu(data: any) {
  writeFileSync(MENU_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  return NextResponse.json(readMenu());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  writeMenu(body);
  return NextResponse.json({ ok: true });
}
