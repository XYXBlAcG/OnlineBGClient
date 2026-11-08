import { useState } from "react";
import {
  gameCatalogue,
  gameKinds,
  type GameKind,
} from "../../domain/catalogue";
import { GameCover } from "./GameCover";
import { SearchField } from "../ui/Controls";
export function GameLibrary({
  selected,
  favorites,
  recent,
  onSelect,
  onFavorite,
  disabled = false,
}: {
  selected: GameKind;
  favorites: readonly string[];
  recent: readonly string[];
  onSelect: (kind: GameKind) => void;
  onFavorite: (kind: GameKind) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("全部");
  const kinds = gameKinds.filter(
    (kind) =>
      (category === "全部" ||
        gameCatalogue[kind].category === category ||
        (category === "收藏" && favorites.includes(kind)) ||
        (category === "常玩" && recent.includes(kind))) &&
      gameCatalogue[kind].name
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  kinds.sort((a, b) => {
    const ai = recent.indexOf(a),
      bi = recent.indexOf(b);
    if (ai < 0 && bi < 0) return 0;
    if (ai < 0) return 1;
    if (bi < 0) return -1;
    return ai - bi;
  });
  return (
    <section className="game-library" aria-disabled={disabled}>
      <div className="library-heading">
        <div>
          <h1>今晚玩什么？</h1>
        </div>
        <SearchField
          label="搜索游戏"
          type="search"
          aria-label="搜索游戏"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <nav className="category-tabs" aria-label="游戏分类">
        {[
          "全部",
          "常玩",
          "收藏",
          ...new Set(gameKinds.map((kind) => gameCatalogue[kind].category)),
        ].map((value) => (
          <button
            key={value}
            aria-pressed={category === value}
            className={category === value ? "active" : ""}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </nav>
      <div className="game-picker">
        {kinds.map((kind) => (
          <article
            key={kind}
            className={`game-card club-game-card ${kind === selected ? "active" : ""}`}
          >
            <button
              className="game-card-main"
              aria-label={`选择${gameCatalogue[kind].name}`}
              aria-pressed={kind === selected}
              disabled={disabled}
              onClick={() => onSelect(kind)}
            >
              <GameCover kind={kind} />
              <span className="club-card-copy">
                <strong>{gameCatalogue[kind].name}</strong>
                <span>{gameCatalogue[kind].description}</span>
                <small>
                  {gameCatalogue[kind].minPlayers}–
                  {gameCatalogue[kind].maxPlayers} 人
                </small>
              </span>
            </button>
            <button
              className="game-favorite"
              aria-label={`${favorites.includes(kind) ? "取消收藏" : "收藏"}${gameCatalogue[kind].name}`}
              aria-pressed={favorites.includes(kind)}
              onClick={() => onFavorite(kind)}
            >
              {favorites.includes(kind) ? "★" : "☆"}
            </button>
          </article>
        ))}
      </div>
      {!kinds.length && (
        <div className="club-empty" role="status">
          <strong>没有找到游戏</strong>
          <p>
            {category === "收藏"
              ? "点游戏卡片上的星标，收藏喜欢的游戏。"
              : category === "常玩"
                ? "开始过的游戏会按游玩次数排在这里。"
                : "试试其他关键词或分类。"}
          </p>
          <button
            onClick={() => {
              setQuery("");
              setCategory("全部");
            }}
          >
            查看全部游戏
          </button>
        </div>
      )}
    </section>
  );
}
