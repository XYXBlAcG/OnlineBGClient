import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  gameCatalogue,
  gameKinds,
  type GameKind,
} from "../../domain/catalogue";
import {
  nativeDdzHand,
  nativeShellDevice,
  nativeShellPreviewOptions,
  nativeShellScreens,
  nativeUnoHand,
  toggleNativeCard,
  type NativeHandCard,
  type NativeShellScreen,
} from "../../shared/native-shell";
import { GameCover } from "../lobby/GameCover";
import { applyTheme } from "../themes";
import "../lobby/lobby.css";
import "../ui/native-shell-preview.css";

type PreviewTheme = "light" | "dark";
type HandGame = "uno" | "ddz";

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h6M14 7h6M4 12h10M18 12h2M4 17h3M11 17h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7" r="2.2" fill="currentColor" />
      <circle cx="16" cy="12" r="2.2" fill="currentColor" />
      <circle cx="9" cy="17" r="2.2" fill="currentColor" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.5 14.5 14.5 9.5M8 17H6.5a3.5 3.5 0 0 1 0-7H9M16 7h1.5a3.5 3.5 0 0 1 0 7H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m14.5 5-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4M7 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBar({ island }: { island: boolean }) {
  return (
    <>
      <div className="native-status-bar" aria-hidden="true">
        <span>9:41</span>
        <span className="native-status-icons">
          <svg viewBox="0 0 18 12" fill="currentColor">
            <rect x="0" y="7" width="3" height="5" rx="1" />
            <rect x="5" y="5" width="3" height="7" rx="1" />
            <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg viewBox="0 0 16 12" fill="currentColor">
            <path d="M8 11.2 5.7 8.9a3.3 3.3 0 0 1 4.6 0Zm-4-4.1L2.6 5.7a7.7 7.7 0 0 1 10.8 0L12 7.1a5.7 5.7 0 0 0-8 0Z" />
          </svg>
          <svg viewBox="0 0 26 12" fill="none">
            <rect
              x="1"
              y="1"
              width="22"
              height="10"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect
              x="3"
              y="3"
              width="16"
              height="6"
              rx="1.5"
              fill="currentColor"
            />
            <path
              d="M24 4v4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
      {island && (
        <div className="native-island" aria-hidden="true">
          <span />
        </div>
      )}
    </>
  );
}

function TabBar({
  screen,
  onScreen,
}: {
  screen: NativeShellScreen;
  onScreen: (screen: NativeShellScreen) => void;
}) {
  const items: { id: NativeShellScreen; label: string; icon: ReactNode }[] = [
    { id: "home", label: "首页", icon: <IconHome /> },
    { id: "lobby", label: "大厅", icon: <IconGrid /> },
    { id: "settings", label: "设置", icon: <IconGear /> },
  ];
  return (
    <nav className="native-tab-bar" aria-label="主要导航">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={screen === item.id ? "is-active" : ""}
          aria-pressed={screen === item.id}
          onClick={() => onScreen(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function HomeScreen({
  lastGame,
  onScreen,
  onLocal,
  onJoin,
}: {
  lastGame: GameKind;
  onScreen: (screen: NativeShellScreen) => void;
  onLocal: (kind: GameKind) => void;
  onJoin: () => void;
}) {
  const game = gameCatalogue[lastGame];
  return (
    <div className="native-screen">
      <header className="native-hero-heading">
        <p className="native-eyebrow">OnlineBGClient</p>
        <h1>今晚玩什么？</h1>
        <p>和朋友开一桌，或者自己先玩一局。</p>
      </header>
      <section className="native-hero-card">
        <GameCover kind={lastGame} />
        <div className="native-hero-copy">
          <small>上次玩的</small>
          <strong>{game.name}</strong>
          <p>{game.description}</p>
        </div>
        <button
          type="button"
          className="native-primary"
          onClick={() => onLocal(lastGame)}
        >
          <IconSpark />
          {game.ai ? "和 AI 玩" : "同屏开局"}
        </button>
      </section>
      <div className="native-action-grid">
        <button type="button" onClick={() => onScreen("lobby")}>
          <span className="native-action-icon">
            <IconGrid />
          </span>
          <strong>本地大厅</strong>
          <small>选择游戏和 AI</small>
        </button>
        <button type="button" onClick={onJoin}>
          <span className="native-action-icon">
            <IconLink />
          </span>
          <strong>加入房间</strong>
          <small>链接或二维码</small>
        </button>
      </div>
      <button
        type="button"
        className="native-recent"
        onClick={() => onLocal("uno")}
      >
        <span className="native-recent-avatar">U</span>
        <span>
          <strong>继续上次房间</strong>
          <small>UNO · 4 人 · 等待加入</small>
        </span>
        <span className="native-chevron">›</span>
      </button>
    </div>
  );
}

function LobbyScreen({
  selected,
  onSelect,
  onBack,
}: {
  selected: GameKind;
  onSelect: (kind: GameKind) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const categories = useMemo(
    () => [
      "全部",
      "常玩",
      "收藏",
      ...new Set(gameKinds.map((kind) => gameCatalogue[kind].category)),
    ],
    [],
  );
  const kinds = useMemo(
    () =>
      gameKinds.filter(
        (kind) =>
          (category === "全部" || gameCatalogue[kind].category === category) &&
          gameCatalogue[kind].name
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [category, query],
  );
  return (
    <div className="native-screen native-lobby-screen">
      <header className="native-large-heading">
        <div>
          <p className="native-eyebrow">本地开局</p>
          <h1>选择游戏</h1>
        </div>
        <button
          type="button"
          className="native-icon-button"
          aria-label="返回首页"
          onClick={onBack}
        >
          <IconBack />
        </button>
      </header>
      <div className="native-search">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle
            cx="11"
            cy="11"
            r="6"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m16 16 4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <input
          aria-label="搜索游戏"
          placeholder="搜索游戏"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="native-chips" role="tablist" aria-label="游戏分类">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={category === item}
            className={category === item ? "is-active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="native-game-grid">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`native-game-card ${selected === kind ? "is-selected" : ""}`}
            aria-pressed={selected === kind}
            onClick={() => onSelect(kind)}
          >
            <GameCover kind={kind} />
            <span className="native-game-copy">
              <strong>{gameCatalogue[kind].name}</strong>
              <small>{gameCatalogue[kind].description}</small>
              <span>
                {gameCatalogue[kind].minPlayers}–
                {gameCatalogue[kind].maxPlayers} 人
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function JoinScreen({
  onBack,
  onJoined,
}: {
  onBack: () => void;
  onJoined: () => void;
}) {
  const [link, setLink] = useState("");
  const [name, setName] = useState("我");
  return (
    <div className="native-screen native-join-screen">
      <header className="native-nav">
        <button
          type="button"
          className="native-icon-button"
          aria-label="返回"
          onClick={onBack}
        >
          <IconBack />
        </button>
        <strong>加入房间</strong>
        <span />
      </header>
      <div className="native-join-body">
        <div className="native-join-illustration">
          <IconLink />
        </div>
        <h1>加入朋友的牌桌</h1>
        <label className="native-field">
          <span>邀请链接</span>
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://…/room/…"
          />
        </label>
        <label className="native-field">
          <span>你的昵称</span>
          <input
            value={name}
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="native-secondary"
          onClick={() => setLink("https://rooms.example/abc")}
        >
          <IconScan />
          扫描邀请二维码
        </button>
        <button
          type="button"
          className="native-primary native-wide"
          disabled={!link.trim() || !name.trim()}
          onClick={onJoined}
        >
          加入牌桌
        </button>
      </div>
    </div>
  );
}

function SettingsScreen({
  theme,
  onTheme,
  motion,
  onMotion,
}: {
  theme: PreviewTheme;
  onTheme: (theme: PreviewTheme) => void;
  motion: boolean;
  onMotion: (value: boolean) => void;
}) {
  return (
    <div className="native-screen">
      <header className="native-large-heading">
        <div>
          <p className="native-eyebrow">OnlineBGClient</p>
          <h1>设置</h1>
        </div>
      </header>
      <section className="native-group">
        <h2>外观</h2>
        <div className="native-row">
          <span>主题</span>
          <div className="native-segmented">
            <button
              type="button"
              className={theme === "light" ? "is-active" : ""}
              onClick={() => onTheme("light")}
            >
              浅色
            </button>
            <button
              type="button"
              className={theme === "dark" ? "is-active" : ""}
              onClick={() => onTheme("dark")}
            >
              深色
            </button>
          </div>
        </div>
        <div className="native-row">
          <span>界面动效</span>
          <button
            type="button"
            className={`native-switch ${motion ? "is-on" : ""}`}
            aria-pressed={motion}
            onClick={() => onMotion(!motion)}
          >
            <span />
          </button>
        </div>
      </section>
      <section className="native-group">
        <h2>声音与语音</h2>
        <div className="native-row">
          <span>按住说话</span>
          <span className="native-row-value">开</span>
        </div>
        <div className="native-row">
          <span>输出设备</span>
          <span className="native-row-value">跟随系统 ›</span>
        </div>
      </section>
    </div>
  );
}

function MockAvatar({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="native-avatar" data-tone={tone}>
      {label}
    </span>
  );
}

function NativeHandCardView({
  card,
  selected,
  onToggle,
}: {
  card: NativeHandCard;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="native-card"
      data-tone={card.tone}
      data-selected={selected}
      aria-pressed={selected}
      aria-label={`${card.suit ?? ""}${card.label}`}
      onClick={onToggle}
    >
      {card.suit && <span className="native-card-suit">{card.suit}</span>}
      <span className="native-card-label">{card.label}</span>
      {!card.suit && card.tone !== "wild" && (
        <span className="native-card-corner">{card.label}</span>
      )}
    </button>
  );
}

function HandTray({
  game,
  selected,
  onToggle,
  onClear,
}: {
  game: HandGame;
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const cards = game === "uno" ? nativeUnoHand : nativeDdzHand;
  return (
    <footer className="native-hand-tray" data-game={game} aria-label="手牌托盘">
      <div className="native-hand-meta">
        <span>{game === "uno" ? "UNO · 你的手牌" : "斗地主 · 你的手牌"}</span>
        {selected.length > 0 && <span>已选 {selected.length} 张</span>}
      </div>
      <div className="native-hand-scroll">
        {cards.map((card) => (
          <NativeHandCardView
            key={card.id}
            card={card}
            selected={selected.includes(card.id)}
            onToggle={() => onToggle(card.id)}
          />
        ))}
      </div>
      <div className="native-hand-actions">
        <button type="button" className="native-secondary" onClick={onClear}>
          不出
        </button>
        <button
          type="button"
          className="native-primary"
          disabled={!selected.length}
          onClick={onClear}
        >
          出牌
        </button>
      </div>
    </footer>
  );
}

function TableScreen({
  game,
  handGame,
  selected,
  onToggle,
  onClear,
  onBack,
}: {
  game: GameKind;
  handGame: HandGame;
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
}) {
  const supportsNativeHand = game === "uno" || game === "ddz";
  return (
    <div className="native-screen native-table-screen">
      <header className="native-nav native-table-nav">
        <button
          type="button"
          className="native-icon-button"
          aria-label="返回大厅"
          onClick={onBack}
        >
          <IconBack />
        </button>
        <div>
          <strong>{gameCatalogue[game].name}</strong>
          <small>房间 8F3K</small>
        </div>
        <button type="button" className="native-icon-button" aria-label="更多">
          <IconMore />
        </button>
      </header>
      <section className="native-table-surface">
        <div className="native-opponents">
          <MockAvatar label="阿" tone="blue" />
          <MockAvatar label="林" tone="green" />
          <MockAvatar label="K" tone="amber" />
        </div>
        <div className="native-table-center">
          {game === "uno" ? (
            <div className="native-discard-stack">
              <span className="native-discard-card" data-tone="red">
                7
              </span>
              <span className="native-discard-card" data-tone="blue">
                4
              </span>
              <span className="native-discard-card" data-tone="green">
                9
              </span>
            </div>
          ) : game === "ddz" ? (
            <div className="native-discard-stack native-ddz-play">
              <span className="native-discard-card" data-tone="black">
                ♠ 8
              </span>
              <span className="native-discard-card" data-tone="black">
                ♠ 8
              </span>
            </div>
          ) : (
            <GameCover kind={game} />
          )}
        </div>
        <div className="native-table-status">
          <span className="native-turn-dot" />
          轮到你了
        </div>
      </section>
      {supportsNativeHand ? (
        <HandTray
          game={handGame}
          selected={selected}
          onToggle={onToggle}
          onClear={onClear}
        />
      ) : (
        <footer className="native-table-placeholder-bar">
          <button type="button" className="native-secondary" onClick={onBack}>
            返回大厅
          </button>
        </footer>
      )}
    </div>
  );
}

function LobbySheet({
  game,
  onClose,
  onStart,
}: {
  game: GameKind;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <div className="native-sheet-backdrop" onClick={onClose}>
      <section
        className="native-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        aria-label="本地对局设置"
      >
        <span className="native-sheet-handle" />
        <div className="native-sheet-heading">
          <GameCover kind={game} />
          <div>
            <strong>{gameCatalogue[game].name}</strong>
            <small>{gameCatalogue[game].description}</small>
          </div>
          <button
            type="button"
            className="native-icon-button"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="native-sheet-row">
          <span>真人玩家</span>
          <strong>1 人</strong>
        </div>
        <div className="native-sheet-row">
          <span>AI 补位</span>
          <strong>
            {gameCatalogue[game].ai
              ? `${Math.max(0, gameCatalogue[game].minPlayers - 1)} 位`
              : "同屏轮流"}
          </strong>
        </div>
        <div className="native-sheet-row">
          <span>难度</span>
          <strong>普通</strong>
        </div>
        <button
          type="button"
          className="native-primary native-wide"
          onClick={onStart}
        >
          开始本地对局
        </button>
        <button
          type="button"
          className="native-secondary native-wide"
          onClick={onClose}
        >
          取消
        </button>
      </section>
    </div>
  );
}

export default function NativeShellPreview() {
  const [initial] = useState(() => nativeShellPreviewOptions(location.search));
  const [screen, setScreen] = useState<NativeShellScreen>(initial.screen);
  const [theme, setTheme] = useState<PreviewTheme>(initial.theme);
  const [island, setIsland] = useState(initial.island);
  const [safeArea, setSafeArea] = useState(initial.safeArea);
  const [motion, setMotion] = useState(initial.motion);
  const [landscape, setLandscape] = useState(initial.landscape);
  const [selectedGame, setSelectedGame] = useState<GameKind>("uno");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tableGame, setTableGame] = useState<GameKind>(
    initial.screen === "table" ? initial.handGame : "uno",
  );
  const [handGame, setHandGame] = useState<HandGame>(initial.handGame);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [scale, setScale] = useState(1);
  const stage = useRef<HTMLElement>(null);
  const lastGame = "uno" as const;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const update = () => {
      const size = landscape
        ? nativeShellDevice.landscape
        : nativeShellDevice.portrait;
      const available = element.getBoundingClientRect();
      setScale(
        Math.min(
          1,
          (available.width - 64) / (size.width + 32),
          (available.height - 64) / (size.height + 32),
        ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [landscape]);

  const device = landscape
    ? nativeShellDevice.landscape
    : nativeShellDevice.portrait;
  const startLocal = (kind: GameKind) => {
    setSelectedGame(kind);
    setTableGame(kind);
    if (kind === "uno" || kind === "ddz") {
      setHandGame(kind);
      setSelectedCards([]);
    }
    setSheetOpen(false);
    setScreen("table");
  };
  const toggleCard = (id: string) =>
    setSelectedCards((current) => toggleNativeCard(current, id));
  const go = (next: NativeShellScreen) => {
    setScreen(next);
    setSheetOpen(false);
  };

  return (
    <main className="native-shell-preview">
      <aside className="native-preview-controls">
        <header>
          <p className="native-preview-eyebrow">Phase A</p>
          <h1>Native Shell</h1>
          <p>SwiftUI 外壳的浏览器原型。所有手机内控件都可点。</p>
        </header>
        <section>
          <h2>预览页面</h2>
          <div className="native-preview-list">
            {nativeShellScreens.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={screen === item}
                className={screen === item ? "is-active" : ""}
                onClick={() => go(item)}
              >
                {item === "home"
                  ? "首页"
                  : item === "lobby"
                    ? "本地大厅"
                    : item === "join"
                      ? "加入房间"
                      : item === "settings"
                        ? "设置"
                        : "牌桌"}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h2>设备</h2>
          <div className="native-preview-row">
            <button
              type="button"
              className={!landscape ? "is-active" : ""}
              onClick={() => setLandscape(false)}
            >
              竖屏
            </button>
            <button
              type="button"
              className={landscape ? "is-active" : ""}
              onClick={() => setLandscape(true)}
            >
              横屏
            </button>
          </div>
          <p className="native-preview-meta">
            {device.width} × {device.height} pt · iPhone 18 Pro 基线
          </p>
        </section>
        <section>
          <h2>外观</h2>
          <div className="native-preview-row">
            <button
              type="button"
              className={theme === "light" ? "is-active" : ""}
              onClick={() => setTheme("light")}
            >
              浅色
            </button>
            <button
              type="button"
              className={theme === "dark" ? "is-active" : ""}
              onClick={() => setTheme("dark")}
            >
              深色
            </button>
          </div>
          <label className="native-preview-check">
            <input
              type="checkbox"
              checked={island}
              onChange={(event) => setIsland(event.target.checked)}
            />
            灵动岛
          </label>
          <label className="native-preview-check">
            <input
              type="checkbox"
              checked={safeArea}
              onChange={(event) => setSafeArea(event.target.checked)}
            />
            安全区
          </label>
          <label className="native-preview-check">
            <input
              type="checkbox"
              checked={motion}
              onChange={(event) => setMotion(event.target.checked)}
            />
            界面动效
          </label>
        </section>
        <section>
          <h2>手牌原型</h2>
          <div className="native-preview-row">
            <button
              type="button"
              className={handGame === "uno" ? "is-active" : ""}
              onClick={() => {
                setHandGame("uno");
                setTableGame("uno");
                setSelectedCards([]);
              }}
            >
              UNO
            </button>
            <button
              type="button"
              className={handGame === "ddz" ? "is-active" : ""}
              onClick={() => {
                setHandGame("ddz");
                setTableGame("ddz");
                setSelectedCards([]);
              }}
            >
              斗地主
            </button>
          </div>
          <p className="native-preview-meta">
            进入「牌桌」后点按手牌，验证 120Hz 选牌动效。
          </p>
        </section>
        <p className="native-preview-tip">
          这是视觉与交互原型，不连接真实房间。重点看安全区、原生卡片、底栏和手牌托盘。
        </p>
      </aside>
      <section ref={stage} className="native-preview-stage">
        <div
          className="native-device-space"
          style={{
            width: `${(device.width + 24) * scale}px`,
            height: `${(device.height + 24) * scale}px`,
          }}
        >
          <div
            className="native-device"
            data-motion={motion ? "on" : "off"}
            data-safe={safeArea ? "on" : "off"}
            data-landscape={landscape ? "on" : "off"}
            style={{
              width: `${device.width}px`,
              height: `${device.height}px`,
              transform: `scale(${scale})`,
            }}
          >
            <div className="native-device-screen">
              <StatusBar island={island} />
              <div className="native-app-content">
                {screen === "home" && (
                  <HomeScreen
                    lastGame={lastGame}
                    onScreen={go}
                    onLocal={startLocal}
                    onJoin={() => go("join")}
                  />
                )}
                {screen === "lobby" && (
                  <LobbyScreen
                    selected={selectedGame}
                    onSelect={(kind) => {
                      setSelectedGame(kind);
                      setSheetOpen(true);
                    }}
                    onBack={() => go("home")}
                  />
                )}
                {screen === "join" && (
                  <JoinScreen
                    onBack={() => go("home")}
                    onJoined={() => startLocal("uno")}
                  />
                )}
                {screen === "settings" && (
                  <SettingsScreen
                    theme={theme}
                    onTheme={setTheme}
                    motion={motion}
                    onMotion={setMotion}
                  />
                )}
                {screen === "table" && (
                  <TableScreen
                    game={tableGame}
                    handGame={handGame}
                    selected={selectedCards}
                    onToggle={toggleCard}
                    onClear={() => setSelectedCards([])}
                    onBack={() => go("lobby")}
                  />
                )}
                {screen !== "join" && screen !== "table" && (
                  <TabBar screen={screen} onScreen={go} />
                )}
              </div>
              {sheetOpen && (
                <LobbySheet
                  game={selectedGame}
                  onClose={() => setSheetOpen(false)}
                  onStart={() => startLocal(selectedGame)}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
