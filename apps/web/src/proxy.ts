import { NextResponse, type NextRequest } from "next/server";
import { shouldNoIndex } from "@/lib/env";

const cleanCountyPath = "/iowa/scott-county/custody/";

export function proxy(request: NextRequest) {
  const url = request.nextUrl;

  if (url.pathname === cleanCountyPath && url.searchParams.size > 0) {
    const cleanUrl = new URL(cleanCountyPath, request.url);
    const response = NextResponse.redirect(cleanUrl, 308);
    applyEnvironmentRobotsHeader(response);
    return response;
  }

  const response = NextResponse.next();
  applyEnvironmentRobotsHeader(response);
  return response;
}

function applyEnvironmentRobotsHeader(response: NextResponse): void {
  if (shouldNoIndex()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, nosnippet");
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
