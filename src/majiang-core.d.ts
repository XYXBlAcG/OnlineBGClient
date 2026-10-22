declare module "@kobalab/majiang-core" {
  class Shoupai {
    static fromString(value: string): Shoupai;
  }
  const core: {
    Shoupai: typeof Shoupai;
    Util: { xiangting_yiban(hand: Shoupai): number };
  };
  export default core;
}
