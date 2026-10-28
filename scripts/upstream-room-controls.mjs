import { parse } from "@babel/parser";
import generatePackage from "@babel/generator";
import traversePackage from "@babel/traverse";
const generate = generatePackage.default,
  traverse = traversePackage.default;
export function unifyRoomControls(modules) {
  for (const [id, code] of modules) {
    if (!code.includes("OwnerExitGame")) continue;
    const ast = parse(`(${code})`);
    let changed = false;
    traverse(ast, {
      MemberExpression(path) {
        if (
          path.node.property.type !== "Identifier" ||
          path.node.property.name !== "OwnerExitGame"
        )
          return;
        const button = path.findParent(
          (parent) =>
            parent.isCallExpression() &&
            parent.node.arguments.some(
              (arg) =>
                arg.type === "ObjectExpression" &&
                arg.properties.some(
                  (prop) =>
                    prop.type === "ObjectProperty" &&
                    prop.key.type === "Identifier" &&
                    prop.key.name === "onClick",
                ),
            ),
        );
        if (button) {
          button.replaceWith(parse("null").program.body[0].expression);
          changed = true;
        }
      },
    });
    if (changed)
      modules.set(
        id,
        generate(ast.program.body[0].expression, { comments: false }).code,
      );
  }
}
