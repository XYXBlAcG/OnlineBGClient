import { expect, it } from "vitest";
import type { NetworkInterfaceInfo } from "node:os";
import { lanAddresses } from "../src/server/lan-addresses";
it("局域网邀请采用真实网卡与实际端口，排除回环和常见虚拟网卡", () => {
  const iface = (address: string, internal = false) =>
    ({ address, family: "IPv4", internal }) as NetworkInterfaceInfo;
  expect(
    lanAddresses(42001, {
      lo0: [iface("127.0.0.1", true)],
      en0: [iface("192.168.1.9")],
      utun4: [iface("10.0.0.2")],
      tun0: [iface("10.0.0.3")],
      "vEthernet (WSL)": [iface("172.22.1.1")],
    }),
  ).toEqual(["http://192.168.1.9:42001"]);
});
