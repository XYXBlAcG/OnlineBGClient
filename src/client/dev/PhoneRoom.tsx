import { useLayoutEffect, useRef, useState } from "react";
import {
  phoneFit,
  phonePresets,
  phoneRoomUrl,
  phoneSize,
} from "../../shared/phone-preview";
import { Button, Select } from "../ui/Controls";
import "../ui/phone-room.css";

function previewAddress() {
  try {
    return phoneRoomUrl("/", location.href, location.origin);
  } catch {
    return `${location.origin}/?device-preview=phone`;
  }
}

export default function PhoneRoom() {
  const [address, setAddress] = useState(previewAddress);
  const [loaded, setLoaded] = useState(previewAddress);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(390);
  const [height, setHeight] = useState(844);
  const [preset, setPreset] = useState("standard");
  const [scale, setScale] = useState("fit");
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const stage = useRef<HTMLElement>(null);
  const size = phoneSize(width, height, width > height);
  const factor =
    scale === "fit"
      ? phoneFit(size.width, size.height, available.width, available.height)
      : Number(scale);
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const update = () =>
      setAvailable({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const changeSize = (nextWidth: number, nextHeight: number) => {
    setWidth(nextWidth);
    setHeight(nextHeight);
  };
  return (
    <main className="app-shell phone-room">
      <header className="phone-room-toolbar">
        <strong className="phone-room-title">手机房间</strong>
        <form
          className="phone-room-address"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const next = phoneRoomUrl(
                address,
                location.href,
                location.origin,
              );
              setAddress(next);
              setLoaded(next);
              setError("");
            } catch (value) {
              setError(value instanceof Error ? value.message : String(value));
            }
          }}
        >
          <input
            aria-label="房间链接"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="粘贴局域网或公网房间邀请链接"
          />
          <Button variant="primary" type="submit">
            打开
          </Button>
        </form>
        <div className="phone-room-tools">
          <Select
            aria-label="设备尺寸"
            value={preset}
            onValueChange={(value) => {
              setPreset(value);
              const next = phonePresets.find((item) => item.id === value);
              if (next) changeSize(next.width, next.height);
            }}
          >
            {phonePresets.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label}
              </option>
            ))}
            <option value="custom">自定义</option>
          </Select>
          <label>
            宽
            <input
              aria-label="手机宽度"
              type="number"
              min={240}
              max={1600}
              value={width}
              onChange={(event) => {
                setPreset("custom");
                setWidth(Number(event.target.value));
              }}
            />
          </label>
          <span>×</span>
          <label>
            高
            <input
              aria-label="手机高度"
              type="number"
              min={240}
              max={1600}
              value={height}
              onChange={(event) => {
                setPreset("custom");
                setHeight(Number(event.target.value));
              }}
            />
          </label>
          <Button
            type="button"
            onClick={() => {
              setPreset("custom");
              changeSize(height, width);
            }}
          >
            旋转
          </Button>
          <Select aria-label="显示比例" value={scale} onValueChange={setScale}>
            <option value="fit">适配窗口</option>
            <option value="1">100%</option>
            <option value="0.75">75%</option>
            <option value="0.5">50%</option>
          </Select>
          <Button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            重新载入
          </Button>
        </div>
      </header>
      <section ref={stage} className="phone-room-stage">
        <div
          className="phone-room-space"
          style={{
            width: `${(size.width + 20) * factor}px`,
            height: `${(size.height + 20) * factor}px`,
          }}
        >
          <div
            className="phone-room-device"
            style={{
              width: `${size.width}px`,
              height: `${size.height}px`,
              transform: `scale(${factor})`,
            }}
          >
            <iframe
              key={reloadKey}
              title="手机房间"
              src={loaded}
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals"
              allow="clipboard-write; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      </section>
      {error && (
        <p className="phone-room-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
