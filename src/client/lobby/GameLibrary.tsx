import { useState } from "react";
import {
  libraryCatalogue,
  libraryEntries,
  type LibraryEntry,
} from "./library-entries";
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
  selected: LibraryEntry;
  favorites: readonly string[];
  recent: readonly string[];
  onSelect: (kind: LibraryEntry) => void;
  onFavorite: (kind: LibraryEntry) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("全部");
  const kinds = libraryEntries.filter(
    (kind) =>
      (category === "全部" ||
        libraryCatalogue[kind].category === category ||
        (category === "收藏" && favorites.includes(kind)) ||
        (category === "常玩" && recent.includes(kind))) &&
      libraryCatalogue[kind].name
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
          <h1>今天玩什么？</h1>
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
          ...new Set(
            libraryEntries.map((kind) => libraryCatalogue[kind].category),
          ),
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
              aria-label={`选择${libraryCatalogue[kind].name}`}
              aria-pressed={kind === selected}
              disabled={disabled}
              onClick={() => onSelect(kind)}
            >
              <GameCover kind={kind} />
              <span className="club-card-copy">
                <strong>{libraryCatalogue[kind].name}</strong>
                <small>
                  {libraryCatalogue[kind].minPlayers}–
                  {libraryCatalogue[kind].maxPlayers} 人
                </small>
              </span>
            </button>
            <button
              className="game-favorite"
              aria-label={`${favorites.includes(kind) ? "取消收藏" : "收藏"}${libraryCatalogue[kind].name}`}
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
