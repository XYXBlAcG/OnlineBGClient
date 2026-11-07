import { MahjongTile } from "./mahjong/MahjongTile";
import { tileName } from "../domain/mahjong/types";
import type { GuideVisual } from "./beginner-guides";

const ids = (types: number[]) => types.map((type, index) => type * 4 + index);

function Tiles({
  types,
  labels,
  transparent,
}: {
  types: number[];
  labels?: string[];
  transparent?: boolean;
}) {
  return (
    <div className="guide-tile-row">
      {ids(types).map((tile, index) => (
        <span className="guide-tile" key={`${tile}:${index}`}>
          <MahjongTile
            tile={tile}
            transparent={transparent && index % 2 === 0}
          />
          <small>{labels?.[index] ?? tileName(tile)}</small>
        </span>
      ))}
    </div>
  );
}

function Group({ title, types }: { title: string; types: number[] }) {
  return (
    <span className="guide-hand-group">
      <small>{title}</small>
      <span>{ids(types).map((tile) => <MahjongTile key={tile} tile={tile} />)}</span>
    </span>
  );
}

export function GuideVisualView({ kind }: { kind: GuideVisual }) {
  if (kind === "mahjong-tiles")
    return (
      <div className="guide-visual" aria-label="麻将牌示例">
        <Tiles
          types={[0, 4, 8, 9, 13, 17, 18, 22, 26, 27, 31]}
          labels={[
            "一万",
            "五万",
            "九万",
            "一筒",
            "五筒",
            "九筒",
            "一条",
            "五条",
            "九条",
            "字牌·东",
            "字牌·白",
          ]}
        />
        <p>万、筒、条是数牌；东南西北白发中是字牌。四川血战不使用字牌。</p>
      </div>
    );
  if (kind === "mahjong-hand")
    return (
      <div className="guide-visual" aria-label="胡牌牌形示例">
        <div className="guide-hand-groups">
          <Group title="顺子" types={[0, 1, 2]} />
          <Group title="顺子" types={[13, 14, 15]} />
          <Group title="顺子" types={[18, 19, 20]} />
          <Group title="刻子" types={[27, 27, 27]} />
          <Group title="雀头" types={[31, 31]} />
        </div>
        <p>四组三张加一对雀头。先看牌形，再看还缺哪一组。</p>
      </div>
    );
  if (kind === "mahjong-yaku")
    return (
      <div className="guide-visual" aria-label="役与牌形示例">
        <div className="guide-hand-groups">
          <Group title="牌形完成" types={[0, 1, 2]} />
          <Group title="还需要" types={[27, 27, 27]} />
        </div>
        <p>牌形完成不等于能和。日本立直至少需要一个役；宝牌只加番。</p>
      </div>
    );
  if (kind === "mahjong-dora")
    return (
      <div className="guide-visual" aria-label="宝牌指示示例">
        <div className="guide-dora-row">
          <Tiles types={[2]} labels={["指示牌"]} />
          <span className="guide-arrow">→</span>
          <Tiles types={[3]} labels={["宝牌"]} />
          <Tiles types={[4]} labels={["赤五"]} />
        </div>
        <p>指示牌的下一张是宝牌；宝牌加番，但不是役。</p>
      </div>
    );
  if (kind === "mahjong-calls")
    return (
      <div className="guide-visual" aria-label="吃碰杠示例">
        <div className="guide-hand-groups">
          <Group title="吃" types={[0, 1, 2]} />
          <Group title="碰" types={[13, 13, 13]} />
          <Group title="杠" types={[22, 22, 22, 22]} />
        </div>
        <p>吃只能吃上家；碰和杠会公开手牌，也可能失去门清与立直。</p>
      </div>
    );
  if (kind === "mahjong-riichi")
    return (
      <div className="guide-visual" aria-label="立直示例">
        <div className="guide-riichi-row">
          <strong className="guide-chip">1000 点</strong>
          <Tiles types={[0, 1, 2, 13, 14, 15]} labels={["听牌", "", "", "", "", ""]} />
          <span className="guide-arrow">→</span>
          <strong className="guide-badge">立直</strong>
        </div>
        <p>门清听牌且点数足够时立直；立直后通常只能打摸到的牌。</p>
      </div>
    );
  if (kind === "mahjong-furiten")
    return (
      <div className="guide-visual" aria-label="振听示例">
        <div className="guide-dora-row">
          <Tiles types={[2]} labels={["打过的听牌"]} />
          <span className="guide-cross">×</span>
          <strong className="guide-badge">不能荣和</strong>
          <strong className="guide-badge is-ok">仍可自摸</strong>
        </div>
        <p>自己打过当前听牌中的任意一张，就会振听；振听只限制荣和。</p>
      </div>
    );
  return (
    <div className="guide-visual" aria-label="透明牌示例">
      <div className="guide-dora-row">
        <Tiles types={[4, 4]} transparent />
        <span className="guide-badge">透明牌</span>
        <span className="guide-badge is-muted">暗牌</span>
      </div>
      <p>蓝色边角是透明牌，所有玩家都能看到；暗牌只显示牌背。</p>
    </div>
  );
}
