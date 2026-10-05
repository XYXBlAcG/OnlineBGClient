import { useRef, useSyncExternalStore } from "react";
import { confirmation } from "./confirmation-controller";
import { Panel } from "./ui/Controls";
export function Confirmation() {
  const request = useSyncExternalStore(
    confirmation.subscribe,
    confirmation.snapshot,
  );
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Panel
      open={!!request}
      onOpenChange={(open) => {
        if (!open) confirmation.complete(false);
      }}
      title="确认"
      className="confirmation-dialog"
      initialFocus={cancel}
    >
      <p>{request?.message}</p>
      <div className="confirmation-actions">
        <button ref={cancel} onClick={() => confirmation.complete(false)}>
          取消
        </button>
        <button
          className="primary-button"
          onClick={() => confirmation.complete(true)}
        >
          {request?.label}
        </button>
      </div>
    </Panel>
  );
}
