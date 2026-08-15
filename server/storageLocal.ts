import path from "node:path";

function configuredLocalStorageDirectory(): string | null {
  const directory = process.env.LOCAL_STORAGE_DIR?.trim();
  return directory ? path.resolve(directory) : null;
}

export function isLocalStorageEnabled(): boolean {
  return configuredLocalStorageDirectory() !== null;
}

export function resolveLocalStoragePath(key: string): string | null {
  const directory = configuredLocalStorageDirectory();
  if (!directory) return null;

  const normalizedKey = key.replace(/^[/\\]+/, "");
  const filePath = path.resolve(directory, normalizedKey);

  if (!filePath.startsWith(`${directory}${path.sep}`)) {
    throw new Error("Invalid local storage key");
  }

  return filePath;
}
