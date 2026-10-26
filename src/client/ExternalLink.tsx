import { useState, type ReactNode } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import links from "./about.json";
export function ExternalLink({
  name,
  children,
  onError,
}: {
  name: Exclude<keyof typeof links, "author">;
  children: ReactNode;
  onError?: (error: string) => void;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <a
        href={links[name]}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          if (!isTauri()) return;
          event.preventDefault();
          setError("");
          void invoke("open_link", { key: name }).catch((error) =>
            (onError ?? setError)(String(error)),
          );
        }}
      >
        {children}
      </a>
      {error && <span role="status">{error}</span>}
    </>
  );
}
