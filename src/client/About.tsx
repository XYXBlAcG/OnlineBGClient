import { invoke, isTauri } from "@tauri-apps/api/core";
import { Panel } from "./ui/Controls";
import profile from "./about.json";
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
  return (
    <Panel
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
          <a
            href={profile[key]}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!isTauri()) return;
              event.preventDefault();
              void invoke("open_link", { key }).catch((error) =>
                onError(String(error)),
              );
            }}
          >
            {text}
          </a>
        </p>
      ))}
    </Panel>
  );
}
