import { invoke, isTauri } from "@tauri-apps/api/core";
import { Panel } from "./ui/Controls";
import profile from "./about.json";
import { productName, version } from "../../src-tauri/tauri.conf.json";

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
      <a
        href={profile.github}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          if (!isTauri()) return;
          event.preventDefault();
          void invoke("open_profile").catch((error) => onError(String(error)));
        }}
      >
        {profile.author}
      </a>
    </Panel>
  );
}
