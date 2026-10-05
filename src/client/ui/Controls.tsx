import { SurfaceResize } from "../SurfaceResize";
import React, {
  Children,
  isValidElement,
  type ReactNode,
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
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={String(option.props.value)}
                value={String(option.props.value)}
                className="ui-select-item"
              >
                <SelectPrimitive.ItemText>
                  {option.props.children}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>✓</SelectPrimitive.ItemIndicator>
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
}: {
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
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="ui-switch-label">
      <SwitchPrimitive.Root
        className="ui-switch"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      >
        <SwitchPrimitive.Thumb className="ui-switch-thumb" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
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
}: {
  initialFocus?: React.RefObject<HTMLElement>;
  className?: string;
  scope?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-overlay" />
        <DialogPrimitive.Content
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
          <SurfaceResize id={title} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
