import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
const traverse = traverseModule.default;
const generate = generateModule.default;
export function attachGuideTargets(modules) {
  const hits = new Map();
  const add = (props, key, attributes = {}) => {
    if (props.some(p => p.key?.value === "data-guide-target")) return;
    props.push(...parse(`(${JSON.stringify({"data-guide-target": key})})`).program.body[0].expression.properties);
    for (const [name, value] of Object.entries(attributes)) props.push(...parse(`({${JSON.stringify(name)}:${value}})`).program.body[0].expression.properties);
    hits.set(key, (hits.get(key) || 0) + 1);
  };
  const buttons = {2078: {"🎲掷骰子": "ktd.roll", "💰交易": "ktd.trade", "⏩结束": "ktd.end"}, 2262: {"💎取宝石": "ccbs.take", "💰购买发展卡": "ccbs.buy", "确认拿这些": "ccbs.confirm"}};
  for (const id of [1817,2078,2262,3405,4595,6749]) {
    const ast = parse(`(${modules.get(id)})`);
    traverse(ast, {CallExpression(path) {
      const call = path.node;
      if (call.arguments[1]?.type !== "ObjectExpression") return;
      const properties = call.arguments[1].properties;
      const p = Object.fromEntries(properties.filter(p => p.type === "ObjectProperty").map(p => [p.key.name || p.key.value, p.value]));
      const tag = call.arguments[0]?.value;
      const cls = p.className ? generate(p.className).code : "";
      if (id === 6749 && p.className?.value === "mx-auto px-2 w-full flex sgs-hand-panel") add(properties,"sgs.hand",{"data-room-region":JSON.stringify("sgs.hand")});
      if (id === 2078 && p.className?.value === "mt-2 text-center catan-hand-panel pt-1 text-sm") add(properties,"ktd.hand");
      if (id === 3405 && p.className?.value === "mt-auto") add(properties,"dy.hand",{"data-room-region":JSON.stringify("dy.hand")});
      if (id === 4595 && tag === "button" && p.onClick?.name === "v") for (const key of ["data-guide-target", "data-guide-id", "data-guide-player"]) properties.push(...parse(`({${JSON.stringify(key)}:e[${JSON.stringify(key)}]})`).program.body[0].expression.properties);
      if (buttons[id]?.[p.children?.value] && p.onClick) add(properties, buttons[id][p.children.value]);
      if (id === 1817 && tag === "circle") {
        if (p.r?.value === "45") add(properties, "tq.piece", {"data-guide-id": "e", "data-guide-player": "n"});
        if (p.r?.value === 35) add(properties, "tq.cell", {"data-guide-id": "i"});
        if (p.r?.value === 45 && p.onClick) add(properties, "tq.landing", {"data-guide-id": "n"});
      }
      if (id === 1817 && tag === "path" && p.strokeWidth?.value === "6") add(properties, "tq.route");
      if (id === 2078 && tag === "circle" && p.r?.value === 50 && p.onClick) {
        if (p.cx?.name === "h" && p.cy?.name === "y") add(properties, "ktd.build", {"data-guide-id": '"road-"+a'});
        if (p.cx?.name === "f" && p.cy?.name === "h") add(properties, "ktd.build", {"data-guide-id": '"vertex-"+a'});
      }
      if (id === 2262) {
        if (cls.startsWith('"ccbs-card-wrapper"')) add(properties, "ccbs.market", {"data-guide-id": "e", "data-guide-small": "!!a"});
        if (cls.startsWith('"ccbs-noble-wrapper"')) add(properties, "ccbs.noble", {"data-guide-id": "e", "data-guide-small": "!!r"});
        if (cls.includes('" scale-125"') && cls.includes('"ccbs-circle ccbs-color-"')) add(properties, "ccbs.bank", {"data-guide-id": "r"});
        if (p.className?.value === "w-10") add(properties, "ccbs.score", {"data-guide-player": "i"});
      }
      if (id === 3405) {
        if (cls.startsWith('"dy-card dy-card-"')) add(properties, "dy.card", {"data-guide-id": "e"});
        for (const [index, color] of ["red", "blue", "purple"].entries()) if (cls.startsWith(`"bg-${color}-100 bg-opacity-75 mt-4`)) add(properties, "dy.pot", {"data-guide-id": String(index)});
        if (p.className?.value === "text-center my-2" && generate(p.children).code.includes("n.scores[e]")) add(properties, "dy.score", {"data-guide-player": "e"});
      }
    }});
    modules.set(id, generate(ast.program.body[0].expression, {comments: false}).code);
  }
  const expected = {"sgs.hand":1,"ktd.hand":1,"dy.hand":1,"tq.piece":1,"tq.cell":1,"tq.landing":1,"tq.route":1,"ktd.build":2,"ktd.roll":1,"ktd.trade":1,"ktd.end":1,"ccbs.market":3,"ccbs.noble":2,"ccbs.bank":2,"ccbs.buy":1,"ccbs.score":1,"dy.card":1,"dy.pot":3,"dy.score":1};
  for (const [key, count] of Object.entries(expected)) if (hits.get(key) !== count) throw new Error(`Guide target boundary changed: ${key} (${hits.get(key) || 0}, expected ${count})`);
}
