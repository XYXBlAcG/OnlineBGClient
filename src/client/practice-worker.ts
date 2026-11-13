import type { AiResult } from "../domain/types";
export type PracticeWorkerResponse =
  { version: number; result: AiResult } | { version: number; error: string };
import { Strategies } from "../domain/strategies";
import type { SearchRequest } from "../domain/strategy";
const strategies = new Strategies();
onmessage = (
  event: MessageEvent<{ version: number; request: SearchRequest }>,
) => {
  const { version, request } = event.data;
  try {
    const quiet = { ...request, audit: false };
    const strategy = strategies.select(request.observation.kind);
    postMessage({
      version,
      result: strategy.complete(
        quiet,
        strategy.score(quiet, strategy.candidates(quiet)),
        [],
      ),
    });
  } catch (error) {
    postMessage({
      version,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
