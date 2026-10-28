import "./run-shelf.css";
import { useEffect, useRef, useState } from "react";
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
    [visible, setVisible] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({});
  const pending = useRef(new Set<string>());
  const [, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    void store
      .runLinks()
      .then((next) => {
        if (active) {
          setLinks(next);
          setVisible(next.length > 0);
        }
      })
      .catch((error) => {
        if (active) setErrors({ load: String(error) });
      });
    return () => {
      active = false;
    };
  }, [store]);
  if (!visible && !Object.keys(errors).length) return null;
  return (
    <section className="run-shelf">
      <h3>继续秘塔远征</h3>
      {errors.load && <p role="alert">{errors.load}</p>}
      {!links.length && visible && (
        <div className="run-shelf-status muted">没有待继续的远征</div>
      )}
      {[...links]
        .sort((a, b) => b.updated - a.updated)
        .map((link) => (
          <div className="run-shelf-entry" key={link.id}>
            <div className="record-row">
              <button
                disabled={busy || pending.current.has(link.id)}
                onClick={() => onRestore(link)}
              >
                第 {Math.max(1, link.floor + 1)} 层 · {link.names.join("、")}
                <small>
                  {link.endpoint ? "联机存档" : "本地存档"} ·{" "}
                  {new Date(link.updated).toLocaleString()}
                </small>
              </button>
              <button
                disabled={busy || pending.current.has(link.id)}
                onClick={async () => {
                  if (pending.current.has(link.id)) return;
                  pending.current.add(link.id);
                  refresh((n) => n + 1);
                  try {
                    if (
                      await confirmation.request(
                        "永久放弃这次远征？普通回放不受影响。",
                        "放弃远征",
                      )
                    ) {
                      await onAbandon(link);
                      setLinks((current) =>
                        current.filter((item) => item.id !== link.id),
                      );
                      setErrors((current) => {
                        const next = { ...current };
                        delete next[link.id];
                        return next;
                      });
                    }
                  } catch (error) {
                    setErrors((current) => ({
                      ...current,
                      [link.id]: String(error),
                    }));
                  } finally {
                    pending.current.delete(link.id);
                    refresh((n) => n + 1);
                  }
                }}
              >
                {pending.current.has(link.id) ? "处理中…" : "放弃"}
              </button>
            </div>
            {errors[link.id] && <p role="alert">{errors[link.id]}</p>}
          </div>
        ))}
    </section>
  );
}
