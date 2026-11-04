declare module "@kobalab/majiang-core" {
  class Shoupai {
    static fromString(value: string): Shoupai;
  }
  const core: {
    Shoupai: typeof Shoupai;
    Util: {
      xiangting_yiban(hand: Shoupai): number;
      xiangting(hand: Shoupai): number;
      tingpai(hand: Shoupai): string[] | null;
      hule_param(options: {
        menfeng: number;
        lizhi?: number;
        yifa?: boolean;
        qianggang?: boolean;
        lingshang?: boolean;
        haidi?: number;
        baopai?: string[];
        fubaopai?: string[];
        lizhibang?: number;
      }): unknown;
      hule(
        hand: Shoupai,
        discard: string | null,
        options: unknown,
      ):
        | {
            hupai?: { name: string }[];
            fanshu?: number;
            damanguan?: number;
            fu?: number;
            defen?: number;
            fenpei?: number[];
          }
        | undefined;
    };
  };
  export default core;
}
