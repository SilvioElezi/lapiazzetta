import { NextResponse } from "next/server";
import { orders } from '../../../lib/store';

export async function GET() {
  const all = Array.from(orders.values()).sort(
    (a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()
  );
  return NextResponse.json(all);
}
