import styles from "./PartyQueue.module.css";
import { mahjongModeNames } from "../domain/mahjong/types";
import type { Command, Snapshot } from "../domain/protocol";
import { gameCatalogue } from "../domain/catalogue";
import { RoomSetup } from "./RoomSetup";
import { Button } from "./ui/Controls";
export type QueueCommand =
  | Omit<Extract<Command, { type: "queue-set" }>, "token">
  | Omit<Extract<Command, { type: "queue-apply" }>, "token">;
export function PartyQueue({
  snapshot,
  send,
  onError,
  compact = false,
}: {
  compact?: boolean;
  snapshot: Snapshot;
  send: (command: QueueCommand) => void;
  onError: (message: string) => void;
}) {
  const queue = snapshot.partyQueue ?? { revision: 0, entries: [] };
  return (
    <section className={styles.queue} aria-label="连续聚会队列">
      <h3>接下来玩</h3>
      {!queue.entries.length && <p className="muted">尚未安排下一局</p>}
      <ol>
        {(compact ? queue.entries.slice(0, 1) : queue.entries).map(
          (item, index) => (
            <li key={item.id}>
              <strong>
                {gameCatalogue[item.config.kind].name}
                {item.config.kind === "scmj"
                  ? `（${mahjongModeNames[item.config.mahjong.mode ?? "sichuan"]}）`
                  : ""}
              </strong>
              <span>
                　{item.config.humans} 真人，{item.config.ai.length} AI
              </span>
              {snapshot.canManage && (
                <div className={styles.actions}>
                  {!compact && (
                    <Button
                      disabled={index === 0}
                      onClick={() => {
                        const entries = [...queue.entries];
                        [entries[index - 1], entries[index]] = [
                          entries[index],
                          entries[index - 1],
                        ];
                        send({
                          type: "queue-set",
                          revision: queue.revision,
                          entries,
                        });
                      }}
                    >
                      上移
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      send({
                        type: "queue-set",
                        revision: queue.revision,
                        entries: queue.entries.filter(
                          (entry) => entry.id !== item.id,
                        ),
                      })
                    }
                  >
                    移除
                  </Button>
                  {index === 0 && !snapshot.playing && (
                    <RoomSetup
                      key={item.id}
                      snapshot={snapshot}
                      proposedConfig={item.config}
                      onError={onError}
                      onApply={(setup) =>
                        send({
                          type: "queue-apply",
                          id: item.id,
                          revision: queue.revision,
                          setup,
                        })
                      }
                    />
                  )}
                </div>
              )}
            </li>
          ),
        )}
      </ol>
      {!compact && snapshot.canManage && queue.entries.length < 12 && (
        <RoomSetup
          snapshot={snapshot}
          purpose="enqueue"
          onError={onError}
          onApply={(setup) =>
            send({
              type: "queue-set",
              revision: queue.revision,
              entries: [
                ...queue.entries,
                { id: crypto.randomUUID(), config: setup.config },
              ],
            })
          }
        />
      )}
    </section>
  );
}
