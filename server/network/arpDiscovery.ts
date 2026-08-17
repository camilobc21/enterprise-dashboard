import { execFile } from "node:child_process";
import { networkInterfaces } from "node:os";
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

function isValidIpv4(ipAddress: string) {
  const octets = ipAddress.split(".").map(Number);
  return octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255);
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

export function derivePrivate24Targets(localAddress: string) {
  if (!isValidIpv4(localAddress) || !isPrivateIpv4(localAddress)) {
    throw new Error("La detección activa solo admite una dirección IPv4 privada.");
  }

  const octets = localAddress.split(".").map(Number);
  const prefix = octets.slice(0, 3).join(".");
  const localHost = octets[3];
  const targets: string[] = [];

  for (let host = 1; host <= 254; host++) {
    if (host !== localHost) targets.push(`${prefix}.${host}`);
  }

  return targets;
}

function getConfiguredOrLocalPrivateAddress() {
  const configuredSubnet = process.env.LOCAL_NETWORK_SUBNET?.trim();
  if (configuredSubnet) {
    const match = configuredSubnet.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/24$/);
    if (!match) {
      throw new Error("LOCAL_NETWORK_SUBNET debe tener el formato 192.168.1.0/24.");
    }
    return match[1];
  }

  for (const interfaces of Object.values(networkInterfaces())) {
    for (const address of interfaces ?? []) {
      if (address.family === "IPv4" && !address.internal && isPrivateIpv4(address.address)) {
        return address.address;
      }
    }
  }

  throw new Error("No se encontró una interfaz IPv4 privada. Configura LOCAL_NETWORK_SUBNET.");
}

async function warmArpCache() {
  if (process.env.LOCAL_NETWORK_ACTIVE_DISCOVERY === "false") return;

  const targets = derivePrivate24Targets(getConfiguredOrLocalPrivateAddress());
  const configuredConcurrency = Number(process.env.LOCAL_NETWORK_DISCOVERY_CONCURRENCY ?? "24");
  const concurrency = Number.isInteger(configuredConcurrency)
    ? Math.min(Math.max(configuredConcurrency, 1), 32)
    : 24;
  const isWindows = process.platform === "win32";

  for (let index = 0; index < targets.length; index += concurrency) {
    await Promise.all(
      targets.slice(index, index + concurrency).map(async (ipAddress) => {
        try {
          await execFileAsync("ping", isWindows ? ["-n", "1", "-w", "300", ipAddress] : ["-c", "1", "-W", "1", ipAddress], {
            timeout: isWindows ? 800 : 1_500,
            windowsHide: true,
            maxBuffer: 1024,
          });
        } catch {
          // Incluso si ICMP está bloqueado, el intento puede haber resuelto una entrada ARP.
        }
      }),
    );
  }
}

export async function collectLocalArpDevices() {
  if (process.env.LOCAL_NETWORK_DISCOVERY !== "true") {
    throw new Error("La detección local está desactivada. Define LOCAL_NETWORK_DISCOVERY=true en tu archivo .env.");
  }

  await warmArpCache();

  const { stdout } = await execFileAsync("arp", ["-a"], {
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  return parseArpOutput(stdout);
}
