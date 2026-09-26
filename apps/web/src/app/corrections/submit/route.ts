import { createDatabase, correctionRequests, parseDatabaseEnvironment } from "@jail-atlas/database";
import { PublicCorrectionSubmissionSchema } from "@jail-atlas/domain";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  correctionSubmitterFingerprint,
  verifyCorrectionFormToken
} from "@/lib/correction-security";
import { readEnvironment } from "@/lib/env";
import { checkRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { countyCoverageCatalog, countyCoveragePath } from "@/lib/coverage-catalog";

const acceptedSourcePagePaths = new Set([
  "/",
  ...countyCoverageCatalog.map((entry) => countyCoveragePath(entry))
]);

const formSchema = z.object({
  category: z.enum([
    "stale_data",
    "incorrect_roster_display",
    "incorrect_contact",
    "incorrect_guidance",
    "privacy",
    "other"
  ]),
  contactEmail: z.union([z.literal(""), z.string().email().max(320)]),
  description: z.string().trim().min(20).max(5_000),
  formStartedAt: z.string().datetime(),
  sourcePagePath: z.string().refine((path) => acceptedSourcePagePaths.has(path)),
  submissionToken: z.string().min(32).max(500),
  website: z.string().max(0)
});

type ResponseStatus = "invalid" | "preview" | "received" | "unavailable";

function redirect(request: Request, status: ResponseStatus): NextResponse {
  const target = new URL("/corrections/", request.url);
  target.searchParams.set("status", status);
  const response = NextResponse.redirect(target, 303);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function POST(request: Request) {
  const environment = readEnvironment();
  const identifier = requestIdentifier(request);
  const rate = checkRateLimit({
    identifier: `correction:${identifier}`,
    limit: 5,
    windowSeconds: 3600
  });
  if (!rate.allowed) return redirect(request, "invalid");

  let rawForm: Record<string, FormDataEntryValue>;
  try {
    rawForm = Object.fromEntries((await request.formData()).entries());
  } catch {
    return redirect(request, "invalid");
  }

  const parsed = formSchema.safeParse(rawForm);
  if (!parsed.success) return redirect(request, "invalid");
  if (
    !verifyCorrectionFormToken({
      startedAt: parsed.data.formStartedAt,
      token: parsed.data.submissionToken
    })
  ) {
    return redirect(request, "invalid");
  }

  const publicSubmission = PublicCorrectionSubmissionSchema.safeParse({
    ...parsed.data,
    contactEmail: parsed.data.contactEmail || null
  });
  if (!publicSubmission.success) return redirect(request, "invalid");

  if (environment.DATA_MODE === "synthetic") {
    return redirect(request, "preview");
  }

  const database = createDatabase(parseDatabaseEnvironment(process.env));
  try {
    await database.db.insert(correctionRequests).values({
      category: parsed.data.category,
      contactEmail: parsed.data.contactEmail || null,
      countyId: null,
      description: parsed.data.description,
      sourcePagePath: parsed.data.sourcePagePath,
      spamRisk: "0.000",
      status: "received",
      submittedAt: new Date(),
      submitterFingerprint: correctionSubmitterFingerprint(identifier)
    });
    return redirect(request, "received");
  } catch {
    return redirect(request, "unavailable");
  } finally {
    await database.close();
  }
}
