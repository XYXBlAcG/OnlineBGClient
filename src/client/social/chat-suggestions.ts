import { bannerCommands } from "../../domain/banner";
import type { Snapshot } from "../../domain/protocol";

export interface ChatSuggestionContext {
  seats: Snapshot["seats"];
  companion: Snapshot["companion"];
}

export interface ChatSuggestion {
  id: string;
  kind: "mention" | "command";
  label: string;
  detail: string;
  insert: string;
  start: number;
  end: number;
}

const commandPattern = /^\/(\S*)/u;
const mentionPattern = /(^|\s)@([^\s@]*)$/u;

export function chatSuggestions(
  text: string,
  caret: number,
  context: ChatSuggestionContext,
): ChatSuggestion[] {
  const command = commandPattern.exec(text);
  if (command && caret <= command[0].length) {
    const query = command[1]!.toLowerCase();
    return bannerCommands
      .filter((item) => item.command.slice(1).toLowerCase().startsWith(query))
      .map((item) => ({
        id: `command:${item.command}`,
        kind: "command" as const,
        label: item.command,
        detail: item.label,
        insert: `${item.command} `,
        start: 0,
        end: command[0].length,
      }));
  }

  const before = text.slice(0, caret);
  const mention = mentionPattern.exec(before);
  if (!mention) return [];
  const query = mention[2]!.toLowerCase();
  const start = caret - mention[2]!.length - 1;
  return context.seats
    .filter((seat) => seat.name.trim() && seat.name.toLowerCase().includes(query))
    .map((seat) => ({
      id: `mention:${seat.id}`,
      kind: "mention" as const,
      label: `@${seat.name}`,
      detail:
        seat.difficulty === null
          ? "玩家"
          : seat.name === context.companion.name
            ? "AI 聊天"
            : "AI",
      insert: `@${seat.name} `,
      start,
      end: caret,
    }));
}

export function applyChatSuggestion(
  text: string,
  suggestion: ChatSuggestion,
): { text: string; caret: number } {
  return {
    text: `${text.slice(0, suggestion.start)}${suggestion.insert}${text.slice(suggestion.end)}`,
    caret: suggestion.start + suggestion.insert.length,
  };
}
