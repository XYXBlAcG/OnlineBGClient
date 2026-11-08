import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { zipSync, strToU8 } from "fflate";

const version = "0.4.1";
const files = [
  "SFNS.woff2",
  "PingFangSC-Regular.woff2",
  "PingFangSC-Semibold.woff2",
];
const entries = Object.fromEntries(
  files.map((name) => [name, readFileSync(`fonts/${name}`)]),
);
entries["pack.json"] = strToU8(JSON.stringify({ version, files }));
const output = `artifacts/fonts/OnlineBGClient-fonts-${version}.zip`;
mkdirSync("artifacts/fonts", { recursive: true });
writeFileSync(output, zipSync(entries, { level: 9 }));
console.log(`${output} ${statSync(output).size} bytes`);
