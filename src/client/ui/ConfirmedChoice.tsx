import {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
} from "react";
export function useConfirmedAction<T>(
  revision: number,
  pending: boolean,
  onConfirm: (value: T) => void | boolean,
) {
  const submitted = useRef(false);
  useEffect(() => {
    if (!pending) submitted.current = false;
  }, [revision, pending]);
  return useCallback(
    (value: T) => {
      if (pending || submitted.current) return;
      submitted.current = true;
      try {
        if (onConfirm(value) === false) submitted.current = false;
      } catch (error) {
        submitted.current = false;
        throw error;
      }
    },
    [revision, pending, onConfirm],
  );
}
export function ChoiceButton<T>({
  value,
  selected,
  onChoose,
  onConfirm,
  disabled,
  children,
  ...props
}: Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onClick" | "onDoubleClick"
> & {
  value: T;
  selected: boolean;
  onChoose: (value: T) => void;
  onConfirm?: (value: T) => void;
}) {
  return (
    <button
      {...props}
      type="button"
      style={{ touchAction: "manipulation", ...props.style }}
      disabled={disabled}
      {...(props.role === "option"
        ? { "aria-selected": selected }
        : { "aria-pressed": selected })}
      onClick={() => {
        if (!disabled) onChoose(value);
      }}
      onDoubleClick={() => {
        if (!disabled) onConfirm?.(value);
      }}
    >
      {children}
    </button>
  );
}
