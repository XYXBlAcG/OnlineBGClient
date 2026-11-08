import { auxiliaryView } from "../native/contract";
import React, {
  Children,
  isValidElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export function Select({
  value,
  onValueChange,
  children,
  className = "",
  disabled,
  ...props
}: {
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const options = Children.toArray(children).filter(
    isValidElement,
  ) as React.ReactElement<{ value: string | number; children: ReactNode }>[];
  return (
    <SelectPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      value={String(value)}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger {...props} className={`ui-select ${className}`}>
        <SelectPrimitive.Value>
          {
            options.find(
              (option) => String(option.props.value) === String(value),
            )?.props.children
          }
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="ui-chevron">⌄</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-motion-scope="ui"
          className="ui-select-menu"
          position="popper"
          sideOffset={6}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <SelectPrimitive.ScrollUpButton className="ui-scroll">
            ⌃
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="ui-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={String(option.props.value)}
                value={String(option.props.value)}
                className="ui-select-item"
              >
                <SelectPrimitive.ItemText>
                  {option.props.children}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ui-select-indicator">
                  ✓
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="ui-scroll">
            ⌄
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
export function Slider({
  value,
  onValueChange,
  min,
  max,
  step,
  "aria-label": label,
  disabled = false,
}: {
  disabled?: boolean;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  "aria-label": string;
}) {
  return (
    <SliderPrimitive.Root
      className="ui-slider"
      disabled={disabled}
      value={[value]}
      onValueChange={(values) => onValueChange(values[0])}
      min={min}
      max={max}
      step={step}
    >
      <SliderPrimitive.Track className="ui-slider-track">
        <SliderPrimitive.Range className="ui-slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="ui-slider-thumb" aria-label={label} />
    </SliderPrimitive.Root>
  );
}
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  id,
  className = "",
  "aria-describedby": describedBy,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-describedby"?: string;
}) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  return (
    <label className={`ui-switch-label ${className}`.trim()}>
      <SwitchPrimitive.Root
        id={controlId}
        className="ui-switch"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        aria-describedby={describedBy}
      >
        <SwitchPrimitive.Thumb className="ui-switch-thumb" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  );
}

export function RadioChoice<T extends string>({
  value,
  onValueChange,
  options,
  label,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
}) {
  return (
    <fieldset className="ui-radio-choice" aria-label={label}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value} data-selected={value === option.value}>
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={value === option.value}
              onChange={() => onValueChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const useFieldLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function SearchField({
  label,
  className = "",
  value,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  label: string;
}) {
  const id = React.useId();
  return (
    <label className={`ui-search-field ${className}`.trim()} htmlFor={id}>
      <input
        {...props}
        id={id}
        type={props.type ?? "search"}
        value={value}
        placeholder={label}
        aria-label={props["aria-label"] ?? label}
      />
    </label>
  );
}
export function TextField({
  label,
  hint,
  className = "",
  value,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  label: string;
  hint?: string;
}) {
  const id = React.useId();
  const field = useRef<HTMLLabelElement>(null);
  const caption = useRef<HTMLSpanElement>(null);
  const text = value === undefined ? "" : String(value);
  const filled = text.length > 0;
  const summary =
    props.type === "password"
      ? "•".repeat(Math.min(12, Array.from(text).length))
      : text;
  const syncNotch = () => {
    const root = field.current,
      text = caption.current;
    if (!root || !text) return;
    const start = Math.max(0, text.offsetLeft - 6);
    const end = Math.min(
      root.clientWidth,
      text.offsetLeft + text.offsetWidth + 6,
    );
    root.style.setProperty("--ui-field-notch-start", `${start}px`);
    root.style.setProperty("--ui-field-notch-end", `${end}px`);
  };
  useFieldLayoutEffect(() => {
    syncNotch();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncNotch);
    if (field.current) observer.observe(field.current);
    if (caption.current) observer.observe(caption.current);
    return () => observer.disconnect();
  }, [label, value]);
  return (
    <label
      ref={field}
      className={`ui-field ${className}`.trim()}
      data-filled={filled}
      htmlFor={id}
    >
      <span ref={caption} className="ui-field-label">
        {label}
      </span>
      <span className="ui-field-summary" aria-hidden="true">
        <span className="ui-field-summary-label">{label}</span>
        {filled && <span className="ui-field-summary-value"> · {summary}</span>}
      </span>
      <input
        {...props}
        id={id}
        value={value}
        aria-label={props["aria-label"] ?? label}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Panel({
  open,
  onOpenChange,
  title,
  children,
  className = "",
  scope,
  initialFocus,
  overlayClassName = "",
}: {
  overlayClassName?: string;
  initialFocus?: React.RefObject<HTMLElement>;
  className?: string;
  scope?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  if (auxiliaryView)
    return open ? (
      <section
        className={`native-content ${className}`}
        data-command-scope={scope}
        aria-label={title}
      >
        {children}
      </section>
    ) : null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-motion-scope="ui"
          className={`ui-overlay ${overlayClassName}`}
        />
        <DialogPrimitive.Content
          data-motion-scope="ui"
          className={`ui-panel ${className}`}
          data-command-scope={scope}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              event.currentTarget.contains(event.target as Node)
            ) {
              event.stopPropagation();
              onOpenChange(false);
            }
          }}
          onOpenAutoFocus={(event) => {
            if (initialFocus?.current) {
              event.preventDefault();
              initialFocus.current.focus();
            }
          }}
          aria-describedby={undefined}
        >
          <div className="ui-panel-heading">
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="icon-button" aria-label="关闭">
              ×
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
  }
>(function Button(
  { variant = "secondary", className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      data-button-variant={variant}
      className={`${variant === "primary" ? "primary-button " : ""}${className}`.trim()}
    />
  );
});
