import { useState } from "react";
import { applyTheme } from "../themes";
import { Button, SearchField, Select, Slider, Switch } from "../ui/Controls";
import styles from "./StyleGallery.module.css";

const colors = [
  "canvas",
  "surface",
  "raised",
  "field",
  "text",
  "muted",
  "accent",
  "line",
  "focus",
  "info",
  "success",
  "warning",
  "danger",
];

const themeOptions = [
  ["system", "跟随系统"],
  ["light", "浅色"],
  ["dark", "深色"],
] as const;

const swatchStyle = (name: string) => ({
  background: `var(--${name})`,
});

export function StyleGallery() {
  const [theme, setTheme] = useState(() =>
    typeof document === "undefined"
      ? "system"
      : (document.documentElement.dataset.theme ?? "system"),
  );
  return (
    <main className={`app-shell ${styles.gallery}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>开发预览</p>
          <h1>样式陈列室</h1>
        </div>
        <div className={styles.headerTools}>
          <p className={styles.note}>
            桌面与手机、浅色与深色、控件与反馈状态的统一检查入口。
          </p>
          <div
            className={styles.themeSwitch}
            role="group"
            aria-label="预览主题"
          >
            {themeOptions.map(([value, label]) => (
              <Button
                key={value}
                variant={theme === value ? "primary" : "secondary"}
                aria-pressed={theme === value}
                onClick={() => {
                  applyTheme(value);
                  setTheme(value);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <section className={styles.section}>
        <h2>颜色 token</h2>
        <div className={styles.swatches}>
          {colors.map((name) => (
            <div className={styles.swatch} key={name}>
              <span className={styles.swatchColor} style={swatchStyle(name)} />
              <strong>--{name}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.columns}>
        <section className={styles.section}>
          <h2>桌面面板</h2>
          <div className={styles.desktopFrame} data-viewport="desktop">
            <div className={styles.mockToolbar}>
              <strong>OnlineBGClient</strong>
              <span>大厅 · 已连接</span>
              <Button>设置</Button>
            </div>
            <div className={styles.mockBody}>
              <nav className="settings-nav" aria-label="设置分组">
                <button aria-pressed="true">外观</button>
                <button>界面显示</button>
                <button>消息与互动</button>
                <button>成就</button>
              </nav>
              <div className={styles.mockContent}>
                <h3>界面设置</h3>
                <SearchField label="搜索设置" value="" onChange={() => {}} />
                <Switch label="界面动画" checked onCheckedChange={() => {}} />
                <div className={styles.formRow}>
                  <span>主题</span>
                  <Select
                    aria-label="主题"
                    value="system"
                    onValueChange={() => {}}
                  >
                    <option value="system">跟随系统</option>
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                  </Select>
                </div>
                <div className={styles.formRow}>
                  <span>音量</span>
                  <div className={styles.sliderSlot}>
                    <Slider
                      aria-label="音量"
                      min={0}
                      max={1}
                      step={0.1}
                      value={0.6}
                      onValueChange={() => {}}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>手机面板</h2>
          <div className={styles.mobileFrame} data-viewport="mobile">
            <div className={styles.mobileHeading}>
              <span>OnlineBGClient</span>
              <span>大厅</span>
            </div>
            <div className={styles.mobileHero}>
              <strong>今晚玩什么？</strong>
              <p>选择游戏，创建房间。</p>
            </div>
            <SearchField label="搜索游戏" value="" onChange={() => {}} />
            <div className={styles.mobileActions}>
              <Button variant="primary">本地对局</Button>
              <Button>跨网络联机</Button>
            </div>
            <div className={styles.mobileCards}>
              <div className={styles.miniCard}>
                <span>飞行棋</span>
                <small>2–4 人</small>
              </div>
              <div className={styles.miniCard}>
                <span>秘塔远征</span>
                <small>1–4 人</small>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.section}>
        <h2>控件状态</h2>
        <div className={styles.showcaseGrid}>
          <div className={styles.surfaceCard}>
            <h3>按钮</h3>
            <div className={styles.row}>
              <Button variant="primary">主操作</Button>
              <Button>普通操作</Button>
              <Button variant="danger">危险操作</Button>
              <Button disabled>禁用</Button>
            </div>
          </div>
          <div className={styles.surfaceCard}>
            <h3>搜索与输入</h3>
            <SearchField label="搜索成就" value="三连六" onChange={() => {}} />
          </div>
          <div className={styles.surfaceCard}>
            <h3>状态</h3>
            <div className={styles.row}>
              <span className={styles.status} data-tone="info">
                信息
              </span>
              <span className={styles.status} data-tone="success">
                成功
              </span>
              <span className={styles.status} data-tone="warning">
                警告
              </span>
              <span className={styles.status} data-tone="danger">
                错误
              </span>
            </div>
          </div>
          <div className={styles.surfaceCard}>
            <h3>加载与空状态</h3>
            <div className={styles.skeleton} />
            <div className={styles.empty}>没有待继续的对局</div>
          </div>
        </div>
      </section>
    </main>
  );
}
