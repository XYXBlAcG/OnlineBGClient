import type { NetworkInterfaceInfo } from "node:os";
export function lanAddresses(
  port: number,
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
) {
  return [
    ...new Set(
      Object.entries(interfaces)
        .filter(
          ([name]) =>
            !/^(lo\d*$|utun|tun\d|tap\d|docker|veth|br-|virbr)|vEthernet|virtualbox|vmware|tailscale|zerotier|clash|mihomo|sing-box/i.test(
              name,
            ),
        )
        .sort(
          ([a], [b]) =>
            Number(/^(en\d|eth\d|wlan|wi-?fi|ethernet|以太网|无线)/i.test(b)) -
            Number(/^(en\d|eth\d|wlan|wi-?fi|ethernet|以太网|无线)/i.test(a)),
        )
        .flatMap(([, values]) =>
          (values ?? [])
            .filter(
              (info) =>
                info.family === "IPv4" &&
                !info.internal &&
                !info.address.startsWith("169.254."),
            )
            .map((info) => `http://${info.address}:${port}`),
        ),
    ),
  ];
}
