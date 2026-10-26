export class TableAnchors {
  private targets = new Map<HTMLElement, Element>();
  private frame = 0;
  private update = () => {
    this.frame = 0;
    for (const [shell, target] of this.targets) {
      if (target.isConnected === false) {
        this.targets.delete(shell);
        continue;
      }
      const bounds = target.getBoundingClientRect();
      Object.assign(shell.style, {
        left: `${bounds.x}px`,
        top: `${bounds.y}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
      });
    }
    if (this.targets.size) this.frame = requestAnimationFrame(this.update);
  };
  add(shell: HTMLElement, target: Element) {
    this.targets.set(shell, target);
    if (!this.frame) this.frame = requestAnimationFrame(this.update);
  }
  delete(shell: HTMLElement) {
    this.targets.delete(shell);
    if (!this.targets.size) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }
  clear() {
    this.targets.clear();
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
