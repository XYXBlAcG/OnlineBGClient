import {
  create,
  parseDependencies,
  type MathNode,
  type ConstantNode,
  type OperatorNode,
  type FunctionNode,
  type ParenthesisNode,
} from "mathjs/number";
const { parse } = create({ parseDependencies });
const operators: Record<string, (...values: number[]) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b,
  pow: Math.pow,
  unaryMinus: (a) => -a,
  unaryPlus: (a) => a,
};
const functions: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
};
export function compileFormula(input: string): {
  evaluate: (x: number) => number;
} {
  const text = input.trim();
  if (!text || text.length > 256) throw new Error("请输入 1–256 个字符的函数");
  let tree: MathNode;
  try {
    tree = parse(text);
  } catch {
    throw new Error("函数格式不正确，请检查括号和运算符");
  }
  let count = 0;
  const build = (node: MathNode, depth: number): ((x: number) => number) => {
    if (++count > 96 || depth > 20)
      throw new Error("函数过于复杂，请简化表达式");
    if (node.type === "ConstantNode") {
      const value = (node as ConstantNode).value;
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error("只支持有限实数常量");
      return () => value;
    }
    if (node.type === "SymbolNode" && "name" in node && node.name === "x")
      return (x) => x;
    if (node.type === "ParenthesisNode")
      return build((node as ParenthesisNode).content, depth + 1);
    if (node.type === "OperatorNode") {
      const op = node as OperatorNode;
      const operation = Object.hasOwn(operators, op.fn)
        ? operators[op.fn]
        : undefined;
      if (operation && op.args.length >= 1 && op.args.length <= 2) {
        const args = op.args.map((arg) => build(arg, depth + 1));
        return args.length === 1
          ? (x) => operation(args[0](x))
          : (x) => operation(args[0](x), args[1](x));
      }
    }
    if (node.type === "FunctionNode") {
      const fn = node as FunctionNode;
      const operation =
        fn.fn.type === "SymbolNode" && Object.hasOwn(functions, fn.fn.name)
          ? functions[fn.fn.name]
          : undefined;
      if (operation && fn.args.length === 1) {
        const argument = build(fn.args[0], depth + 1);
        return (x) => operation(argument(x));
      }
    }
    throw new Error("仅支持变量 x、实数、四则运算、幂和常用数学函数");
  };
  return { evaluate: build(tree, 0) };
}
