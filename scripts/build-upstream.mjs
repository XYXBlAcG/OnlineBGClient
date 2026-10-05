import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';
import generatePackage from '@babel/generator';
import traversePackage from '@babel/traverse';
import { translateText } from '../src/domain/terms.ts';

const generate = generatePackage.default;
const traverse = traversePackage.default;
const modules = new Map();
const manifest = [];
await mkdir('.tmp/upstream', { recursive: true });
for (const name of ['vendor', 'app', 'uno', 'sgs', 'fxq', 'tq', 'ddz', 'dy', 'ktd', 'ccbs']) {
  const path = `upstream/raw/${name}.js`;
  const source = await readFile(path, 'utf8');
  manifest.push({ path, sha256: createHash('sha256').update(source).digest('hex') });
  const ast = parse(source);
  traverse(ast, {
    CallExpression(path) {
      const node = path.node;
      if (node.callee.type !== 'MemberExpression' || node.callee.property.name !== 'push') return;
      const registry = node.arguments[0]?.elements?.[1];
      if (registry?.type !== 'ObjectExpression') return;
      for (const property of registry.properties) {
        const id = property.key.value;
        const code = generate(property.value, { comments: false }).code;
        modules.set(id, code);
      }
    },
  });
}
for (const [id, code] of modules) await writeFile(`.tmp/upstream/${id}.js`, code);
const roots = [7902, 1124, 3797, 2078, 552, 738, 9796, 6912, 3405, 2437, 4473, 6544, 6139, 9474, 7707, 6749, 6435, 5051, 8655, 8280, 8467, 1983, 6350, 575, 8410, 6359, 7448, 4062, 6630, 1621, 5328, 1529];
const overrides = new Set([7313, 6417, 3953, 3366, 2335, 4420, 161]);
const selected = new Map();
function include(id) {
  if (selected.has(id) || overrides.has(id)) return;
  const code = modules.get(id);
  if (!code) throw new Error(`Missing upstream module ${id}`);
  selected.set(id, code);
  const ast = parse(`(${code})`);
  const parameter = ast.program.body[0].expression.params[2]?.name;
  traverse(ast, {
    CallExpression(path) {
      const node = path.node;
      if (node.callee.type === 'Identifier' && node.callee.name === parameter && node.arguments[0]?.type === 'NumericLiteral') include(node.arguments[0].value);
    },
  });
}
roots.forEach(include);
for (const id of [6749, 5051, 8280, 1983]) {
  const ast = parse(`(${selected.get(id)})`);
  traverse(ast, { StringLiteral(path) {
    if (!path.parentPath.isObjectProperty({ key: path.node }) && !/^[a-zA-Z0-9_ -]+$/.test(path.node.value)) {
      path.node.value = translateText(path.node.value);
      delete path.node.extra;
    }
  } });
  selected.set(id, generate(ast.program.body[0].expression, { comments: false }).code);
}
const gameAst = parse(`(${selected.get(6749)})`);
let chooseHero;
let resolveCounterspell;
let fireAttackPredicates = 0;
traverse(gameAst, {
  IfStatement(path) {
    const test = path.node.test;
    if (test.type !== "LogicalExpression" || test.operator !== "&&" || test.left.name !== "l" || test.right.name !== "a") return;
    const enclosing = path.getFunctionParent();
    if (!enclosing || !generate(enclosing.node).code.includes("Se(e, c.MZ.USE_HUO_GONG)")) return;
    path.node.test = parse("l !== undefined && a").program.body[0].expression;
    fireAttackPredicates++;
  },
  FunctionExpression(path) {
    const code = generate(path.node, { comments: false }).code;
    if (code.length < 5000 && code.startsWith('function (e, r, n) {') && code.includes('t.hero[n] = r') && code.includes('t.heroCandidates[n] = []')) {
      chooseHero = code;
      path.replaceWith(parse('(function(e, r, n) { companionBridge.sink({type:"sgs-hero", hero:r}); return e; })').program.body[0].expression);
      path.skip();
    } else if (code.startsWith('function (e) {\n  if (e.dcdType !== c.qy.RESPOND_TO_WU_XIE)')) resolveCounterspell = code;
  },
  FunctionDeclaration(path) {
    if (path.node.id.name === 'me') {
      traverse(path.node, {
        noScope: true,
        FunctionExpression(inner) {
          const code = generate(inner.node, { comments: false }).code;
          if (code.startsWith('function (e) {\n  if (e.dcdType !== c.qy.RESPOND_TO_WU_XIE)')) resolveCounterspell = code;
        },
      });
      path.node.body = parse('(function() { return null; })').program.body[0].expression.body;
      path.skip();
    }
  },
  VariableDeclarator(path) {
    if (path.node.id.name === 'be' && path.node.init?.type === 'FunctionExpression') {
      path.traverse({ VariableDeclarator(inner) {
        if (inner.node.id.name === 'i' && inner.node.init?.type === 'CallExpression') inner.node.init = parse('undefined').program.body[0].expression;
        if (inner.node.id.name === 'o' && inner.node.init?.type === 'CallExpression') inner.node.init = parse('e.view').program.body[0].expression;
      } });
    }
  },
});
let heroSurfaces = 0;
traverse(gameAst, { CallExpression(path) {
 if (path.node.arguments[0]?.name !== 'N' || path.node.arguments[1]?.type !== 'ObjectExpression') return;
 const card = generate(path.node).code;
 const props = generate(path.node.arguments[1]).code;
 path.replaceWith(parse(`companionBridge.heroCard ? (0,S.jsx)(companionBridge.heroCard,{...${props},children:${card}}) : ${card}`).program.body[0].expression);
 path.skip(); heroSurfaces++;
} });
if (heroSurfaces !== 2) throw new Error('Upstream hero card boundary changed');
let trickSurfaces = 0;
traverse(gameAst, { VariableDeclarator(path) {
 if (path.node.id.name !== 'p' || path.node.init?.type !== 'FunctionExpression') return;
 const result = path.node.init.body.body.find(node => node.type === 'ReturnStatement');
 if (!result || !generate(result.argument).code.includes('sgs-card-container')) return;
 const card = generate(result.argument).code;
 result.argument = parse(`companionBridge.trickCard ? (0,S.jsx)(companionBridge.trickCard,{id:r,children:${card}}) : ${card}`).program.body[0].expression;
 trickSurfaces++;
} });
if (trickSurfaces !== 1) throw new Error('Upstream trick card boundary changed');
if (fireAttackPredicates !== 1) throw new Error('Upstream fire attack boundary changed');
if (!chooseHero || !resolveCounterspell) throw new Error('Upstream action boundaries changed');
const facade = `
var companionBridge = n.bridge;
r.actionSpec = ke;
r.chooseHero = ${chooseHero};
r.resolveCounterspell = function(e) { R(e); (${resolveCounterspell})(e); };
r.reset = R;
r.resetPlay = k;
r.cardCount = we;
r.targetCount = Ze;
r.advance = fe;
var companionOriginalSpec = ke;
ke = function(view,position) {
  var spec = companionOriginalSpec(view,position);
  if (!companionBridge.sink) return spec;
  if (spec.usableAction) { spec.usableAction = spec.usableAction.slice(); spec.usableAction[c.yP.OP_FUNC] = function(state,cards,targets,button,option) { companionBridge.sink({type:'sgs-choice',cards,targets,button,option:option||0,skill:-1}); }; }
  spec.usableSkills = spec.usableSkills.map(function(skill) { var result=skill.slice(); result[c.DG.OP_FUNC]=function(state,cards,targets,button) { companionBridge.sink({type:'sgs-choice',cards,targets,button,option:0,skill:skill[0]}); }; return result; });
  return spec;
};`;
gameAst.program.body[0].expression.body.body.push(...parse(facade).program.body);
selected.set(6749, generate(gameAst.program.body[0].expression, { comments: false }).code);
const poisonAst = parse(`(${selected.get(3405)})`);
poisonAst.program.body[0].expression.body.body.unshift(...parse('var companionBridge = n.bridge;').program.body);
let poisonView = 0;
let poisonActions = 0;
traverse(poisonAst, {
 VariableDeclarator(path) {
  if (path.node.id.name === 'c' && path.node.init?.type === 'CallExpression' && generate(path.node.init).code.includes('i.UG.decode(n.data)')) { path.node.init = parse('undefined').program.body[0].expression; poisonView++; }
  if (path.node.id.name === 'l' && path.node.init?.type === 'CallExpression' && generate(path.node.init).code.includes('o.my)(c, e.playerList.length)')) path.node.init = parse('t.view').program.body[0].expression;
 },
 ObjectProperty(path) {
  if (path.node.key?.name !== 'updateGameData' || path.node.value.type !== 'FunctionExpression') return;
  path.node.value.body = parse('(function(t){ companionBridge.sink({type:"dy-play",card:t.lastOp.putCard,pot:t.pots.findIndex(function(pot){return pot.includes(t.lastOp.putCard);})}); })').program.body[0].expression.body;
  poisonActions++;
 }
});
if (poisonView !== 1 || poisonActions !== 1) throw new Error('Poison boundaries changed');
selected.set(3405, generate(poisonAst.program.body[0].expression,{comments:false}).code);
const unoAst = parse(`(${selected.get(7707)})`);
traverse(unoAst, { VariableDeclarator(path) {
  if (path.node.id.name !== 'S' || path.node.init?.type !== 'FunctionExpression') return;
  path.traverse({ VariableDeclarator(inner) {
    if (inner.node.id.name === 'u' && inner.node.init?.type === 'CallExpression') inner.node.init = parse('undefined').program.body[0].expression;
    if (inner.node.id.name === 'd' && inner.node.init?.type === 'CallExpression') inner.node.init = parse('r.view').program.body[0].expression;
  } });
} });
selected.set(7707, generate(unoAst.program.body[0].expression, { comments: false }).code);
const flightAst = parse(`(${selected.get(7448)})`);
traverse(flightAst, { VariableDeclarator(path) {
  if (path.node.id.name !== 'H' || path.node.init?.type !== 'FunctionExpression') return;
  path.traverse({ VariableDeclarator(inner) {
    if (inner.node.id.name === 'f' && inner.node.init?.type === 'CallExpression') inner.node.init = parse('e.view').program.body[0].expression;
  } });
} });
selected.set(7448, generate(flightAst.program.body[0].expression, { comments: false }).code);
const checkersRulesAst = parse(`(${selected.get(5328)})`);
checkersRulesAst.program.body[0].expression.body.body.push(...parse(`
var companionCheckersCandidates = z;
var companionCheckersCache = new WeakMap();
z = function(view, actor) {
  var entry = companionCheckersCache.get(view);
  if (!entry || entry.pieces !== view.pieces || entry.rule !== view.rule) {
    entry = {pieces:view.pieces, rule:view.rule, routes:new Map()};
    companionCheckersCache.set(view, entry);
  }
  if (entry.routes.has(actor)) return entry.routes.get(actor);
  var routes = companionCheckersCandidates(view, actor);
  entry.routes.set(actor, routes);
  return routes;
};`).program.body);
selected.set(5328, generate(checkersRulesAst.program.body[0].expression, { comments: false }).code);
const checkersAst = parse(`(${selected.get(1621)})`);
let checkersViews = 0;
let checkersReplay = 0;
traverse(checkersAst, { VariableDeclarator(path) {
  if (path.node.id.name !== 'm' || path.node.init?.type !== 'FunctionExpression') return;
  path.traverse({ VariableDeclarator(inner) {
    if (inner.node.id.name === 'k') { inner.remove(); return; }
    if (inner.node.id.name === 'm' && inner.node.init?.type === 'CallExpression') {
      inner.node.init = parse('e.view').program.body[0].expression;
      checkersViews++;
    }
  } });
} });
traverse(checkersAst, { ObjectExpression(path) {
  const label = path.node.properties.find(property => property.key?.name === 'children' && property.value?.value === '对局复盘');
  if (!label) return;
  path.node.properties = path.node.properties.filter(property => property.key?.name !== 'to');
  path.node.properties.push(parse('({onClick:e.onReplay})').program.body[0].expression.properties[0]);
  label.value.value = '审核 AI 决策';
  delete label.value.extra;
  checkersReplay++;
} });
traverse(checkersAst, { CallExpression(path) {
  const properties = path.node.arguments[1]?.properties;
  if (!properties?.some(property => property.key?.name === 'onClick' && property.value?.type === 'MemberExpression' && property.value.object.name === 'e' && property.value.property.name === 'onReplay')) return;
  path.replaceWith(parse(`e.onReplay && ${generate(path.node).code}`).program.body[0].expression);
  path.skip();
} });
if (checkersViews !== 1 || checkersReplay !== 1) throw new Error('Upstream checkers UI boundary changed');
selected.set(1621, generate(checkersAst.program.body[0].expression, { comments: false }).code);
const ddzAst = parse(`(${selected.get(6544)})`);
let ddzViewBindings = 0;
traverse(ddzAst, { VariableDeclarator(path) {
  if (path.node.id.name === 'd' && path.node.init?.type === 'CallExpression' && generate(path.node.init).code === '(0, l.my)(c, u)') { path.node.init = parse('e.view').program.body[0].expression; ddzViewBindings++; }
} });
let ddzUnsupportedControls = 0;
traverse(ddzAst, { CallExpression(path) {
  const callee = path.node.callee;
  const member = callee.type === 'SequenceExpression' ? callee.expressions.at(-1) : callee;
  if (member.type === 'MemberExpression' && member.object.name === 'l' && ['h8', '$9'].includes(member.property.name)) { path.replaceWith(parse('false').program.body[0].expression); ddzUnsupportedControls++; }
} });
if (ddzUnsupportedControls !== 2) throw new Error('Dou dizhu control boundary changed');
if (ddzViewBindings !== 1) throw new Error('Dou dizhu view boundary changed');
selected.set(6544, generate(ddzAst.program.body[0].expression, { comments: false }).code);
const catanAst = parse(`(${selected.get(2078)})`);
let catanViews = 0, catanWrites = 0, catanMonopoly = 0, catanPanels = 0, catanActions = 0, catanPlayerStrips = 0, catanEmptyHands = 0;
const catanRoadFunctions = new Map();
traverse(catanAst, { CallExpression: { exit(path) {
  const props = path.node.arguments[1];
  if (props?.type !== "ObjectExpression") return;
  const classProp = props.properties.find(p => p.type === "ObjectProperty" && p.key.name === "className");
  const childrenProp = props.properties.find(p => p.type === "ObjectProperty" && p.key.name === "children");
  if (path.node.arguments[0]?.name === "q" && props.properties.some(p => p.key?.name === "hasPort")) {
    const original = generate(path.node).code;
    path.replaceWith(parse(`(0,x.jsx)("div",{className:"catan-player-strip",children:${original}})`).program.body[0].expression);
    catanPlayerStrips++;
    path.skip();
  } else if (classProp?.value.value === "h-10 leading-10" && ["你暂无资源卡", "你暂无发展卡"].includes(childrenProp?.value.value)) {
    classProp.value.value = "catan-empty-hand";
    catanEmptyHands++;
  } else if (classProp?.value.value === "text-center" && childrenProp?.value.type === "ArrayExpression" && generate(childrenProp.value).code.includes("N.hint")) {
    classProp.value.value = "text-center catan-actions";
    catanActions++;
  }
} }, StringLiteral(path) {
  if (path.node.value === "mt-2 text-center bg-gray-700 pt-1 text-sm") { path.node.value = "mt-2 text-center catan-hand-panel pt-1 text-sm"; catanPanels++; }
}, VariableDeclarator(path) {
  const node = path.node;
  if (["J", "X"].includes(node.id.name) && node.init?.type === "FunctionExpression") { catanRoadFunctions.set(node.id.name, generate(node.init).code); path.remove(); return; }
  if (node.id.name === "C" && node.init?.type === "CallExpression" && generate(node.init).code === "d.AD.decode(p.data)") { node.init = parse("e.view").program.body[0].expression; catanViews++; }
  if (node.id.name === "I" && node.init?.type === "FunctionExpression" && generate(node.init).code.includes("PlayerUpdateGameData")) { node.init = parse('(function(next) { companionBridge.sink(companionBridge.catanIntent(C, next, t.position - 1)); })').program.body[0].expression; catanWrites++; }
}, ExpressionStatement(path) {
  if (generate(path.node).code === "t.lastOp.needs[e] = a;") { path.insertAfter(parse("t.lastOp.resource = e;").program.body[0]); catanMonopoly++; }
} });
if (catanViews !== 1 || catanWrites !== 1 || catanMonopoly !== 1 || catanPanels !== 1 || catanActions !== 1 || catanPlayerStrips !== 1 || catanEmptyHands !== 2) throw new Error("Catan boundary changed");
catanAst.program.body[0].expression.body.body.unshift(parse("var companionBridge = t.bridge;").program.body[0]);
const catanRulesAst = parse(`(${selected.get(552)})`);
if (catanRoadFunctions.size !== 2) throw new Error("Catan road algorithm changed");
catanRulesAst.program.body[0].expression.body.body.push(...parse(`var J = ${catanRoadFunctions.get("J")}, X = ${catanRoadFunctions.get("X")}; a.longestRoad = X;`).program.body);
selected.set(552, generate(catanRulesAst.program.body[0].expression, { comments: false }).code);
selected.set(2078, generate(catanAst.program.body[0].expression, { comments: false }).code);
const splendorAst = parse(`(${selected.get(7902)})`);
let splendorViews = 0, splendorWrites = 0;
traverse(splendorAst, { VariableDeclarator(path) {
  if (path.node.id.name === "y" && generate(path.node.init).code.includes("l.my")) { path.node.init = parse("n.view").program.body[0].expression; splendorViews++; }
}, ObjectProperty(path) {
  if (path.node.key.name === "onAction" && path.node.value.type === "FunctionExpression") { path.node.value = parse('(function(move) { if (!companionBridge.readOnly && g !== null && !A.current.pending) { A.current.pending = true; companionBridge.sink({type:"ccbs-action",move:move}); } })').program.body[0].expression; splendorWrites++; }
} });
if (splendorViews !== 1 || splendorWrites !== 1) throw new Error("Splendor boundary changed");
splendorAst.program.body[0].expression.body.body.unshift(parse("var companionBridge = t.bridge;").program.body[0]);
selected.set(7902, generate(splendorAst.program.body[0].expression, { comments: false }).code);
const splendorTableAst = parse(`(${selected.get(2262)})`);
let splendorReservationKeys = 0;
traverse(splendorTableAst, { CallExpression(path) {
  const node=path.node, callee=node.callee, callback=node.arguments[0];
  if(callee.type!=="MemberExpression" || callee.property.name!=="map" || callee.object.type!=="MemberExpression" || callee.object.object.type!=="MemberExpression" || callee.object.object.property.name!=="playerBooked" || callback?.type!=="FunctionExpression")return;
  callback.params.push(parse("reservedIndex").program.body[0].expression);
  path.traverse({CallExpression(inner){if(inner.node.arguments[2]?.type === "Identifier" && inner.node.arguments[2].name === "n") { inner.node.arguments[2]=parse('n >= 0 ? n : "hidden-" + reservedIndex').program.body[0].expression; splendorReservationKeys++; }}});
}, BinaryExpression(path) {
  if (generate(path.node).code === "-1 - c.XO[n]") { path.replaceWith(parse("n < 0 ? n : -1 - c.XO[n]").program.body[0].expression); path.skip(); }
} });
if(splendorReservationKeys !== 2)throw new Error("Splendor reservation boundary changed");
selected.set(2262, generate(splendorTableAst.program.body[0].expression, { comments: false }).code);
for (const [id, jsxName, requireName, mapClass] of [[2078, "x", "t", "max-w-3xl mx-auto w-full relative"], [7448, "u", "i", "max-w-3xl mx-auto w-full relative"], [1817, "c", "r", "max-w-2xl mx-auto"]]) {
  const ast = parse(`(${selected.get(id)})`);
  let boards = 0;
  traverse(ast, { CallExpression: { exit(path) {
    const props = path.node.arguments[1];
    if (props?.type !== "ObjectExpression") return;
    const classProp = props.properties.find(p => p.key?.name === "className");
    if (classProp?.value.value !== mapClass) return;
    const original = generate(path.node).code;
    path.replaceWith(parse(`(0, ${jsxName}.jsx)(companionMapBridge.mapViewport, {children: ${original}})`).program.body[0].expression);
    boards++;
    path.skip();
  } } });
  if (boards !== 1) throw new Error(`Map viewport boundary changed: ${id}`);
  ast.program.body[0].expression.body.body.unshift(...parse(`var companionMapBridge = ${requireName}.bridge;`).program.body);
  selected.set(id, generate(ast.program.body[0].expression, { comments: false }).code);
}
const tableAst = parse(`(${selected.get(2262)})`);
let tables = 0;
traverse(tableAst, { ObjectExpression(path) {
  const classProp = path.node.properties.find(p => p.key?.name === "className" && p.value.value === "text-center");
  const children = path.node.properties.find(p => p.key?.name === "children")?.value;
  if (!classProp || children?.type !== "ArrayExpression" || children.elements[0]?.arguments?.[0]?.name !== "d" || children.elements.at(-1)?.arguments?.[0]?.name !== "j") return;
  classProp.value.value = "text-center splendor-table";
  const sections = children.elements;
  children.elements = [
    parse(`(0,o.jsxs)("div",{className:"table-public",children:[${sections.slice(0,2).map(n=>generate(n).code).join(",")}]})`).program.body[0].expression,
    parse(`(0,o.jsxs)("div",{className:"table-actions",children:[${sections.slice(2,5).map(n=>generate(n).code).join(",")}]})`).program.body[0].expression,
    parse(`(0,o.jsxs)("details",{className:"table-collection",children:[(0,o.jsx)("summary",{children:"玩家与收藏"}),${generate(sections[5]).code}]})`).program.body[0].expression,
  ];
  tables++;
} });
if (tables !== 1) throw new Error("Splendor table boundary changed");
selected.set(2262, generate(tableAst.program.body[0].expression, { comments:false }).code);
const handAst = parse(`(${selected.get(6749)})`);
let hands = 0, publicAreas = 0;
traverse(handAst, { StringLiteral(path) {
  if (path.node.value === "mx-auto px-2 w-full flex") { path.node.value += " sgs-hand-panel"; hands++; }
}, ObjectExpression(path) {
  const cls = path.node.properties.find(p => p.key?.name === "className" && p.value.value === "flex-grow flex flex-col");
  const children = path.node.properties.find(p => p.key?.name === "children")?.value;
  if (cls && children?.type === "ArrayExpression" && generate(children.elements[0]).code.includes("Te.map")) { cls.value.value += " sgs-public-panel"; publicAreas++; }
} });
if(hands !== 1 || publicAreas !== 1) throw new Error("Sanguosha table boundary changed");
selected.set(6749, generate(handAst.program.body[0].expression, {comments:false}).code);
const poisonLayoutAst = parse(`(${selected.get(3405)})`);
let potLayouts = 0;
traverse(poisonLayoutAst, { ArrayExpression(path) {
  const start = path.node.elements.findIndex(node => node?.type === "CallExpression" && generate(node).code.includes('className: "bg-red-100'));
  if (start < 0) return;
  const pots = path.node.elements.slice(start, start + 3);
  if (!generate(pots[1]).code.includes('className: "bg-blue-100') || !generate(pots[2]).code.includes('className: "bg-purple-100')) throw new Error("Poison pot boundary changed");
  path.node.elements.splice(start, 3, parse(`(0,d.jsxs)("div",{className:"poison-pots",children:[${pots.map(node=>generate(node).code).join(",")}]})`).program.body[0].expression);
  potLayouts++;
  path.skip();
} });
if (potLayouts !== 1) throw new Error("Poison layout boundary changed");
selected.set(3405, generate(poisonLayoutAst.program.body[0].expression, {comments:false}).code);
const buttonAst = parse(`(${selected.get(4595)})`);
let disabledButtons = 0;
traverse(buttonAst, { ObjectExpression(path) {
  const properties = path.node.properties;
  if (!properties.some(property => property.key?.name === 'type' && property.value?.value === 'button') || !properties.some(property => property.key?.name === 'onClick' && property.value?.name === 'v')) return;
  properties.push(parse('({disabled:h})').program.body[0].expression.properties[0]);
  disabledButtons++;
} });
if (disabledButtons !== 1) throw new Error('Upstream button boundary changed');
selected.set(4595, generate(buttonAst.program.body[0].expression, { comments: false }).code);
const metricsAst = parse(`(${selected.get(3299)})`);
traverse(metricsAst, { VariableDeclarator(path) {
  if (path.node.id.name === 'r' && path.node.init?.type === 'CallExpression') path.node.init = parse('typeof document === "undefined" ? 16 : a("😀")').program.body[0].expression;
} });
selected.set(3299, generate(metricsAst.program.body[0].expression, { comments: false }).code);
selected.set(7640, 'function(module) { module.exports = function(name) { return name === "buffer" && typeof Buffer !== "undefined" ? {Buffer} : null; }; }');
for (const [id, code] of selected) {
  const ast = parse(`(${code})`);
  traverse(ast, { CallExpression(path) {
    const node = path.node;
    if (!['div', 'span'].includes(node.arguments[0]?.value) || node.arguments[1]?.type !== 'ObjectExpression') return;
    const props = node.arguments[1].properties;
    if (!props.some(prop => prop.key?.name === 'onClick') || props.some(prop => ['role', 'tabIndex', 'onKeyDown'].includes(prop.key?.name))) return;
    props.push(...parse('({role:"button",tabIndex:0,onKeyDown:function(event) { if (!event.repeat && !event.isComposing && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); event.currentTarget.click(); } }})').program.body[0].expression.properties);
  } });
  selected.set(id, generate(ast.program.body[0].expression, { comments: false }).code);
}
await writeFile('src/upstream/factories.js', `export default {\n${[...selected].map(([id,code])=>`${id}: ${code}`).join(',\n')}\n};\n`);
for (const path of ['public/upstream/dy.css', 'public/upstream/ktd.css', 'public/upstream/ccbs.css', 'public/upstream/ccbs-cards.webp', 'public/upstream/ccbs-nobles.webp']) { const source=await readFile(path); manifest.push({path,sha256:createHash('sha256').update(source).digest('hex')}); }
await writeFile('upstream/manifest.json', JSON.stringify({ origin: 'https://game.hullqin.cn/', captured: '2026-10-05', sources: manifest, modules: [...selected.keys()] }, null, 2)+'\n');
console.log(`Extracted ${selected.size} modules with ${modules.size} available`);
