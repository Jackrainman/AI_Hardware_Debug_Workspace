// apps/desktop/src/storage/local-storage-adapter.ts
// S3-PREP-STORAGE-ADAPTER-ABSTRACTION-A2A3A4：
// 先把浏览器 localStorage 访问集中到单一边界；后续 HTTP/server adapter 可沿此边界替换。

interface LocalStorageShape {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export interface LocalStorageAdapter {
  readonly kind: "browser-local-storage";
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  listKeys(prefix: string): string[];
}

function getLocalStorage(): LocalStorageShape {
  return window.localStorage;
}

export const localStorageAdapter: LocalStorageAdapter = {
  kind: "browser-local-storage",
  getItem(key: string): string | null {
    return getLocalStorage().getItem(key);
  },
  setItem(key: string, value: string): void {
    getLocalStorage().setItem(key, value);
  },
  listKeys(prefix: string): string[] {
    const storage = getLocalStorage();
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key !== null && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  },
};
