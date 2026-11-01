export class FrameGate {
  private deadline: number | undefined;
  private fps: number | undefined;
  take(time: number, fps: number): boolean {
    if (!fps) {
      this.deadline = undefined;
      this.fps = fps;
      return true;
    }
    const interval = 1000 / fps;
    if (this.deadline === undefined || fps !== this.fps) {
      this.fps = fps;
      this.deadline = time + interval;
      return true;
    }
    if (time + 0.75 < this.deadline) return false;
    this.deadline +=
      Math.max(1, Math.floor((time - this.deadline) / interval) + 1) * interval;
    return true;
  }
}
