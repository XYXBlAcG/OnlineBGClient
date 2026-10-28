import releases from "./releases.json";
import { useNativeWindow } from "./native/windows";
import { ExternalLink } from "./ExternalLink";
import { Panel } from "./ui/Controls";
import { productName } from "../../src-tauri/tauri.conf.json";
import { version } from "../../package.json";

export function About({
  open,
  onOpenChange,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string) => void;
}) {
  const detached = useNativeWindow(
    "about",
    open,
    { view: "about" },
    (intent) => {
      if (intent.type === "close") onOpenChange(false);
      if (intent.type === "error") onError(intent.message);
    },
  );
  if (detached) return null;
  return (
    <Panel
      className="about-links"
      title={`关于 ${productName}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <h2>{productName}</h2>
      <p className="muted">{version}</p>
      {(
        [
          ["github", "作者 Github 主页：", "链接"],
          ["original", "请支持原作：", "game"],
        ] as const
      ).map(([key, label, text]) => (
        <p key={key}>
          {label}
          <ExternalLink name={key} onError={onError}>
            {text}
          </ExternalLink>
        </p>
      ))}
      <div className="release-notes">
        {releases.map((release) => (
          <section key={release.version}>
            <h3>{release.version}</h3>
            <small>{release.date}</small>
            <ul>
              {release.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Panel>
  );
}
