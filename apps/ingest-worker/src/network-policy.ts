import { lookup as defaultLookup } from "node:dns/promises";
import { isIP } from "node:net";

export type DnsLookup = (
  hostname: string
) => Promise<readonly { readonly address: string; readonly family: number }[]>;

export interface ValidatedSourceUrl {
  readonly url: URL;
  readonly resolvedAddresses: readonly string[];
}

export class SourceNetworkPolicyError extends Error {
  readonly code:
    | "INVALID_URL"
    | "HTTPS_REQUIRED"
    | "CREDENTIALS_FORBIDDEN"
    | "FRAGMENT_FORBIDDEN"
    | "PORT_FORBIDDEN"
    | "HOST_NOT_ALLOWLISTED"
    | "IP_LITERAL_FORBIDDEN"
    | "DNS_LOOKUP_FAILED"
    | "NON_PUBLIC_ADDRESS";

  constructor(code: SourceNetworkPolicyError["code"], message: string) {
    super(message);
    this.name = "SourceNetworkPolicyError";
    this.code = code;
  }
}

function parseIpv4(address: string): readonly number[] | undefined {
  const parts = address.split(".");
  if (parts.length !== 4) return undefined;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return undefined;
  return numbers;
}

function isNonPublicIpv4(address: string): boolean {
  const parts = parseIpv4(address);
  if (parts === undefined) return true;
  const [first = 0, second = 0, third = 0] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function ipv4ToHextets(address: string): readonly string[] | undefined {
  const parts = parseIpv4(address);
  if (parts === undefined) return undefined;
  const [a = 0, b = 0, c = 0, d = 0] = parts;
  return [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
}

function parseIpv6(address: string): bigint | undefined {
  let normalized = (address.toLowerCase().split("%")[0] ?? "").trim();
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    if (lastColon < 0) return undefined;
    const hextets = ipv4ToHextets(normalized.slice(lastColon + 1));
    if (hextets === undefined) return undefined;
    normalized = `${normalized.slice(0, lastColon)}:${hextets.join(":")}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return undefined;
  const left = (halves[0] ?? "").split(":").filter(Boolean);
  const right = (halves[1] ?? "").split(":").filter(Boolean);
  const omitted = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (omitted < 0 || (halves.length === 1 && left.length !== 8)) return undefined;
  const groups = [...left, ...Array.from({ length: omitted }, () => "0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return undefined;
  }

  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function ipv6PrefixMatches(value: bigint, prefix: bigint, bits: number): boolean {
  return value >> BigInt(128 - bits) === prefix >> BigInt(128 - bits);
}

function isNonPublicIpv6(address: string): boolean {
  const value = parseIpv6(address);
  if (value === undefined) return true;

  // IPv4-mapped IPv6 addresses inherit the safety classification of their IPv4 value.
  if (value >> 32n === 0xffffn) {
    const ipv4 = Number(value & 0xffff_ffffn);
    return isNonPublicIpv4(
      [ipv4 >>> 24, (ipv4 >>> 16) & 255, (ipv4 >>> 8) & 255, ipv4 & 255].join(".")
    );
  }

  // Fail closed outside global-unicast 2000::/3, then exclude globally scoped
  // documentation and transition ranges that can encode alternate destinations.
  const globalUnicast = value >> 125n === 1n;
  const documentation = ipv6PrefixMatches(value, 0x20010db8000000000000000000000000n, 32);
  const teredo = ipv6PrefixMatches(value, 0x20010000000000000000000000000000n, 32);
  const sixToFour = ipv6PrefixMatches(value, 0x20020000000000000000000000000000n, 16);
  const documentationV2 = ipv6PrefixMatches(value, 0x3fff0000000000000000000000000000n, 20);
  return !globalUnicast || documentation || teredo || sixToFour || documentationV2;
}

export function isPublicNetworkAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !isNonPublicIpv4(address);
  if (family === 6) return !isNonPublicIpv6(address);
  return false;
}

function normalizeAllowlist(allowlist: readonly string[]): ReadonlySet<string> {
  return new Set(allowlist.map((hostname) => hostname.toLowerCase().replace(/\.$/, "")));
}

export async function validateSourceUrl(
  input: string,
  allowlist: readonly string[],
  dnsLookup: DnsLookup = async (hostname) => defaultLookup(hostname, { all: true, verbatim: true })
): Promise<ValidatedSourceUrl> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SourceNetworkPolicyError("INVALID_URL", "Source URL is not a valid absolute URL");
  }

  if (url.protocol !== "https:") {
    throw new SourceNetworkPolicyError("HTTPS_REQUIRED", "Official source URLs must use HTTPS");
  }
  if (url.username !== "" || url.password !== "") {
    throw new SourceNetworkPolicyError(
      "CREDENTIALS_FORBIDDEN",
      "Credentials are forbidden in source URLs"
    );
  }
  if (url.hash !== "") {
    throw new SourceNetworkPolicyError(
      "FRAGMENT_FORBIDDEN",
      "Fragments are forbidden in source fetch URLs"
    );
  }
  if (url.port !== "" && url.port !== "443") {
    throw new SourceNetworkPolicyError(
      "PORT_FORBIDDEN",
      "Only the default HTTPS port is permitted"
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const ipCandidate =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  if (isIP(ipCandidate) !== 0) {
    throw new SourceNetworkPolicyError(
      "IP_LITERAL_FORBIDDEN",
      "IP-literal source URLs are forbidden"
    );
  }
  if (!normalizeAllowlist(allowlist).has(hostname)) {
    throw new SourceNetworkPolicyError(
      "HOST_NOT_ALLOWLISTED",
      "Source hostname is not in the approved exact-host allowlist"
    );
  }

  let answers: readonly { readonly address: string; readonly family: number }[];
  try {
    answers = await dnsLookup(hostname);
  } catch {
    throw new SourceNetworkPolicyError(
      "DNS_LOOKUP_FAILED",
      "Approved source hostname did not resolve"
    );
  }
  if (answers.length === 0) {
    throw new SourceNetworkPolicyError(
      "DNS_LOOKUP_FAILED",
      "Approved source hostname had no addresses"
    );
  }

  const addresses = [...new Set(answers.map(({ address }) => address))];
  if (addresses.some((address) => !isPublicNetworkAddress(address))) {
    throw new SourceNetworkPolicyError(
      "NON_PUBLIC_ADDRESS",
      "Approved source hostname resolved to a non-public address"
    );
  }

  return Object.freeze({ url, resolvedAddresses: Object.freeze(addresses) });
}

export class PhaseOneNetworkDisabledError extends Error {
  constructor() {
    super("External source requests are disabled during Phase 1 synthetic execution");
    this.name = "PhaseOneNetworkDisabledError";
  }
}

export type SourceFetch = (input: string, init?: RequestInit) => Promise<Response>;

export function createPhaseOneSourceFetch(): SourceFetch {
  // This is intentionally the only Phase 1 transport. A future live transport must
  // repeat validateSourceUrl inside its connection-time DNS lookup and validate every
  // redirect; a preflight lookup alone is not sufficient protection against rebinding.
  return () => Promise.reject(new PhaseOneNetworkDisabledError());
}
