import { lazy, Suspense, type ComponentProps } from "react";

const loadOriginalGame = () => import("./OriginalGame");

const OriginalGame = lazy(() =>
  loadOriginalGame().then((module) => ({ default: module.OriginalGame })),
);

export function prefetchGameSurface(): void {
  void loadOriginalGame();
}

export function OriginalGameLazy(props: ComponentProps<typeof OriginalGame>) {
  return (
    <Suspense
      fallback={
        <div
          className="native-table-loading original-game-loading"
          role="status"
        >
          <span className="native-table-spinner" aria-hidden="true" />
          <span>正在加载牌桌…</span>
        </div>
      }
    >
      <OriginalGame {...props} />
    </Suspense>
  );
}
