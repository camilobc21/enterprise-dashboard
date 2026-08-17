import { networkInterfaces } from "node:os";

export function getLanUrls(
  port: number,
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): string[] {
  const urls = new Set<string>();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.add(`http://${entry.address}:${port}`);
      }
    }
  }

  return Array.from(urls);
}
