import { Replay } from "../domain/replay";
onmessage = (event) => {
  try {
    postMessage({ frames: new Replay(event.data).frames() });
  } catch (error) {
    postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
