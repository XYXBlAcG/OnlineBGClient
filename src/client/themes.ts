import { z } from "zod";

const color = z
  .string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
export const themeSchema = z.object({
  apiVersion: z.literal(1),
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1).max(24),
  scheme: z.enum(["light", "dark"]),
  tokens: z
    .object({
      canvas: color,
      surface: color,
      raised: color,
      field: color,
      text: color,
      muted: color,
      accent: color,
      "accent-text": color,
      hover: color,
      line: color,
      focus: color,
      disabled: color,
      "disabled-text": color,
    })
    .strict(),
});
export type ThemePlugin = z.infer<typeof themeSchema>;
export class ThemeRegistry {
  private themes = new Map<string, ThemePlugin>();
  register(input: unknown): void {
    const theme = themeSchema.parse(input);
    if (this.themes.has(theme.id)) throw new Error("主题标识重复");
    this.themes.set(theme.id, theme);
  }
  get(id: string): ThemePlugin {
    const theme = this.themes.get(id);
    if (!theme) throw new Error("主题尚未安装");
    return theme;
  }
  list(): ThemePlugin[] {
    return [...this.themes.values()];
  }
}
export const lightTheme: ThemePlugin = {
  apiVersion: 1,
  id: "light",
  label: "浅色",
  scheme: "light",
  tokens: {
    canvas: "#f3f4f6",
    surface: "#fff",
    raised: "#fff",
    field: "#edeff2",
    text: "#242830",
    muted: "#626b79",
    accent: "#256cda",
    "accent-text": "#fff",
    hover: "#e5edf9",
    line: "#d9dde4",
    focus: "#4c8ff2",
    disabled: "#e4e7ec",
    "disabled-text": "#687282",
  },
};
export const darkTheme: ThemePlugin = {
  apiVersion: 1,
  id: "dark",
  label: "深色",
  scheme: "dark",
  tokens: {
    canvas: "#17191e",
    surface: "#23262d",
    raised: "#2b2f38",
    field: "#303540",
    text: "#eef1f7",
    muted: "#adb5c4",
    accent: "#5b9bf0",
    "accent-text": "#111827",
    hover: "#35445c",
    line: "#414751",
    focus: "#4c8ff2",
    disabled: "#30343d",
    "disabled-text": "#a0a9b8",
  },
};
export const themes = new ThemeRegistry();
themes.register(lightTheme);
themes.register(darkTheme);
export function applyTheme(id: string): void {
  const effective =
    id === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : id;
  const theme = themes.get(effective);
  const root = document.documentElement;
  root.dataset.theme = id;
  root.style.colorScheme = theme.scheme;
  for (const [name, value] of Object.entries(theme.tokens))
    root.style.setProperty(`--${name}`, value);
  root.style.setProperty(
    "--shadow",
    theme.scheme === "dark" ? "0 10px 36px #0005" : "0 8px 30px #15233d19",
  );
}
