import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";

const staging = ".tmp/ios-icons";
const generated = `${staging}/ios`;

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
execFileSync(
  "npx",
  [
    "tauri",
    "icon",
    "public/icon.svg",
    "--output",
    staging,
    "--ios-color",
    "#2875e8",
  ],
  { stdio: "inherit" },
);
await cp(generated, "src-tauri/icons/ios", { recursive: true });
await cp(generated, "src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset", {
  recursive: true,
});
console.log("iOS icons updated");
