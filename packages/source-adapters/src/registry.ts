import type { SourceAdapter } from "./contracts.js";

export type AnySourceAdapter = SourceAdapter<unknown, unknown, unknown>;

export class SourceAdapterRegistry {
  readonly #adapters = new Map<string, AnySourceAdapter>();

  register<TFetched, TValidated, TParsed>(
    adapter: SourceAdapter<TFetched, TValidated, TParsed>
  ): void {
    if (this.#adapters.has(adapter.key)) {
      throw new Error(`Source adapter already registered: ${adapter.key}`);
    }
    this.#adapters.set(adapter.key, adapter);
  }

  get(key: string): AnySourceAdapter {
    const adapter = this.#adapters.get(key);
    if (!adapter) throw new Error(`No source adapter registered for key: ${key}`);
    return adapter;
  }

  has(key: string): boolean {
    return this.#adapters.has(key);
  }

  keys(): readonly string[] {
    return [...this.#adapters.keys()].sort();
  }
}

export function createSourceAdapterRegistry(
  adapters: readonly AnySourceAdapter[] = []
): SourceAdapterRegistry {
  const registry = new SourceAdapterRegistry();
  for (const adapter of adapters) registry.register(adapter);
  return registry;
}

export const sourceAdapterRegistry = createSourceAdapterRegistry();
