import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEVICE_ID_STORAGE_KEY,
  getOrCreateDeviceId,
} from "./device-id";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("getOrCreateDeviceId", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "generated-device-id"),
    });
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an existing device id from localStorage", () => {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, "existing-device-id");

    expect(getOrCreateDeviceId()).toBe("existing-device-id");
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });

  it("creates and persists a new device id when missing", () => {
    expect(getOrCreateDeviceId()).toBe("generated-device-id");
    expect(window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)).toBe(
      "generated-device-id",
    );
    expect(crypto.randomUUID).toHaveBeenCalledOnce();
  });

  it("returns the same id on subsequent calls", () => {
    const first = getOrCreateDeviceId();
    const second = getOrCreateDeviceId();

    expect(first).toBe(second);
    expect(crypto.randomUUID).toHaveBeenCalledOnce();
  });
});