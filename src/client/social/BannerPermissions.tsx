import type { Snapshot } from "../../domain/protocol";
import type { BannerPolicy } from "../../domain/banner";
import { Select } from "../ui/Controls";
export function BannerPermissions({
  snapshot,
  onChange,
}: {
  snapshot: Snapshot;
  onChange: (policy: BannerPolicy) => void;
}) {
  const policy = snapshot.bannerPolicy;
  return (
    <section className="banner-permissions">
      <h3>横幅与全屏表情</h3>
      <Select
        aria-label="横幅使用权限"
        value={policy.mode}
        onValueChange={(mode) =>
          onChange({ ...policy, mode: mode as BannerPolicy["mode"] })
        }
      >
        <option value="host">仅房主</option>
        <option value="selected">房主和指定玩家</option>
        <option value="all">所有玩家</option>
        <option value="off">禁止发送</option>
      </Select>
      {policy.mode === "selected" &&
        snapshot.seats
          .filter(
            (seat, index) =>
              seat.id && !seat.difficulty && seat.name && index > 0,
          )
          .map((seat) => (
            <label key={seat.id} className="setting-row">
              <span>{seat.name}</span>
              <input
                type="checkbox"
                checked={policy.members.includes(seat.id)}
                onChange={(event) =>
                  onChange({
                    ...policy,
                    members: event.target.checked
                      ? [...policy.members, seat.id]
                      : policy.members.filter((id) => id !== seat.id),
                  })
                }
              />
            </label>
          ))}
    </section>
  );
}
