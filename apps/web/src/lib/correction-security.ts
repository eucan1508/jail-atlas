import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readEnvironment } from "./env";

const minimumCompletionMilliseconds = 1_500;
const maximumTokenAgeMilliseconds = 2 * 60 * 60 * 1000;

function signature(value: string): string {
  return createHmac("sha256", readEnvironment().CORRECTION_FORM_HMAC_SECRET)
    .update(value)
    .digest("base64url");
}

export function createCorrectionFormToken(now = Date.now()): { startedAt: string; token: string } {
  const startedAt = new Date(now).toISOString();
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${startedAt}.${nonce}`;
  return { startedAt, token: `${payload}.${signature(payload)}` };
}

export function verifyCorrectionFormToken({
  now = Date.now(),
  startedAt,
  token
}: {
  now?: number;
  startedAt: string;
  token: string;
}): boolean {
  const segments = token.split(".");
  // Read the base64url fields from the end: ISO timestamps contain a decimal point.
  const suppliedSignature = segments.pop();
  const nonce = segments.pop();
  const tokenStartedAt = segments.join(".");
  if (!tokenStartedAt || !nonce || !suppliedSignature || tokenStartedAt !== startedAt) return false;

  const startedAtMilliseconds = Date.parse(startedAt);
  const elapsed = now - startedAtMilliseconds;
  if (
    !Number.isFinite(startedAtMilliseconds) ||
    elapsed < minimumCompletionMilliseconds ||
    elapsed > maximumTokenAgeMilliseconds
  ) {
    return false;
  }

  const expectedSignature = signature(`${tokenStartedAt}.${nonce}`);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function correctionSubmitterFingerprint(identifier: string): string {
  return createHmac("sha256", readEnvironment().CORRECTION_FORM_HMAC_SECRET)
    .update(`correction:${identifier}`)
    .digest("base64url");
}
