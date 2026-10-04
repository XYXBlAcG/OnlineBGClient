import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Panel } from "./ui/Controls";
export function Invite({
  url,
  open,
  onOpenChange,
  onError,
}: {
  url: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string) => void;
}) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (open)
      void QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: "M",
      })
        .then(setQr)
        .catch((error) => onError(String(error)));
  }, [url, open]);
  return (
    <Panel title="邀请朋友" open={open} onOpenChange={onOpenChange}>
      {qr && <img className="invite-qr" src={qr} alt="房间邀请二维码" />}
      <p className="invite-url">{url}</p>
      <button
        onClick={() =>
          void navigator.clipboard
            .writeText(url)
            .catch((error) => onError(String(error)))
        }
      >
        复制链接
      </button>
      {navigator.share && (
        <button
          onClick={() =>
            void navigator
              .share({ title: "一起玩桌游", url })
              .catch((error) => {
                if (error.name !== "AbortError") onError(String(error));
              })
          }
        >
          分享邀请
        </button>
      )}
    </Panel>
  );
}
