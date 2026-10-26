import "./run-shelf.css";
import { useEffect, useState } from "react";
import { ClientStore, type RunLink } from "../storage";
import { confirmation } from "../confirmation-controller";
export function RunShelf({
  onRestore,
  busy = false,
  onAbandon,
}: {
  busy?: boolean;
  onRestore: (link: RunLink) => void;
  onAbandon: (link: RunLink) => Promise<void>;
}) {
  const [store] = useState(() => new ClientStore()),
    [links, setLinks] = useState<RunLink[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    void store
      .runLinks()
      .then(setLinks)
      .catch((error) => setError(String(error)));
  }, [store]);
  if (!links.length && !error) return null;
  return (
    <section className="run-shelf">
      <h3>继续秘塔远征</h3>
      {error && <p role="alert">{error}</p>}
      {[...links]
        .sort((a, b) => b.updated - a.updated)
        .map((link) => (
          <div className="record-row" key={link.id}>
            <button disabled={busy} onClick={() => onRestore(link)}>
              第 {Math.max(1, link.floor + 1)} 层 · {link.names.join("、")}
              <small>
                {link.endpoint ? "联机存档" : "本地存档"} ·{" "}
                {new Date(link.updated).toLocaleString()}
              </small>
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                if (
                  await confirmation.request(
                    "永久放弃这次远征？普通回放不受影响。",
                    "放弃远征",
                  )
                ) {
                  try {
                    await onAbandon(link);
                    setLinks(await store.runLinks());
                  } catch (error) {
                    setError(String(error));
                  }
                }
              }}
            >
              放弃
            </button>
          </div>
        ))}
    </section>
  );
}
