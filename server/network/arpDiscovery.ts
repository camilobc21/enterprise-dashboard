import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ArpDevice = {
  ipAddress: string;
  macAddress: string;
};

function isPrivateIpv4(ipAddress: string) {
  const [first, second] = ipAddress.split(".").map(Number);
  return first === 10 || first === 192 && second === 168 || first === 172 && second >= 16 && second <= 31;
}

function normalizeMac(value: string) {
  return value.replace(/-/g, ":").toUpperCase();
}

export function parseArpOutput(output: string): ArpDevice[] {
  const devices = new Map<string, ArpDevice>();
  const windowsPattern = /^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+(([0-9a-f]{2}[-:]){5}[0-9a-f]{2})\s+/i;
  const unixPattern = /\((\d{1,3}(?:\.\d{1,3}){3})\)\s+at\s+(([0-9a-f]{2}[:-]){5}[0-9a-f]{2})/i;

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(windowsPattern) ?? line.match(unixPattern);
    if (!match) continue;

    const ipAddress = match[1];
    if (!isPrivateIpv4(ipAddress)) continue;
    const macAddress = normalizeMac(match[2]);
    devices.set(macAddress, { ipAddress, macAddress });
  }

  return Array.from(devices.values());
}

export async function collectLocalArpDevices() {
  if (process.env.LOCAL_NETWORK_DISCOVERY !== "true") {
    throw new Error("La detección local está desactivada. Define LOCAL_NETWORK_DISCOVERY=true en tu archivo .env.");
  }

  const isWindows = process.platform === "win32";
  const { stdout } = await execFileAsync(isWindows ? "arp" : "arp", isWindows ? ["-a"] : ["-a"], {
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  return parseArpOutput(stdout);
}
