const key = "onlinebg.graphwar.formulas";
export function readFormulaHistory(
  storage: Pick<Storage, "getItem">,
): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (v): v is string =>
              typeof v === "string" && v.length > 0 && v.length <= 256,
          )
          .slice(0, 12)
      : [];
  } catch {
    return [];
  }
}
export function saveFormulaHistory(
  storage: Pick<Storage, "setItem">,
  formulas: string[],
): void {
  storage.setItem(key, JSON.stringify(formulas.slice(0, 12)));
}
