import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { Stepper } from "../src/client/ui/Controls";

it("steps seat counts with buttons and clamps typed values", () => {
  const change = vi.fn();
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <Stepper
        label="真人人数"
        value={2}
        min={1}
        max={4}
        onValueChange={change}
      />,
    );
  });
  const buttons = tree.root.findAllByType("button");
  act(() => buttons[1].props.onClick());
  expect(change).toHaveBeenLastCalledWith(3);
  act(() => buttons[0].props.onClick());
  expect(change).toHaveBeenLastCalledWith(1);
  const input = tree.root.findByType("input");
  act(() => input.props.onChange({ target: { value: "9" } }));
  act(() => input.props.onBlur());
  expect(change).toHaveBeenLastCalledWith(4);
  act(() => input.props.onChange({ target: { value: "0" } }));
  act(() => input.props.onBlur());
  expect(change).toHaveBeenLastCalledWith(1);
  act(() => tree.unmount());
});
