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
> & { quality?: import("../scene3d/environment").Scene3dQuality };

export function PoolGame({
  renderer = "auto",
  environment = "midnight",
  quality = "balanced",
  onRendererChange,
  ...props
}: PoolTableProps & {
  renderer?: PoolRenderer;
  environment?: import("../scene3d/environment").PoolEnvironment;
  quality?: import("../scene3d/environment").Scene3dQuality;
  onRendererChange?: (renderer: PoolRenderer) => void;
}) {
  const playback = usePoolPlayback(props.view, props.actor);
  const [rendererEnvironment, setRendererEnvironment] = useState(detectPoolRendererEnvironment);
  const [override, setOverride] = useState<PoolRenderer | null>(null);
  const [fallback, setFallback] = useState(false);
  const preference = override ?? renderer;
  useEffect(() => {
    setOverride(null);
    setFallback(false);
  }, [renderer]);
  useEffect(() => {
    const update = () => setRendererEnvironment(detectPoolRendererEnvironment());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const kind = resolvePoolRenderer(preference, fallback, rendererEnvironment);
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
          environment={environment}
          quality={quality}
          onRendererToggle={() => change("2d")}
          onUnavailable={unavailable}
        />
      </Suspense>
    );
  return (
    <PoolTable
      {...props}
      playback={playback}
      onRendererToggle={rendererEnvironment.webgl ? () => change("3d") : undefined}
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
