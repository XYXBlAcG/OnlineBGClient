import { useEffect, useRef, useState } from "react";

interface MathFieldElement extends HTMLElement {
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
  executeCommand(command: string): boolean;
  focus(): void;
}

const clean = (value: string) =>
  value
    .replace(/\\placeholder\{?\}?/g, "")
    .replace(/[−]/g, "-")
    .replace(/[×]/g, "*")
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
  const multiplyBinding = useRef<{
    target: HTMLElement;
    handler: (event: Event) => void;
  } | null>(null);
  const emitted = useRef(value);
  const latest = useRef({ value, onChange, onSubmit, disabled });
  latest.current = { value, onChange, onSubmit, disabled };
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let keyboard: HTMLElement | null = null;
    let keyboardObserver: MutationObserver | null = null;
    let bodyObserver: MutationObserver | null = null;
    let hideButton: HTMLButtonElement | null = null;
    let scrollFrame = 0;
    let scrollTimer = 0;
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
          element.insert("\\times ", {
            format: "latex",
            focus: true,
          });
          emitValue();
        };
        const multiplyKey = (event: Event) => {
          const target = event.target as HTMLElement | null;
          if (!target?.closest(".MLK__keycap")?.textContent?.includes("×"))
            return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          insertMultiply();
        };
        const clearKeyboardState = () => {
          clearKeyboardState();
        };
        const syncKeyboard = () => {
          if (!element.isConnected) return;
          const open = keyboard?.classList.contains("is-visible") ?? false;
          if (open) {
            document.body.dataset.mathKeyboard = "open";
            const height =
              keyboard
                ?.querySelector<HTMLElement>(".MLK__backdrop")
                ?.getBoundingClientRect().height ?? 0;
            document.documentElement.style.setProperty(
              "--math-keyboard-height",
              `${height}px`,
            );
            cancelAnimationFrame(scrollFrame);
            scrollFrame = requestAnimationFrame(() => {
              element.scrollIntoView({ block: "nearest", behavior: "smooth" });
            });
            clearTimeout(scrollTimer);
            scrollTimer = window.setTimeout(() => {
              element.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }, 320);
            return;
          }
          clearKeyboardState();
        };
        const bindKeyboard = () => {
          const found = document.querySelector<HTMLElement>(
            "body > .ML__keyboard",
          );
          if (!found) {
            keyboardObserver?.disconnect();
            if (multiplyBinding.current) {
              multiplyBinding.current.target.removeEventListener(
                "pointerdown",
                multiplyBinding.current.handler,
                true,
              );
              multiplyBinding.current = null;
            }
            if (keyboard || document.body.dataset.mathKeyboard)
              clearKeyboardState();
            keyboard = null;
            return false;
          }
          const same = keyboard === found;
          keyboard = found;
          if (!same) {
            if (multiplyBinding.current)
              multiplyBinding.current.target.removeEventListener(
                "pointerdown",
                multiplyBinding.current.handler,
                true,
              );
            found.addEventListener("pointerdown", multiplyKey, true);
            multiplyBinding.current = { target: found, handler: multiplyKey };
          }
          const backdrop = found.querySelector<HTMLElement>(".MLK__backdrop");
          if (backdrop && !backdrop.querySelector(".math-keyboard-hide")) {
            hideButton = document.createElement("button");
            hideButton.type = "button";
            hideButton.className = "math-keyboard-hide";
            hideButton.setAttribute("aria-label", "收起键盘");
            hideButton.setAttribute("data-math-keyboard-hide", "true");
            hideButton.innerHTML =
              '<span aria-hidden="true">⌄</span><span>收起</span>';
            hideButton.addEventListener("pointerdown", (event) =>
              event.stopPropagation(),
            );
            hideButton.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              (
                window as unknown as {
                  mathVirtualKeyboard?: {
                    hide(options?: { animate?: boolean }): void;
                  };
                }
              ).mathVirtualKeyboard?.hide({ animate: true });
              element.focus();
            });
            backdrop.appendChild(hideButton);
          }
          if (same) return true;
          keyboardObserver?.disconnect();
          keyboardObserver = new MutationObserver(() => {
            if (!keyboard?.querySelector(".math-keyboard-hide")) bindKeyboard();
            syncKeyboard();
          });
          keyboardObserver.observe(found, {
            attributes: true,
            attributeFilter: ["class"],
            childList: true,
            subtree: true,
          });
          syncKeyboard();
          return true;
        };
        element.setAttribute("aria-label", "发射函数");
        element.setAttribute("data-guide-target", "gw.formula");
        element.setAttribute("math-virtual-keyboard-policy", "manual");
        element.addEventListener("input", () => {
          const next = clean(element.getValue("ascii-math"));
          emitted.current = next;
          latest.current.onChange(next);
        });
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
        element.addEventListener("focus", () => {
          syncKeyboard();
        });
        element.addEventListener("virtual-keyboard-toggle", () => {
          window.setTimeout(() => {
            bindKeyboard();
            syncKeyboard();
          }, 0);
        });
        element.setValue(latest.current.value, { format: "ascii-math" });
        host.current.appendChild(element);
        field.current = element;
        bodyObserver = new MutationObserver(() => {
          bindKeyboard();
        });
        bodyObserver.observe(document.body, { childList: true });
        bindKeyboard();
        setReady(true);
      },
      () => {},
    );
    return () => {
      disposed = true;
      cancelAnimationFrame(scrollFrame);
      clearTimeout(scrollTimer);
      bodyObserver?.disconnect();
      keyboardObserver?.disconnect();
      hideButton?.remove();
      if (multiplyBinding.current) {
        multiplyBinding.current.target.removeEventListener(
          "pointerdown",
          multiplyBinding.current.handler,
          true,
        );
        multiplyBinding.current = null;
      }
      delete document.body.dataset.mathKeyboard;
      document.documentElement.style.removeProperty("--math-keyboard-height");
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
