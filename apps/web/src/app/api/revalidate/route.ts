import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { readEnvironment } from "@/lib/env";

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow"
};

function matches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Purges every cached page. Called by the roster refresh workflow after it writes new snapshots
 * and by the "Purge site cache" workflow after a record is removed, so cached pages never keep a
 * removed or released person past the purge.
 */
export function POST(request: Request) {
  const secret = readEnvironment().REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "Not found." }, { status: 404, headers });
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!matches(token, secret)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401, headers });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true }, { headers });
}
