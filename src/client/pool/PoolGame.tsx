import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
} from "react";
import { PoolTable } from "./PoolTable";
import { PoolTableShell } from "./PoolTableShell";
import { usePoolPlayback } from "./use-pool-playback";
import {
  detectPoolRendererEnvironment,
  resolvePoolRenderer,
  type PoolRenderer,
} from "./renderer";

const PoolTable3D = lazy(() =>
  import("./PoolTable3D").then((module) => ({
    default: module.PoolTable3D,
  })),
);

type PoolTableProps = Omit<
  ComponentProps<typeof PoolTable>,
  "onRendererToggle" | "playback"
>;

export function PoolGame({
  renderer = "auto",
  onRendererChange,
  ...props
}: PoolTableProps & {
  renderer?: PoolRenderer;
  onRendererChange?: (renderer: PoolRenderer) => void;
}) {
  const playback = usePoolPlayback(props.view, props.actor);
  const [environment] = useState(detectPoolRendererEnvironment);
  const [override, setOverride] = useState<PoolRenderer | null>(null);
  const [fallback, setFallback] = useState(false);
  const preference = override ?? renderer;
  useEffect(() => {
    setOverride(null);
    setFallback(false);
  }, [renderer]);
  const kind =
    props.view.mode === "party"
      ? "2d"
      : resolvePoolRenderer(preference, fallback, environment);
  const change = (next: PoolRenderer) => {
    setOverride(next);
    setFallback(false);
    onRendererChange?.(next);
  };
  const unavailable = useCallback(() => setFallback(true), []);
  if (kind === "3d")
    return (
      <Suspense
        fallback={
          <PoolLoading
            view={props.view}
            replay={props.replay}
            onRendererToggle={() => change("2d")}
          />
        }
      >
        <PoolTable3D
          {...props}
          playback={playback}
          onRendererToggle={() => change("2d")}
          onUnavailable={unavailable}
        />
      </Suspense>
    );
  return (
    <PoolTable
      {...props}
      playback={playback}
      onRendererToggle={
        environment.webgl && props.view.mode !== "party"
          ? () => change("3d")
          : undefined
      }
    />
  );
}

function PoolLoading({
  view,
  replay,
  onRendererToggle,
}: {
  view: ComponentProps<typeof PoolTable>["view"];
  replay: boolean;
  onRendererToggle: () => void;
}) {
  return (
    <PoolTableShell
      view={view}
      remaining={null}
      power={0}
      spin={{ x: 0, y: 0 }}
      onSpin={() => {}}
      elevation={0}
      onElevation={() => {}}
      predict={false}
      onPredict={() => {}}
      renderer="3d"
      onRendererToggle={onRendererToggle}
      hint="正在加载 3D 桌面"
      disabled
      replay={replay}
    >
      <div className="pool-canvas pool-table-loading" role="status">
        <span className="native-table-spinner" aria-hidden="true" />
        <span>正在加载 3D 桌面…</span>
      </div>
    </PoolTableShell>
  );
}
