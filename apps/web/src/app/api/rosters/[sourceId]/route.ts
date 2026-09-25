import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readEnvironment } from "@/lib/env";
import { checkRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { getLiveRosterPage } from "@/lib/live-roster";
import { InvalidCursorError, maximumRosterPageSize } from "@/lib/roster";

const querySchema = z.object({
  cursor: z.string().min(20).max(1_024),
  limit: z.coerce.number().int().min(1).max(maximumRosterPageSize).default(maximumRosterPageSize)
});

const noIndexHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, nosnippet"
};

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...noIndexHeaders, ...extraHeaders }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const environment = readEnvironment();
  // A production build without a customer database must fail closed as an
  // unavailable route. This also keeps the production smoke artifact free of
  // the development roster endpoint.
  if (environment.DATA_MODE !== "official" || !process.env.DATABASE_URL) {
    return json({ error: "Roster source not found." }, 404);
  }

  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!query.success) return json({ error: "Invalid roster continuation request." }, 400);

  const rate = checkRateLimit({
    identifier: `roster:${sourceId}:${requestIdentifier(request)}`,
    limit: environment.ROSTER_API_RATE_LIMIT,
    windowSeconds: environment.ROSTER_API_RATE_WINDOW_SECONDS
  });
  const rateHeaders = {
    "RateLimit-Limit": String(rate.limit),
    "RateLimit-Remaining": String(rate.remaining),
    "RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000))
  };
  if (!rate.allowed) {
    return json({ error: "Too many roster requests. Try again shortly." }, 429, {
      ...rateHeaders,
      "Retry-After": String(environment.ROSTER_API_RATE_WINDOW_SECONDS)
    });
  }

  try {
    return json(
      await getLiveRosterPage({ sourceId, cursor: query.data.cursor, limit: query.data.limit }),
      200,
      rateHeaders
    );
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return json({ error: "Invalid or expired roster cursor." }, 400, rateHeaders);
    }
    return json({ error: "Roster continuation is temporarily unavailable." }, 503, rateHeaders);
  }
}
