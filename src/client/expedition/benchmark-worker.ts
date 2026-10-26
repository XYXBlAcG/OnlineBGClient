import { benchmark } from "../../domain/expedition/benchmark";
self.onmessage = (event: MessageEvent<number>) => {
  try {
    const report = benchmark(event.data, (done, total) => {
      if (done % 5 === 0) self.postMessage({ type: "progress", done, total });
    });
    self.postMessage({ type: "done", report });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
