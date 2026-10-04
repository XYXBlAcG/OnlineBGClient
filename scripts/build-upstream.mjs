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
for (const name of ['vendor', 'app', 'uno', 'sgs', 'fxq', 'tq', 'ddz']) {
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
const roots = [6544, 6139, 9474, 7707, 6749, 6435, 5051, 8655, 8280, 8467, 1983, 6350, 575, 8410, 6359, 7448, 4062, 6630, 1621, 5328, 1529];
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
await writeFile('upstream/manifest.json', JSON.stringify({ origin: 'https://game.hullqin.cn/', captured: '2026-10-04', sources: manifest, modules: [...selected.keys()] }, null, 2)+'\n');
console.log(`Extracted ${selected.size} modules with ${modules.size} available`);
