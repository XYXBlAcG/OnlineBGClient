import {
  create,
  parseDependencies,
  type MathNode,
  type ConstantNode,
  type OperatorNode,
  type FunctionNode,
  type ParenthesisNode,
  type SymbolNode,
} from "mathjs/number";
const { parse } = create({ parseDependencies });
export type FormulaFamily = "linear" | "trig" | "root" | "power" | "other";
export type GraphwarFunctionGroup = "function" | "advanced";
export interface GraphwarFunctionSpec {
  name: string;
  group: GraphwarFunctionGroup;
  arity: readonly number[];
  family: FormulaFamily;
  evaluate: (values: readonly number[]) => number;
}
export const graphwarFunctions: readonly GraphwarFunctionSpec[] = [
  {
    name: "sin",
    group: "function",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.sin(v),
  },
  {
    name: "cos",
    group: "function",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.cos(v),
  },
  {
    name: "tan",
    group: "function",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.tan(v),
  },
  {
    name: "sqrt",
    group: "function",
    arity: [1],
    family: "root",
    evaluate: ([v]) => Math.sqrt(v),
  },
  {
    name: "abs",
    group: "function",
    arity: [1],
    family: "root",
    evaluate: ([v]) => Math.abs(v),
  },
  {
    name: "exp",
    group: "function",
    arity: [1],
    family: "other",
    evaluate: ([v]) => Math.exp(v),
  },
  {
    name: "ln",
    group: "function",
    arity: [1],
    family: "other",
    evaluate: ([v]) => Math.log(v),
  },
  {
    name: "log",
    group: "function",
    arity: [1],
    family: "other",
    evaluate: ([v]) => Math.log10(v),
  },
  {
    name: "asin",
    group: "advanced",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.asin(v),
  },
  {
    name: "acos",
    group: "advanced",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.acos(v),
  },
  {
    name: "atan",
    group: "advanced",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.atan(v),
  },
  {
    name: "sinh",
    group: "advanced",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.sinh(v),
  },
  {
    name: "cosh",
    group: "advanced",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.cosh(v),
  },
  {
    name: "tanh",
    group: "advanced",
    arity: [1],
    family: "trig",
    evaluate: ([v]) => Math.tanh(v),
  },
  {
    name: "floor",
    group: "advanced",
    arity: [1],
    family: "other",
    evaluate: ([v]) => Math.floor(v),
  },
  {
    name: "ceil",
    group: "advanced",
    arity: [1],
    family: "other",
    evaluate: ([v]) => Math.ceil(v),
  },
  {
    name: "round",
    group: "advanced",
    arity: [1],
    family: "other",
    evaluate: ([v]) => Math.round(v),
  },
  {
    name: "sign",
    group: "advanced",
    arity: [1],
    family: "other",
    evaluate: ([v]) => Math.sign(v),
  },
  {
    name: "min",
    group: "advanced",
    arity: [1, 2, 3, 4],
    family: "other",
    evaluate: (values) => Math.min(...values),
  },
  {
    name: "max",
    group: "advanced",
    arity: [1, 2, 3, 4],
    family: "other",
    evaluate: (values) => Math.max(...values),
  },
  {
    name: "clamp",
    group: "advanced",
    arity: [3],
    family: "other",
    evaluate: ([value, low, high]) => Math.min(Math.max(value, low), high),
  },
];
const functionSpecs = new Map(
  graphwarFunctions.map((spec) => [spec.name, spec]),
);
const operators: Record<string, (...values: number[]) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b,
  pow: Math.pow,
  unaryMinus: (a) => -a,
  unaryPlus: (a) => a,
};
const constants: Record<string, number> = { pi: Math.PI, e: Math.E };
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
    if (node.type === "SymbolNode") {
      const name = (node as SymbolNode).name;
      if (name === "x") return (x) => x;
      if (Object.hasOwn(constants, name)) return () => constants[name];
    }
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
      const name = fn.fn.type === "SymbolNode" ? fn.fn.name : "";
      const spec = functionSpecs.get(name);
      if (spec && spec.arity.includes(fn.args.length)) {
        const argument = fn.args.map((arg) => build(arg, depth + 1));
        return (x) => spec.evaluate(argument.map((evaluate) => evaluate(x)));
      }
      if (spec)
        throw new Error(
          `${name} 需要 ${spec.arity.join("、")} 个参数，请检查括号`,
        );
    }
    throw new Error("仅支持变量 x、π、e、四则运算、幂和常用数学函数");
  };
  return { evaluate: build(tree, 0) };
}

export function formulaFamily(input: string): FormulaFamily {
  const tree = parse(input.trim());
  let family: FormulaFamily = "linear";
  const visit = (node: MathNode) => {
    if (node.type === "FunctionNode") {
      const fn = node as FunctionNode;
      family =
        fn.fn.type === "SymbolNode"
          ? (functionSpecs.get(fn.fn.name)?.family ?? "other")
          : "other";
      fn.args.forEach(visit);
      return;
    }
    if (node.type === "OperatorNode") {
      const op = node as OperatorNode;
      if (op.fn === "pow") family = "power";
      op.args.forEach(visit);
    }
  };
  visit(tree);
  return family;
}
