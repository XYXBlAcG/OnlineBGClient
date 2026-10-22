import { MotionControls, type MotionPreferences } from "./MotionControls";
import { AvatarPicker } from "./AvatarPicker";
import { seatAvatar } from "../domain/avatar";
import * as Popover from "@radix-ui/react-popover";
import type { Snapshot } from "../domain/protocol";
import { interactionCatalogue, type InteractionKind } from "../domain/social";
import {
  defaultPhraseGroups,
  phraseGroups,
  type PhraseGroup,
} from "../domain/phrases";
import { PhraseMenu } from "./PhraseMenu";
export interface AvatarSurfaceProps {
  index: number;
  className?: string;
  children?: React.ReactNode;
  isTurn?: boolean;
  snapshot: Pick<Snapshot, "seats" | "actor" | "kind">;
  replay?: boolean;
  customPhrases?: PhraseGroup[];
  motionPreferences?: MotionPreferences;
  onMotion?: (preferences: MotionPreferences) => void;
  onAvatar?: (avatar: string) => void;
  onPhrase?: (text: string) => void;
  onInteract?: (target: number, kind: InteractionKind) => void;
}
export function AvatarSurface({
  index,
  className = "",
  children,
  isTurn,
  snapshot,
  replay,
  onPhrase,
  onAvatar,
  motionPreferences,
  onMotion,
  onInteract,
  customPhrases = defaultPhraseGroups,
}: AvatarSurfaceProps) {
  const seat = snapshot.seats[index];
  if (!seat) return null;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`game-avatar ${className} ${isTurn ? "is-turn" : ""}`}
          data-game-avatar={index}
          aria-label={`${seat.name}的头像`}
          disabled={
            replay || (index === snapshot.actor ? !onPhrase : !onInteract)
          }
        >
          <span className="game-avatar-face">{seatAvatar(seat)}</span>
          <span className="game-avatar-name">{seat.name}</span>
          {children}
        </button>
      </Popover.Trigger>
      {!replay && (
        <Popover.Portal>
          <Popover.Content
            data-motion-scope="ui"
            className="ui-popover avatar-menu"
            sideOffset={8}
            collisionPadding={12}
          >
            <strong>{seat.name}</strong>
            {index === snapshot.actor && onPhrase && (
              <PhraseMenu
                groups={phraseGroups(snapshot.kind, customPhrases)}
                onSend={onPhrase}
              />
            )}
            {index === snapshot.actor && onAvatar && (
              <details className="avatar-edit">
                <summary>更换头像</summary>
                <AvatarPicker value={seatAvatar(seat)} onChange={onAvatar} />
              </details>
            )}
            {index === snapshot.actor && motionPreferences && onMotion && (
              <details className="avatar-edit">
                <summary>动效偏好</summary>
                <MotionControls
                  preferences={motionPreferences}
                  onChange={onMotion}
                />
              </details>
            )}
            {index !== snapshot.actor && onInteract && (
              <div className="avatar-interactions">
                {Object.entries(interactionCatalogue).map(([kind, effect]) => (
                  <Popover.Close asChild key={kind}>
                    <button
                      aria-label={`送出${effect.name}`}
                      onClick={() => onInteract(index, kind as InteractionKind)}
                    >
                      {effect.emoji}
                    </button>
                  </Popover.Close>
                ))}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}
