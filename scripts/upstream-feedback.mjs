import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
const traverse = traverseModule.default;
const generate = generateModule.default;
export function attachFeedback(modules) {
  const ast = parse(`(${modules.get(2262)})`);
  const requireName = ast.program.body[0].expression.params[2].name;
  let count = 0;
  traverse(ast, {FunctionExpression(path) {
    if (path.node.params.length !== 1 || path.node.params[0].name !== "n") return;
    const body = generate(path.node.body).code;
    if (!body.includes("getClientRects")) return;
    const target = body.includes("ccbs-noble-") ? "ccbs.noble" : body.includes("ccbs-card-") ? "ccbs.market" : "ccbs.bank";
    path.node.body = parse(`(function(n){return companionFeedbackBridge.feedback ? (0,o.jsx)(companionFeedbackBridge.feedback,{event:n.lastOp,version:n.gameVersion,target:${JSON.stringify(target)}}):null;})`).program.body[0].expression.body;
    count++;
    path.skip();
  }});
  if (count !== 3) throw new Error(`Splendor feedback boundary changed (${count})`);
  ast.program.body[0].expression.body.body.unshift(parse(`var companionFeedbackBridge = ${requireName}.bridge;`).program.body[0]);
  modules.set(2262, generate(ast.program.body[0].expression, {comments:false}).code);
}
