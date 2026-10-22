import { useEffect, useState } from "react";
import { avatarPresets, avatarSchema } from "../domain/avatar";
export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (avatar: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const result = avatarSchema.safeParse(draft);
  return (
    <section className="avatar-picker" aria-label="玩家头像">
      <div className="avatar-picker-input">
        <span className="avatar-preview" aria-hidden="true">
          {value}
        </span>
        <label>
          自定义头像
          <input
            aria-label="自定义头像"
            value={draft}
            maxLength={128}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!result.success || result.data === value}
          onClick={() => {
            if (result.success) onChange(result.data);
          }}
        >
          使用头像
        </button>
      </div>
      <p className="muted" aria-live="polite">
        {result.success
          ? "一个 emoji 或单个汉字"
          : "请输入一个 emoji 或单个汉字"}
      </p>
      <div className="avatar-presets">
        {avatarPresets.map((avatar) => (
          <button
            type="button"
            key={avatar}
            aria-label={`头像 ${avatar}`}
            aria-pressed={value === avatar}
            onClick={() => onChange(avatar)}
          >
            {avatar}
          </button>
        ))}
      </div>
    </section>
  );
}
