import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
for (const path of [
  "src/client/city",
  "src/domain/city",
  "src/server/city-worker.ts",
  "src-tauri/src/city.rs",
  "public/art/city",
  "src-tauri/resources/hosting/city-worker.mjs",
])
  assert.equal(existsSync(path), false, `Unexpected city content: ${path}`);
for (const root of ["dist", "src-tauri/resources/hosting/web"]) {
  assert.ok(existsSync(`${root}/index.html`));
  for (const name of readdirSync(`${root}/assets`)) {
    assert.ok(!name.includes("CityWorkspace"));
    if (name.endsWith(".js"))
      assert.ok(
        !readFileSync(`${root}/assets/${name}`, "utf8").includes("共建城市"),
      );
  }
  assert.equal(existsSync(`${root}/art/city`), false);
}
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const name of ["recharts", "simplex-noise"])
  assert.equal(pkg.dependencies[name], undefined);
console.log(
  `Release ${pkg.version}: city content excluded from source and build resources`,
);
