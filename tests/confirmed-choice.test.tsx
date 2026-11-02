import React from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import {
  ChoiceButton,
  useConfirmedAction,
} from "../src/client/ui/ConfirmedChoice";
it("单击仅选择，双击提交该按钮的值且同一状态不能重复提交", () => {
  const choose = vi.fn(),
    submit = vi.fn();
  function Harness({
    revision = 1,
    pending = false,
  }: {
    revision?: number;
    pending?: boolean;
  }) {
    const confirm = useConfirmedAction(revision, pending, submit);
    return (
      <ChoiceButton
        value="right"
        selected={false}
        onChoose={choose}
        onConfirm={confirm}
        disabled={pending}
      >
        右侧路线
      </ChoiceButton>
    );
  }
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<Harness />);
  });
  act(() => tree.root.findByType("button").props.onClick());
  expect(choose).toHaveBeenCalledWith("right");
  expect(submit).not.toHaveBeenCalled();
  act(() => {
    tree.root.findByType("button").props.onDoubleClick();
    tree.root.findByType("button").props.onDoubleClick();
  });
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledWith("right");
  act(() => tree.update(<Harness pending />));
  act(() => tree.root.findByType("button").props.onDoubleClick());
  expect(submit).toHaveBeenCalledTimes(1);
  act(() => tree.update(<Harness revision={2} />));
  act(() => tree.root.findByType("button").props.onDoubleClick());
  expect(submit).toHaveBeenCalledTimes(2);
  act(() => tree.unmount());
});
it("失败后待响应状态解除可以重试，观察者只有选择权", () => {
  const submit = vi.fn(),
    choose = vi.fn();
  function Harness({
    pending = false,
    readonly = false,
  }: {
    pending?: boolean;
    readonly?: boolean;
  }) {
    const confirm = useConfirmedAction(1, pending, submit);
    return (
      <ChoiceButton
        value={2}
        selected
        onChoose={choose}
        onConfirm={readonly ? undefined : confirm}
      >
        动作
      </ChoiceButton>
    );
  }
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<Harness />);
  });
  act(() => tree.root.findByType("button").props.onDoubleClick());
  act(() => tree.update(<Harness pending />));
  act(() => tree.update(<Harness />));
  act(() => tree.root.findByType("button").props.onDoubleClick());
  expect(submit).toHaveBeenCalledTimes(2);
  act(() => tree.update(<Harness readonly />));
  act(() => {
    tree.root.findByType("button").props.onClick();
    tree.root.findByType("button").props.onDoubleClick();
  });
  expect(choose).toHaveBeenCalledWith(2);
  expect(submit).toHaveBeenCalledTimes(2);
  act(() => tree.unmount());
});

it("未发生提交的选择不会锁住同一状态下的下一次确认", () => {
  const submit = vi.fn((value: string) =>
    value === "valid" ? undefined : false,
  );
  function Harness() {
    const confirm = useConfirmedAction(1, false, submit);
    return (
      <>
        <ChoiceButton
          value="invalid"
          selected={false}
          onChoose={() => {}}
          onConfirm={confirm}
        >
          已投路线
        </ChoiceButton>
        <ChoiceButton
          value="valid"
          selected={false}
          onChoose={() => {}}
          onConfirm={confirm}
        >
          另一条路线
        </ChoiceButton>
      </>
    );
  }
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<Harness />);
  });
  act(() => {
    tree.root.findAllByType("button")[0].props.onDoubleClick();
    tree.root.findAllByType("button")[1].props.onDoubleClick();
  });
  expect(submit.mock.calls).toEqual([["invalid"], ["valid"]]);
  act(() => tree.unmount());
});
