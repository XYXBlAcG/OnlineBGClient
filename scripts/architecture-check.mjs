import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const root = process.cwd();
const portablePath = (value) => value.split(sep).join("/");
const sourceRoot = join(root, "src");
const rules = [
  { directory: "src/domain", forbidden: ["src/client", "src/server"] },
  { directory: "src/server", forbidden: ["src/client"] },
  { directory: "src/client", forbidden: ["src/server"] },
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return nested.flat();
}

function importsOf(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [];
  const record = (node, specifier) => {
    if (!specifier || !ts.isStringLiteralLike(specifier)) return;
    if (!specifier.text.startsWith(".")) return;
    imports.push({
      specifier: specifier.text,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
    });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      record(node, node.moduleSpecifier);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      record(node, node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return imports;
}

const files = (await filesUnder(sourceRoot)).filter((file) =>
  /\.(?:ts|tsx)$/.test(file),
);
const violations = [];

for (const rule of rules) {
  const directory = join(root, rule.directory);
  for (const file of files.filter((path) => path.startsWith(directory))) {
    const source = await readFile(file, "utf8");
    for (const imported of importsOf(source, file)) {
      const target = portablePath(
        relative(root, resolve(dirname(file), imported.specifier)),
      );
      for (const forbidden of rule.forbidden)
        if (target === forbidden || target.startsWith(`${forbidden}/`))
          violations.push({
            file: portablePath(relative(root, file)),
            line: imported.line,
            specifier: imported.specifier,
            forbidden,
          });
    }
  }
}

if (violations.length) {
  for (const violation of violations)
    console.error(
      `${violation.file}:${violation.line} 不应从 ${violation.forbidden} 导入 ${violation.specifier}`,
    );
  process.exit(1);
}
console.log("架构边界检查通过");
