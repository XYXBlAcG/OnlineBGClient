export interface ReadPosition {
  sequence: number;
  own: number;
}
export class ChatReadState {
  constructor(
    private key: string,
    private storage: Pick<Storage, "getItem" | "setItem">,
  ) {}
  position(): ReadPosition {
    const value = this.storage.getItem(this.key);
    if (!value) return { sequence: 0, own: 0 };
    const parsed = JSON.parse(value) as ReadPosition;
    return parsed;
  }
  unread(sequence: number, own: number): number {
    const read = this.position();
    return Math.max(0, sequence - read.sequence - Math.max(0, own - read.own));
  }
  mark(sequence: number, own: number): void {
    this.storage.setItem(this.key, JSON.stringify({ sequence, own }));
  }
}
