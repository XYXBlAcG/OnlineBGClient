import { useEffect, useRef, useSyncExternalStore } from "react";
import { confirmation } from "./confirmation-controller";

export function Confirmation() {
  const request = useSyncExternalStore(
    confirmation.subscribe,
    confirmation.snapshot,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (request) dialog.current!.showModal();
    else dialog.current?.close();
  }, [request]);
  return (
    <dialog
      ref={dialog}
      className="confirmation-dialog"
      aria-labelledby="confirmation-message"
      onCancel={(event) => {
        event.preventDefault();
        confirmation.complete(false);
      }}
    >
      <p id="confirmation-message">{request?.message}</p>
      <div>
        <button onClick={() => confirmation.complete(false)}>取消</button>
        <button
          className="primary-button"
          onClick={() => confirmation.complete(true)}
        >
          {request?.label}
        </button>
      </div>
    </dialog>
  );
}
