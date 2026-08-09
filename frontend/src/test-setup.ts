class InMemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.has(key) ? this.entries.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new InMemoryStorage(),
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: new InMemoryStorage(),
  configurable: true,
  writable: true,
});
