import { Select } from "./ui/Controls";
import { themes } from "./themes";
export function ThemeControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="theme-control">
      <span>外观</span>
      <Select aria-label="外观主题" value={value} onValueChange={onChange}>
        <option value="system">跟随系统</option>
        {themes.list().map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
