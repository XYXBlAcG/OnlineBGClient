export class MotionLifetime {
  private live = new Map<
    { cancel: () => void },
    ReturnType<typeof setTimeout>
  >();
  constructor(private readonly limit = 3) {}
  keep(animation: { cancel: () => void }, duration: number): void {
    while (this.live.size >= this.limit) {
      const oldest = this.live.keys().next().value!;
      clearTimeout(this.live.get(oldest));
      oldest.cancel();
      this.live.delete(oldest);
    }
    const timer = setTimeout(() => {
      animation.cancel();
      this.live.delete(animation);
    }, duration);
    this.live.set(animation, timer);
  }
  clear(): void {
    for (const [animation, timer] of this.live) {
      clearTimeout(timer);
      animation.cancel();
    }
    this.live.clear();
  }
}
