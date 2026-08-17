import { describe, expect, it } from "vitest";
import { getLanUrls } from "./lan";

describe("LAN server URLs", () => {
  it("returns external IPv4 addresses and excludes loopback interfaces", () => {
    const urls = getLanUrls(3000, {
      "Wi-Fi": [
        { address: "192.168.1.42", family: "IPv4", internal: false, mac: "00:00:00:00:00:00", netmask: "255.255.255.0", cidr: "192.168.1.42/24" },
      ],
      Loopback: [
        { address: "127.0.0.1", family: "IPv4", internal: true, mac: "00:00:00:00:00:00", netmask: "255.0.0.0", cidr: "127.0.0.1/8" },
      ],
    });

    expect(urls).toEqual(["http://192.168.1.42:3000"]);
  });
});
