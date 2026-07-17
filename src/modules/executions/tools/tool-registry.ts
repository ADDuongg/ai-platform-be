import type { ToolAdapter } from './tool-adapter';

/**
 * Registry keyed by Tool catalog code.
 */
export class ToolAdapterRegistry {
  private readonly byCode = new Map<string, ToolAdapter>();

  constructor(adapters: ToolAdapter[]) {
    for (const adapter of adapters) {
      this.byCode.set(adapter.code, adapter);
    }
  }

  get(code: string): ToolAdapter | undefined {
    return this.byCode.get(code.trim().toLowerCase());
  }
}
