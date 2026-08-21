import { isIP } from "node:net";
import { z } from "zod";

export const SourceAllowlistSchema = z
  .array(
    z.object({
      hostname: z.string().trim().toLowerCase().min(1),
      includeSubdomains: z.boolean().default(false)
    })
  )
  .min(1);
export type SourceAllowlist = z.infer<typeof SourceAllowlistSchema>;

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  )
    return true;
  const [first = 0, second = 0, third = 0] = octets;
  return (
    first === 0 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function assertPublicResolvedAddress(address: string): void {
  const version = isIP(address);
  if (version === 0) throw new Error("Resolved source address is not an IP literal");
  if ((version === 4 && isPrivateIpv4(address)) || (version === 6 && isPrivateIpv6(address))) {
    throw new Error("Resolved source address is not public");
  }
}

export function assertAllowlistedSourceUrl(
  input: string,
  configuredAllowlist: SourceAllowlist
): URL {
  const allowlist = SourceAllowlistSchema.parse(configuredAllowlist);
  const url = new URL(input);
  if (url.protocol !== "https:") throw new Error("Source URLs must use HTTPS");
  if (url.username || url.password) throw new Error("Source URLs cannot contain credentials");
  if (url.port && url.port !== "443") throw new Error("Source URLs cannot use a custom port");
  if (url.hash) throw new Error("Source URLs cannot contain fragments");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".local") || isIP(hostname)) {
    throw new Error("Source hostname must be a public DNS name");
  }
  const allowed = allowlist.some(
    (entry) =>
      hostname === entry.hostname ||
      (entry.includeSubdomains && hostname.endsWith(`.${entry.hostname}`))
  );
  if (!allowed) throw new Error("Source hostname is not allowlisted");
  return url;
}
