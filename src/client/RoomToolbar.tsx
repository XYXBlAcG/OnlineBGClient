import { roomSurface } from "./room-surface";
import { useState } from "react";
import type { Command, Snapshot } from "../domain/protocol";
import { gameCatalogue } from "../domain/catalogue";
import { RoomSetup } from "./RoomSetup";
import { ThemeControl } from "./ThemeControl";
import { Panel, Select } from "./ui/Controls";
import { GameCommands } from "./GameCommands";
import type { Preferences } from "./preferences";
import type { CommandRegistry } from "./commands";
import type { Action } from "../domain/types";
import { BannerPermissions } from "./social/BannerPermissions";

export function RoomToolbar({
  snapshot,
  mobile,
  focused,
  onFocus,
  preferences,
  onTheme,
  latency,
  network,
  invite,
  inviteCopied,
  onInvite,
  send,
  onError,
  act,
  registry,
  pending,
  guideAvailable,
  guideShown,
  onGuide,
}: {
  snapshot: Snapshot;
  mobile: boolean;
  focused: boolean;
  onFocus: () => void;
  preferences: Preferences;
  onTheme: (theme: string) => void;
  latency?: number;
  network: boolean;
  invite: () => void;
  inviteCopied: boolean;
  onInvite: () => void;
  send: (
    command:
      | Omit<Extract<Command, { type: "tempo" }>, "token">
      | Omit<Extract<Command, { type: "banner-policy" }>, "token">
      | Omit<Extract<Command, { type: "game" }>, "token">
      | Omit<Extract<Command, { type: "ai-run" }>, "token">,
  ) => void;
  onError: (message: string) => void;
  act: (action: Action) => void;
  registry: CommandRegistry;
  pending: boolean;
  guideAvailable: boolean;
  guideShown: boolean;
  onGuide: () => void;
}) {
  const [open, setOpen] = useState(false);
  const controls = (
    <>
      {mobile && <ThemeControl value={preferences.theme} onChange={onTheme} />}
      {mobile && snapshot.canManage && (
        <RoomSetup
          snapshot={snapshot}
          onError={onError}
          onApply={(setup) => {
            send({ type: "game", setup });
            setOpen(false);
          }}
        />
      )}
      {mobile && guideAvailable && (
        <button
          aria-pressed={guideShown}
          onClick={() => {
            setOpen(false);
            onGuide();
          }}
        >
          {guideShown ? "关闭新手引导" : "新手引导"}
        </button>
      )}
      {mobile &&
        snapshot.canManage &&
        snapshot.state &&
        snapshot.config.ai.length > 0 && (
          <button
            onClick={() => send({ type: "ai-run", enabled: snapshot.aiPaused })}
          >
            {snapshot.aiPaused ? "继续 AI" : "暂停 AI"}
          </button>
        )}
      {mobile && snapshot.actor >= 0 && (
        <button
          disabled={!snapshot.state || snapshot.finished}
          onClick={() => {
            setOpen(false);
            registry
              .list()
              .find((command) => command.id === `${snapshot.kind}.actions`)
              ?.run();
          }}
        >
          游戏操作
        </button>
      )}
      {snapshot.canManage && gameCatalogue[snapshot.kind].ai && (
        <label className="room-tempo">
          AI 间隔
          <Select
            aria-label="对局 AI 间隔"
            value={snapshot.config.aiDelayMs}
            onValueChange={(value) =>
              send({ type: "tempo", delayMs: Number(value) })
            }
          >
            {[
              ...new Set([
                0,
                500,
                1000,
                1500,
                2000,
                3000,
                5000,
                snapshot.config.aiDelayMs,
              ]),
            ]
              .sort((a, b) => a - b)
              .map((value) => (
                <option key={value} value={value}>
                  {value / 1000} 秒
                </option>
              ))}
          </Select>
        </label>
      )}
      {snapshot.canManage && (
        <BannerPermissions
          snapshot={snapshot}
          onChange={(policy) => send({ type: "banner-policy", policy })}
        />
      )}
    </>
  );
  return (
    <div
      className="room-toolbar"
      role="region"
      aria-label={roomSurface.region}
      data-room-id={snapshot.room}
    >
      <div className="room-heading">
        <strong aria-label={roomSurface.game}>
          {gameCatalogue[snapshot.kind].name}
        </strong>
        <small>
          {snapshot.seats.filter((seat) => seat.name).length}/
          {snapshot.seats.length} 人
          {latency !== undefined && network && (
            <>
              {" "}
              ·{" "}
              <output
                className="network-latency"
                aria-label={roomSurface.latency}
              >
                {latency} ms
              </output>
            </>
          )}
        </small>
        {!mobile && <small>{snapshot.room}</small>}
      </div>
      <div className="room-primary-actions">
        {(!mobile || snapshot.playing) && (
          <button aria-pressed={focused} onClick={onFocus}>
            {focused ? "恢复界面" : mobile ? "沉浸牌桌" : "专注模式"}
          </button>
        )}
        {!mobile && snapshot.canManage && (
          <RoomSetup
            snapshot={snapshot}
            onError={onError}
            onApply={(setup) => send({ type: "game", setup })}
          />
        )}
        {!mobile &&
          snapshot.canManage &&
          snapshot.state &&
          snapshot.config.ai.length > 0 && (
            <button
              onClick={() =>
                send({ type: "ai-run", enabled: snapshot.aiPaused })
              }
            >
              {snapshot.aiPaused ? "继续 AI" : "暂停 AI"}
            </button>
          )}
        {snapshot.actor >= 0 && (
          <GameCommands
            showTrigger={!mobile}
            snapshot={snapshot}
            act={act}
            registry={registry}
            bindings={preferences.bindings}
            pending={pending}
          />
        )}{" "}
        {network && (
          <>
            {!mobile && (
              <button onClick={invite}>
                {inviteCopied ? "已复制邀请" : "复制邀请"}
              </button>
            )}
            <button onClick={onInvite}>{mobile ? "邀请" : "邀请二维码"}</button>
          </>
        )}
        <button aria-expanded={open} onClick={() => setOpen(true)}>
          房间菜单
        </button>
      </div>

      <Panel
        className={
          mobile ? "room-menu-panel mobile-room-menu" : "room-menu-panel"
        }
        open={open}
        onOpenChange={setOpen}
        title="房间菜单"
      >
        <div className="room-menu-controls">
          {controls}
          <small className="muted">房间 · {snapshot.room}</small>
        </div>
      </Panel>
    </div>
  );
}
