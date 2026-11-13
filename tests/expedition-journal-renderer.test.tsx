import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpeditionJournalGallery } from "../src/client/expedition/ExpeditionJournalPanel";
import { ExpeditionOptionsControl } from "../src/client/expedition/ExpeditionOptionsControl";
import { emptyJournal } from "../src/domain/expedition/journal";
import { legacyNodeIds, legacyProfile } from "../src/domain/expedition/legacy";

it("renders the archive overview, tabs and growth explanation", () => {
  const html = renderToString(
    <ExpeditionJournalGallery
      journal={emptyJournal}
      onUpgrade={async () => {}}
      onExport={() => {}}
      onImport={async () => {}}
    />,
  );
  expect(html).toContain("远征档案");
  expect(html).toContain("探索次数");
  expect(html).toContain("局外传承");
  expect(html).toContain("单局成长");
  expect(html).toMatch(/职业(<!-- -->)? 0\/9/);
  expect(html).toMatch(/卡牌(<!-- -->)? 0\/240/);
  expect(html).toMatch(/遗物(<!-- -->)? 0\/71/);
});

it("renders every legacy node as a tiered tech tree", () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ExpeditionJournalGallery
        journal={emptyJournal}
        onUpgrade={async () => {}}
        onExport={() => {}}
        onImport={async () => {}}
      />,
    );
  });
  const tab = tree.root
    .findAllByType("button")
    .find((button) => button.children.join("") === "传承");
  act(() => tab?.props.onClick());
  expect(
    tree.root.findAll(
      (node) =>
        node.type === "article" && node.props.className === "exp-journal-node",
    ),
  ).toHaveLength(legacyNodeIds.length);
  expect(
    tree.root.findAll(
      (node) =>
        node.type === "header" && String(node.children[0]).startsWith("阶段 "),
    ),
  ).toHaveLength(6);
});

it("renders all cards with a discovered card selected", () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ExpeditionJournalGallery
        journal={{
          ...emptyJournal,
          runs: {
            card: {
              chapter: 0,
              won: false,
              ascension: 0,
              settled: true,
              knowledge: 6,
              professions: [0],
              cards: ["strike"],
              relics: [],
              bosses: [],
            },
          },
        }}
        onUpgrade={async () => {}}
        onExport={() => {}}
        onImport={async () => {}}
      />,
    );
  });
  const tab = tree.root
    .findAllByType("button")
    .find((button) => button.children.join("").startsWith("卡牌"));
  act(() => tab?.props.onClick());
  expect(
    tree.root.findAll(
      (node) =>
        node.type === "button" && node.props.className === "exp-journal-card",
    ),
  ).toHaveLength(240);
  expect(
    tree.root.findByProps({ className: "exp-journal-detail" }),
  ).toBeTruthy();
});

it("shows the host legacy bonuses in expedition options", () => {
  const html = renderToString(
    <ExpeditionOptionsControl
      value={{
        difficulty: "standard",
        ascension: 0,
        endless: false,
        legacy: [...legacyNodeIds],
      }}
      onChange={() => {}}
      journal={{ ...emptyJournal, legacy: [...legacyNodeIds] }}
    />,
  );
  expect(html).toContain("远征传承");
  expect(html).toContain("起始金币 +30");
  expect(html).toContain("首次奖励重选免费");
  expect(html).toContain("来自房主档案");
});

it("summarizes the full legacy profile without duplicate nodes", () => {
  expect(legacyProfile([...legacyNodeIds, ...legacyNodeIds])).toEqual(
    legacyProfile(legacyNodeIds),
  );
});
