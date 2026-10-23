import { balance } from "./balance";
import {
  battlefield,
  type GraphwarView,
  type Point,
  type Soldier,
} from "./types";
import { BattlefieldIndex, circleInterval, distance } from "./trajectory";
export class Movement {
  readonly unit: Soldier;
  private field: BattlefieldIndex;
  constructor(
    readonly view: GraphwarView,
    soldier: number,
  ) {
    const unit = view.soldiers.find((s) => s.id === soldier && s.hp > 0);
    if (!unit) throw new Error("请选择自己的存活士兵");
    this.unit = unit;
    this.field = new BattlefieldIndex(view);
  }
  check(point: Point): { allowed: boolean; reason: string; distance: number } {
    const d = distance(this.unit, point),
      bounds = battlefield(this.view),
      direction = this.view.teams[this.unit.player] === 0 ? -1 : 1;
    let reason = "";
    if (!Number.isFinite(point.x + point.y)) reason = "目的地无效";
    else if (d < 0.01) reason = "请选择新的目的地";
    else if (point.x * direction < balance.soldierRadius)
      reason = "不能越过中线";
    else if (
      Math.abs(point.x) > bounds.width / 2 - balance.soldierRadius ||
      Math.abs(point.y) > bounds.height / 2 - balance.soldierRadius
    )
      reason = "不能离开战场";
    else if (d > balance.moveDistance + 1e-6)
      reason = `超出移动距离 ${balance.moveDistance}`;
    else if (this.field.sweep(this.unit, point, balance.soldierRadius))
      reason = "路径被障碍阻挡";
    else if (
      this.view.soldiers.some(
        (s) =>
          s.hp > 0 &&
          s.id !== this.unit.id &&
          circleInterval(
            { ...s, radius: balance.soldierRadius * 2 },
            this.unit,
            point,
          ),
      )
    )
      reason = "路径与其他士兵重叠";
    return { allowed: !reason, reason, distance: d };
  }
}
