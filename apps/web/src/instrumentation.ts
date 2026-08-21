import { readEnvironment } from "@/lib/env";

/**
 * Fail before a Next.js server instance becomes ready when production configuration is unsafe.
 * Next calls register once per server instance and waits for it to complete.
 */
export function register(): void {
  readEnvironment();
}
