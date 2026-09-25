import { createSourceAdapterRegistry, type SourceAdapterRegistry } from "./registry.js";
import {
  createDallasCountySourceAdapter,
  type DallasCountyAdapterOptions
} from "./dallas-county.js";
import {
  createIowaCurrentRosterAdapter,
  type IowaRosterAdapterOptions
} from "./iowa-current-roster.js";

export interface IowaLaunchRegistryOptions {
  readonly dallas?: DallasCountyAdapterOptions;
  readonly cedar?: IowaRosterAdapterOptions;
  readonly blackHawk?: IowaRosterAdapterOptions;
}

/**
 * Builds only the explicitly configured, audited Iowa adapters. Polk, Linn,
 * Johnson, and Story intentionally have no factory here until their sources
 * pass unattended verification.
 */
export function createIowaLaunchRegistry(
  options: IowaLaunchRegistryOptions
): SourceAdapterRegistry {
  const adapters = [];
  if (options.dallas) adapters.push(createDallasCountySourceAdapter(options.dallas));
  if (options.cedar) {
    adapters.push(createIowaCurrentRosterAdapter({ ...options.cedar, source: "cedar" }));
  }
  if (options.blackHawk) {
    adapters.push(createIowaCurrentRosterAdapter({ ...options.blackHawk, source: "black_hawk" }));
  }
  return createSourceAdapterRegistry(adapters);
}
