import { createPortal } from "react-dom";
import { useEffect } from "react";
export function Notices({
  notice,
  progress,
  onDismiss,
  onCancel,
}: {
  notice: string;
  progress: string;
  onDismiss: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(onDismiss, 7000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);
  const success = /已复制|成功|已就绪/.test(notice);
  return createPortal(
    <div className="notification-stack" aria-live="polite" aria-atomic="true">
      {progress && (
        <div className="notification progress-notification" role="status">
          <span className="notification-spinner" aria-hidden="true" />
          <span>{progress}</span>
          <button onClick={onCancel}>取消</button>
        </div>
      )}
      {notice && (
        <div
          className={`notification ${success ? "success-notification" : "error-notification"}`}
          role={success ? "status" : "alert"}
        >
          <span className="notification-icon" aria-hidden="true">
            {success ? "✓" : "!"}
          </span>
          <span>{notice}</span>
          <button aria-label="关闭提示" onClick={onDismiss}>
            ×
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
