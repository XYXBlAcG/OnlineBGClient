import { useEffect, useRef, useState } from "react";

interface MathFieldElement extends HTMLElement {
  inlineShortcuts: Record<string, string>;
  setValue(value: string, options?: { format?: string }): void;
  getValue(format?: string): string;
  insert(
    value: string,
    options?: {
      format?: string;
      insertionMode?: string;
      selectionMode?: string;
      focus?: boolean;
    },
  ): boolean;
  focus(): void;
}

const clean = (value: string) =>
  value
    .replace(/\\placeholder\{?\}?/g, "")
    .replace(/[−]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/-:/g, "/")
    .replace(/[π]/g, "pi")
    .replace(/[√]/g, "sqrt")
    .replace(/[#?]/g, "");

export function MathFormulaField({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLInputElement>(null);
  const field = useRef<MathFieldElement | null>(null);
  const emitted = useRef(value);
  const latest = useRef({ value, onChange, onSubmit, disabled });
  latest.current = { value, onChange, onSubmit, disabled };
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    void Promise.all([import("mathlive"), import("mathlive/static.css")]).then(
      () => {
        if (disposed || !host.current) return;
        const element = document.createElement(
          "math-field",
        ) as MathFieldElement;
        const emitValue = () => {
          const next = clean(element.getValue("ascii-math"));
          emitted.current = next;
          latest.current.onChange(next);
        };
        const insertMultiply = () => {
          element.insert("\\times ", { format: "latex", focus: true });
          emitValue();
        };
        element.inlineShortcuts = {};
        element.setAttribute("aria-label", "发射函数");
        element.setAttribute("data-guide-target", "gw.formula");
        element.setAttribute("math-virtual-keyboard-policy", "manual");
        element.addEventListener("input", emitValue);
        element.addEventListener(
          "keydown",
          (event) => {
            const keyboard = event as KeyboardEvent;
            if (
              keyboard.key === "*" &&
              !keyboard.altKey &&
              !keyboard.ctrlKey &&
              !keyboard.metaKey
            ) {
              keyboard.preventDefault();
              keyboard.stopPropagation();
              insertMultiply();
              return;
            }
            if (
              keyboard.key === "Enter" &&
              !keyboard.isComposing &&
              !keyboard.shiftKey
            ) {
              keyboard.preventDefault();
              latest.current.onSubmit?.();
            }
          },
          true,
        );
        element.setValue(latest.current.value, { format: "ascii-math" });
        host.current.appendChild(element);
        field.current = element;
        setReady(true);
      },
      () => {},
    );
    return () => {
      disposed = true;
      field.current?.remove();
      field.current = null;
    };
  }, []);
  useEffect(() => {
    const element = field.current;
    if (!ready || !element || latest.current.value === emitted.current) return;
    if (clean(element.getValue("ascii-math")) === latest.current.value) return;
    element.setValue(latest.current.value, { format: "ascii-math" });
    emitted.current = latest.current.value;
  }, [value, ready]);
  return (
    <div className="math-formula-field" data-ready={ready}>
      <input
        ref={fallback}
        className="math-formula-fallback"
        aria-label="发射函数"
        data-guide-target="gw.formula"
        value={value}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => latest.current.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.nativeEvent.isComposing &&
            !event.shiftKey
          ) {
            event.preventDefault();
            latest.current.onSubmit?.();
          }
        }}
      />
      <div ref={host} className="math-formula-host" />
    </div>
  );
}
