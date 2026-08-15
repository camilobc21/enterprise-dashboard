import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { storagePut } from "./storage";
import { isLocalStorageEnabled, resolveLocalStoragePath } from "./storageLocal";

const originalDirectory = process.env.LOCAL_STORAGE_DIR;

afterEach(() => {
  if (originalDirectory === undefined) delete process.env.LOCAL_STORAGE_DIR;
  else process.env.LOCAL_STORAGE_DIR = originalDirectory;
});

describe("local storage paths", () => {
  it("uses the configured directory for local document files", () => {
    process.env.LOCAL_STORAGE_DIR = "/tmp/enterprise-dashboard-storage";

    expect(isLocalStorageEnabled()).toBe(true);
    expect(resolveLocalStoragePath("10-documents/report.pdf")).toBe(
      path.resolve("/tmp/enterprise-dashboard-storage/10-documents/report.pdf")
    );
  });

  it("rejects keys that try to escape the local storage directory", () => {
    process.env.LOCAL_STORAGE_DIR = "/tmp/enterprise-dashboard-storage";

    expect(() => resolveLocalStoragePath("../sensitive-file")).toThrow("Invalid local storage key");
  });

  it("writes an uploaded document to the configured local directory", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "enterprise-dashboard-storage-"));
    process.env.LOCAL_STORAGE_DIR = directory;

    const uploaded = await storagePut("10-documents/report.txt", "contenido local", "text/plain");
    const storedPath = resolveLocalStoragePath(uploaded.key);

    expect(uploaded.url).toBe(`/manus-storage/${uploaded.key}`);
    await expect(fs.readFile(storedPath!, "utf8")).resolves.toBe("contenido local");
    await fs.rm(directory, { recursive: true, force: true });
  });
});
