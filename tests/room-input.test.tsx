import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { KeyBindingEditor } from "../src/client/KeyBindingEditor";
import { Lobby } from "../src/client/Lobby";
import { defaultPreferences } from "../src/client/preferences";
import { usePreferences } from "../src/client/use-preferences";
const command = {
  id: "a",
  title: "操作",
  scope: "global",
  binding: "F1",
  enabled: () => true,
  run: () => {},
};
afterEach(() => vi.unstubAllGlobals());
it("focuses recording, cancels Escape, clears Delete, and waits for persistence", async () => {
  const focus = vi.fn();
  let resolve!: () => void;
  const bind = vi.fn(() => new Promise<void>((done) => (resolve = done)));
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <KeyBindingEditor command={command} commands={[command]} onBind={bind} />,
      {
        createNodeMock: (element) =>
          element.type === "input" ? { focus } : null,
      },
    );
  });
  const arm = () =>
    act(() =>
      tree.root.findByProps({ className: "key-binding" }).props.onClick(),
    );
  const key = (key: string) => ({
    key,
    repeat: false,
    nativeEvent: { isComposing: false },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  });
  arm();
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  act(() =>
    tree.root.findByType("input").props.onKeyDownCapture(key("Escape")),
  );
  expect(tree.root.findAllByType("input")).toHaveLength(0);
  expect(bind).not.toHaveBeenCalled();
  arm();
  await act(async () =>
    tree.root.findByType("input").props.onKeyDownCapture(key("Delete")),
  );
  expect(bind).toHaveBeenCalledWith("a", "");
  expect(JSON.stringify(tree.toJSON())).toContain("保存中");
  expect(JSON.stringify(tree.toJSON())).not.toContain("已保存");
  await act(async () => resolve());
  expect(JSON.stringify(tree.toJSON())).toContain("已保存");
  expect(JSON.stringify(tree.toJSON())).toContain("未绑定");
  act(() => tree.unmount());
});
it("reports persistence failure and keeps the previous shortcut", async () => {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <KeyBindingEditor
        command={command}
        commands={[command]}
        onBind={async () => {
          throw Error("存储失败");
        }}
      />,
    );
  });
  act(() =>
    tree.root.findByProps({ className: "key-binding" }).props.onClick(),
  );
  await act(async () =>
    tree.root
      .findAllByType("button")
      .find((button) => button.props.children === "清除")!
      .props.onClick(),
  );
  expect(JSON.stringify(tree.toJSON())).toContain("存储失败");
  expect(JSON.stringify(tree.toJSON())).not.toContain("已保存");
  expect(tree.root.findAllByType("input")).toHaveLength(1);
  act(() => tree.unmount());
});
it("keeps joining and creating mutually exclusive and retains invitation input", () => {
  vi.stubGlobal("window", { clearTimeout, setTimeout });
  vi.stubGlobal("HTMLFormElement", class {});
  vi.stubGlobal("localStorage", { getItem: () => null });
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <Lobby
        service="http://localhost:8787"
        initialRoom=""
        busy={false}
        onCreate={() => {}}
        onJoin={() => {}}
        preferences={defaultPreferences}
        onPreferencesChange={() => {}}
      />,
    );
  });
  const click = (title: string, role?: string) =>
    act(() =>
      tree.root
        .findAllByType("button")
        .find(
          (button) =>
            button.props.children === title &&
            (!role || button.props.role === role),
        )!
        .props.onClick(),
    );
  click("跨网络联机");
  expect(
    tree.root.findByProps({ className: "game-library" }).props.hidden,
  ).toBe(true);
  const inputs = tree.root.findAllByType("input");
  const invitation = inputs.find(
    (input) => input.props.placeholder === "粘贴邀请链接",
  )!;
  expect(invitation).toBeDefined();
  act(() =>
    invitation.props.onChange({
      target: { value: "https://example.test/?room=abc" },
    }),
  );
  click("创建房间", "tab");
  expect(tree.root.findAllByProps({ className: "game-library" })).toHaveLength(
    1,
  );
  expect(
    tree.root
      .findAllByType("input")
      .some((input) => input.props.placeholder === "粘贴邀请链接"),
  ).toBe(false);
  click("加入", "tab");
  expect(
    tree.root
      .findAllByType("input")
      .some((input) => input.props.value === "https://example.test/?room=abc"),
  ).toBe(true);
  act(() => tree.unmount());
});
it("commits preference state only after storage succeeds", () => {
  const store = vi.fn((_key: string, _value: string): void => {
    throw Error("quota");
  });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: store });
  let current!: ReturnType<typeof usePreferences>;
  let tree!: ReturnType<typeof create>;
  function Harness() {
    current = usePreferences((value) => value);
    return null;
  }
  act(() => {
    tree = create(<Harness />);
  });
  expect(() =>
    act(() => current[1]((value) => ({ ...value, computeDetails: true }))),
  ).toThrow("quota");
  expect(current[0].computeDetails).toBe(false);
  store.mockImplementation(() => {});
  act(() => current[1]((value) => ({ ...value, computeDetails: true })));
  expect(current[0].computeDetails).toBe(true);
  expect(JSON.parse(store.mock.calls.at(-1)![1]).computeDetails).toBe(true);
  act(() => tree.unmount());
});

it("retains the game library across mode changes and creates with settings-owned network configuration", () => {
  vi.stubGlobal("window", { clearTimeout, setTimeout });
  vi.stubGlobal("HTMLFormElement", class {});
  vi.stubGlobal("localStorage", { getItem: () => null });
  const onCreate = vi.fn();
  let tree!: ReturnType<typeof create>;
  const props = {
    service: "http://localhost:8787",
    initialRoom: "",
    busy: false,
    onCreate,
    onJoin: () => {},
    preferences: {
      ...defaultPreferences,
      network: { temporary: false, service: "https://rooms.example.test" },
    },
    onPreferencesChange: () => {},
  };
  act(() => {
    tree = create(<Lobby {...props} />);
  });
  const library = tree.root.findByProps({ className: "game-library" });
  act(() =>
    tree.root
      .findAllByType("button")
      .find((button) => button.props.children === "跨网络联机")!
      .props.onClick(),
  );
  expect(tree.root.findByProps({ className: "game-library" })).toBe(library);
  expect(library.props.hidden).toBe(true);
  act(() =>
    tree.root
      .findAllByType("button")
      .find(
        (button) =>
          button.props.role === "tab" && button.props.children === "创建房间",
      )!
      .props.onClick(),
  );
  expect(library.props.hidden).toBe(false);
  expect(JSON.stringify(tree.toJSON())).not.toContain("更多设置");
  act(() =>
    tree.root
      .findAllByType("button")
      .find((button) => button.props.className?.startsWith("primary-button"))!
      .props.onClick(),
  );
  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({ training: false }),
    "我",
    "network",
    "https://rooms.example.test",
    false,
    false,
  );
  act(() => tree.update(<Lobby {...props} busy />));
  expect(
    tree.root
      .findAllByType("button")
      .find((button) => button.props.className?.startsWith("primary-button"))!
      .props["aria-busy"],
  ).toBe(true);
  act(() => tree.unmount());
});
