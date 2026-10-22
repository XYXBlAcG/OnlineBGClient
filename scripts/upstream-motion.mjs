import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
const traverse = traverseModule.default,
  generate = generateModule.default;
export function attachMotion(modules) {
  let pieces = 0,
    svg = 0,
    queries = 0,
    cards = 0,
    zones = 0,
    sprites = 0,
    sgsHooks = 0,
    svgHooks = 0;
  for (const [id, source] of modules) {
    if (![1817, 7448, 2078, 7707, 6544, 3405, 6749].includes(id)) continue;
    const ast = parse(`(${source})`),
      requireName = ast.program.body[0].expression.params[2].name;
    traverse(ast, {
      CallExpression(path) {
        if (
          [7448, 2078].includes(id) &&
          path.node.callee.type === "SequenceExpression" &&
          path.node.callee.expressions.at(-1)?.property?.name === "useEffect" &&
          generate(path.node.arguments[0]).code.includes("getElementsByTagName")
        ) {
          path.node.callee.expressions.at(-1).property.name = "useLayoutEffect";
          svgHooks++;
        }

        if (
          id === 6749 &&
          path.node.callee.type === "SequenceExpression" &&
          path.node.callee.expressions.at(-1)?.property?.name ===
            "useLayoutEffect" &&
          ["D", "T"].includes(path.getFunctionParent()?.node.id?.name)
        ) {
          path.node.arguments[0].body.body.unshift(
            parse(
              "function guard(){if(companionMotionBridge.skipLegacyMotion)return;}",
            ).program.body[0].body.body[0],
          );
          sgsHooks++;
        }
        const call = path.node;
        if (
          call.callee.type === "MemberExpression" &&
          call.callee.object.name === "document" &&
          call.callee.property.name === "getElementsByTagName" &&
          ["animate", "animateTransform"].includes(call.arguments[0]?.value)
        ) {
          path.replaceWith(
            parse(
              `companionMotionBridge.svgAnimations(${JSON.stringify(call.arguments[0].value)})`,
            ).program.body[0].expression,
          );
          queries++;
          path.skip();
          return;
        }
        if (
          call.callee.type === "MemberExpression" &&
          call.callee.property.name === "beginElement"
        ) {
          path.replaceWith(
            parse(
              `companionMotionBridge.animateSvg(${generate(call.callee.object).code})`,
            ).program.body[0].expression,
          );
          svg++;
          path.skip();
          return;
        }
        if (call.arguments[1]?.type !== "ObjectExpression") return;
        const props = call.arguments[1].properties;
        const p = Object.fromEntries(
          props
            .filter((p) => p.type === "ObjectProperty")
            .map((p) => [p.key.name || p.key.value, p.value]),
        );
        const cls = p.className ? generate(p.className).code : "";
        const add = (attributes) =>
          props.push(
            ...parse(
              `({${Object.entries(attributes)
                .map(([k, v]) => `${JSON.stringify(k)}:${v}`)
                .join(",")}})`,
            ).program.body[0].expression.properties,
          );
        if (
          id === 6544 &&
          call.arguments[0]?.name === "h" &&
          p.ids?.name === "t" &&
          path.getFunctionParent()?.node.id?.name === "x"
        ) {
          add({ "data-motion-zone": JSON.stringify("ddz.public") });
          zones++;
        }
        if (
          id === 6544 &&
          call.arguments[0]?.value === "div" &&
          cls.startsWith('"ddz-poker-list"') &&
          path.getFunctionParent()?.node.id?.name === "d"
        ) {
          add({ "data-motion-zone": 'e["data-motion-zone"]' });
          zones++;
        }
        if (id === 7707 && p.className?.value === "ml-2 mr-4") {
          add({ "data-motion-zone": JSON.stringify("uno.deck") });
          zones++;
        }
        if (
          id === 7707 &&
          p.className?.value === "mr-2" &&
          p.id?.name === "p"
        ) {
          add({ "data-motion-zone": JSON.stringify("uno.discard") });
          zones++;
        }
        if (
          id === 7707 &&
          p.className?.name === "n" &&
          p.style &&
          generate(p.style).code.includes("e ? 34 : 26")
        ) {
          add({ "data-motion-zone": 'r["data-motion-zone"]' });
          zones++;
        }
        if (id === 2078 && call.arguments[0]?.value === "use" && p.xlinkHref) {
          const href = generate(p.xlinkHref).code;
          if (href.startsWith('"#road"')) {
            add({ "data-motion-key": '"ktd-road-"+r+"-"+e' });
            sprites++;
          }
          if (href.includes('"city" : "vill"')) {
            add({ "data-motion-key": '"ktd-house-"+r+"-"+(e>>1)' });
            sprites++;
          }
        }
        if (
          id === 7448 &&
          call.arguments[0]?.value === "use" &&
          p.xlinkHref &&
          generate(p.xlinkHref).code.startsWith('"#p-"') &&
          ["m", "F"].includes(call.arguments[2]?.name)
        ) {
          add({ "data-motion-key": '"fxq-plane-"+' + call.arguments[2].name });
          sprites++;
          if (call.arguments[2].name === "F")
            add({ "data-motion-route": '$.join(";")' });
        }
        if (
          id === 6749 &&
          p.className?.value === "absolute z-50" &&
          p.ref?.name === "i"
        ) {
          add({ "data-motion-zone": JSON.stringify("sgs.public-card") });
          zones++;
        }

        if (
          ["animate", "animateTransform"].includes(call.arguments[0]?.value) &&
          p.dur
        )
          props.push(
            ...parse(`({"data-game-duration":${generate(p.dur).code}})`).program
              .body[0].expression.properties,
          );
        if (
          id === 7707 &&
          p.className?.value === "flex justify-evenly items-center pt-2"
        )
          props.push(
            ...parse('({"data-guide-target":"uno.status"})').program.body[0]
              .expression.properties,
          );
        let key;
        if (
          id === 1817 &&
          call.arguments[0]?.value === "circle" &&
          p.r?.value === "45"
        ) {
          key = '"tq-piece-"+n+"-"+r';
          pieces++;
        }
        if (id === 7707 && cls.startsWith('"uno absolute'))
          key = 't===undefined?undefined:"uno-card-"+t';
        if (id === 6544 && cls.startsWith('"ddz-poker ddz-poker-'))
          key = 't?"ddz-card-"+t:undefined';
        if (id === 3405 && cls.startsWith('"dy-card dy-card-'))
          key = '"dy-card-"+e';
        if (key) {
          props.push(
            ...parse(`({"data-motion-key":${key}})`).program.body[0].expression
              .properties,
          );
          cards++;
        }
      },
    });
    if ([7448, 2078, 6749].includes(id))
      ast.program.body[0].expression.body.body.unshift(
        parse(`var companionMotionBridge=${requireName}.bridge;`).program
          .body[0],
      );
    modules.set(
      id,
      generate(ast.program.body[0].expression, { comments: false }).code,
    );
  }
  if (
    pieces !== 1 ||
    svg !== 4 ||
    queries !== 4 ||
    cards !== 4 ||
    zones !== 6 ||
    sprites !== 5 ||
    sgsHooks !== 2 ||
    svgHooks !== 2
  )
    throw new Error(
      `Motion boundary changed: ${pieces}/${svg}/${queries}/${cards}/${zones}/${sprites}/${sgsHooks}/${svgHooks}`,
    );
}
