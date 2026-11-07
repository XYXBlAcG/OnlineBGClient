import { PartyRuntime } from "./party/PartyRuntime";
import { RoomParty } from "./RoomParty";
import { roomSurface } from "./room-surface";
import { useReducer } from "react";
import { roomSurfaceTransition } from "./party/navigation";
import type { Command, Snapshot } from "../domain/protocol";
import { gameCatalogue } from "../domain/catalogue";
import { RoomSetup } from "./RoomSetup";
import { ThemeControl } from "./ThemeControl";
import { Button, Panel, Select } from "./ui/Controls";
import { GameCommands } from "./GameCommands";
import type { Preferences } from "./preferences";
import { platformModifier, type CommandRegistry } from "./commands";
import { focusToggleBinding } from "./focus-presentation";
import { Shortcut } from "./ui/Shortcut";
import type { Action } from "../domain/types";
import { BannerPermissions } from "./social/BannerPermissions";
import { ChallengeBoard } from "./ChallengeBoard";
import { ConnectionStatus } from "./ConnectionStatus";

export function RoomToolbar({
  snapshot,
  mobile,
  focused,
  onFocus,
  onEnd,
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
  onPractice,
}: {
  snapshot: Snapshot;
  mobile: boolean;
  focused: boolean;
  onFocus: () => void;
  onEnd?: () => void;
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
      | Omit<Extract<Command, { type: "ai-run" }>, "token">
      | Omit<Extract<Command, { type: "party" }>, "token">,
  ) => void;
  onError: (message: string) => void;
  act: (action: Action) => void;
  registry: CommandRegistry;
  pending: boolean;
  guideAvailable: boolean;
  guideShown: boolean;
  onGuide: () => void;
  onPractice?: () => void;
}) {
  const [surface, dispatch] = useReducer(roomSurfaceTransition, null);
  const open = surface === "menu";
  const setOpen = (value: boolean) =>
    dispatch(value ? { type: "open", surface: "menu" } : { type: "close" });
  const observer =
    snapshot.party.enabled &&
    (snapshot.finished ||
      (snapshot.playing &&
        snapshot.party.observers.includes(
          snapshot.partyActor ?? snapshot.actor,
        )));
  const controls = (
    <>
      <section className="room-drawer-section">
        {guideAvailable && (
          <Button
            aria-pressed={guideShown}
            onClick={() => {
              setOpen(false);
              onGuide();
            }}
          >
            {guideShown ? "关闭新手引导" : "新手引导"}
          </Button>
        )}
        {snapshot.playing && (
          <Button
            aria-pressed={focused}
            onClick={() => {
              setOpen(false);
              onFocus();
            }}
          >
            {focused ? "恢复界面" : "专注牌桌"}{" "}
            <Shortcut
              binding={preferences.bindings["view.focus"] ?? focusToggleBinding}
            />
          </Button>
        )}
        {onPractice && (
          <Button
            onClick={() => {
              setOpen(false);
              onPractice();
            }}
          >
            练习核心操作
          </Button>
        )}
        {snapshot.challenges && (
          <ChallengeBoard board={snapshot.challenges} snapshot={snapshot} />
        )}
      </section>
      {(snapshot.canManage || snapshot.party.enabled || network) && (
        <section className="room-drawer-section">
          {(snapshot.canManage || snapshot.party.enabled) && (
            <Button
              data-room-action="party"
              onClick={() => dispatch({ type: "open", surface: "party" })}
            >
              {observer
                ? snapshot.finished
                  ? "颁奖"
                  : "旁观互动"
                : "房间派对"}
            </Button>
          )}
          {network && (
            <Button
              onClick={() => {
                setOpen(false);
                onInvite();
              }}
            >
              邀请二维码
            </Button>
          )}
          {network && (
            <Button onClick={invite}>
              {inviteCopied ? "已复制邀请" : "复制邀请"}{" "}
              <Shortcut
                binding={
                  preferences.bindings["app.invite"] ??
                  `${platformModifier()}+Shift+I`
                }
              />
            </Button>
          )}
        </section>
      )}
      {snapshot.canManage && (
        <section className="room-drawer-section">
          <RoomSetup
            registry={registry}
            binding={preferences.bindings["room.setup"] ?? ""}
            snapshot={snapshot}
            onError={onError}
            onApply={(setup) => {
              send({ type: "game", setup });
              setOpen(false);
            }}
          />
          {snapshot.state && snapshot.config.ai.length > 0 && (
            <Button
              onClick={() =>
                send({ type: "ai-run", enabled: snapshot.aiPaused })
              }
            >
              {snapshot.aiPaused ? "继续 AI" : "暂停 AI"}
            </Button>
          )}
          {gameCatalogue[snapshot.kind].ai && (
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
          <BannerPermissions
            snapshot={snapshot}
            onChange={(policy) => send({ type: "banner-policy", policy })}
          />
        </section>
      )}
      <section className="room-drawer-section">
        <ConnectionStatus
          snapshot={snapshot}
          network={network}
          latency={latency}
        />
      </section>
      <section className="room-drawer-section">
        <ThemeControl value={preferences.theme} onChange={onTheme} />
      </section>
      {onEnd &&
        snapshot.canManage &&
        snapshot.playing &&
        !snapshot.finished && (
          <section className="room-drawer-section room-drawer-danger">
            <Button
              variant="danger"
              data-room-action="end"
              onClick={() => {
                setOpen(false);
                onEnd();
              }}
            >
              结束对局
            </Button>
          </section>
        )}
    </>
  );
  return (
    <>
      <PartyRuntime
        snapshot={snapshot}
        preferences={preferences}
        mobile={mobile}
      />
      <RoomParty
        open={surface === "party"}
        onOpenChange={(value) =>
          dispatch(
            value ? { type: "open", surface: "party" } : { type: "close" },
          )
        }
        interactionsEnabled={preferences.interactions}
        snapshot={snapshot}
        observer={observer}
        onAction={(id, action) => {
          if (action.type === "buy" || action.type === "buy-plugin")
            dispatch({ type: "sent" });
          send({ type: "party", id, action });
        }}
      />
      <div
        className="room-toolbar"
        hidden={focused}
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
            {latency !== undefined && latency > 150 && network && (
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
          {snapshot.kind === "uno" && snapshot.config.team && (
            <small className="uno-team-legend">
              红队{" "}
              {snapshot.seats
                .filter((_, index) => index % 2 === 0)
                .map((seat) => seat.name)
                .join("、")}{" "}
              · 蓝队{" "}
              {snapshot.seats
                .filter((_, index) => index % 2 === 1)
                .map((seat) => seat.name)
                .join("、")}
            </small>
          )}
        </div>
        <div className="room-primary-actions">
          {snapshot.actor >= 0 && (
            <GameCommands
              snapshot={snapshot}
              act={act}
              registry={registry}
              bindings={preferences.bindings}
              pending={pending}
              onReveal={focused ? onFocus : undefined}
            />
          )}
          <Button aria-expanded={open} onClick={() => setOpen(true)}>
            房间菜单
          </Button>
        </div>

        <Panel
          className={
            mobile ? "room-menu-panel mobile-room-menu" : "room-menu-panel"
          }
          open={open}
          onOpenChange={setOpen}
          title="房间菜单"
          overlayClassName="room-menu-overlay"
        >
          <div className="room-menu-controls">
            {controls}
            <small className="muted">房间 · {snapshot.room}</small>
          </div>
        </Panel>
      </div>
    </>
  );
}
