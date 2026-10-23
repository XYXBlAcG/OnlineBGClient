import { parse } from "@babel/parser";
import generatePackage from "@babel/generator";
import traversePackage from "@babel/traverse";
const generate = generatePackage.default,
  traverse = traversePackage.default;
export function attachTableRegions(modules) {
  const regions = {
    7707: {
      "flex justify-center items-center": "piles",
      "flex justify-evenly items-center pt-2": "status",
      "flex-grow flex justify-around mt-2 relative": "players",
    },
    6749: {
      "flex-grow flex flex-col sgs-public-panel": "public",
      "mx-auto px-2 w-full flex sgs-hand-panel": "hand",
    },
    3405: { "mt-auto": "hand", "poison-pots": "public" },
    2078: {
      "text-center catan-actions": "actions",
      "mt-2 text-center catan-hand-panel pt-1 text-sm": "hand",
    },
    2262: {
      "table-public": "public",
      "table-actions": "actions",
      "table-collection": "collection",
    },
  };
  for (const [key, classes] of Object.entries(regions)) {
    const id = Number(key),
      ast = parse(`(${modules.get(id)})`);
    const found = new Set();
    traverse(ast, {
      ObjectExpression(path) {
        const cls = path.node.properties.find(
          (prop) =>
            prop.key?.name === "className" &&
            prop.value.type === "StringLiteral",
        )?.value.value;
        const region = classes[cls];
        if (!region) return;
        path.node.properties.push(
          ...parse(`({"data-table-region":${JSON.stringify(region)}})`).program
            .body[0].expression.properties,
        );
        found.add(cls);
      },
    });
    for (const cls of Object.keys(classes))
      if (!found.has(cls))
        throw new Error(`Table region boundary changed: ${id} ${cls}`);
    if (id === 7707) {
      let hands = 0;
      traverse(ast, {
        VariableDeclarator(path) {
          if (
            path.node.id.name !== "N" ||
            path.node.init?.type !== "FunctionExpression"
          )
            return;
          const body = path.node.init.body.body.find(
            (node) => node.type === "ReturnStatement",
          );
          const props = body?.argument?.arguments?.[1];
          if (
            props?.type !== "ObjectExpression" ||
            !generate(props).code.includes("setSelected: N")
          )
            return;
          props.properties.push(
            ...parse('({"data-table-region":"hand"})').program.body[0]
              .expression.properties,
          );
          hands++;
        },
        ObjectProperty(path) {
          if (
            path.node.key.name === "minHeight" &&
            path.node.value.value === 48
          )
            path.node.value = parse(
              '("var(--uno-action-height,48px)")',
            ).program.body[0].expression;
        },
      });
      if (hands !== 1) throw new Error("UNO hand region changed");
    }
    modules.set(
      id,
      generate(ast.program.body[0].expression, { comments: false }).code,
    );
  }
  const ddz = parse(`(${modules.get(6544)})`);
  let hands = 0;
  traverse(ddz, {
    ObjectProperty(path) {
      if (
        path.node.key.name === "className" &&
        path.node.value.value === "mt-4"
      ) {
        path.node.value.value += " table-hand-region";
        hands++;
      }
    },
  });
  if (hands !== 4) throw new Error("Dou dizhu hand regions changed");
  modules.set(
    6544,
    generate(ddz.program.body[0].expression, { comments: false }).code,
  );
}
