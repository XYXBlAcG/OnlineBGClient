import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const defaultBaselinePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "ui-audit.baseline.json",
);

const normalizeEntry = (entry) => {
  const id = entry.id ?? entry.fingerprint;
  if (!id) throw new Error("基线文件缺少指纹字段（id/fingerprint）");
  return {
    id,
    game: entry.game,
    viewport: entry.viewport,
    severity: entry.severity,
    category: entry.category,
    element: entry.element ?? (entry.selectors ?? []).join(" / "),
  };
};

export const baselineEntry = (finding) => ({
  id: finding.fingerprint,
  game: finding.game,
  viewport: finding.viewport,
  severity: finding.severity,
  category: finding.category,
  element: finding.selectors.join(" / "),
});

export async function writeBaseline(findings, generatedAt) {
  const entries = findings
    .map(baselineEntry)
    .sort((left, right) => left.id.localeCompare(right.id));
  await writeFile(
    defaultBaselinePath,
    `${JSON.stringify({ version: 1, generatedAt, findings: entries }, null, 2)}\n`,
  );
  return defaultBaselinePath;
}

export async function readBaselineFindings(path) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`无法读取基线文件：${path}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`基线文件不是合法 JSON：${path}`);
  }
  const findings = Array.isArray(parsed) ? parsed : parsed?.findings;
  if (!Array.isArray(findings))
    throw new Error(`基线文件缺少 findings 数组：${path}`);
  return findings.map(normalizeEntry);
}
