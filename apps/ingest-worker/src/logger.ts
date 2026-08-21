import { z } from "zod";

export type LogLevel = "debug" | "info" | "warn" | "error";

const logEventPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

const LogEventSchema = z.string().min(1).max(96).regex(logEventPattern);

const secretKeyPattern =
  /authorization|cookie|credential|password|secret|token|api[-_]?key|database[-_]?url/i;
const personalKeyPattern =
  /^(?:name|firstName|lastName|fullName|dateOfBirth|dob|address|phone|email|bookingIdentifier|person|record)$/i;
const urlPattern = /https?:\/\/[^\s"']+/gi;

export type LogFields = Readonly<Record<string, unknown>>;

export interface StructuredLogger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

interface LoggerOptions {
  readonly minimumLevel: LogLevel;
  readonly service?: string;
  readonly now?: () => Date;
  readonly write?: (line: string) => void;
}

const levelOrder: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function redactUrls(value: string): string {
  return value.replace(urlPattern, (candidate) => {
    try {
      const url = new URL(candidate);
      url.username = "";
      url.password = "";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return "[REDACTED_URL]";
    }
  });
}

function sanitizeValue(value: unknown, key: string, seen: WeakSet<object>): unknown {
  if (secretKeyPattern.test(key)) return "[REDACTED_SECRET]";
  if (personalKeyPattern.test(key)) return "[REDACTED_PERSONAL_DATA]";
  if (typeof value === "string") return redactUrls(value).slice(0, 2_000);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: "[REDACTED_ERROR_DETAIL]"
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeValue(item, key, seen));
  }
  if (typeof value === "object" && value !== null) {
    if (seen.has(value)) return "[REDACTED_CIRCULAR]";
    seen.add(value);
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value).slice(0, 100)) {
      output[childKey] = sanitizeValue(childValue, childKey, seen);
    }
    return output;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return "[UNDEFINED]";
  if (typeof value === "symbol") return "[SYMBOL]";
  if (typeof value === "function") return "[FUNCTION]";
  return "[UNSERIALIZABLE]";
}

function sanitizeFields(fields: LogFields): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  const seen = new WeakSet<object>();
  for (const [key, value] of Object.entries(fields).slice(0, 100)) {
    output[key] = sanitizeValue(value, key, seen);
  }
  return output;
}

export function createStructuredLogger(options: LoggerOptions): StructuredLogger {
  const service = options.service ?? "ingest-worker";
  const now = options.now ?? (() => new Date());
  const write = options.write ?? ((line: string) => process.stdout.write(line));

  const log = (level: LogLevel, event: string, fields: LogFields = {}): void => {
    if (levelOrder[level] < levelOrder[options.minimumLevel]) return;
    const validatedEvent = LogEventSchema.parse(event);
    const payload = {
      ...sanitizeFields(fields),
      timestamp: now().toISOString(),
      level,
      service,
      event: validatedEvent
    };
    write(`${JSON.stringify(payload)}\n`);
  };

  return Object.freeze({
    debug: (event: string, fields?: LogFields) => log("debug", event, fields),
    info: (event: string, fields?: LogFields) => log("info", event, fields),
    warn: (event: string, fields?: LogFields) => log("warn", event, fields),
    error: (event: string, fields?: LogFields) => log("error", event, fields)
  });
}
